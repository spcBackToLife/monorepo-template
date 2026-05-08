import { useState, useRef, useEffect, useMemo } from 'react';
import { observer } from 'mobx-react-lite';
import { editorStore } from '@/stores/editor';
import type { DataPayload } from '@/types/editor';

/**
 * Task 3.4.6 — Expression Input
 *
 * A text input that:
 * - Shows a chain link icon to indicate expression mode
 * - Accepts {{data.xxx}} syntax
 * - Has a dropdown for auto-complete based on the keys from the active dataset
 * - Shows resolved preview below the input
 */

interface ExpressionInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const ExpressionInput = observer(function ExpressionInput({
  value,
  onChange,
  placeholder = '{{data.key}}',
}: ExpressionInputProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [filter, setFilter] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // v2: 数据源补全候选合并（static→initial；api→激活 mock 场景的 responseBody）
  const screen = editorStore.activeScreen;
  const activeDataSet = useMemo(() => {
    if (!screen) return null;
    const merged: DataPayload = {};
    for (const ds of screen.dataSources ?? []) {
      let payload: unknown;
      if (ds.type === 'static') {
        payload = ds.initial;
      } else {
        const mock = ds.mock;
        if (!mock) continue;
        const sc = mock.scenarios.find((s) => s.id === mock.activeScenarioId)
          ?? mock.scenarios[0];
        if (!sc || sc.isTimeout) continue;
        if (sc.statusCode < 200 || sc.statusCode >= 300) continue;
        payload = sc.responseBody;
      }
      if (payload && typeof payload === 'object') {
        Object.assign(merged, payload as DataPayload);
      }
    }
    return Object.keys(merged).length > 0 ? { data: merged } : null;
  }, [screen?.dataSources]);

  const dataKeys = useMemo(() => {
    if (!activeDataSet) return [];
    return flattenKeys(activeDataSet.data, 'data');
  }, [activeDataSet]);

  const filteredKeys = useMemo(() => {
    if (!filter) return dataKeys;
    const lower = filter.toLowerCase();
    return dataKeys.filter((k) => k.toLowerCase().includes(lower));
  }, [dataKeys, filter]);

  // Resolve the expression for preview
  const resolvedPreview = useMemo(() => {
    if (!value || !activeDataSet) return null;
    return resolveExpression(value, activeDataSet.data);
  }, [value, activeDataSet]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    // Check if user is typing inside {{ }}
    const cursorPos = e.target.selectionStart ?? 0;
    const textBefore = newValue.slice(0, cursorPos);
    const openIdx = textBefore.lastIndexOf('{{');
    const closeIdx = textBefore.lastIndexOf('}}');

    if (openIdx !== -1 && (closeIdx === -1 || openIdx > closeIdx)) {
      // Inside an expression
      const partialKey = textBefore.slice(openIdx + 2);
      setFilter(partialKey);
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
    }
  };

  const handleKeySelect = (key: string) => {
    const expression = `{{${key}}}`;
    onChange(expression);
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative flex-1">
      <div className="flex items-center border border-gray-200 rounded h-6 focus-within:border-blue-400 bg-amber-50/50">
        <span className="px-1 text-amber-500 flex-shrink-0 text-xs" title="Expression binding">
          🔗
        </span>
        <input
          ref={inputRef}
          type="text"
          className="flex-1 h-full px-1 bg-transparent outline-none text-xs text-gray-800 font-mono min-w-0"
          value={value}
          onChange={handleInputChange}
          onFocus={() => {
            if (value.includes('{{')) setShowDropdown(true);
          }}
          placeholder={placeholder}
        />
      </div>

      {/* Auto-complete dropdown */}
      {showDropdown && filteredKeys.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 top-7 left-0 w-full max-h-32 overflow-y-auto bg-white border border-gray-200 rounded shadow-lg"
        >
          {filteredKeys.map((key) => (
            <button
              key={key}
              type="button"
              className="w-full text-left px-2 py-1 text-[10px] font-mono hover:bg-blue-50 text-gray-700"
              onClick={() => handleKeySelect(key)}
            >
              <span className="text-purple-600">{key}</span>
              <span className="ml-1 text-gray-400">
                = {getNestedValuePreview(activeDataSet?.data ?? {}, key)}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Resolved preview */}
      {resolvedPreview !== null && (
        <div className="mt-0.5 text-[10px] text-gray-500 font-mono truncate px-1" title={formatPreviewTitle(resolvedPreview)}>
          → {formatPreviewValue(resolvedPreview)}
        </div>
      )}
    </div>
  );
});

// ===== Utility functions =====

/** Flatten a nested object into dot-separated key paths */
function flattenKeys(obj: DataPayload, prefix: string): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = `${prefix}.${key}`;
    keys.push(fullKey);
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...flattenKeys(value as DataPayload, fullKey));
    }
    if (Array.isArray(value)) {
      value.forEach((_, i) => {
        keys.push(`${fullKey}[${i}]`);
        if (value[i] && typeof value[i] === 'object') {
          keys.push(...flattenKeys(value[i] as DataPayload, `${fullKey}[${i}]`));
        }
      });
    }
  }
  return keys;
}

/** Get a preview of a nested value */
function getNestedValuePreview(data: DataPayload, path: string): string {
  const value = resolveDataPath(data, path);
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return `"${value.slice(0, 20)}"`;
  if (typeof value === 'object') return JSON.stringify(value).slice(0, 30);
  return String(value);
}

/** Resolve a data path like "data.user.name" against data object */
function resolveDataPath(data: DataPayload, path: string): unknown {
  // Remove leading "data." prefix
  const stripped = path.startsWith('data.') ? path.slice(5) : path;
  const parts = stripped.split(/[.[]]+/).filter(Boolean);
  let current: unknown = data;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (typeof current === 'object') {
      current = (current as DataPayload)[part];
    } else {
      return undefined;
    }
  }
  return current;
}

/** Resolve {{data.xxx}} expressions — returns raw value when the entire string is one expression */
function resolveExpression(expression: string, data: DataPayload): unknown {
  const fullMatch = expression.match(/^\{\{(.*?)\}\}$/);
  if (fullMatch) {
    const value = resolveDataPath(data, fullMatch[1].trim());
    return value !== undefined ? value : null;
  }
  const regex = /\{\{(.*?)\}\}/g;
  let hasExpr = false;
  const result = expression.replace(regex, (_, path: string) => {
    hasExpr = true;
    const value = resolveDataPath(data, path.trim());
    return value !== undefined ? formatPreviewValue(value) : `{{${path.trim()}}}`;
  });
  return hasExpr ? result : null;
}

function formatPreviewValue(value: unknown): string {
  if (Array.isArray(value)) {
    return `数组 (${value.length} 项)`;
  }
  if (value && typeof value === 'object') {
    const keys = Object.keys(value as DataPayload);
    return `对象 {${keys.slice(0, 3).join(', ')}${keys.length > 3 ? '…' : ''}}`;
  }
  return String(value ?? '');
}

function formatPreviewTitle(value: unknown): string {
  if (Array.isArray(value)) {
    try { return JSON.stringify(value, null, 2).slice(0, 500); } catch { return `Array(${value.length})`; }
  }
  if (value && typeof value === 'object') {
    try { return JSON.stringify(value, null, 2).slice(0, 500); } catch { return String(value); }
  }
  return String(value ?? '');
}

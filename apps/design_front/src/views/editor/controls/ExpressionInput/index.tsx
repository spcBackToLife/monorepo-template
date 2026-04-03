import { useState, useRef, useEffect, useMemo } from 'react';
import { observer } from 'mobx-react-lite';
import { editorStore } from '@/stores/editor';

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

  // Get active dataset keys for autocompletion
  const screen = editorStore.activeScreen;
  const activeDataSet = useMemo(() => {
    if (!screen) return null;
    const ds = (screen.dataSets ?? []).find((d) => d.id === screen.activeDataSetId);
    return ds ?? null;
  }, [screen?.dataSets, screen?.activeDataSetId]);

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
        <div className="mt-0.5 text-[10px] text-gray-500 font-mono truncate px-1" title={String(resolvedPreview)}>
          → {String(resolvedPreview)}
        </div>
      )}
    </div>
  );
});

// ===== Utility functions =====

/** Flatten a nested object into dot-separated key paths */
function flattenKeys(obj: Record<string, unknown>, prefix: string): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = `${prefix}.${key}`;
    keys.push(fullKey);
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...flattenKeys(value as Record<string, unknown>, fullKey));
    }
    if (Array.isArray(value)) {
      value.forEach((_, i) => {
        keys.push(`${fullKey}[${i}]`);
        if (value[i] && typeof value[i] === 'object') {
          keys.push(...flattenKeys(value[i] as Record<string, unknown>, `${fullKey}[${i}]`));
        }
      });
    }
  }
  return keys;
}

/** Get a preview of a nested value */
function getNestedValuePreview(data: Record<string, unknown>, path: string): string {
  const value = resolveDataPath(data, path);
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return `"${value.slice(0, 20)}"`;
  if (typeof value === 'object') return JSON.stringify(value).slice(0, 30);
  return String(value);
}

/** Resolve a data path like "data.user.name" against data object */
function resolveDataPath(data: Record<string, unknown>, path: string): unknown {
  // Remove leading "data." prefix
  const stripped = path.startsWith('data.') ? path.slice(5) : path;
  const parts = stripped.split(/[.\[\]]+/).filter(Boolean);
  let current: unknown = data;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return current;
}

/** Resolve {{data.xxx}} expressions in a string */
function resolveExpression(expression: string, data: Record<string, unknown>): string | null {
  const regex = /\{\{(.*?)\}\}/g;
  let hasExpression = false;
  const result = expression.replace(regex, (_, path: string) => {
    hasExpression = true;
    const trimmed = path.trim();
    const value = resolveDataPath(data, trimmed);
    return value !== undefined ? String(value) : `{{${trimmed}}}`;
  });
  return hasExpression ? result : null;
}

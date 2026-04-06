import { useState, useRef, useCallback, useEffect } from 'react';

interface NumericInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  unit?: string;
  units?: string[];
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  disabled?: boolean;
  isOverridden?: boolean;
}

/**
 * Task 1.6.2 — NumericInput
 * Input with drag-to-adjust behavior and optional unit selector.
 */
export function NumericInput({
  value,
  onChange,
  label,
  unit: defaultUnit = 'px',
  units = ['px', '%', 'em', 'rem', 'auto'],
  min,
  max,
  step = 1,
  placeholder,
  disabled = false,
  isOverridden = false,
}: NumericInputProps) {
  const [localValue, setLocalValue] = useState(value);
  const [selectedUnit, setSelectedUnit] = useState(() => {
    const match = value.match(/(px|%|em|rem|vw|vh|auto)$/);
    return match ? match[1] : defaultUnit;
  });
  const [showUnits, setShowUnits] = useState(false);
  const isDragging = useRef(false);
  const dragStartY = useRef(0);
  const dragStartValue = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalValue(value);
    const match = value.match(/(px|%|em|rem|vw|vh|auto)$/);
    if (match) setSelectedUnit(match[1]);
  }, [value]);

  const parseNumeric = (v: string): number => {
    const num = parseFloat(v);
    return isNaN(num) ? 0 : num;
  };

  const clamp = (v: number): number => {
    let result = v;
    if (min !== undefined) result = Math.max(min, result);
    if (max !== undefined) result = Math.min(max, result);
    return result;
  };

  const commit = (v: string) => {
    const trimmed = v.trim();
    if (trimmed === '' || trimmed === 'auto') {
      onChange(trimmed);
      return;
    }
    const num = parseFloat(trimmed);
    if (!isNaN(num)) {
      const clamped = clamp(num);
      onChange(`${clamped}${selectedUnit}`);
    } else {
      onChange(trimmed);
    }
  };

  const handleLabelMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return;
      e.preventDefault();
      isDragging.current = true;
      dragStartY.current = e.clientY;
      dragStartValue.current = parseNumeric(localValue);

      const onMouseMove = (me: MouseEvent) => {
        if (!isDragging.current) return;
        const delta = (dragStartY.current - me.clientY) * step;
        const newVal = clamp(dragStartValue.current + delta);
        const str = `${Math.round(newVal * 100) / 100}`;
        setLocalValue(str);
        onChange(`${newVal}${selectedUnit}`);
      };

      const onMouseUp = () => {
        isDragging.current = false;
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        document.body.style.cursor = '';
      };

      document.body.style.cursor = 'ns-resize';
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    },
    [disabled, localValue, selectedUnit, step, min, max, onChange],
  );

  return (
    <div className="flex items-center gap-1 text-xs relative">
      {label && (
        <span
          className="text-gray-500 w-8 text-right select-none cursor-ns-resize flex-shrink-0"
          onMouseDown={handleLabelMouseDown}
          title={`拖拽调整 ${label}`}
        >
          {label}
        </span>
      )}
      <div className="flex items-center flex-1 border border-gray-200 rounded h-6 focus-within:border-blue-400 transition-colors">
        <input
          ref={inputRef}
          type="text"
          className="flex-1 w-full h-full px-1.5 bg-transparent outline-none text-xs text-gray-800 min-w-0"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={() => commit(localValue)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              commit(localValue);
              inputRef.current?.blur();
            }
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              const num = clamp(parseNumeric(localValue) + step);
              const str = `${num}`;
              setLocalValue(str);
              onChange(`${num}${selectedUnit}`);
            }
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              const num = clamp(parseNumeric(localValue) - step);
              const str = `${num}`;
              setLocalValue(str);
              onChange(`${num}${selectedUnit}`);
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
        />
        <div className="relative">
          <button
            className="h-full px-1 text-gray-400 hover:text-gray-600 text-[10px] border-l border-gray-200"
            onClick={() => setShowUnits(!showUnits)}
            type="button"
          >
            {selectedUnit}
          </button>
          {showUnits && (
            <div className="absolute top-full right-0 mt-0.5 bg-white border border-gray-200 rounded shadow-lg z-50 min-w-[48px]">
              {units.map((u) => (
                <button
                  key={u}
                  type="button"
                  className={`w-full px-2 py-0.5 text-left text-xs hover:bg-blue-50 ${
                    u === selectedUnit ? 'text-blue-500 bg-blue-50' : 'text-gray-600'
                  }`}
                  onClick={() => {
                    setSelectedUnit(u);
                    setShowUnits(false);
                    if (localValue && localValue !== 'auto') {
                      const num = parseNumeric(localValue);
                      onChange(`${num}${u}`);
                    }
                  }}
                >
                  {u}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {isOverridden && (
        <div
          className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0"
          title="此属性已在当前状态中被覆盖"
        />
      )}
    </div>
  );
}

import { useState, useCallback } from 'react';

interface BoxModelEditorProps {
  margin: { top: string; right: string; bottom: string; left: string };
  padding: { top: string; right: string; bottom: string; left: string };
  onMarginChange: (side: string, value: string) => void;
  onPaddingChange: (side: string, value: string) => void;
}

/**
 * Task 1.6.6 — BoxModelEditor
 * Interactive margin/padding box model diagram.
 */
export function BoxModelEditor({ margin, padding, onMarginChange, onPaddingChange }: BoxModelEditorProps) {
  return (
    <div className="relative w-full select-none" style={{ aspectRatio: '5 / 3' }}>
      {/* Margin layer (outermost) */}
      <div className="absolute inset-0 border-2 border-dashed border-orange-300 bg-orange-50/30 rounded">
        <span className="absolute top-0 left-1 text-[9px] text-orange-400 font-medium">margin</span>
        {/* Top margin */}
        <BoxInput
          className="absolute top-0.5 left-1/2 -translate-x-1/2"
          value={margin.top}
          onChange={(v) => onMarginChange('marginTop', v)}
        />
        {/* Right margin */}
        <BoxInput
          className="absolute right-0.5 top-1/2 -translate-y-1/2"
          value={margin.right}
          onChange={(v) => onMarginChange('marginRight', v)}
        />
        {/* Bottom margin */}
        <BoxInput
          className="absolute bottom-0.5 left-1/2 -translate-x-1/2"
          value={margin.bottom}
          onChange={(v) => onMarginChange('marginBottom', v)}
        />
        {/* Left margin */}
        <BoxInput
          className="absolute left-0.5 top-1/2 -translate-y-1/2"
          value={margin.left}
          onChange={(v) => onMarginChange('marginLeft', v)}
        />

        {/* Padding layer (inner) */}
        <div className="absolute inset-5 border-2 border-dashed border-green-300 bg-green-50/30 rounded">
          <span className="absolute top-0 left-1 text-[9px] text-green-500 font-medium">padding</span>
          {/* Top padding */}
          <BoxInput
            className="absolute top-0.5 left-1/2 -translate-x-1/2"
            value={padding.top}
            onChange={(v) => onPaddingChange('paddingTop', v)}
          />
          {/* Right padding */}
          <BoxInput
            className="absolute right-0.5 top-1/2 -translate-y-1/2"
            value={padding.right}
            onChange={(v) => onPaddingChange('paddingRight', v)}
          />
          {/* Bottom padding */}
          <BoxInput
            className="absolute bottom-0.5 left-1/2 -translate-x-1/2"
            value={padding.bottom}
            onChange={(v) => onPaddingChange('paddingBottom', v)}
          />
          {/* Left padding */}
          <BoxInput
            className="absolute left-0.5 top-1/2 -translate-y-1/2"
            value={padding.left}
            onChange={(v) => onPaddingChange('paddingLeft', v)}
          />

          {/* Content box */}
          <div className="absolute inset-4 border border-blue-200 bg-blue-50/50 rounded flex items-center justify-center">
            <span className="text-[10px] text-blue-400">content</span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface BoxInputProps {
  className: string;
  value: string;
  onChange: (value: string) => void;
}

function BoxInput({ className, value, onChange }: BoxInputProps) {
  const [editing, setEditing] = useState(false);
  const [localVal, setLocalVal] = useState(value);

  const displayVal = value ? value.replace(/px$/, '') : '-';

  const commit = useCallback(() => {
    setEditing(false);
    const trimmed = localVal.trim();
    if (!trimmed || trimmed === '-') {
      onChange('');
      return;
    }
    const num = parseFloat(trimmed);
    if (!isNaN(num)) {
      onChange(`${num}px`);
    } else {
      onChange(trimmed);
    }
  }, [localVal, onChange]);

  if (editing) {
    return (
      <input
        className={`${className} w-8 h-4 text-[10px] text-center bg-white border border-blue-400 rounded outline-none z-10`}
        value={localVal}
        autoFocus
        onChange={(e) => setLocalVal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') setEditing(false);
        }}
      />
    );
  }

  return (
    <span
      className={`${className} text-[10px] text-gray-500 cursor-pointer hover:text-blue-500 px-0.5`}
      onClick={() => {
        setLocalVal(value ? value.replace(/px$/, '') : '');
        setEditing(true);
      }}
    >
      {displayVal}
    </span>
  );
}

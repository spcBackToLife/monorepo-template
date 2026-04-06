import { useState, useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { editorStore } from '@/stores/editor';

interface ColorPickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  showOpacity?: boolean;
  isOverridden?: boolean;
}

type ColorMode = 'hex' | 'rgb';

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace('#', '');
  if (clean.length !== 6 && clean.length !== 3) return null;
  const full = clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean;
  const num = parseInt(full, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Task 1.6.3 — ColorPicker
 * Color input with hex/rgb mode and opacity.
 */
export const ColorPicker = observer(function ColorPicker({ value, onChange, label, showOpacity = true, isOverridden = false }: ColorPickerProps) {
  const [mode, setMode] = useState<ColorMode>('hex');
  const [localHex, setLocalHex] = useState(value || '#000000');
  const [opacity, setOpacity] = useState(100);
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const nativeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value) {
      // Parse rgba/rgb/hex
      const rgbaMatch = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
      if (rgbaMatch) {
        const hex = rgbToHex(+rgbaMatch[1], +rgbaMatch[2], +rgbaMatch[3]);
        setLocalHex(hex);
        if (rgbaMatch[4]) setOpacity(Math.round(parseFloat(rgbaMatch[4]) * 100));
      } else if (value.startsWith('#')) {
        setLocalHex(value.slice(0, 7));
      }
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    };
    if (showPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showPicker]);

  const commitColor = (hex: string, op: number) => {
    if (op < 100) {
      const rgb = hexToRgb(hex);
      if (rgb) {
        const v = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${op / 100})`;
        onChange(v);
        editorStore.addRecentColor(v);
        return;
      }
    }
    onChange(hex);
    editorStore.addRecentColor(hex);
  };

  const rgb = hexToRgb(localHex);

  return (
    <div className="w-full">
      <div className="flex items-center gap-1.5 text-xs relative">
        {label && <span className="text-gray-500 w-8 text-right flex-shrink-0">{label}</span>}

        {/* Color swatch */}
        <button
          type="button"
          className="w-6 h-6 rounded border border-gray-200 flex-shrink-0 cursor-pointer"
          style={{ backgroundColor: localHex }}
          onClick={() => nativeRef.current?.click()}
        />

        {/* Hidden native color input for system picker */}
        <input
          ref={nativeRef}
          type="color"
          className="sr-only"
          value={localHex}
          onChange={(e) => {
            setLocalHex(e.target.value);
            commitColor(e.target.value, opacity);
          }}
        />

        {/* Hex/RGB input */}
        <div className="flex items-center flex-1 border border-gray-200 rounded h-6 focus-within:border-blue-400">
          {mode === 'hex' ? (
            <input
              type="text"
              className="flex-1 w-full h-full px-1.5 bg-transparent outline-none text-xs text-gray-800 min-w-0"
              value={localHex}
              onChange={(e) => setLocalHex(e.target.value)}
              onBlur={() => commitColor(localHex, opacity)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitColor(localHex, opacity);
              }}
            />
          ) : (
            <div className="flex items-center gap-0.5 px-1 flex-1">
              {rgb && (['r', 'g', 'b'] as const).map((ch) => (
                <input
                  key={ch}
                  type="number"
                  min={0}
                  max={255}
                  className="w-8 h-full bg-transparent outline-none text-xs text-gray-800 text-center"
                  value={rgb[ch]}
                  onChange={(e) => {
                    const v = Math.min(255, Math.max(0, parseInt(e.target.value) || 0));
                    const newRgb = { ...rgb, [ch]: v };
                    const newHex = rgbToHex(newRgb.r, newRgb.g, newRgb.b);
                    setLocalHex(newHex);
                    commitColor(newHex, opacity);
                  }}
                />
              ))}
            </div>
          )}
          <button
            type="button"
            className="h-full px-1 text-gray-400 hover:text-gray-600 text-[10px] border-l border-gray-200"
            onClick={() => setMode(mode === 'hex' ? 'rgb' : 'hex')}
          >
            {mode.toUpperCase()}
          </button>
        </div>

        {/* Opacity */}
        {showOpacity && (
          <div className="flex items-center border border-gray-200 rounded h-6 w-14">
            <input
              type="number"
              min={0}
              max={100}
              className="w-full h-full px-1 bg-transparent outline-none text-xs text-gray-800 text-center"
              value={opacity}
              onChange={(e) => {
                const v = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                setOpacity(v);
                commitColor(localHex, v);
              }}
            />
            <span className="text-gray-400 text-[10px] pr-1">%</span>
          </div>
        )}
        {isOverridden && (
          <div
            className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0"
            title="此属性已在当前状态中被覆盖"
          />
        )}
      </div>

      {/* Project palette */}
      <div className="mt-1">
        <div className="text-[9px] text-gray-400 mb-0.5">项目色板</div>
        <div className="flex flex-wrap gap-0.5">
          {editorStore.projectColorPalette.map((c) => (
            <button
              key={c}
              type="button"
              className="w-4 h-4 rounded-sm border border-gray-200 hover:ring-1 hover:ring-blue-400"
              style={{ backgroundColor: c }}
              onClick={() => { onChange(c); editorStore.addRecentColor(c); }}
              title={c}
            />
          ))}
        </div>
      </div>
      {/* Recent colors */}
      {editorStore.recentColors.length > 0 && (
        <div className="mt-1">
          <div className="text-[9px] text-gray-400 mb-0.5">最近使用</div>
          <div className="flex flex-wrap gap-0.5">
            {editorStore.recentColors.map((c) => (
              <button
                key={c}
                type="button"
                className="w-4 h-4 rounded-sm border border-gray-200 hover:ring-1 hover:ring-blue-400"
                style={{ backgroundColor: c }}
                onClick={() => onChange(c)}
                title={c}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

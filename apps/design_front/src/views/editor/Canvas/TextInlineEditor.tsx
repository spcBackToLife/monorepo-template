import { useEffect, useRef, useState, useCallback, useLayoutEffect, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { observer } from 'mobx-react-lite';
import type { ComponentNode } from '@globallink/design-schema';
import { findNodeInScreens } from '@globallink/design-operations';
import { editorStore } from '@/stores/editor';
import './text-inline-editor.css';

type Box = { left: number; top: number; width: number; height: number };

/** 画布「绝对定位居中文案」类（双击插入的段落等） */
function isCaptionFlexBlock(n: ComponentNode): boolean {
  if (n.type !== 'p' && n.type !== 'h1' && n.type !== 'h2' && n.type !== 'h3') return false;
  const s = n.styles ?? {};
  if (s.position !== 'absolute') return false;
  const ta = s.textAlign;
  const centered =
    ta === 'center' || (typeof ta === 'string' && ta.toLowerCase() === 'center');
  const captionVert =
    s.top === '50%' &&
    typeof s.transform === 'string' &&
    /translateY\s*\(\s*-?50%\s*\)/.test(s.transform);
  return centered || captionVert;
}

/** 已有 column flex 居中则跳过；否则保存时再写一层，避免只选中时贴顶 */
function captionFlexNeedsPatch(n: ComponentNode): boolean {
  if (!isCaptionFlexBlock(n)) return false;
  const s = n.styles ?? {};
  const ok =
    (s.display === 'flex' || s.display === 'inline-flex') &&
    s.flexDirection === 'column' &&
    s.justifyContent === 'center' &&
    s.alignItems === 'center';
  return !ok;
}

/** 仅同步横向内边距与字体；单行时 line-height = 节点高度，文字在框内垂直居中 */
function readTypoFromElement(el: HTMLElement, boxHeight: number, textHasNewline: boolean): CSSProperties {
  const cs = getComputedStyle(el);

  const base: CSSProperties = {
    fontFamily: cs.fontFamily,
    fontSize: cs.fontSize,
    fontWeight: cs.fontWeight,
    fontStyle: cs.fontStyle,
    letterSpacing: cs.letterSpacing,
    wordSpacing: cs.wordSpacing,
    color: cs.color,
    textAlign: cs.textAlign as CSSProperties['textAlign'],
    textTransform: cs.textTransform as CSSProperties['textTransform'],
    paddingLeft: cs.paddingLeft,
    paddingRight: cs.paddingRight,
    paddingTop: 0,
    paddingBottom: 0,
    margin: 0,
  };

  if (textHasNewline) {
    return {
      ...base,
      lineHeight: cs.lineHeight,
    };
  }

  return {
    ...base,
    lineHeight: `${boxHeight}px`,
  };
}

/**
 * W2：文本类 primitive 双击后的行内编辑（写入 updateComponentProps.text）
 */
export const TextInlineEditor = observer(function TextInlineEditor({
  nodeId,
  containerRef,
  onClose,
}: {
  nodeId: string;
  containerRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
}) {
  const node = findNodeInScreens(editorStore.screens, nodeId);
  const [text, setText] = useState(String(node?.props?.text ?? ''));
  const [box, setBox] = useState<Box | null>(null);
  const [typo, setTypo] = useState<CSSProperties>({});
  const taRef = useRef<HTMLTextAreaElement>(null);
  const skipSaveRef = useRef(false);

  const textHasNewline = text.includes('\n');

  useEffect(() => {
    setText(String(node?.props?.text ?? ''));
  }, [nodeId, node?.props?.text]);

  /**
   * 透明 textarea 叠在画布 DOM 上时，底层仍会渲染原文 → 重影。
   * 编辑期间隐藏源节点文字，仅保留占位尺寸与选中框。
   */
  useEffect(() => {
    const mark = () => {
      const el = containerRef.current?.querySelector(`[data-node-id="${nodeId}"]`) as HTMLElement | null;
      if (el) el.setAttribute('data-text-inline-editing', 'true');
    };
    mark();
    const id = requestAnimationFrame(mark);
    return () => {
      cancelAnimationFrame(id);
      const el = containerRef.current?.querySelector(`[data-node-id="${nodeId}"]`) as HTMLElement | null;
      el?.removeAttribute('data-text-inline-editing');
    };
  }, [nodeId, containerRef]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      taRef.current?.focus();
      taRef.current?.select();
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  const measure = useCallback(() => {
    const el = containerRef.current?.querySelector(`[data-node-id="${nodeId}"]`) as HTMLElement | null;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const w = r.width;
    const h = r.height;
    setBox({
      left: r.left,
      top: r.top,
      /** 与节点外接盒同宽，禁止强行 min-width 撑破父级 */
      width: Math.max(1, w),
      height: Math.max(1, h),
    });
    setTypo(readTypoFromElement(el, Math.max(1, h), textHasNewline));
  }, [nodeId, containerRef, textHasNewline]);

  useEffect(() => {
    measure();
    const el = containerRef.current?.querySelector(`[data-node-id="${nodeId}"]`) as HTMLElement | null;
    const ro = el ? new ResizeObserver(() => measure()) : null;
    if (el && ro) ro.observe(el);
    window.addEventListener('scroll', measure, true);
    window.addEventListener('resize', measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener('scroll', measure, true);
      window.removeEventListener('resize', measure);
    };
  }, [nodeId, containerRef, measure]);

  /** 高度严格等于节点包围盒，不随 scrollHeight 增高，避免比选中框高一截 */
  useLayoutEffect(() => {
    const ta = taRef.current;
    if (!ta || !box) return;
    ta.style.height = `${box.height}px`;
    ta.style.maxHeight = `${box.height}px`;
    ta.style.minHeight = `${box.height}px`;
  }, [text, box]);

  const save = useCallback(() => {
    if (!node || skipSaveRef.current) return;
    editorStore.execute({
      type: 'componentProps.update',
      params: { nodeId, props: { text } },
    });
    /** 编辑时用整高 line-height 居中，落库后须 column flex，否则只选中时又回到贴顶 */
    if (captionFlexNeedsPatch(node)) {
      editorStore.execute({
        type: 'style.update',
        params: {
          nodeId,
          styles: {
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            lineHeight: 'normal',
          },
        },
      });
    }
    onClose();
  }, [node, nodeId, text, onClose]);

  if (!node || !box) return null;

  return createPortal(
    <textarea
      ref={taRef}
      className="text-inline-editor"
      style={{
        left: box.left,
        top: box.top,
        width: box.width,
        height: box.height,
        minHeight: box.height,
        maxHeight: box.height,
        zIndex: 10000,
        ...typo,
        boxSizing: 'border-box',
      }}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        if (skipSaveRef.current) {
          skipSaveRef.current = false;
          return;
        }
        save();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          skipSaveRef.current = true;
          onClose();
        }
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          save();
        }
      }}
    />,
    document.body,
  );
});

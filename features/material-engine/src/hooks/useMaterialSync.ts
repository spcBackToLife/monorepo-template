/**
 * useMaterialSync — 素材编辑器 WebSocket 同步 Hook
 *
 * 接收 `me:operation` 类型化操作事件，
 * 用 MaterialOperationExecutor 重放操作更新本地 Schema。
 *
 * 接收 MaterialOperation → Executor.execute() → Schema 更新 → SVG 自动重渲染
 */
import { useEffect, useRef, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { MaterialOperation } from '@globallink/material-operations';
import { useMaterialEditor } from '../context/MaterialEditorContext';

interface MaterialOperationEnvelope {
  fingerprint: string;
  projectId: string;
  materialId: string;
  operation: MaterialOperation;
  seq: number;
  author: string;
  timestamp: string;
}

interface UseMaterialSyncOptions {
  /** WebSocket 基础 URL */
  wsBase?: string;
  /** 项目 ID */
  projectId: string;
  /** 素材工程 ID */
  materialId: string;
  /** 是否启用 */
  enabled?: boolean;
}

export function useMaterialSync({
  wsBase = 'http://127.0.0.1:3001',
  projectId,
  materialId,
  enabled = true,
}: UseMaterialSyncOptions) {
  const { execute, setProject } = useMaterialEditor();

  const socketRef = useRef<Socket | null>(null);
  const outgoingFingerprintsRef = useRef(new Set<string>());
  const lastSeqRef = useRef(0);

  // ===== 连接 =====

  useEffect(() => {
    if (!enabled || !projectId || !materialId) return;

    const socket = io(`${wsBase}/ws/material-editor`, {
      transports: ['websocket'],
      timeout: 5000,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 8000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[MaterialSync] Connected');

      // 订阅
      socket.emit('me:subscribe', { projectId, materialId });

      // 断线重连：发送 handshake 获取遗漏的操作
      if (lastSeqRef.current > 0) {
        socket.emit('me:handshake', { lastSeq: lastSeqRef.current });
      }
    });

    socket.on('disconnect', () => {
      console.log('[MaterialSync] Disconnected');
    });

    // 接收操作
    socket.on('me:operation', (envelope: MaterialOperationEnvelope) => {
      // Echo dedup
      if (
        envelope.fingerprint &&
        outgoingFingerprintsRef.current.has(envelope.fingerprint)
      ) {
        outgoingFingerprintsRef.current.delete(envelope.fingerprint);
        lastSeqRef.current = Math.max(lastSeqRef.current, envelope.seq);
        return;
      }

      // 执行操作更新本地 Schema
      execute(envelope.operation);
      lastSeqRef.current = Math.max(lastSeqRef.current, envelope.seq);
    });

    // 接收 undo 事件
    socket.on(
      'me:undo',
      (data: { projectId: string; materialId: string; seq: number }) => {
        // undo 后需要全量刷新 Schema
        lastSeqRef.current = Math.max(lastSeqRef.current, data.seq);
        // 请求完整 Schema
        fetchSchema(wsBase, projectId, materialId).then((schema) => {
          if (schema) setProject(schema);
        });
      },
    );

    socket.on('connect_error', (err: Error) => {
      console.warn('[MaterialSync] Connection error:', err.message);
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [enabled, wsBase, projectId, materialId, execute, setProject]);

  // ===== 发送操作 =====

  const sendOperation = useCallback(
    (operation: MaterialOperation, fingerprint?: string) => {
      if (!socketRef.current?.connected) return;

      const fp =
        fingerprint ??
        `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      outgoingFingerprintsRef.current.add(fp);

      // 30s 后自动清理
      setTimeout(() => outgoingFingerprintsRef.current.delete(fp), 30000);

      socketRef.current.emit('me:operation', {
        materialId,
        operation,
        fingerprint: fp,
      });
    },
    [materialId],
  );

  const sendBatch = useCallback(
    (operations: MaterialOperation[], fingerprints?: string[]) => {
      if (!socketRef.current?.connected) return;

      const fps = operations.map(
        (_, i) =>
          fingerprints?.[i] ??
          `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      );

      for (const fp of fps) {
        outgoingFingerprintsRef.current.add(fp);
        setTimeout(() => outgoingFingerprintsRef.current.delete(fp), 30000);
      }

      socketRef.current.emit('me:batch', {
        materialId,
        operations,
        fingerprints: fps,
      });
    },
    [materialId],
  );

  return {
    sendOperation,
    sendBatch,
    isConnected: socketRef.current?.connected ?? false,
  };
}

// ===== 辅助：获取完整 Schema =====

async function fetchSchema(
  baseUrl: string,
  projectId: string,
  materialId: string,
): Promise<any | null> {
  try {
    const res = await fetch(
      `${baseUrl}/api/projects/${projectId}/materials/${materialId}/schema`,
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

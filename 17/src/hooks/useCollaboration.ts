import { useState, useEffect, useRef, useCallback } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { MonacoBinding } from 'y-monaco';
import type { editor } from 'monaco-editor';
import type { Socket } from 'socket.io-client';
import { getSocket } from '@/lib/socket';
import type { Collaborator } from '@/shared/types';

interface UseCollaborationOptions {
  roomId: string;
  snippetId?: string;
  initialCode?: string;
  userId?: string;
}

interface UseCollaborationReturn {
  isConnected: boolean;
  isJoined: boolean;
  collaborators: Collaborator[];
  error: string | null;
  localCollaborator: Collaborator | null;
  ydoc: Y.Doc | null;
  ytext: Y.Text | null;
  joinRoom: () => Promise<void>;
  leaveRoom: () => void;
  sendCursorUpdate: (cursor: Collaborator['cursor']) => void;
  bindMonacoEditor: (editorInstance: editor.IStandaloneCodeEditor) => MonacoBinding | null;
  requestSync: () => void;
}

const CURSOR_DEBOUNCE_MS = 50;

export function useCollaboration({
  roomId,
  initialCode,
  userId,
}: UseCollaborationOptions): UseCollaborationReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [localCollaborator, setLocalCollaborator] = useState<Collaborator | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const ytextRef = useRef<Y.Text | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);
  const cursorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCursorRef = useRef<Collaborator['cursor'] | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const cleanup = useCallback(() => {
    if (bindingRef.current) {
      bindingRef.current.destroy();
      bindingRef.current = null;
    }

    if (providerRef.current) {
      providerRef.current.destroy();
      providerRef.current = null;
    }

    if (ydocRef.current) {
      ydocRef.current.destroy();
      ydocRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.off('collab:joined');
      socketRef.current.off('collab:user-joined');
      socketRef.current.off('collab:user-left');
      socketRef.current.off('collab:cursor-updated');
      socketRef.current.off('collab:doc-update');
      socketRef.current.off('collab:sync-state');
      socketRef.current.off('collab:error');
      socketRef.current.off('connect');
      socketRef.current.off('disconnect');
      socketRef.current.off('connect_error');
    }

    if (cursorTimeoutRef.current) {
      clearTimeout(cursorTimeoutRef.current);
      cursorTimeoutRef.current = null;
    }

    ytextRef.current = null;
    setIsJoined(false);
    setLocalCollaborator(null);
    setCollaborators([]);
  }, []);

  const joinRoom = useCallback(async () => {
    try {
      setError(null);

      if (!roomId) {
        throw new Error('Room ID is required');
      }

      cleanup();

      const socket = getSocket();
      socketRef.current = socket;

      const ydoc = new Y.Doc();
      ydocRef.current = ydoc;

      const ytext = ydoc.getText('code');
      ytextRef.current = ytext;

      socket.on('connect', () => {
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
      });

      socket.on('disconnect', (reason) => {
        setIsConnected(false);
        if (reason === 'io server disconnect') {
          socket.connect();
        }
      });

      socket.on('connect_error', () => {
        reconnectAttemptsRef.current++;
        if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          setError('Connection failed after multiple attempts');
        }
      });

      socket.on('collab:joined', (data) => {
        try {
          const docState = new Uint8Array(data.docState);
          Y.applyUpdate(ydoc, docState, 'server');

          const local = data.collaborators.find((c: Collaborator) => c.userId === userId);
          if (local) {
            setLocalCollaborator(local);
          }

          setCollaborators(data.collaborators);
          setIsJoined(true);
          setError(null);
          reconnectAttemptsRef.current = 0;
        } catch (err) {
          setError('Failed to initialize document');
          console.error('Error applying initial document state:', err);
        }
      });

      socket.on('collab:user-joined', (collaborator) => {
        setCollaborators((prev) => {
          const exists = prev.some((c) => c.userId === collaborator.userId);
          if (exists) {
            return prev.map((c) =>
              c.userId === collaborator.userId ? collaborator : c
            );
          }
          return [...prev, collaborator];
        });
      });

      socket.on('collab:user-left', (userIdLeft) => {
        setCollaborators((prev) => prev.filter((c) => c.userId !== userIdLeft));
      });

      socket.on('collab:cursor-updated', (collaborator) => {
        setCollaborators((prev) =>
          prev.map((c) =>
            c.userId === collaborator.userId ? collaborator : c
          )
        );
      });

      socket.on('collab:doc-update', (update) => {
        try {
          const updateArray = new Uint8Array(update);
          Y.applyUpdate(ydoc, updateArray, 'remote');
        } catch (err) {
          console.error('Error applying document update:', err);
        }
      });

      socket.on('collab:sync-state', (docState) => {
        try {
          const updateArray = new Uint8Array(docState);
          Y.applyUpdate(ydoc, updateArray, 'server');
        } catch (err) {
          console.error('Error applying sync state:', err);
        }
      });

      socket.on('collab:error', (errMessage) => {
        setError(errMessage);
      });

      ydoc.on('update', (update: Uint8Array, origin: unknown) => {
        if (origin !== 'server' && origin !== 'remote' && socket.connected) {
          socket.emit('collab:doc-update', Array.from(update));
        }
      });

      socket.emit('collab:join', { roomId, initialCode });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to join room';
      setError(errorMessage);
      throw err;
    }
  }, [roomId, initialCode, userId, cleanup]);

  const leaveRoom = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('collab:leave');
    }
    cleanup();
  }, [cleanup]);

  const sendCursorUpdate = useCallback(
    (cursor: Collaborator['cursor']) => {
      if (!socketRef.current || !socketRef.current.connected || !isJoined) return;

      lastCursorRef.current = cursor;

      if (cursorTimeoutRef.current) {
        clearTimeout(cursorTimeoutRef.current);
      }

      cursorTimeoutRef.current = setTimeout(() => {
        if (lastCursorRef.current && socketRef.current) {
          socketRef.current.emit('collab:cursor', lastCursorRef.current);
        }
      }, CURSOR_DEBOUNCE_MS);
    },
    [isJoined]
  );

  const bindMonacoEditor = useCallback(
    (editorInstance: editor.IStandaloneCodeEditor): MonacoBinding | null => {
      if (!ydocRef.current || !ytextRef.current) {
        console.warn('Document not initialized, cannot bind editor');
        return null;
      }

      if (bindingRef.current) {
        bindingRef.current.destroy();
      }

      const model = editorInstance.getModel();
      if (!model) {
        console.warn('Editor model not available');
        return null;
      }

      const binding = new MonacoBinding(
        ytextRef.current,
        model,
        new Set([editorInstance]),
        providerRef.current?.awareness
      );

      bindingRef.current = binding;
      return binding;
    },
    []
  );

  const requestSync = useCallback(() => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('collab:request-sync');
    }
  }, []);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    isConnected,
    isJoined,
    collaborators,
    error,
    localCollaborator,
    ydoc: ydocRef.current,
    ytext: ytextRef.current,
    joinRoom,
    leaveRoom,
    sendCursorUpdate,
    bindMonacoEditor,
    requestSync,
  };
}

export default useCollaboration;

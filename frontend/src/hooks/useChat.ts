/**
 * useChat — React hook managing the active chat session and chat list.
 *
 * Responsibilities:
 *   • CRUD operations on chat sessions
 *   • Loading / saving sessions via chatStorage (IndexedDB + localStorage)
 *   • Sending messages through the backend chat endpoint
 *   • Tracking loading / error state
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { ChatSession, ChatSessionMeta, DiagramType } from '../types/chat';
import type { ValidationResult } from '../utils/api';
import { createChatSession, createChatMessage } from '../types/chat';
import {
  listChatSessions,
  loadChatSession,
  saveChatSession,
  deleteChatSession as deleteSessionStorage,
  renameChatSession as renameSessionStorage,
  getCurrentChatId,
  setCurrentChatId,
} from '../utils/chatStorage';
import { sendChatMessage, classifyDiagramType } from '../utils/api';

import { useUIStore } from '../store/uiStore';

export interface UseChatReturn {
  /** Metadata list of all chats (for sidebar). */
  chatList: ChatSessionMeta[];
  /** Currently active chat session (full data). */
  activeChat: ChatSession | null;
  /** True while waiting for the LLM response. */
  isLoading: boolean;
  /** Last error message (null on success). */
  error: string | null;

  /** Create a new empty chat and make it active. */
  createChat: (title?: string) => Promise<ChatSession>;
  /** Open an existing chat by ID. */
  openChat: (id: string) => Promise<void>;
  /** Delete a chat session. */
  deleteChat: (id: string) => Promise<void>;
  /** Rename a chat session. */
  renameChat: (id: string, title: string) => Promise<void>;
  /** Send a user message, get assistant response, update diagram code. */
  sendMessage: (content: string) => Promise<void>;
  /** Regenerate the last assistant response. */
  regenerateLastResponse: () => Promise<void>;
  /** Update diagram code from visual editor (does NOT trigger LLM). */
  updateDiagramCode: (code: string) => Promise<void>;
  /** Store latest visual validation result for the current diagram. */
  updateValidationResult: (validation: ValidationResult | null) => Promise<void>;

  /** Current diagram code from the active chat. */
  diagramCode: string;
  /** Current diagram type (null until first generation). */
  diagramType: DiagramType | null;
  /** Latest visual validation result for the current diagram. */
  validationResult: ValidationResult | null;
}

interface UseChatOptions {
  model: string;
  visionModel: string;
  autoValidation?: boolean;
  maxValidationRetries?: number;
}

export function useChat(options: UseChatOptions): UseChatReturn {
  const [chatList, setChatList] = useState<ChatSessionMeta[]>([]);
  const [activeChat, setActiveChat] = useState<ChatSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setGenerationPhase = useUIStore((s) => s.setGenerationPhase);
  const resetGeneration = useUIStore((s) => s.resetGeneration);

  // Ref to avoid stale closures in async callbacks
  const activeChatRef = useRef<ChatSession | null>(null);
  activeChatRef.current = activeChat;

  // ── Load chat list + restore last session on mount ──────────────────────

  useEffect(() => {
    const init = async () => {
      const metas = listChatSessions();
      setChatList(metas);

      const lastId = getCurrentChatId();
      if (lastId) {
        const session = await loadChatSession(lastId);
        if (session) {
          setActiveChat(session);
        }
      }
    };
    init();
  }, []);

  // ── Refresh metadata list from localStorage ─────────────────────────────

  const refreshList = useCallback(() => {
    setChatList(listChatSessions());
  }, []);

  // ── Create a new chat ───────────────────────────────────────────────────

  const createChat = useCallback(
    async (title?: string): Promise<ChatSession> => {
      const session = createChatSession(title);
      await saveChatSession(session);
      setCurrentChatId(session.id);
      setActiveChat(session);
      setError(null);
      refreshList();
      return session;
    },
    [refreshList],
  );

  // ── Open chat ───────────────────────────────────────────────────────────

  const openChat = useCallback(
    async (id: string) => {
      const session = await loadChatSession(id);
      if (session) {
        setActiveChat(session);
        setCurrentChatId(session.id);
        setError(null);
      }
    },
    [],
  );

  // ── Delete chat ─────────────────────────────────────────────────────────

  const deleteChat = useCallback(
    async (id: string) => {
      await deleteSessionStorage(id);
      if (activeChatRef.current?.id === id) {
        setActiveChat(null);
        setCurrentChatId(null);
      }
      refreshList();
    },
    [refreshList],
  );

  // ── Rename chat ─────────────────────────────────────────────────────────

  const renameChat = useCallback(
    async (id: string, title: string) => {
      await renameSessionStorage(id, title);
      if (activeChatRef.current?.id === id) {
        setActiveChat((prev) => prev ? { ...prev, title } : prev);
      }
      refreshList();
    },
    [refreshList],
  );

  // ── Send message ────────────────────────────────────────────────────────

  const sendMessage = useCallback(
    async (content: string) => {
      let session = activeChatRef.current;
      if (!session) {
        // Auto-create session
        session = await createChat(content.slice(0, 60));
      }

      setIsLoading(true);
      setError(null);
      setGenerationPhase('classifying');

      try {
        // 1. Append user message
        const userMsg = createChatMessage('user', content);
        session = {
          ...session,
          messages: [...session.messages, userMsg],
          updatedAt: new Date().toISOString(),
        };

        // Auto-title from first message
        if (session.messages.length === 1) {
          session.title = content.slice(0, 60);
        }

        // 2. If first message, classify diagram type
        let diagramType = session.diagramType;
        if (!diagramType) {
          try {
            const classified = await classifyDiagramType(content, options.model);
            diagramType = classified;
          } catch {
            diagramType = 'mermaid'; // fallback
          }
          session = { ...session, diagramType };
        }

        // 3. Save interim state (user message visible)
        setActiveChat(session);
        await saveChatSession(session);
        refreshList();

        setGenerationPhase('generating');

        // 4. Call backend chat endpoint
        const isFirstMessage = session.messages.filter((m) => m.role === 'user').length === 1;
        
        // Timeout for "taking longer than usual"
        const longWaitTimer = setTimeout(() => {
          setGenerationPhase('fixing', 'Taking longer than usual... double-checking syntax.');
        }, 15000);

        let response;
        try {
          response = await sendChatMessage({
            chatId: session.id,
            message: content,
            diagramType: diagramType!,
            currentDiagramCode: isFirstMessage ? undefined : session.currentDiagramCode,
            isFirstMessage,
            enableValidation: options.autoValidation ?? true,
            maxRetries: options.maxValidationRetries ?? 2,
            model: options.model,
            visionModel: options.visionModel,
          });
        } finally {
          clearTimeout(longWaitTimer);
        }

        // 5. Append assistant message
        const assistantMsg = createChatMessage(
          'assistant',
          response.message || 'Diagram updated.',
          response.code,
          response.validation ?? null,
        );

        session = {
          ...session,
          messages: [...session.messages, assistantMsg],
          currentDiagramCode: response.code,
          diagramType: (response.language as DiagramType) || diagramType,
          currentValidation: response.validation ?? null,
          updatedAt: new Date().toISOString(),
        };

        setActiveChat(session);
        await saveChatSession(session);
        refreshList();
        setGenerationPhase('done');
        setTimeout(() => resetGeneration(), 2000);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to send message';
        setError(msg);
        setGenerationPhase('error', msg);
      } finally {
        setIsLoading(false);
      }
    },
    [createChat, options.autoValidation, options.maxValidationRetries, options.model, options.visionModel, refreshList, setGenerationPhase, resetGeneration],
  );

  // ── Regenerate last response ────────────────────────────────────────────

  const regenerateLastResponse = useCallback(async () => {
    const session = activeChatRef.current;
    if (!session || session.messages.length < 2) return;

    // Find the last user message
    const lastUserMsg = [...session.messages].reverse().find((m) => m.role === 'user');
    if (!lastUserMsg) return;

    // Remove the last assistant message
    const messages = session.messages.slice();
    if (messages[messages.length - 1]?.role === 'assistant') {
      messages.pop();
    }

    // Revert diagram code to the previous assistant message's code
    const prevAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
    const prevCode = prevAssistant?.diagramCode || '';

    const trimmedSession: ChatSession = {
      ...session,
      messages,
      currentDiagramCode: prevCode,
      currentValidation: prevAssistant?.validation ?? null,
    };
    setActiveChat(trimmedSession);
    activeChatRef.current = trimmedSession;
    await saveChatSession(trimmedSession);

    // Re-send
    await sendMessage(lastUserMsg.content);
  }, [sendMessage]);

  // ── Update diagram code from visual editor ──────────────────────────────

  const updateDiagramCode = useCallback(
    async (code: string) => {
      const session = activeChatRef.current;
      if (!session) return;

      const updated: ChatSession = {
        ...session,
        currentDiagramCode: code,
        currentValidation: null,
        updatedAt: new Date().toISOString(),
      };
      setActiveChat(updated);
      activeChatRef.current = updated;
      await saveChatSession(updated);
    },
    [],
  );

  const updateValidationResult = useCallback(
    async (validation: ValidationResult | null) => {
      const session = activeChatRef.current;
      if (!session) return;

      const updated: ChatSession = {
        ...session,
        currentValidation: validation,
        updatedAt: new Date().toISOString(),
      };
      setActiveChat(updated);
      activeChatRef.current = updated;
      await saveChatSession(updated);
    },
    [],
  );

  return {
    chatList,
    activeChat,
    isLoading,
    error,
    createChat,
    openChat,
    deleteChat,
    renameChat,
    sendMessage,
    regenerateLastResponse,
    updateDiagramCode,
    updateValidationResult,
    diagramCode: activeChat?.currentDiagramCode || '',
    diagramType: activeChat?.diagramType || null,
    validationResult: (activeChat?.currentValidation ?? null) as ValidationResult | null,
  };
}

/**
 * Chat session and message types for v2.0 conversation-based workflow.
 */

export type DiagramType = 'mermaid' | 'dbml' | 'graphviz';

export type MessageRole = 'user' | 'assistant';

/** A single message in a chat conversation. */
export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  /** Diagram code attached to an assistant message (if any). */
  diagramCode?: string;
  timestamp: string;
}

/** A persistent chat session. */
export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  /** Locked after the first generation. */
  diagramType: DiagramType | null;
  messages: ChatMessage[];
  /** Latest diagram code (accumulated through modifications). */
  currentDiagramCode: string;
}

/** Metadata stored in localStorage for quick listing without loading full history. */
export interface ChatSessionMeta {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  diagramType: DiagramType | null;
  messageCount: number;
}

// ── Factory Helpers ────────────────────────────────────────────────────────────

let _counter = 0;
function uid(): string {
  return `${Date.now()}-${++_counter}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createChatSession(title?: string): ChatSession {
  const now = new Date().toISOString();
  return {
    id: uid(),
    title: title || 'New Chat',
    createdAt: now,
    updatedAt: now,
    diagramType: null,
    messages: [],
    currentDiagramCode: '',
  };
}

export function createChatMessage(role: MessageRole, content: string, diagramCode?: string): ChatMessage {
  return {
    id: uid(),
    role,
    content,
    diagramCode,
    timestamp: new Date().toISOString(),
  };
}

export function sessionToMeta(session: ChatSession): ChatSessionMeta {
  return {
    id: session.id,
    title: session.title,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    diagramType: session.diagramType,
    messageCount: session.messages.length,
  };
}

const STORAGE_PREFIX = 'webchat_sessions_v1';
const DEFAULT_CHAT_TITLE = '新对话';

const getMessageText = (message) => {
  if (!message || !message.content) {
    return '';
  }

  if (Array.isArray(message.content)) {
    const textItem = message.content.find((item) => item.type === 'text');
    return typeof textItem?.text === 'string' ? textItem.text : '';
  }

  return typeof message.content === 'string' ? message.content : '';
};

const trimSessionTitle = (value) => {
  const text = (value || '').replace(/\s+/g, ' ').trim();
  if (!text) {
    return DEFAULT_CHAT_TITLE;
  }

  if (text.length <= 28) {
    return text;
  }

  return `${text.slice(0, 28)}...`;
};

export const deriveWebChatSessionTitle = (messages = []) => {
  const firstUserMessage = messages.find((message) => message.role === 'user');
  return trimSessionTitle(getMessageText(firstUserMessage));
};

export const deriveWebChatSessionPreview = (messages = []) => {
  const previewMessage = [...messages]
    .reverse()
    .find((message) => getMessageText(message));

  return trimSessionTitle(getMessageText(previewMessage));
};

export const sortWebChatSessions = (sessions = []) =>
  [...sessions].sort((left, right) => (right.updatedAt || 0) - (left.updatedAt || 0));

const normalizeWebChatSession = (session = {}) => {
  const messages = Array.isArray(session.messages) ? session.messages : [];
  const timestamp = Number.isFinite(session.updatedAt)
    ? session.updatedAt
    : Date.now();

  return {
    id: session.id || `webchat-${timestamp}-${Math.random().toString(36).slice(2, 8)}`,
    title: trimSessionTitle(session.title || deriveWebChatSessionTitle(messages)),
    model: session.model || '',
    group: session.group || '',
    messages,
    createdAt: Number.isFinite(session.createdAt) ? session.createdAt : timestamp,
    updatedAt: timestamp,
  };
};

export const createWebChatSession = (defaults = {}) => {
  const timestamp = Date.now();
  const sessionId = globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : `webchat-${timestamp}-${Math.random().toString(36).slice(2, 8)}`;

  return normalizeWebChatSession({
    id: sessionId,
    title: DEFAULT_CHAT_TITLE,
    createdAt: timestamp,
    updatedAt: timestamp,
    messages: [],
    ...defaults,
  });
};

const getStorageKey = (userId) => `${STORAGE_PREFIX}:${userId}`;

export const loadWebChatSessions = (userId) => {
  if (!userId) {
    return [];
  }

  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return sortWebChatSessions(parsed.map(normalizeWebChatSession));
  } catch (error) {
    console.error('Failed to load web chat sessions:', error);
    return [];
  }
};

export const saveWebChatSessions = (userId, sessions) => {
  if (!userId) {
    return;
  }

  try {
    const normalizedSessions = sortWebChatSessions(
      (sessions || []).map(normalizeWebChatSession),
    );
    localStorage.setItem(
      getStorageKey(userId),
      JSON.stringify(normalizedSessions),
    );
  } catch (error) {
    console.error('Failed to save web chat sessions:', error);
  }
};

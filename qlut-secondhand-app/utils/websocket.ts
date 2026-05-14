import { WS_URL } from '../config';
import { reactive } from 'vue';

type EventType = 'open' | 'close' | 'error' | 'message' | 'status';
type EventCallback = (...args: any[]) => void;

const BASE_DELAY = 1000;
const MAX_DELAY = 32000;

interface WsState {
  socket: UniApp.SocketTask | null;
  connected: boolean;
  manualClose: boolean;
  retryCount: number;
  retryTimer: ReturnType<typeof setTimeout> | null;
  pendingQueue: string[];
  listeners: Map<EventType, Set<EventCallback>>;
}

const state: WsState = {
  socket: null,
  connected: false,
  manualClose: false,
  retryCount: 0,
  retryTimer: null,
  pendingQueue: [],
  listeners: new Map(),
};

const publicStatus = reactive({
  connected: false,
  reconnecting: false,
  pendingCount: 0,
  retryCount: 0,
});

function syncStatus() {
  publicStatus.connected = state.connected;
  publicStatus.reconnecting = state.retryTimer !== null;
  publicStatus.pendingCount = state.pendingQueue.length;
  publicStatus.retryCount = state.retryCount;
  emit('status', { ...publicStatus });
}

function emit(event: EventType, ...args: any[]) {
  const handlers = state.listeners.get(event);
  if (handlers) {
    handlers.forEach((cb) => {
      try {
        cb(...args);
      } catch (e) {
        console.error(`[WS] listener error on "${event}":`, e);
      }
    });
  }
}

function getRetryDelay(): number {
  const delay = BASE_DELAY * Math.pow(2, state.retryCount);
  return Math.min(delay, MAX_DELAY);
}

function flushQueue() {
  while (state.pendingQueue.length > 0 && state.socket && state.connected) {
    const msg = state.pendingQueue.shift()!;
    state.socket.send({ data: msg });
  }
  syncStatus();
}

function scheduleReconnect() {
  if (state.manualClose) return;
  if (state.retryTimer !== null) return;

  const delay = getRetryDelay();
  console.log(`[WS] reconnecting in ${delay}ms (attempt ${state.retryCount + 1})`);

  state.retryTimer = setTimeout(() => {
    state.retryTimer = null;
    state.retryCount++;
    syncStatus();
    connect();
  }, delay);
  syncStatus();
}

function bindSocketEvents(socket: UniApp.SocketTask) {
  socket.onOpen(() => {
    console.log('[WS] connected');
    state.connected = true;
    state.retryCount = 0;
    flushQueue();
    syncStatus();
    emit('open');
  });

  socket.onMessage((res) => {
    try {
      const msg = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
      emit('message', msg);
    } catch (e) {
      console.error('[WS] failed to parse message:', e, res.data);
    }
  });

  socket.onError((err) => {
    console.error('[WS] error:', err);
    emit('error', err);
  });

  socket.onClose((res) => {
    console.log(`[WS] closed (code: ${res.code}, reason: ${res.reason})`);
    state.connected = false;
    state.socket = null;
    syncStatus();
    emit('close', res);

    if (!state.manualClose) {
      scheduleReconnect();
    }
  });
}

function connect(): void {
  const token = uni.getStorageSync('token');
  if (!token) {
    console.warn('[WS] no token — skip connect');
    syncStatus();
    return;
  }

  if (state.socket) {
    state.socket.close({ code: 1000, reason: 'reconnect' });
  }

  state.manualClose = false;
  const url = `${WS_URL}?token=${token}`;
  console.log('[WS] connecting to', url);

  const socket = uni.connectSocket({
    url,
    success: () => {
      console.log('[WS] socket created');
    },
    fail: (err) => {
      console.error('[WS] connectSocket fail:', err);
      scheduleReconnect();
    },
  });

  state.socket = socket;
  syncStatus();
  bindSocketEvents(socket);
}

function disconnect(): void {
  close();
}

function close(): void {
  state.manualClose = true;

  if (state.retryTimer !== null) {
    clearTimeout(state.retryTimer);
    state.retryTimer = null;
  }

  if (state.socket) {
    state.socket.close({ code: 1000, reason: 'manual' });
    state.socket = null;
  }

  state.connected = false;
  state.retryCount = 0;
  state.pendingQueue = [];
  syncStatus();
}

function on(event: EventType, callback: EventCallback): void {
  if (!state.listeners.has(event)) {
    state.listeners.set(event, new Set());
  }
  state.listeners.get(event)!.add(callback);
}

function off(event: EventType, callback: EventCallback): void {
  state.listeners.get(event)?.delete(callback);
}

function send(data: Record<string, unknown>): void {
  const json = JSON.stringify(data);
  if (state.connected && state.socket) {
    state.socket.send({ data: json });
  } else {
    console.log('[WS] queued pending message');
    state.pendingQueue.push(json);
    syncStatus();
  }
}

export function useWebSocket() {
  return { connect, disconnect, close, on, off, send, status: publicStatus };
}

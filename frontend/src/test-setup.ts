import "@testing-library/jest-dom";

// jsdom doesn't ship these; cmdk and a few libraries rely on them.
class ResizeObserverPolyfill {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as unknown as { ResizeObserver?: unknown }).ResizeObserver ||=
  ResizeObserverPolyfill;

if (typeof window !== "undefined" && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function () {};
}

// Stop real WebSocket construction during unit tests — the LogPane otherwise
// tries to reach ws://localhost:8000. Tests that need the stream should
// spy on lib/ws explicitly.
class FakeWebSocket {
  constructor() {}
  send() {}
  close() {}
  addEventListener() {}
  removeEventListener() {}
}
(globalThis as unknown as { WebSocket: unknown }).WebSocket = FakeWebSocket;

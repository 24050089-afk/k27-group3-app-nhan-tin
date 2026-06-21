const _logs = [];
const _listeners = new Set();

let _id = 0;

export const networkLogger = {
  nextId() {
    return String(++_id);
  },
  add(entry) {
    _logs.unshift(entry);
    if (_logs.length > 100) _logs.pop();
    _listeners.forEach((fn) => fn([..._logs]));
  },
  getLogs() {
    return [..._logs];
  },
  clear() {
    _logs.length = 0;
    _listeners.forEach((fn) => fn([]));
  },
  subscribe(fn) {
    _listeners.add(fn);
    return () => _listeners.delete(fn);
  },
};

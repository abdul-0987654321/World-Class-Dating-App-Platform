// Manual mock for logger to reduce noise in tests
export default {
  info: (() => {}) as any,
  error: (() => {}) as any,
  warn: (() => {}) as any,
  debug: (() => {}) as any,
};

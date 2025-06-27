type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const log = (level: LogLevel, ...args: unknown[]) => {
  const message = `[${level.toUpperCase()}] ${args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
  ).join(' ')}`;
  
  // Output to console during test runs
  if (process.env.NODE_ENV === 'test') {
    // Use process.stdout to avoid vitest's console capture
    process.stdout.write(message + '\n');
  } else {
    console[level](...args);
  }
};

export const logger = {
  debug: (...args: unknown[]) => log('debug', ...args),
  info: (...args: unknown[]) => log('info', ...args),
  warn: (...args: unknown[]) => log('warn', ...args),
  error: (...args: unknown[]) => log('error', ...args),
};

export const createMockLogger = () => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
});

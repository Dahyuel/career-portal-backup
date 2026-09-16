// utils/logger.ts — Production-safe logger
// Only outputs to console in development mode (import.meta.env.DEV)
// In production, all logging is silenced to prevent data leakage.

const isDev = import.meta.env.DEV;

export const logger = {
    log: (...args: unknown[]) => { if (isDev) console.log(...args); },
    warn: (...args: unknown[]) => { if (isDev) console.warn(...args); },
    error: (...args: unknown[]) => { if (isDev) console.error(...args); },
    debug: (...args: unknown[]) => { if (isDev) console.debug(...args); },
};

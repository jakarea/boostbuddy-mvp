/**
 * Development-only logging utility
 * In production, all logs become no-ops to avoid console overhead
 */

const isDevelopment = process.env.NODE_ENV === 'development';

type DevLogFunction = (...args: unknown[]) => void;

// Core logging functions (no-op in production)
export const devLog: DevLogFunction = isDevelopment
  ? console.log.bind(console)
  : () => {};

export const devWarn: DevLogFunction = isDevelopment
  ? console.warn.bind(console)
  : () => {};

export const devError: DevLogFunction = isDevelopment
  ? console.error.bind(console)
  : () => {};

export const devGroup: DevLogFunction = isDevelopment
  ? console.group.bind(console)
  : () => {};

export const devGroupEnd: DevLogFunction = isDevelopment
  ? console.groupEnd.bind(console)
  : () => {};

export const devLogTable: DevLogFunction = isDevelopment
  ? console.table.bind(console)
  : () => {};

// Conditional logger - only logs if predicate is true
export const devLogIf = (condition: boolean, ...args: unknown[]) => {
  if (isDevelopment && condition) {
    console.log(...args);
  }
};

// Performance logging (always logs in dev, never in production)
export const devPerf: DevLogFunction = isDevelopment
  ? console.timeLog?.bind(console) || (() => {})
  : () => {};

/**
 * Usage:
 * import { devLog, devWarn, devError, devGroup, devGroupEnd } from '@/lib/utils/devLog';
 * devLog('Debug info:', data);
 * devGroup('Section name'); devGroupEnd();
 */

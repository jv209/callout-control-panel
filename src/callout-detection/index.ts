/**
 * Callout detection module — barrel export.
 *
 * Re-exports the CSS parser and detection types for convenient importing.
 */

export { getCalloutsFromCSS } from './css-parser';
export type { CalloutID, Callout, CalloutProperties, CalloutSource } from './types';

/** Generates a unique ID using timestamp + random base-36 suffix. Used for entries, blocks, and media filenames. */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

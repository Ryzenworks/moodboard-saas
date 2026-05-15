/**
 * Convert Supabase error objects (PostgrestError, StorageError, etc.)
 * to proper Error instances so they never surface as [object Object]
 * in React error boundaries.
 */
export function toError(err: unknown): Error {
  if (err instanceof Error) return err;
  if (err && typeof err === 'object' && 'message' in err) {
    return new Error((err as { message: string }).message);
  }
  if (typeof err === 'string') return new Error(err);
  return new Error('An unknown database error occurred');
}

// Small generic retry helper for the geographic-clustering feature's Route
// Matrix calls. This repo keeps its own copy (same convention as
// lib/geocode.ts / lib/ics.ts) with a much tighter policy than
// uinta-field-app's: a real customer is synchronously waiting on this one.

export type RetryOptions = {
  attempts: number;
  backoffMs: number[]; // backoffMs[i] = delay before the (i+2)th attempt
  isRetryable?: (err: unknown) => boolean;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < opts.attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const retryable = opts.isRetryable ? opts.isRetryable(err) : true;
      const isLastAttempt = attempt === opts.attempts - 1;
      if (!retryable || isLastAttempt) throw err;
      const delay = opts.backoffMs[attempt] ?? opts.backoffMs[opts.backoffMs.length - 1] ?? 0;
      await sleep(delay);
    }
  }
  throw lastErr;
}

export async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wait for a random number of milliseconds between min and max.
 */
export async function randomDelay(min: number = 1000, max: number = 3500): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min + 1) + min);
  console.log(`[RateLimiter] Waiting for polite delay of ${ms}ms...`);
  return delay(ms);
}

/**
 * Execute an async function with exponential backoff retries.
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries: number = 2,
  delayMs: number = 2000,
  factor: number = 2
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      if (attempt > retries) {
        throw error;
      }
      const backoffDelay = delayMs * Math.pow(factor, attempt - 1);
      console.warn(
        `[Retry] Attempt ${attempt} failed. Retrying in ${backoffDelay}ms. Error: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      await delay(backoffDelay);
    }
  }
}

/**
 * Clean up whitespace, tabs, and newlines from a string.
 */
export function cleanText(text: string | null | undefined): string | null {
  if (!text) return null;
  const cleaned = text
    .replace(/\s+/g, " ")
    .replace(/^\s+|\s+$/g, "")
    .trim();
  return cleaned || null;
}

/**
 * Safely parse a number from a string, removing currency symbols and formatting.
 */
export function parseNumber(text: string | null | undefined): number | null {
  if (!text) return null;
  const cleaned = text.replace(/[^0-9.]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

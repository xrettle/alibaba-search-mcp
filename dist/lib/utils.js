"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.delay = delay;
exports.randomDelay = randomDelay;
exports.retryWithBackoff = retryWithBackoff;
exports.cleanText = cleanText;
exports.parseNumber = parseNumber;
async function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
/**
 * Wait for a random number of milliseconds between min and max.
 */
async function randomDelay(min = 1000, max = 3500) {
    const ms = Math.floor(Math.random() * (max - min + 1) + min);
    console.log(`[RateLimiter] Waiting for polite delay of ${ms}ms...`);
    return delay(ms);
}
/**
 * Execute an async function with exponential backoff retries.
 */
async function retryWithBackoff(fn, retries = 2, delayMs = 2000, factor = 2) {
    let attempt = 0;
    while (true) {
        try {
            return await fn();
        }
        catch (error) {
            attempt++;
            if (attempt > retries) {
                throw error;
            }
            const backoffDelay = delayMs * Math.pow(factor, attempt - 1);
            console.warn(`[Retry] Attempt ${attempt} failed. Retrying in ${backoffDelay}ms. Error: ${error instanceof Error ? error.message : String(error)}`);
            await delay(backoffDelay);
        }
    }
}
/**
 * Clean up whitespace, tabs, and newlines from a string.
 */
function cleanText(text) {
    if (!text)
        return null;
    const cleaned = text
        .replace(/\s+/g, " ")
        .replace(/^\s+|\s+$/g, "")
        .trim();
    return cleaned || null;
}
/**
 * Safely parse a number from a string, removing currency symbols and formatting.
 */
function parseNumber(text) {
    if (!text)
        return null;
    const cleaned = text.replace(/[^0-9.]/g, "");
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
}

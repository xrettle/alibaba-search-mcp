"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeBrowser = closeBrowser;
exports.scrapePage = scrapePage;
const playwright_1 = require("playwright");
const utils_1 = require("./utils");
const rateLimiter_1 = require("./rateLimiter");
let browserInstance = null;
/**
 * Returns a running browser instance, initializing it if necessary.
 */
async function getBrowser() {
    if (browserInstance && browserInstance.isConnected()) {
        return browserInstance;
    }
    if (browserInstance) {
        await browserInstance.close().catch(() => { });
    }
    console.log("[Browser] Launching headless Chromium instance...");
    browserInstance = await playwright_1.chromium.launch({
        headless: true,
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu",
            "--disable-web-security",
            // Stealth flag to help prevent automation detection
            "--disable-blink-features=AutomationControlled",
        ],
    });
    return browserInstance;
}
/**
 * Closes the active browser instance.
 */
async function closeBrowser() {
    if (browserInstance) {
        console.log("[Browser] Closing browser instance...");
        await browserInstance.close().catch(() => { });
        browserInstance = null;
    }
}
/**
 * Detects whether the current page content is a block page or a verification/captcha.
 */
async function detectBlockOrCaptcha(page) {
    const url = page.url();
    if (url.includes("sec.alibaba.com") ||
        url.includes("nocaptcha") ||
        url.includes("captcha") ||
        url.includes("login")) {
        console.warn(`[Browser] CAPTCHA or Login redirect detected in URL: ${url}`);
        return true;
    }
    const title = await page.title().catch(() => "");
    if (/security check|captcha|verify|slide to verify|robot|sign in/i.test(title)) {
        console.warn(`[Browser] CAPTCHA or security title detected: "${title}"`);
        return true;
    }
    // Common DOM selectors indicating slide-to-verify or robot checks
    const indicators = [
        "#nc_1_wrapper",
        ".nc-container",
        ".sec-wrapper",
        "#nocaptcha",
        "#sua-slide",
        ".verify-iframe",
        ".identity-verify",
    ];
    for (const selector of indicators) {
        const exists = await page.$(selector).catch(() => null);
        if (exists) {
            console.warn(`[Browser] CAPTCHA selector matches indicator: ${selector}`);
            return true;
        }
    }
    // Check visible page body text for captcha keywords
    const bodyText = await page.textContent("body").catch(() => "");
    if (bodyText) {
        const lowText = bodyText.toLowerCase();
        if (lowText.includes("slide to verify") ||
            lowText.includes("verify your identity") ||
            lowText.includes("unusual traffic from your computer") ||
            lowText.includes("security verification")) {
            console.warn("[Browser] CAPTCHA text patterns found in page body");
            return true;
        }
    }
    return false;
}
/**
 * Runs a scraping task within the global concurrency queue, managing page life cycle,
 * stealth options, loading state, retries, and captcha detection.
 */
async function scrapePage(url, parser) {
    // Use env configuration
    const timeout = parseInt(process.env.REQUEST_TIMEOUT_MS || "30000", 10);
    const maxRetries = parseInt(process.env.MAX_RETRIES || "2", 10);
    // Queue up the request to enforce concurrency limits
    return rateLimiter_1.globalQueue.run(async () => {
        return (0, utils_1.retryWithBackoff)(async () => {
            let browser = null;
            let context = null;
            let page = null;
            try {
                browser = await getBrowser();
                // Create context with custom user agent and permissions to avoid blocks
                context = await browser.newContext({
                    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                    viewport: { width: 1280, height: 800 },
                    deviceScaleFactor: 1,
                    locale: "en-US",
                    timezoneId: "America/New_York",
                    extraHTTPHeaders: {
                        "Accept-Language": "en-US,en;q=0.9",
                        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
                        "sec-ch-ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
                        "sec-ch-ua-mobile": "?0",
                        "sec-ch-ua-platform": '"Windows"',
                    },
                });
                page = await context.newPage();
                page.setDefaultTimeout(timeout);
                // Add random human delay to prevent fast request fingerprinting
                await (0, utils_1.randomDelay)(1500, 3000);
                console.log(`[Browser] Navigating to URL: ${url}`);
                const response = await page.goto(url, {
                    waitUntil: "domcontentloaded",
                });
                // Wait a brief moment to let dynamic scripts evaluate
                await page.waitForTimeout(2000).catch(() => { });
                const isBlocked = await detectBlockOrCaptcha(page);
                if (isBlocked) {
                    return {
                        data: null,
                        blockedOrCaptcha: true,
                        extractionConfidence: 0.0,
                    };
                }
                // Parse page content using the provided parser function
                const { data, confidence } = await parser(page);
                return {
                    data,
                    blockedOrCaptcha: false,
                    extractionConfidence: confidence,
                };
            }
            catch (error) {
                console.error(`[Browser] Scrape error occurred for URL: ${url}. Error: ${error instanceof Error ? error.message : String(error)}`);
                throw error; // Let the retry handle it
            }
            finally {
                // Clean up page and context
                if (page)
                    await page.close().catch(() => { });
                if (context)
                    await context.close().catch(() => { });
            }
        }, maxRetries, 3000).catch((err) => {
            // If we failed after all retries, return graceful fallback rather than crashing
            console.error(`[Browser] Scrape permanently failed for URL: ${url} after retries. Returning partial/null.`);
            return {
                data: null,
                blockedOrCaptcha: true, // Treat exhaustive errors as block-like
                extractionConfidence: 0.0,
            };
        });
    });
}

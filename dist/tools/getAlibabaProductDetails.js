"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAlibabaProductDetailsSchema = void 0;
exports.getAlibabaProductDetails = getAlibabaProductDetails;
const zod_1 = require("zod");
const browser_1 = require("../lib/browser");
const productParser_1 = require("../lib/parsers/productParser");
const cache_1 = require("../lib/cache");
exports.getAlibabaProductDetailsSchema = zod_1.z.object({
    productUrl: zod_1.z.string().url("Must be a valid URL link."),
});
/**
 * Retrieves deep specification details for a specific Alibaba product page.
 */
async function getAlibabaProductDetails(input) {
    let url = input.productUrl.trim();
    if (url.startsWith("//")) {
        url = `https:${url}`;
    }
    const cacheKey = `product_${url}`;
    const cached = cache_1.globalCache.get(cacheKey);
    if (cached) {
        console.log(`[Cache] Hit for: ${cacheKey}`);
        return cached;
    }
    const scrapeResult = await (0, browser_1.scrapePage)(url, productParser_1.parseProductPage);
    const details = scrapeResult.data;
    // Guarantee keys are present with nulls if missing (ensuring consistent JSON keys)
    const cleanDetails = details
        ? {
            title: details.title ?? null,
            description: details.description ?? null,
            priceTiers: details.priceTiers ?? null,
            MOQ: details.MOQ ?? null,
            specs: details.specs ?? null,
            leadTime: details.leadTime ?? null,
            images: details.images ?? null,
            supplierSummary: details.supplierSummary ?? null,
            storefrontLinks: details.storefrontLinks ?? null,
            rawVisibleText: details.rawVisibleText ?? null,
        }
        : null;
    const output = {
        details: cleanDetails,
        blocked_or_captcha: scrapeResult.blockedOrCaptcha,
        extraction_confidence: scrapeResult.extractionConfidence,
    };
    if (!scrapeResult.blockedOrCaptcha && scrapeResult.data && scrapeResult.data.title) {
        cache_1.globalCache.set(cacheKey, output);
    }
    return output;
}

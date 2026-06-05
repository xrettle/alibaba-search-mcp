"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchAlibabaProductsSchema = void 0;
exports.searchAlibabaProducts = searchAlibabaProducts;
const zod_1 = require("zod");
const browser_1 = require("../lib/browser");
const searchParser_1 = require("../lib/parsers/searchParser");
const cache_1 = require("../lib/cache");
exports.searchAlibabaProductsSchema = zod_1.z.object({
    query: zod_1.z.string(),
    page: zod_1.z.number().optional(),
    minPrice: zod_1.z.number().optional(),
    maxPrice: zod_1.z.number().optional(),
    maxMOQ: zod_1.z.number().optional(),
    sortBy: zod_1.z.enum(["relevance", "price_asc", "price_desc", "moq_asc", "moq_desc"]).optional(),
    supplierCountry: zod_1.z.string().optional(),
    verifiedOnly: zod_1.z.boolean().optional(),
});
/**
 * Executes a search for products on Alibaba.
 */
async function searchAlibabaProducts(input) {
    const { query, page = 1, minPrice, maxPrice, maxMOQ, sortBy, supplierCountry, verifiedOnly } = input;
    // Build target URL
    let url = `https://www.alibaba.com/trade/search?SearchText=${encodeURIComponent(query)}&page=${page}`;
    if (minPrice !== undefined)
        url += `&minPrice=${minPrice}`;
    if (maxPrice !== undefined)
        url += `&maxPrice=${maxPrice}`;
    if (maxMOQ !== undefined)
        url += `&moq=${maxMOQ}`;
    if (supplierCountry !== undefined)
        url += `&country=${encodeURIComponent(supplierCountry)}`;
    if (sortBy) {
        if (sortBy === "price_asc")
            url += "&sortType=price-asc";
        else if (sortBy === "price_desc")
            url += "&sortType=price-desc";
        else if (sortBy === "moq_asc")
            url += "&sortType=moq-asc";
        else if (sortBy === "moq_desc")
            url += "&sortType=moq-desc";
    }
    if (verifiedOnly) {
        url += "&certCategory=100009115"; // verified suppliers
    }
    const cacheKey = `search_${url}`;
    const cached = cache_1.globalCache.get(cacheKey);
    if (cached) {
        console.log(`[Cache] Hit for: ${cacheKey}`);
        return cached;
    }
    const scrapeResult = await (0, browser_1.scrapePage)(url, searchParser_1.parseSearchPage);
    const results = scrapeResult.data || [];
    // Guarantee keys are present with nulls if missing (avoiding undefined property drops)
    const cleanResults = results.map((item) => ({
        title: item.title ?? null,
        productUrl: item.productUrl ?? null,
        imageUrl: item.imageUrl ?? null,
        priceText: item.priceText ?? null,
        moqText: item.moqText ?? null,
        supplierName: item.supplierName ?? null,
        supplierUrl: item.supplierUrl ?? null,
        supplierLocation: item.supplierLocation ?? null,
        yearsOnAlibaba: item.yearsOnAlibaba ?? null,
        verificationBadges: item.verificationBadges ?? null,
        shortDescription: item.shortDescription ?? null,
    }));
    const output = {
        results: cleanResults,
        blocked_or_captcha: scrapeResult.blockedOrCaptcha,
        extraction_confidence: scrapeResult.extractionConfidence,
    };
    if (!scrapeResult.blockedOrCaptcha && scrapeResult.data && scrapeResult.data.length > 0) {
        cache_1.globalCache.set(cacheKey, output);
    }
    return output;
}

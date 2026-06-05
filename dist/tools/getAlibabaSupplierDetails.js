"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAlibabaSupplierDetailsSchema = void 0;
exports.getAlibabaSupplierDetails = getAlibabaSupplierDetails;
const zod_1 = require("zod");
const browser_1 = require("../lib/browser");
const supplierParser_1 = require("../lib/parsers/supplierParser");
const cache_1 = require("../lib/cache");
exports.getAlibabaSupplierDetailsSchema = zod_1.z.object({
    supplierUrl: zod_1.z.string().url("Must be a valid URL link."),
});
/**
 * Retrieves company profile details for a specific Alibaba supplier link.
 */
async function getAlibabaSupplierDetails(input) {
    let url = input.supplierUrl.trim();
    if (url.startsWith("//")) {
        url = `https:${url}`;
    }
    // Normalize supplier URLs: redirect root storefront subdomains to company_profile.html
    try {
        const urlObj = new URL(url);
        if (urlObj.hostname.endsWith(".en.alibaba.com") &&
            (urlObj.pathname === "/" || urlObj.pathname === "")) {
            urlObj.pathname = "/company_profile.html";
            url = urlObj.toString();
        }
    }
    catch (err) {
        console.warn(`[SupplierTool] Could not parse or normalize supplier URL: ${url}`);
    }
    const cacheKey = `supplier_${url}`;
    const cached = cache_1.globalCache.get(cacheKey);
    if (cached) {
        console.log(`[Cache] Hit for: ${cacheKey}`);
        return cached;
    }
    const scrapeResult = await (0, browser_1.scrapePage)(url, supplierParser_1.parseSupplierPage);
    const details = scrapeResult.data;
    // Guarantee keys are present with nulls if missing (consistent JSON keys)
    const cleanDetails = details
        ? {
            supplierName: details.supplierName ?? null,
            yearsOnAlibaba: details.yearsOnAlibaba ?? null,
            location: details.location ?? null,
            businessType: details.businessType ?? null,
            employeeCount: details.employeeCount ?? null,
            certifications: details.certifications ?? null,
            responseRate: details.responseRate ?? null,
            tradeAssurance: details.tradeAssurance ?? false,
            verifiedStatus: details.verifiedStatus ?? null,
            mainCategories: details.mainCategories ?? null,
            companyDescription: details.companyDescription ?? null,
            rawVisibleText: details.rawVisibleText ?? null,
        }
        : null;
    const output = {
        details: cleanDetails,
        blocked_or_captcha: scrapeResult.blockedOrCaptcha,
        extraction_confidence: scrapeResult.extractionConfidence,
    };
    if (!scrapeResult.blockedOrCaptcha && scrapeResult.data && scrapeResult.data.supplierName) {
        cache_1.globalCache.set(cacheKey, output);
    }
    return output;
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assessAlibabaSupplierTrustSchema = void 0;
exports.assessAlibabaSupplierTrust = assessAlibabaSupplierTrust;
const zod_1 = require("zod");
const getAlibabaSupplierDetails_1 = require("./getAlibabaSupplierDetails");
const trustScore_1 = require("../lib/scoring/trustScore");
const cache_1 = require("../lib/cache");
exports.assessAlibabaSupplierTrustSchema = zod_1.z.object({
    supplierUrl: zod_1.z.string().url("Must be a valid URL link."),
});
/**
 * Assesses the trust level of an Alibaba supplier based on their storefront details.
 */
async function assessAlibabaSupplierTrust(input) {
    const { supplierUrl } = input;
    const cacheKey = `trust_${supplierUrl.trim()}`;
    const cached = cache_1.globalCache.get(cacheKey);
    if (cached) {
        console.log(`[Cache] Hit for: ${cacheKey}`);
        return cached;
    }
    // 1. Fetch supplier details (using the getAlibabaSupplierDetails tool, which has cache internally)
    const result = await (0, getAlibabaSupplierDetails_1.getAlibabaSupplierDetails)({ supplierUrl });
    if (result.blocked_or_captcha || !result.details) {
        return {
            trustScore: 0,
            reasons: ["Could not fetch supplier details due to page block or access issue."],
            warnings: ["Unable to load company profile."],
            extractedSignals: null,
            blocked_or_captcha: result.blocked_or_captcha,
            extraction_confidence: 0.0,
        };
    }
    // 2. Compute trust score based on details
    const scoring = (0, trustScore_1.calculateTrustScore)(result.details);
    const output = {
        trustScore: scoring.trustScore,
        reasons: scoring.reasons,
        warnings: scoring.warnings,
        extractedSignals: scoring.extractedSignals,
        blocked_or_captcha: result.blocked_or_captcha,
        extraction_confidence: result.extraction_confidence,
    };
    cache_1.globalCache.set(cacheKey, output);
    return output;
}

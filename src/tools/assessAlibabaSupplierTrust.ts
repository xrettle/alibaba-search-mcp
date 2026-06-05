import { z } from "zod";
import { getAlibabaSupplierDetails } from "./getAlibabaSupplierDetails";
import { calculateTrustScore, TrustScoreResult } from "../lib/scoring/trustScore";
import { globalCache } from "../lib/cache";

export const assessAlibabaSupplierTrustSchema = z.object({
  supplierUrl: z.string().url("Must be a valid URL link."),
});

export type AssessAlibabaSupplierTrustInput = z.infer<typeof assessAlibabaSupplierTrustSchema>;

export interface AssessAlibabaSupplierTrustOutput {
  trustScore: number;
  reasons: string[];
  warnings: string[];
  extractedSignals: TrustScoreResult["extractedSignals"] | null;
  blocked_or_captcha: boolean;
  extraction_confidence: number;
}

/**
 * Assesses the trust level of an Alibaba supplier based on their storefront details.
 */
export async function assessAlibabaSupplierTrust(
  input: AssessAlibabaSupplierTrustInput
): Promise<AssessAlibabaSupplierTrustOutput> {
  const { supplierUrl } = input;
  const cacheKey = `trust_${supplierUrl.trim()}`;

  const cached = globalCache.get<AssessAlibabaSupplierTrustOutput>(cacheKey);
  if (cached) {
    console.log(`[Cache] Hit for: ${cacheKey}`);
    return cached;
  }

  // 1. Fetch supplier details (using the getAlibabaSupplierDetails tool, which has cache internally)
  const result = await getAlibabaSupplierDetails({ supplierUrl });

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
  const scoring = calculateTrustScore(result.details);

  const output: AssessAlibabaSupplierTrustOutput = {
    trustScore: scoring.trustScore,
    reasons: scoring.reasons,
    warnings: scoring.warnings,
    extractedSignals: scoring.extractedSignals,
    blocked_or_captcha: result.blocked_or_captcha,
    extraction_confidence: result.extraction_confidence,
  };

  globalCache.set(cacheKey, output);

  return output;
}

import { SupplierDetails } from "../parsers/supplierParser";

export interface TrustScoreResult {
  trustScore: number;
  reasons: string[];
  warnings: string[];
  extractedSignals: {
    supplierName: string | null;
    yearsOnAlibaba: number | null;
    location: string | null;
    businessType: string | null;
    employeeCount: string | null;
    responseRate: string | null;
    tradeAssurance: boolean;
    verifiedStatus: string | null;
    certificationsCount: number;
    certificationsList: string[];
  };
}

/**
 * Calculates a trust score between 0-100 based on supplier signals.
 */
export function calculateTrustScore(supplier: SupplierDetails): TrustScoreResult {
  let score = 40; // Base score for a basic active profile
  const reasons: string[] = ["Base trust score: +40"];
  const warnings: string[] = [];

  // 1. Years on Alibaba
  const years = supplier.yearsOnAlibaba;
  if (years !== null) {
    if (years >= 10) {
      score += 30;
      reasons.push(`Established Supplier: +30 (${years} years on Alibaba)`);
    } else if (years >= 5) {
      score += 20;
      reasons.push(`Experienced Supplier: +20 (${years} years on Alibaba)`);
    } else if (years >= 2) {
      score += 10;
      reasons.push(`Active Supplier: +10 (${years} years on Alibaba)`);
    } else {
      score += 2;
      reasons.push(`New Supplier: +2 (${years} year(s) on Alibaba)`);
      warnings.push(`Supplier is relatively new to Alibaba (${years} year(s)).`);
    }
  } else {
    warnings.push("Could not determine supplier's years on Alibaba.");
  }

  // 2. Verified status (Gold / Verified Supplier)
  const verified = supplier.verifiedStatus;
  if (verified && /verified|gold/i.test(verified)) {
    score += 20;
    reasons.push(`Verification Badge: +20 (${verified})`);
  } else {
    warnings.push("Supplier has no active verification badge (Not Verified or Gold Supplier).");
  }

  // 3. Trade Assurance
  if (supplier.tradeAssurance) {
    score += 15;
    reasons.push("Trade Assurance Enabled: +15");
  } else {
    warnings.push("Trade Assurance is not explicitly enabled.");
  }

  // 4. Response Rate
  if (supplier.responseRate) {
    const rateMatch = supplier.responseRate.match(/(\d+)/);
    if (rateMatch) {
      const rate = parseInt(rateMatch[1], 10);
      if (rate >= 95) {
        score += 10;
        reasons.push(`Excellent Response Rate: +10 (${rate}%)`);
      } else if (rate >= 80) {
        score += 5;
        reasons.push(`Good Response Rate: +5 (${rate}%)`);
      } else if (rate < 60) {
        warnings.push(`Low response rate detected (${rate}%).`);
      }
    }
  } else {
    warnings.push("No visible response rate data.");
  }

  // 5. Certifications (ISO 9001, CE, etc.)
  const certs = supplier.certifications;
  if (certs && certs.length > 0) {
    const certPoints = Math.min(certs.length * 5, 10);
    score += certPoints;
    reasons.push(`Certifications Uploaded: +${certPoints} (${certs.slice(0, 3).join(", ")})`);
  }

  // Ensure bounds
  score = Math.max(0, Math.min(100, score));

  return {
    trustScore: score,
    reasons,
    warnings,
    extractedSignals: {
      supplierName: supplier.supplierName,
      yearsOnAlibaba: supplier.yearsOnAlibaba,
      location: supplier.location,
      businessType: supplier.businessType,
      employeeCount: supplier.employeeCount,
      responseRate: supplier.responseRate,
      tradeAssurance: supplier.tradeAssurance,
      verifiedStatus: supplier.verifiedStatus,
      certificationsCount: supplier.certifications ? supplier.certifications.length : 0,
      certificationsList: supplier.certifications || [],
    },
  };
}

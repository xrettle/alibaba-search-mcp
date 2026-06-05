import { z } from "zod";
import { scrapePage } from "../lib/browser";
import { parseSupplierPage, SupplierDetails } from "../lib/parsers/supplierParser";
import { globalCache } from "../lib/cache";

export const getAlibabaSupplierDetailsSchema = z.object({
  supplierUrl: z.string().url("Must be a valid URL link."),
});

export type GetAlibabaSupplierDetailsInput = z.infer<typeof getAlibabaSupplierDetailsSchema>;

export interface GetAlibabaSupplierDetailsOutput {
  details: SupplierDetails | null;
  blocked_or_captcha: boolean;
  extraction_confidence: number;
}

/**
 * Retrieves company profile details for a specific Alibaba supplier link.
 */
export async function getAlibabaSupplierDetails(
  input: GetAlibabaSupplierDetailsInput
): Promise<GetAlibabaSupplierDetailsOutput> {
  let url = input.supplierUrl.trim();
  if (url.startsWith("//")) {
    url = `https:${url}`;
  }

  // Normalize supplier URLs: redirect root storefront subdomains to company_profile.html
  try {
    const urlObj = new URL(url);
    if (
      urlObj.hostname.endsWith(".en.alibaba.com") &&
      (urlObj.pathname === "/" || urlObj.pathname === "")
    ) {
      urlObj.pathname = "/company_profile.html";
      url = urlObj.toString();
    }
  } catch (err) {
    console.warn(`[SupplierTool] Could not parse or normalize supplier URL: ${url}`);
  }

  const cacheKey = `supplier_${url}`;
  const cached = globalCache.get<GetAlibabaSupplierDetailsOutput>(cacheKey);
  if (cached) {
    console.log(`[Cache] Hit for: ${cacheKey}`);
    return cached;
  }

  const scrapeResult = await scrapePage(url, parseSupplierPage);
  const details = scrapeResult.data;

  // Guarantee keys are present with nulls if missing (consistent JSON keys)
  const cleanDetails: SupplierDetails | null = details
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

  const output: GetAlibabaSupplierDetailsOutput = {
    details: cleanDetails,
    blocked_or_captcha: scrapeResult.blockedOrCaptcha,
    extraction_confidence: scrapeResult.extractionConfidence,
  };

  if (!scrapeResult.blockedOrCaptcha && scrapeResult.data && scrapeResult.data.supplierName) {
    globalCache.set(cacheKey, output);
  }

  return output;
}

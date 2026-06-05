import { z } from "zod";
import { scrapePage } from "../lib/browser";
import { parseProductPage, ProductDetails } from "../lib/parsers/productParser";
import { globalCache } from "../lib/cache";

export const getAlibabaProductDetailsSchema = z.object({
  productUrl: z.string().url("Must be a valid URL link."),
});

export type GetAlibabaProductDetailsInput = z.infer<typeof getAlibabaProductDetailsSchema>;

export interface GetAlibabaProductDetailsOutput {
  details: ProductDetails | null;
  blocked_or_captcha: boolean;
  extraction_confidence: number;
}

/**
 * Retrieves deep specification details for a specific Alibaba product page.
 */
export async function getAlibabaProductDetails(
  input: GetAlibabaProductDetailsInput
): Promise<GetAlibabaProductDetailsOutput> {
  let url = input.productUrl.trim();
  if (url.startsWith("//")) {
    url = `https:${url}`;
  }

  const cacheKey = `product_${url}`;
  const cached = globalCache.get<GetAlibabaProductDetailsOutput>(cacheKey);
  if (cached) {
    console.log(`[Cache] Hit for: ${cacheKey}`);
    return cached;
  }

  const scrapeResult = await scrapePage(url, parseProductPage);
  const details = scrapeResult.data;

  // Guarantee keys are present with nulls if missing (ensuring consistent JSON keys)
  const cleanDetails: ProductDetails | null = details
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

  const output: GetAlibabaProductDetailsOutput = {
    details: cleanDetails,
    blocked_or_captcha: scrapeResult.blockedOrCaptcha,
    extraction_confidence: scrapeResult.extractionConfidence,
  };

  if (!scrapeResult.blockedOrCaptcha && scrapeResult.data && scrapeResult.data.title) {
    globalCache.set(cacheKey, output);
  }

  return output;
}

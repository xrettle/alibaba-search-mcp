import { z } from "zod";
import { scrapePage } from "../lib/browser";
import { parseSearchPage, SearchProductResult } from "../lib/parsers/searchParser";
import { globalCache } from "../lib/cache";

export const searchAlibabaProductsSchema = z.object({
  query: z.string(),
  page: z.number().optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  maxMOQ: z.number().optional(),
  sortBy: z.enum(["relevance", "price_asc", "price_desc", "moq_asc", "moq_desc"]).optional(),
  supplierCountry: z.string().optional(),
  verifiedOnly: z.boolean().optional(),
});

export type SearchAlibabaProductsInput = z.infer<typeof searchAlibabaProductsSchema>;

export interface SearchAlibabaProductsOutput {
  results: SearchProductResult[];
  blocked_or_captcha: boolean;
  extraction_confidence: number;
}

/**
 * Executes a search for products on Alibaba.
 */
export async function searchAlibabaProducts(
  input: SearchAlibabaProductsInput
): Promise<SearchAlibabaProductsOutput> {
  const { query, page = 1, minPrice, maxPrice, maxMOQ, sortBy, supplierCountry, verifiedOnly } = input;

  // Build target URL
  let url = `https://www.alibaba.com/trade/search?SearchText=${encodeURIComponent(query)}&page=${page}`;

  if (minPrice !== undefined) url += `&minPrice=${minPrice}`;
  if (maxPrice !== undefined) url += `&maxPrice=${maxPrice}`;
  if (maxMOQ !== undefined) url += `&moq=${maxMOQ}`;
  if (supplierCountry !== undefined) url += `&country=${encodeURIComponent(supplierCountry)}`;

  if (sortBy) {
    if (sortBy === "price_asc") url += "&sortType=price-asc";
    else if (sortBy === "price_desc") url += "&sortType=price-desc";
    else if (sortBy === "moq_asc") url += "&sortType=moq-asc";
    else if (sortBy === "moq_desc") url += "&sortType=moq-desc";
  }

  if (verifiedOnly) {
    url += "&certCategory=100009115"; // verified suppliers
  }

  const cacheKey = `search_${url}`;
  const cached = globalCache.get<SearchAlibabaProductsOutput>(cacheKey);
  if (cached) {
    console.log(`[Cache] Hit for: ${cacheKey}`);
    return cached;
  }

  const scrapeResult = await scrapePage(url, parseSearchPage);
  const results = scrapeResult.data || [];

  // Guarantee keys are present with nulls if missing (avoiding undefined property drops)
  const cleanResults: SearchProductResult[] = results.map((item) => ({
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

  const output: SearchAlibabaProductsOutput = {
    results: cleanResults,
    blocked_or_captcha: scrapeResult.blockedOrCaptcha,
    extraction_confidence: scrapeResult.extractionConfidence,
  };

  if (!scrapeResult.blockedOrCaptcha && scrapeResult.data && scrapeResult.data.length > 0) {
    globalCache.set(cacheKey, output);
  }

  return output;
}

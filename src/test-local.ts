import dotenv from "dotenv";
dotenv.config();

import { searchAlibabaProducts } from "./tools/searchAlibabaProducts";
import { assessAlibabaSupplierTrust } from "./tools/assessAlibabaSupplierTrust";
import { closeBrowser } from "./lib/browser";

/**
 * Runs a smoke test performing an Alibaba search and analyzing the trust score of the first supplier.
 */
async function runSmokeTest() {
  console.log("==================================================");
  console.log("         ALIBABA MCP SERVER SMOKE TEST            ");
  console.log("==================================================");

  const query = "wireless headphones";
  console.log(`\n[Test] 1. Searching Alibaba products for query: "${query}"...`);

  try {
    const searchResult = await searchAlibabaProducts({ query, page: 1 });
    
    console.log("\n[Test] Search Results Meta:");
    console.log(`- Blocked or Captcha: ${searchResult.blocked_or_captcha}`);
    console.log(`- Extraction Confidence: ${searchResult.extraction_confidence}`);
    console.log(`- Total Results Parsed: ${searchResult.results.length}`);

    if (searchResult.results.length > 0) {
      const firstItem = searchResult.results[0];
      console.log("\n[Test] First Product Matched:");
      console.log(`- Title: ${firstItem.title}`);
      console.log(`- Price Text: ${firstItem.priceText}`);
      console.log(`- MOQ Text: ${firstItem.moqText}`);
      console.log(`- Product Link: ${firstItem.productUrl}`);
      console.log(`- Supplier Name: ${firstItem.supplierName}`);
      console.log(`- Supplier Link: ${firstItem.supplierUrl}`);

      if (firstItem.supplierUrl) {
        console.log(`\n[Test] 2. Assessing Trust for Supplier: "${firstItem.supplierName}"...`);
        console.log(`- Supplier URL: ${firstItem.supplierUrl}`);

        const trustResult = await assessAlibabaSupplierTrust({
          supplierUrl: firstItem.supplierUrl,
        });

        console.log("\n[Test] Supplier Trust Assessment:");
        console.log(`- Trust Score (0-100): ${trustResult.trustScore}`);
        console.log(`- Reasons:`, trustResult.reasons);
        console.log(`- Warnings:`, trustResult.warnings);
        console.log(`- Blocked or Captcha: ${trustResult.blocked_or_captcha}`);
        console.log(`- Extraction Confidence: ${trustResult.extraction_confidence}`);

        if (trustResult.extractedSignals) {
          console.log("\n[Test] Extracted Signals Details:");
          console.log(`  - Location: ${trustResult.extractedSignals.location}`);
          console.log(`  - Years on Alibaba: ${trustResult.extractedSignals.yearsOnAlibaba}`);
          console.log(`  - Verified Status: ${trustResult.extractedSignals.verifiedStatus}`);
          console.log(`  - Business Type: ${trustResult.extractedSignals.businessType}`);
          console.log(`  - Total Employees: ${trustResult.extractedSignals.employeeCount}`);
          console.log(`  - Certifications Uploaded: ${trustResult.extractedSignals.certificationsCount}`);
        }
      } else {
        console.log("\n[Test] Warning: First search result did not specify a supplier URL. Cannot test trust scoring.");
      }
    } else {
      console.log("\n[Test] Warning: No products were scraped. This may be due to anti-bot blocks or captcha.");
    }
  } catch (error: any) {
    console.error("\n[Test] Error: Smoke test execution crashed:", error.message || error);
  } finally {
    console.log("\n[Test] Cleaning up active browser contexts...");
    await closeBrowser();
    console.log("[Test] Smoke test complete.");
    console.log("==================================================");
  }
}

runSmokeTest();

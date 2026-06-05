"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const searchAlibabaProducts_1 = require("./tools/searchAlibabaProducts");
const assessAlibabaSupplierTrust_1 = require("./tools/assessAlibabaSupplierTrust");
const browser_1 = require("./lib/browser");
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
        const searchResult = await (0, searchAlibabaProducts_1.searchAlibabaProducts)({ query, page: 1 });
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
                const trustResult = await (0, assessAlibabaSupplierTrust_1.assessAlibabaSupplierTrust)({
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
            }
            else {
                console.log("\n[Test] Warning: First search result did not specify a supplier URL. Cannot test trust scoring.");
            }
        }
        else {
            console.log("\n[Test] Warning: No products were scraped. This may be due to anti-bot blocks or captcha.");
        }
    }
    catch (error) {
        console.error("\n[Test] Error: Smoke test execution crashed:", error.message || error);
    }
    finally {
        console.log("\n[Test] Cleaning up active browser contexts...");
        await (0, browser_1.closeBrowser)();
        console.log("[Test] Smoke test complete.");
        console.log("==================================================");
    }
}
runSmokeTest();

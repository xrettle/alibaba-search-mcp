"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseSupplierPage = parseSupplierPage;
const utils_1 = require("../utils");
/**
 * Parses details from an Alibaba supplier profile/company page.
 */
async function parseSupplierPage(page) {
    // Let the company profile details bootstrap
    await page
        .waitForSelector(".company-name, .company-title, .info-table, h1, .contact-info, tr, dl", {
        timeout: 8000,
    })
        .catch(() => {
        console.log("[SupplierParser] Timeout waiting for profile indicators. Parsing current state.");
    });
    const extracted = await page.evaluate(() => {
        // 1. Supplier Name
        const nameEl = document.querySelector(".company-name, .company-title, h1.name, .supplier-name, .profile-name, .org-name");
        const supplierName = nameEl ? nameEl.textContent : null;
        // 2. Years on Alibaba
        const yearEl = document.querySelector(".year-icon, .company-year, .years-on-alibaba, .elements-company-year, .years-icon, .year-num");
        const yearText = yearEl ? yearEl.textContent : null;
        // 3. Trade Assurance
        const taEl = document.querySelector(".trade-assurance, .ta-icon, .trade-assurance-icon, [title*='Trade Assurance'], img[src*='assurance'], .trade-assurance-details");
        const tradeAssurance = !!taEl || document.body.innerText.includes("Trade Assurance");
        // 4. Verified Status
        const verifiedEl = document.querySelector(".verified-icon, .verified-tag, .gold-supplier, .verified-supplier-title, img[src*='verified'], .verified-info");
        let verifiedStatus = null;
        if (verifiedEl) {
            verifiedStatus =
                verifiedEl.textContent?.trim() || verifiedEl.getAttribute("title") || "Verified";
        }
        else if (document.body.innerText.includes("Verified Supplier")) {
            verifiedStatus = "Verified Supplier";
        }
        // 5. Look up table rows for key attributes
        let location = null;
        let businessType = null;
        let employeeCount = null;
        let responseRate = null;
        let mainProductsText = null;
        // Search tables or descriptions
        const rows = Array.from(document.querySelectorAll("tr, .overview-item, .info-item, .profile-row, dl, .attr-row"));
        rows.forEach((row) => {
            const text = row.textContent || "";
            const lowerText = text.toLowerCase();
            // Look for Country/Region
            if (lowerText.includes("country/region") ||
                lowerText.includes("location") ||
                lowerText.includes("province/state")) {
                const valEl = row.querySelector("td:last-child, dd, .value, .info-desc");
                if (valEl && valEl.textContent)
                    location = valEl.textContent;
            }
            // Look for Business Type
            if (lowerText.includes("business type")) {
                const valEl = row.querySelector("td:last-child, dd, .value, .info-desc");
                if (valEl && valEl.textContent)
                    businessType = valEl.textContent;
            }
            // Look for Employee Count
            if (lowerText.includes("total employees") ||
                lowerText.includes("employee count") ||
                lowerText.includes("no. of employees") ||
                lowerText.includes("number of employees")) {
                const valEl = row.querySelector("td:last-child, dd, .value, .info-desc");
                if (valEl && valEl.textContent)
                    employeeCount = valEl.textContent;
            }
            // Look for Response Rate
            if (lowerText.includes("response rate") || lowerText.includes("response time")) {
                const valEl = row.querySelector("td:last-child, dd, .value, .info-desc, .rate-num");
                if (valEl && valEl.textContent)
                    responseRate = valEl.textContent;
            }
            // Look for Main Products
            if (lowerText.includes("main products") || lowerText.includes("main product categories")) {
                const valEl = row.querySelector("td:last-child, dd, .value, .info-desc");
                if (valEl && valEl.textContent)
                    mainProductsText = valEl.textContent;
            }
        });
        // 6. Certifications
        const certifications = [];
        const certEls = document.querySelectorAll(".cert-item, .certification-tag, .certificates-list li, .cert-name, .license-item");
        certEls.forEach((el) => {
            const txt = el.textContent?.trim();
            if (txt && !certifications.includes(txt) && txt.length > 2) {
                certifications.push(txt);
            }
        });
        // Fallback: search common cert abbreviations in text
        const certMatches = document.body.innerText.match(/\b(ISO\s*9001|ISO\s*14001|CE\s*Certification|CE|FCC|RoHS|GMP|HACCP|SGS|TUV)\b/gi);
        if (certMatches) {
            certMatches.forEach((c) => {
                const cleaned = c.toUpperCase().trim();
                if (!certifications.includes(cleaned))
                    certifications.push(cleaned);
            });
        }
        // 7. Company Description
        const descEl = document.querySelector(".company-description, .description-content, .about-us-content, .company-introduction, .intro-content");
        const companyDescription = descEl ? descEl.textContent : null;
        // 8. Raw text snapshot
        const rawVisibleText = document.body.innerText || "";
        return {
            supplierName,
            yearText,
            location,
            businessType,
            employeeCount,
            certifications: certifications.length > 0 ? certifications : null,
            responseRate,
            tradeAssurance,
            verifiedStatus,
            mainProductsText: mainProductsText,
            companyDescription,
            rawVisibleText: rawVisibleText.substring(0, 8000),
        };
    });
    // Post process cleaning
    let yearsOnAlibaba = null;
    if (extracted.yearText) {
        const match = extracted.yearText.match(/(\d+)\s*y/i);
        if (match) {
            yearsOnAlibaba = parseInt(match[1], 10);
        }
        else {
            const num = parseInt(extracted.yearText.replace(/[^0-9]/g, ""), 10);
            if (!isNaN(num))
                yearsOnAlibaba = num;
        }
    }
    // Parse main categories
    let mainCategories = null;
    if (extracted.mainProductsText) {
        mainCategories = extracted.mainProductsText
            .split(/[,;\n]/)
            .map((s) => s.trim())
            .filter((s) => s.length > 2);
    }
    const data = {
        supplierName: (0, utils_1.cleanText)(extracted.supplierName),
        yearsOnAlibaba,
        location: (0, utils_1.cleanText)(extracted.location),
        businessType: (0, utils_1.cleanText)(extracted.businessType),
        employeeCount: (0, utils_1.cleanText)(extracted.employeeCount),
        certifications: extracted.certifications,
        responseRate: (0, utils_1.cleanText)(extracted.responseRate),
        tradeAssurance: extracted.tradeAssurance,
        verifiedStatus: (0, utils_1.cleanText)(extracted.verifiedStatus),
        mainCategories: mainCategories && mainCategories.length > 0 ? mainCategories : null,
        companyDescription: (0, utils_1.cleanText)(extracted.companyDescription),
        rawVisibleText: extracted.rawVisibleText,
    };
    const confidence = data.supplierName ? 0.94 : 0.15;
    return { data, confidence };
}

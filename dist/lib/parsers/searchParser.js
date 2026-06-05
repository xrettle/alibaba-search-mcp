"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseSearchPage = parseSearchPage;
const utils_1 = require("../utils");
/**
 * Parses search results from an Alibaba product search page.
 */
async function parseSearchPage(page) {
    // Let the dynamic search list render
    await page
        .waitForSelector(".fy23-search-card, .card-layout, [data-content='productItem'], .search-card-item, .gallery-card-layout-item, .list-no-v2-outter", { timeout: 8000 })
        .catch(() => {
        console.log("[SearchParser] Timeout waiting for standard card selectors. Attempting fallback parse.");
    });
    // Extract from the page
    const extracted = await page.evaluate(() => {
        // 1. Gather all potential card elements
        let cards = Array.from(document.querySelectorAll(".fy23-search-card, .card-layout, [data-content='productItem'], .search-card-item, .gallery-card-layout-item, .list-no-v2-outter, .search-product-item, div[data-spm='product-card']"));
        // Fallback: If no wrappers found, collect a[href*="/product-detail/"] and construct virtual cards from parents
        if (cards.length === 0) {
            const links = Array.from(document.querySelectorAll("a[href*='/product-detail/']"));
            const uniqueCards = new Set();
            links.forEach((lnk) => {
                let parent = lnk.parentElement;
                for (let i = 0; i < 5; i++) {
                    if (parent &&
                        (parent.clientHeight > 150 ||
                            parent.classList.contains("card") ||
                            parent.getAttribute("data-content") === "productItem")) {
                        uniqueCards.add(parent);
                        break;
                    }
                    parent = parent?.parentElement || null;
                }
            });
            cards = Array.from(uniqueCards);
        }
        return cards.map((card) => {
            // Extract title
            const titleEl = card.querySelector(".card-title, .search-card-e-title, .elements-title-normal, h2, h3, a[href*='/product-detail/'] span, .title-link");
            const title = titleEl ? titleEl.textContent : null;
            // Extract URL
            const linkEl = card.querySelector("a[href*='/product-detail/']");
            const productUrl = linkEl ? linkEl.href : null;
            // Extract Image
            const imgEl = card.querySelector("img.card-img, img.search-card-e-img, .elements-img img, img[src*='alicdn'], .search-card-e-img-container img");
            const imageUrl = imgEl
                ? imgEl.src || imgEl.getAttribute("data-src") || imgEl.getAttribute("src")
                : null;
            // Extract Price
            const priceEl = card.querySelector(".elements-price-normal, .price-list, .search-card-e-price-main, .search-card-e-price, [data-content='price'], .price");
            const priceText = priceEl ? priceEl.textContent : null;
            // Extract MOQ
            const moqEl = card.querySelector(".elements-moq-normal, .min-order, .search-card-e-moq, [data-content='moq'], .moq");
            const moqText = moqEl ? moqEl.textContent : null;
            // Extract Supplier Name
            const supplierEl = card.querySelector(".elements-company-name, .company-name, .supplier-name, a[href*='.en.alibaba.com'], .supplier-name-container");
            const supplierName = supplierEl ? supplierEl.textContent : null;
            // Extract Supplier URL
            const supplierLinkEl = card.querySelector("a[href*='.en.alibaba.com']");
            const supplierUrl = supplierLinkEl ? supplierLinkEl.href : null;
            // Extract Supplier Location
            const locationEl = card.querySelector(".elements-country-flag, .country-flag, .supplier-country, .supplier-location, .country-name, .supplier-country-name");
            const supplierLocation = locationEl
                ? locationEl.getAttribute("title") || locationEl.textContent
                : null;
            // Extract Years
            const yearEl = card.querySelector(".elements-company-year, .elements-years-icon, .supplier-year, .year-icon, .years-on-alibaba");
            const yearText = yearEl ? yearEl.textContent : null;
            // Extract Badges
            const badges = [];
            const badgeEls = card.querySelectorAll(".elements-verified-icon, .verified-icon, .trade-assurance, .supplier-badge, img[src*='verified'], img[src*='assurance'], .verified-supplier");
            badgeEls.forEach((badge) => {
                const text = badge.textContent?.trim() ||
                    badge.getAttribute("title")?.trim() ||
                    badge.getAttribute("alt")?.trim();
                if (text && !text.includes("http") && text.length > 2) {
                    badges.push(text);
                }
            });
            // Extract Description Snippet
            const descEl = card.querySelector(".search-card-e-desc, .product-description, .snippet, .short-description");
            const shortDescription = descEl ? descEl.textContent : null;
            return {
                title,
                productUrl,
                imageUrl,
                priceText,
                moqText,
                supplierName,
                supplierUrl,
                supplierLocation,
                yearText,
                badges,
                shortDescription,
            };
        });
    });
    // Post-process values outside the browser context
    const results = extracted
        .map((item) => {
        let yearsOnAlibaba = null;
        if (item.yearText) {
            const match = item.yearText.match(/(\d+)\s*y/i);
            if (match) {
                yearsOnAlibaba = parseInt(match[1], 10);
            }
            else {
                const num = parseInt(item.yearText.replace(/[^0-9]/g, ""), 10);
                if (!isNaN(num))
                    yearsOnAlibaba = num;
            }
        }
        return {
            title: (0, utils_1.cleanText)(item.title),
            productUrl: item.productUrl || null,
            imageUrl: item.imageUrl || null,
            priceText: (0, utils_1.cleanText)(item.priceText),
            moqText: (0, utils_1.cleanText)(item.moqText),
            supplierName: (0, utils_1.cleanText)(item.supplierName),
            supplierUrl: item.supplierUrl || null,
            supplierLocation: (0, utils_1.cleanText)(item.supplierLocation),
            yearsOnAlibaba,
            verificationBadges: item.badges && item.badges.length > 0 ? Array.from(new Set(item.badges)) : null,
            shortDescription: (0, utils_1.cleanText)(item.shortDescription),
        };
    })
        .filter((item) => item.title && item.productUrl); // Keep only cards that successfully resolved a title & link
    const confidence = results.length > 0 ? 0.95 : 0.1;
    return { data: results, confidence };
}

import { Page } from "playwright";
import { cleanText } from "../utils";

export interface ProductDetails {
  title: string | null;
  description: string | null;
  priceTiers: { quantity: string; price: string }[] | null;
  MOQ: string | null;
  specs: Record<string, string> | null;
  leadTime: string | null;
  images: string[] | null;
  supplierSummary: string | null;
  storefrontLinks: string[] | null;
  rawVisibleText: string | null;
}

/**
 * Parses details from an Alibaba product detail page.
 */
export async function parseProductPage(
  page: Page
): Promise<{ data: ProductDetails; confidence: number }> {
  // Let dynamic spec content and attributes bootstrap
  await page
    .waitForSelector(".pdp-info-title, h1, .product-title, .specification-table, .do-entry-item", {
      timeout: 8000,
    })
    .catch(() => {
      console.log("[ProductParser] Timeout waiting for standard pdp indicators. Parsing current state.");
    });

  const extracted = await page.evaluate(() => {
    // 1. Title
    const titleEl = document.querySelector(".pdp-info-title, h1, .product-title, .module-title");
    const title = titleEl ? titleEl.textContent : null;

    // 2. Price Tiers
    const priceTiers: { quantity: string; price: string }[] = [];
    const tierEls = document.querySelectorAll(
      ".price-tier, .price-range, .price-item, .price-ranges-list > div, .promotion-price-item, tr.price-row"
    );
    tierEls.forEach((el) => {
      const qtyEl = el.querySelector(".quantity, .tier-quantity, .price-range-title, .range-quantity, td:first-child");
      const prcEl = el.querySelector(".price, .tier-price, .price-range-price, .price-value, td:last-child");
      if (prcEl) {
        priceTiers.push({
          quantity: qtyEl?.textContent?.trim() || "1+",
          price: prcEl.textContent?.trim() || "",
        });
      }
    });

    // 3. MOQ
    const moqEl = document.querySelector(
      ".moq-number, .moq-value, .product-moq, .min-order-value, [data-content='moq'], .moq-val"
    );
    const MOQ = moqEl ? moqEl.textContent : null;

    // 4. Specs
    const specs: Record<string, string> = {};
    const attributeItems = Array.from(
      document.querySelectorAll(
        ".do-entry-item, .attribute-item, .product-property-item, .spec-item, tr.attribute-row, .product-attribute tr"
      )
    );
    attributeItems.forEach((el) => {
      const keyEl = el.querySelector(".attr-name, .property-title, .spec-title, td:first-child, th");
      const valEl = el.querySelector(".attr-value, .property-desc, .spec-value, td:last-child, td");
      if (keyEl && valEl) {
        const key = keyEl.textContent?.trim()?.replace(/:$/, "") || "";
        const val = valEl.textContent?.trim() || "";
        if (key && val && key !== val) {
          specs[key] = val;
        }
      }
    });

    // 5. Lead Time
    const leadTimeEl = document.querySelector(
      ".lead-time-wrapper, .lead-time-list, .shipping-lead-time, .delivery-info, .lead-time-table"
    );
    const leadTime = leadTimeEl ? leadTimeEl.textContent : null;

    // 6. Images
    const images: string[] = [];
    const imgEls = document.querySelectorAll(
      ".main-image, .detail-image, .detail-gallery img, .slider-item img, img.image-nav-item, .pic-list img"
    );
    imgEls.forEach((img) => {
      const src =
        img.getAttribute("src") ||
        img.getAttribute("data-src") ||
        img.getAttribute("original-src") ||
        img.getAttribute("data-lazy-src");
      if (src && src.includes("alicdn") && !src.includes("200x200") && !src.includes("50x50")) {
        // Build full URL if relative protocol
        const fullSrc = src.startsWith("//") ? `https:${src}` : src;
        images.push(fullSrc);
      }
    });

    // 7. Description text
    const descEl = document.querySelector(
      "#product-detail, .product-detail-introduction, .description-detail, .rich-text-description, .product-description, #detail-description"
    );
    const description = descEl ? descEl.textContent : null;

    // 8. Supplier Summary
    const supplierEl = document.querySelector(
      ".supplier-card, .supplier-info, .company-profile-card, .store-card, .company-info-panel"
    );
    const supplierSummary = supplierEl ? supplierEl.textContent : null;

    // 9. Storefront/Company links
    const storefrontLinks: string[] = [];
    const links = Array.from(document.querySelectorAll("a[href*='.en.alibaba.com']")) as HTMLAnchorElement[];
    links.forEach((l) => {
      if (l.href && !storefrontLinks.includes(l.href)) {
        storefrontLinks.push(l.href);
      }
    });

    // 10. Raw text snapshot
    const rawVisibleText = document.body.innerText || "";

    return {
      title,
      description,
      priceTiers: priceTiers.length > 0 ? priceTiers : null,
      MOQ,
      specs: Object.keys(specs).length > 0 ? specs : null,
      leadTime,
      images: Array.from(new Set(images)),
      supplierSummary,
      storefrontLinks: storefrontLinks.slice(0, 10),
      rawVisibleText: rawVisibleText.substring(0, 8000), // Keep first 8k chars of text to avoid context blowup
    };
  });

  // Post process cleaning
  const data: ProductDetails = {
    title: cleanText(extracted.title),
    description: cleanText(extracted.description),
    priceTiers: extracted.priceTiers,
    MOQ: cleanText(extracted.MOQ),
    specs: extracted.specs,
    leadTime: cleanText(extracted.leadTime),
    images: extracted.images.length > 0 ? extracted.images : null,
    supplierSummary: cleanText(extracted.supplierSummary),
    storefrontLinks: extracted.storefrontLinks,
    rawVisibleText: extracted.rawVisibleText,
  };

  // Compute confidence
  const confidence = data.title ? 0.92 : 0.1;

  return { data, confidence };
}

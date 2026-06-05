import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { searchAlibabaProducts, searchAlibabaProductsSchema } from "./tools/searchAlibabaProducts";
import { getAlibabaProductDetails, getAlibabaProductDetailsSchema } from "./tools/getAlibabaProductDetails";
import { getAlibabaSupplierDetails, getAlibabaSupplierDetailsSchema } from "./tools/getAlibabaSupplierDetails";
import { assessAlibabaSupplierTrust, assessAlibabaSupplierTrustSchema } from "./tools/assessAlibabaSupplierTrust";

export const mcpServer = new Server(
  {
    name: "alibaba-search-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register tools schema
mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "search_alibaba_products",
        description:
          "Search for products on Alibaba. Returns title, productUrl, imageUrl, priceText, moqText, supplierName, supplierUrl, supplierLocation, yearsOnAlibaba, verificationBadges, and shortDescription.",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "Search keywords query" },
            page: { type: "number", description: "Page number (defaults to 1)" },
            minPrice: { type: "number", description: "Minimum price threshold in USD" },
            maxPrice: { type: "number", description: "Maximum price threshold in USD" },
            maxMOQ: { type: "number", description: "Maximum MOQ units limit" },
            sortBy: {
              type: "string",
              enum: ["relevance", "price_asc", "price_desc", "moq_asc", "moq_desc"],
              description: "Sorting criteria for results",
            },
            supplierCountry: {
              type: "string",
              description: "Country code of the supplier (e.g. US, CN)",
            },
            verifiedOnly: {
              type: "boolean",
              description: "Only include verified supplier results",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "get_alibaba_product_details",
        description:
          "Fetch deep specifications, full description text, price tiers, MOQ, shipping time, spec sheet properties, images, supplier summary, and storefront links from an Alibaba product URL.",
        inputSchema: {
          type: "object",
          properties: {
            productUrl: { type: "string", description: "The full product detail page URL" },
          },
          required: ["productUrl"],
        },
      },
      {
        name: "get_alibaba_supplier_details",
        description:
          "Retrieve comprehensive details for an Alibaba supplier, including name, years on platform, location country, business type, employee count, verified status, certifications list, response rate, and company description.",
        inputSchema: {
          type: "object",
          properties: {
            supplierUrl: { type: "string", description: "The supplier storefront or profile page URL" },
          },
          required: ["supplierUrl"],
        },
      },
      {
        name: "assess_alibaba_supplier_trust",
        description:
          "Computes a quantitative trust score (0-100) for a supplier using visible signals, outlining reasons list, warning flags, and detailed verification indicators.",
        inputSchema: {
          type: "object",
          properties: {
            supplierUrl: { type: "string", description: "The supplier storefront or profile page URL" },
          },
          required: ["supplierUrl"],
        },
      },
    ],
  };
});

// Route tool calls
mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "search_alibaba_products": {
        const parsedArgs = searchAlibabaProductsSchema.parse(args);
        const result = await searchAlibabaProducts(parsedArgs);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          isError: false,
        };
      }
      case "get_alibaba_product_details": {
        const parsedArgs = getAlibabaProductDetailsSchema.parse(args);
        const result = await getAlibabaProductDetails(parsedArgs);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          isError: false,
        };
      }
      case "get_alibaba_supplier_details": {
        const parsedArgs = getAlibabaSupplierDetailsSchema.parse(args);
        const result = await getAlibabaSupplierDetails(parsedArgs);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          isError: false,
        };
      }
      case "assess_alibaba_supplier_trust": {
        const parsedArgs = assessAlibabaSupplierTrustSchema.parse(args);
        const result = await assessAlibabaSupplierTrust(parsedArgs);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          isError: false,
        };
      }
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    console.error(`[MCP] Tool execution error for ${name}:`, error);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              error: error.message || String(error),
              blocked_or_captcha: true,
              extraction_confidence: 0.0,
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }
});

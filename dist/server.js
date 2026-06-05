"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables before importing other project modules
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const sse_js_1 = require("@modelcontextprotocol/sdk/server/sse.js");
const mcp_1 = require("./mcp");
const browser_1 = require("./lib/browser");
const searchAlibabaProducts_1 = require("./tools/searchAlibabaProducts");
const getAlibabaProductDetails_1 = require("./tools/getAlibabaProductDetails");
const getAlibabaSupplierDetails_1 = require("./tools/getAlibabaSupplierDetails");
const assessAlibabaSupplierTrust_1 = require("./tools/assessAlibabaSupplierTrust");
const app = (0, express_1.default)();
// Set up cross-origin sharing and JSON parser
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const PORT = parseInt(process.env.PORT || "3000", 10);
const HOST = "0.0.0.0";
// Auth middleware enforcing bearer token security if MCP_BEARER_TOKEN is defined
const authMiddleware = (req, res, next) => {
    // Bypass authentication for the health check endpoint
    if (req.path === "/health") {
        return next();
    }
    const token = process.env.MCP_BEARER_TOKEN;
    if (!token || token.trim() === "") {
        // Bearer token is not set, allow public open access
        return next();
    }
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            error: "Unauthorized",
            message: "Missing or invalid Authorization header. A valid Bearer Token is required.",
        });
    }
    const requestToken = authHeader.split(" ")[1];
    if (requestToken !== token) {
        return res.status(401).json({
            error: "Unauthorized",
            message: "Access denied. Invalid Bearer Token.",
        });
    }
    next();
};
app.use(authMiddleware);
// --- Health Check Endpoint ---
app.get("/health", (req, res) => {
    res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        concurrency_limit: parseInt(process.env.MAX_CONCURRENCY || "2", 10),
        cache_ttl: parseInt(process.env.CACHE_TTL_SECONDS || "1800", 10),
        auth_enabled: !!(process.env.MCP_BEARER_TOKEN && process.env.MCP_BEARER_TOKEN.trim() !== ""),
    });
});
// --- Streamable HTTP (Direct JSON-RPC over POST) ---
// Perplexity Custom Connectors can invoke tools synchronously by sending direct POST payloads.
app.post("/call", async (req, res) => {
    try {
        const { method, params, id } = req.body || {};
        console.log(`[HTTP] Direct JSON-RPC call received for method: ${method}`);
        if (method === "tools/list") {
            return res.json({
                jsonrpc: "2.0",
                id,
                result: {
                    tools: [
                        {
                            name: "search_alibaba_products",
                            description: "Search for products on Alibaba. Returns title, productUrl, imageUrl, priceText, moqText, supplierName, supplierUrl, supplierLocation, yearsOnAlibaba, verificationBadges, and shortDescription.",
                            inputSchema: {
                                type: "object",
                                properties: {
                                    query: { type: "string" },
                                    page: { type: "number" },
                                    minPrice: { type: "number" },
                                    maxPrice: { type: "number" },
                                    maxMOQ: { type: "number" },
                                    sortBy: { type: "string", enum: ["relevance", "price_asc", "price_desc", "moq_asc", "moq_desc"] },
                                    supplierCountry: { type: "string" },
                                    verifiedOnly: { type: "boolean" }
                                },
                                required: ["query"]
                            }
                        },
                        {
                            name: "get_alibaba_product_details",
                            description: "Fetch deep specifications, full description text, price tiers, MOQ, shipping time, spec sheet properties, images, supplier summary, and storefront links from an Alibaba product URL.",
                            inputSchema: {
                                type: "object",
                                properties: {
                                    productUrl: { type: "string" }
                                },
                                required: ["productUrl"]
                            }
                        },
                        {
                            name: "get_alibaba_supplier_details",
                            description: "Retrieve comprehensive details for an Alibaba supplier, including name, years on platform, location country, business type, employee count, verified status, certifications list, response rate, and company description.",
                            inputSchema: {
                                type: "object",
                                properties: {
                                    supplierUrl: { type: "string" }
                                },
                                required: ["supplierUrl"]
                            }
                        },
                        {
                            name: "assess_alibaba_supplier_trust",
                            description: "Computes a quantitative trust score (0-100) for a supplier using visible signals, outlining reasons list, warning flags, and detailed verification indicators.",
                            inputSchema: {
                                type: "object",
                                properties: {
                                    supplierUrl: { type: "string" }
                                },
                                required: ["supplierUrl"]
                            }
                        }
                    ]
                }
            });
        }
        if (method === "tools/call") {
            const { name, arguments: args } = params || {};
            let result;
            switch (name) {
                case "search_alibaba_products": {
                    const parsedArgs = searchAlibabaProducts_1.searchAlibabaProductsSchema.parse(args);
                    result = await (0, searchAlibabaProducts_1.searchAlibabaProducts)(parsedArgs);
                    break;
                }
                case "get_alibaba_product_details": {
                    const parsedArgs = getAlibabaProductDetails_1.getAlibabaProductDetailsSchema.parse(args);
                    result = await (0, getAlibabaProductDetails_1.getAlibabaProductDetails)(parsedArgs);
                    break;
                }
                case "get_alibaba_supplier_details": {
                    const parsedArgs = getAlibabaSupplierDetails_1.getAlibabaSupplierDetailsSchema.parse(args);
                    result = await (0, getAlibabaSupplierDetails_1.getAlibabaSupplierDetails)(parsedArgs);
                    break;
                }
                case "assess_alibaba_supplier_trust": {
                    const parsedArgs = assessAlibabaSupplierTrust_1.assessAlibabaSupplierTrustSchema.parse(args);
                    result = await (0, assessAlibabaSupplierTrust_1.assessAlibabaSupplierTrust)(parsedArgs);
                    break;
                }
                default:
                    return res.status(404).json({
                        jsonrpc: "2.0",
                        id,
                        error: {
                            code: -32601,
                            message: `Tool ${name} not found.`
                        }
                    });
            }
            return res.json({
                jsonrpc: "2.0",
                id,
                result: {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(result, null, 2)
                        }
                    ],
                    isError: false
                }
            });
        }
        return res.status(400).json({
            jsonrpc: "2.0",
            id,
            error: {
                code: -32601,
                message: `Method ${method} not supported.`
            }
        });
    }
    catch (err) {
        console.error("[HTTP] Direct JSON-RPC execution failed:", err);
        res.status(500).json({
            jsonrpc: "2.0",
            id: req.body?.id || null,
            error: {
                code: -32603,
                message: err.message || "Internal error occurred during direct JSON-RPC execution.",
            },
        });
    }
});
// --- SSE (Server-Sent Events) Transport ---
// Handles standard MCP SSE connection management and message posting.
const activeTransports = new Map();
app.get("/sse", async (req, res) => {
    console.log("[SSE] New SSE client connection request received.");
    const transport = new sse_js_1.SSEServerTransport("/message", res);
    const sessionId = transport.sessionId;
    activeTransports.set(sessionId, transport);
    console.log(`[SSE] Created transport session ID: ${sessionId}`);
    await mcp_1.mcpServer.connect(transport);
    req.on("close", () => {
        console.log(`[SSE] Connection closed. Discarding session: ${sessionId}`);
        activeTransports.delete(sessionId);
    });
});
app.post("/message", async (req, res) => {
    const sessionId = req.query.sessionId;
    if (!sessionId) {
        return res.status(400).json({ error: "Missing required sessionId query parameter." });
    }
    const transport = activeTransports.get(sessionId);
    if (!transport) {
        return res.status(404).json({ error: `Active session not found for ID: ${sessionId}` });
    }
    console.log(`[SSE] Forwarding message for session: ${sessionId}`);
    await transport.handlePostMessage(req, res);
});
// Start Express Listener
const server = app.listen(PORT, HOST, () => {
    console.log(`===============================================`);
    console.log(`  Alibaba Research MCP Server running!         `);
    console.log(`  Listening on: http://${HOST}:${PORT}         `);
    console.log(`  Health Check: http://${HOST}:${PORT}/health  `);
    console.log(`  SSE Endpoint: http://${HOST}:${PORT}/sse     `);
    console.log(`  HTTP Endpoint: http://${HOST}:${PORT}/call   `);
    console.log(`===============================================`);
});
// Safe shutdown handlers
const shutdown = async () => {
    console.log("[Server] Received termination signal. Disposing resources...");
    server.close(async () => {
        await (0, browser_1.closeBrowser)();
        console.log("[Server] Server closed successfully.");
        process.exit(0);
    });
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

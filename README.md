# Alibaba Research MCP Server

A production-ready remote Model Context Protocol (MCP) server in Node.js and TypeScript. Built specifically for **Perplexity Custom Connectors**, it leverages Playwright to scrape search listings, product specifications, and supplier details from Alibaba while implementing caching, rate limiting, and defensive block detection.

---

## Features

1. **Dual Transport Support**: Works via standard MCP Server-Sent Events (SSE) OR synchronous direct JSON-RPC over HTTP (`POST /call`), which is ideal for Perplexity.
2. **Robust Scraping (Playwright)**: Employs randomized user-agents, stealth parameters, random rate limiting, and automatic page block/captcha detection.
3. **In-Memory Caching**: Caches scraping runs using an in-memory TTL cache to respect Alibaba and avoid redundant network calls.
4. **Queue Concurrency Control**: Restricts simultaneous browser instances to prevent CPU/memory bottlenecks (especially on Render's free tier).
5. **Trust Scoring Engine**: Synthesizes structured data points into a single Trust Score (0-100) with detailed reasons and warnings.
6. **Optional Authentication**: Supports standard Bearer-Token header authentication (`MCP_BEARER_TOKEN`).

---

## Project Structure

```text
├── src/
│   ├── lib/
│   │   ├── parsers/
│   │   │   ├── searchParser.ts       # Parses search listings
│   │   │   ├── productParser.ts      # Parses product details
│   │   │   └── supplierParser.ts     # Parses supplier profile
│   │   ├── scoring/
│   │   │   └── trustScore.ts         # Logic for 0-100 rating
│   │   ├── browser.ts                # Playwright lifecycle, stealth, and queue
│   │   ├── cache.ts                  # TTL Memory Cache
│   │   ├── rateLimiter.ts            # Concurrency limit implementation
│   │   └── utils.ts                  # Clean text, delays, and backoff retries
│   ├── tools/
│   │   ├── searchAlibabaProducts.ts  # Tool: search_alibaba_products
│   │   ├── getAlibabaProductDetails.ts # Tool: get_alibaba_product_details
│   │   ├── getAlibabaSupplierDetails.ts # Tool: get_alibaba_supplier_details
│   │   └── assessAlibabaSupplierTrust.ts # Tool: assess_alibaba_supplier_trust
│   ├── mcp.ts                        # MCP Server setup and tool registrations
│   ├── server.ts                     # Express server & SSE/HTTP routes
│   └── test-local.ts                 # Local smoke test runner
├── Dockerfile                        # Multi-stage Playwright runner
├── render.yaml                       # Render blueprint deployment setup
├── package.json
└── tsconfig.json
```

---

## Setup & Local Run

### Prerequisites
- Node.js (v18+)
- Playwright system dependencies (automatically configured on Docker, or via `npx playwright install chromium`)

### 1. Installation
Clone the repository, navigate to the folder, and run:
```bash
npm install
npx playwright install chromium
```

### 2. Configuration
Copy `.env.example` to `.env` and fill in the values:
```bash
cp .env.example .env
```
Key env variables:
* `PORT`: Server port (default `3000`)
* `MAX_CONCURRENCY`: Limit active Chromium tabs (default `2`)
* `CACHE_TTL_SECONDS`: Cache retention time (default `1800` / 30 mins)
* `MCP_BEARER_TOKEN`: Set a secret token to secure the endpoints. Leave blank for open access.

### 3. Run Development Server
```bash
npm run dev
```

### 4. Run Smoke Test
Run the local validation script to search wireless headphones and evaluate a supplier:
```bash
npm run test:local
```

---

## Deployment (Render)

Render supports Docker deployments. Because Playwright requires specific system libraries, **you must deploy this service using the Docker runtime** (not Node).

During startup, the server automatically reads `process.env.PORT` and binds the listener to host `0.0.0.0`. This ensures that Render can perform health check routing and expose the remote service correctly.

### Method 1: Render Blueprints (Recommended)
1. Push this repository to GitHub or GitLab.
2. Go to the Render Dashboard, click **New** -> **Blueprint**.
3. Connect your repository. Render will read the `render.yaml` file and configure the service automatically.
4. (Optional) Set the `MCP_BEARER_TOKEN` environment variable in the Render Dashboard to secure your server.

### Method 2: Manual Web Service
1. Create a **Web Service** on Render.
2. Select **Docker** as the Runtime (do NOT select Node).
3. Render injects PORT automatically. The app reads process.env.PORT and binds to 0.0.0.0.
4. Set the following environment variables:
   * `MAX_CONCURRENCY`: `1` (or `2`, keeping it low for free tier resource constraints)
   * `CACHE_TTL_SECONDS`: `1800`
   * `REQUEST_TIMEOUT_MS`: `30000`
   * `MCP_BEARER_TOKEN`: `your_secret_passphrase`

---

## Perplexity Remote MCP Configuration

Perplexity Custom Connectors let you connect remote MCP servers directly to Perplexity's query engine. Configure it with the following settings in your Perplexity developer dashboard:

* **Connector Type**: Remote MCP
* **Transport**: Streamable HTTP (preferred/recommended) or SSE (fallback)
* **Endpoint URL**:
  * **For Streamable HTTP**: `https://<render-service>.onrender.com/call`
  * **For SSE**: `https://<render-service>.onrender.com/sse`
* **Authentication**:
  * **If MCP_BEARER_TOKEN is set**: Configure Perplexity authentication to use **API Key / Bearer-style Token** and enter your secret token value.
  * **If MCP_BEARER_TOKEN is unset**: Configure Perplexity to use **Open Access** (no authentication).

---

## Trust Scoring Weights

The `assess_alibaba_supplier_trust` tool grades suppliers from **0 to 100** based on the following weights:

* **Base Score (40 pts)**: Awarded to any active, scraping-accessible profile.
* **Platform Seniority (Max +30 pts)**:
  * 10+ years on Alibaba: **+30 pts**
  * 5-9 years: **+20 pts**
  * 2-4 years: **+10 pts**
  * 1 year: **+2 pts**
* **Verification Status (Max +20 pts)**:
  * Has "Verified Supplier" or "Gold Supplier" badge: **+20 pts**
* **Trade Assurance (Max +15 pts)**:
  * Active Trade Assurance status: **+15 pts**
* **Response Rate (Max +10 pts)**:
  * >= 95%: **+10 pts**
  * >= 80%: **+5 pts**
* **Certifications (Max +10 pts)**:
  * +5 points per uploaded certification (e.g., ISO 9001, CE, RoHS) up to a max of **+10 pts** (2+ certs).

### Trust Score Warnings
The output includes warning flags for critical concerns:
* Seniority < 2 years.
* Missing verification credentials.
* Low response rate (< 60%).
* Disconnected or unverified Trade Assurance.

---

## Polite Web Scraping & Failures

To respect target servers and avoid anti-bot trigger loops:
1. **Concurrency Controls**: Requests are queued up to run in sequence or small batches.
2. **Polite Random Delays**: 1.5s to 3.5s delays are introduced prior to launching page navigations.
3. **Retry Backoffs**: Crashed requests are retried up to `MAX_RETRIES` times with exponential backoff delays.
4. **Graceful Cap**: In the event of a permanent block or captcha challenge, tools **do not crash**. They flag `blocked_or_captcha: true`, set `extraction_confidence: 0.0`, and return partial text snapshot data so that LLMs can still analyze whatever is visible.

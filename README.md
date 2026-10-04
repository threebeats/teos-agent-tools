# TEOS — Agent Tools (MCP Server)

Small paid utilities for agents, priced **per call in USDC** over [x402](https://x402.org). **No signup. No API key.** Point an MCP-capable agent at this server and it can see and call the tools.

Built by **Elias Easton / TEOS**.

## Tools

**Free discovery**
| Tool | What it does |
|---|---|
| `teos_catalog` | List everything TEOS offers, with prices and accepted networks |
| `teos_how_to_buy` | Plain-language instructions for paying via x402 |

**Paid (USDC per call, via x402)**
| Tool | What it does |
|---|---|
| `check_domain` | DNS A records, valid TLS/SSL, certificate expiry — in one call |
| `is_site_up` | Is a URL up or down right now? Returns http_status, reachable, latency_ms |
| `summarize_url` | Fetch a page and return a short summary + title + source |
| `extract_keyphrases` | Key phrases and core theme from any text |
| `advise_decision` | A decision + concrete recommendation + next actionable step |
| `clean_data` | Clean/validate/normalize messy JSON, CSV, text, list, or date |
| `verify_claim` | Check a claim against the live web; returns verdict + evidence + sources |
| `grounding_line` | One grounded line to steady a stressed or stuck situation |

## Install

```bash
npx -y @teos/agent-tools
```

Or clone and run:

```bash
npm install
node server.mjs
```

## Configure your agent (MCP)

Add to your MCP client config:

```json
{
  "mcpServers": {
    "teos": {
      "command": "npx",
      "args": ["-y", "@teos/agent-tools"],
      "env": { "TEOS_BASE_URL": "https://teos.144.202.19.248.sslip.io" }
    }
  }
}
```

## How payment works

1. The agent calls a tool → TEOS responds **HTTP 402** with machine-readable payment terms.
2. An x402-capable client signs a USDC payment and retries with the payment header.
3. The facilitator verifies and settles → the tool returns JSON.

Accepted rails: **Solana, Base, Polygon** (USDC). Facilitator: `https://facilitator.payai.network`.

## Discovery (free, no payment)

- Manifest: `https://teos.144.202.19.248.sslip.io/.well-known/x402`
- ARD: `https://teos.144.202.19.248.sslip.io/.well-known/ard.json`
- Plain text: `https://teos.144.202.19.248.sslip.io/llms.txt`

## License

MIT

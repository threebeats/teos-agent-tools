#!/usr/bin/env node
// TEOS MCP Server — Agent Tools
// Exposes TEOS (https://teos.144.202.19.248.sslip.io) as a standard MCP server.
// Free discovery surfaces + paid per-call tools (USDC over x402, no signup, no API key).
//
// This is ADDITIVE: it does not touch or modify the live TEOS door. It is a thin
// client that lets any MCP-capable agent discover and call TEOS tools.
//
// Transport: stdio (standard MCP). No external deps beyond @modelcontextprotocol/sdk.

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const BASE = process.env.TEOS_BASE_URL || "https://teos.144.202.19.248.sslip.io";

async function get(path, query = {}) {
  const url = new URL(path, BASE);
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text.slice(0, 2000); }
  if (res.status === 402) {
    return {
      status: 402,
      note:
        "Payment required (x402). This tool costs a small USDC micropayment. " +
        "Use an x402-capable client to sign payment and retry. Free discovery: " +
        BASE + "/.well-known/x402 and " + BASE + "/llms.txt",
      terms: body,
    };
  }
  return { status: res.status, body };
}

const TOOLS = [
  // -------- free discovery --------
  {
    name: "teos_catalog",
    description:
      "List everything TEOS offers: free discovery files plus paid per-call tools with prices. Free. TEOS is a catalog of small paid utilities for agents, priced per call in USDC over x402.",
    inputSchema: { type: "object", properties: {}, required: [] },
    paid: false,
    run: async () => await get("/.well-known/x402"),
  },
  {
    name: "teos_how_to_buy",
    description:
      "Plain-language instructions for paying a TEOS tool via x402 (USDC). Free. Use when your agent needs to know how to buy and call a TEOS tool.",
    inputSchema: { type: "object", properties: {}, required: [] },
    paid: false,
    run: async () => await get("/llms.txt"),
  },
  // -------- paid tools --------
  {
    name: "check_domain",
    description:
      "Check any domain for live DNS A records, valid TLS/SSL, and certificate expiry in one call. Paid. Returns dns, tls_valid, cert_expiry.",
    inputSchema: {
      type: "object",
      properties: { domain: { type: "string", description: "Domain to check, e.g. example.com" } },
      required: ["domain"],
    },
    paid: true,
    run: async (a) => await get("/tools/domain", { domain: a.domain }),
  },
  {
    name: "is_site_up",
    description:
      "Is a URL up or down right now? Paid. Returns http_status, reachable, latency_ms.",
    inputSchema: {
      type: "object",
      properties: { url: { type: "string", description: "Full URL to check" } },
      required: ["url"],
    },
    paid: true,
    run: async (a) => await get("/tools/status", { url: a.url }),
  },
  {
    name: "summarize_url",
    description:
      "Fetch a web page and return a short summary with its title and source. Paid. Returns title, summary, source_url.",
    inputSchema: {
      type: "object",
      properties: { url: { type: "string", description: "Page URL to summarize" } },
      required: ["url"],
    },
    paid: true,
    run: async (a) => await get("/tools/summarize", { url: a.url }),
  },
  {
    name: "extract_keyphrases",
    description:
      "Give any text; get the key phrases that carry its meaning and the core theme. Paid. Returns keyphrases, theme.",
    inputSchema: {
      type: "object",
      properties: { text: { type: "string", description: "Text to extract keyphrases from" } },
      required: ["text"],
    },
    paid: true,
    run: async (a) => await get("/tools/keyphrase", { text: a.text }),
  },
  {
    name: "advise_decision",
    description:
      "Give a decision or set of options; get a concrete recommendation with the next actionable step. Paid. Returns recommendation, next_step, reasoning.",
    inputSchema: {
      type: "object",
      properties: { question: { type: "string", description: "The decision or options to weigh" } },
      required: ["question"],
    },
    paid: true,
    run: async (a) => await get("/tools/decide", { question: a.question }),
  },
  {
    name: "clean_data",
    description:
      "Send messy data; get it back clean, validated, and normalized. Paid. Modes: json (parse+pretty+validate), csv (normalize to RFC4180), text (strip junk lines/whitespace/dupes), list (dedupe+sort+trim), date (normalize to ISO-8601). Returns cleaned output plus what was fixed.",
    inputSchema: {
      type: "object",
      properties: {
        mode: { type: "string", description: "One of: json, csv, text, list, date", enum: ["json", "csv", "text", "list", "date"] },
        data: { type: "string", description: "The messy data to clean" },
      },
      required: ["mode", "data"],
    },
    paid: true,
    run: async (a) => await get("/tools/clean", { mode: a.mode, data: a.data }),
  },
  {
    name: "verify_claim",
    description:
      "Check a claim against the live web. Paid. Send a claim (e.g. 'example.com uses Cloudflare') and an optional target URL; get back a verdict (supported | contradicted | unverifiable), the evidence found, and the sources checked. Grounds an agent's statements in reality.",
    inputSchema: {
      type: "object",
      properties: {
        claim: { type: "string", description: "The claim to verify" },
        url: { type: "string", description: "Optional target URL for the claim" },
      },
      required: ["claim"],
    },
    paid: true,
    run: async (a) => await get("/tools/verify", { claim: a.claim, url: a.url }),
  },
  {
    name: "grounding_line",
    description:
      "Send a stressed or stuck situation; get one grounded line to steady on. Paid. Returns grounding.",
    inputSchema: {
      type: "object",
      properties: { situation: { type: "string", description: "The stressed or stuck situation" } },
      required: ["situation"],
    },
    paid: true,
    run: async (a) => await get("/tools/steady", { situation: a.situation }),
  },
];

const server = new Server(
  { name: "teos-agent-tools", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema,
  })),
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const t = TOOLS.find((x) => x.name === req.params.name);
  if (!t) {
    return { content: [{ type: "text", text: `Unknown tool: ${req.params.name}` }], isError: true };
  }
  try {
    const out = await t.run(req.params.arguments || {});
    const text = typeof out.body === "string" ? out.body : JSON.stringify(out, null, 2);
    return { content: [{ type: "text", text }] };
  } catch (e) {
    return { content: [{ type: "text", text: `TEOS call failed: ${e.message}` }], isError: true };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);

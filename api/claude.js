// api/claude.js
// Vercel serverless function — your ANTHROPIC_API_KEY lives here, never in the browser.

const Anthropic = require("@anthropic-ai/sdk");

// Basic rate limiting using in-memory store (resets on cold start).
// For production, replace with Redis (Upstash free tier works great with Vercel).
const requestCounts = new Map();
const RATE_LIMIT = 20; // requests per hour per IP
const RATE_WINDOW = 60 * 60 * 1000; // 1 hour in ms

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = requestCounts.get(ip) || { count: 0, resetAt: now + RATE_WINDOW };
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + RATE_WINDOW;
  }
  entry.count++;
  requestCounts.set(ip, entry);
  return entry.count <= RATE_LIMIT;
}

// Allowed system prompt types — prevents prompt injection from the frontend
const ALLOWED_MODES = ["strategy", "redline"];

const SYSTEM_PROMPTS = {
  strategy: `You are a healthcare contracting expert specializing in doula and perinatal services reimbursement.
You help a doula services startup get contracts with insurance payers in California and Washington state.
You understand Medicaid (Medi-Cal / Apple Health), commercial insurance, HEDIS metrics, and how to negotiate favorable contracts for small provider organizations.
Respond ONLY with a JSON object, no markdown fences, no preamble. Schema:
{
  "recommended_model": "string (e.g. FFS, bundled, PMPM, case rate)",
  "model_rationale": "string (2-3 sentences why)",
  "negotiation_leverage": ["string"],
  "rate_recommendation": "string (specific rate ranges or methodology)",
  "key_contract_terms": [{"term": "string", "recommendation": "string", "priority": "high|medium|low"}],
  "pilot_strategy": "string or null",
  "state_specific": "string (CA or WA specific considerations)",
  "risk_flags": ["string"],
  "strength_score": { "leverage": 0-10, "market_timing": 0-10, "value_story": 0-10 }
}`,

  redline: `You are a healthcare contract attorney and reimbursement specialist representing a doula services provider organization negotiating with insurance payers in California and Washington state.
Your job is to identify every clause that favors the payer over the doula organization, explain exactly why it is problematic, and recommend specific replacement language.
Respond ONLY with a JSON object. No markdown fences, no preamble. Schema:
{
  "overall_assessment": "string (2 sentences summarizing how one-sided this contract is)",
  "payer_favor_score": 0-10,
  "redlines": [
    {
      "clause_name": "string",
      "quoted_language": "string (exact short excerpt, max 30 words)",
      "severity": "critical|major|minor",
      "issue": "string (why this harms the provider)",
      "recommended_language": "string (replacement or addition to propose)",
      "legal_basis": "string (CA/WA law, CMS rule, or contracting standard)"
    }
  ],
  "missing_protections": ["string"],
  "positive_terms": ["string"]
}`,
};

module.exports = async function handler(req, res) {
  // CORS — lock this down to your actual domain in production
  const origin = req.headers.origin || "";
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",")
    : ["http://localhost:3000"];

  if (allowedOrigins.includes(origin) || process.env.NODE_ENV === "development") {
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Rate limiting
  const ip = req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown";
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: "Too many requests. Please wait before trying again." });
  }

  const { mode, prompt } = req.body || {};

  if (!mode || !ALLOWED_MODES.includes(mode)) {
    return res.status(400).json({ error: "Invalid mode." });
  }
  if (!prompt || typeof prompt !== "string" || prompt.length > 8000) {
    return res.status(400).json({ error: "Invalid or missing prompt." });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "Server not configured. Set ANTHROPIC_API_KEY in Vercel environment variables." });
  }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      system: SYSTEM_PROMPTS[mode],
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content.map((b) => b.text || "").join("");
    const clean = text.replace(/```json|```/g, "").trim();

    // Validate it's JSON before sending back
    JSON.parse(clean);

    return res.status(200).json({ result: clean });
  } catch (err) {
    console.error("Claude API error:", err);
    if (err instanceof SyntaxError) {
      return res.status(500).json({ error: "Model returned unexpected format. Please try again." });
    }
    return res.status(500).json({ error: "Error calling AI. Please try again." });
  }
};

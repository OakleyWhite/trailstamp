// Trailstamp AI function: plans days, suggests packing items and makes challenges.
// The app sends a prompt; this function calls Claude with YOUR API key, which stays
// on the server. Set it once with:
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
// Deploy with:
//   supabase functions deploy ai
import { createClient } from "jsr:@supabase/supabase-js@2";

const DAILY_LIMIT = Number(Deno.env.get("AI_DAILY_LIMIT") ?? "25");
const MODEL_DEFAULT = Deno.env.get("AI_MODEL") ?? "claude-sonnet-5";
const MODEL_QUICK = Deno.env.get("AI_MODEL_QUICK") ?? "claude-haiku-4-5-20251001";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const reply = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply(405, { code: "bad_request" });

  // Only signed-in Trailstamp users can call this.
  const auth = req.headers.get("Authorization") ?? "";
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: auth } },
  });
  const { data: u } = await sb.auth.getUser();
  if (!u?.user) return reply(401, { code: "not_granted" });

  let body: { prompt?: string; tier?: string };
  try { body = await req.json(); } catch { return reply(400, { code: "bad_request" }); }
  const prompt = String(body.prompt ?? "").slice(0, 12000);
  if (!prompt) return reply(400, { code: "bad_request" });

  const { data: calls, error } = await sb.rpc("bump_ai_usage");
  if (error) return reply(500, { code: "unavailable" });
  if ((calls as number) > DAILY_LIMIT) return reply(429, { code: "rate_limited" });

  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) return reply(500, { code: "unavailable", message: "ANTHROPIC_API_KEY is not set" });

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: body.tier === "quick" ? MODEL_QUICK : MODEL_DEFAULT,
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!r.ok) return reply(502, { code: r.status === 429 ? "rate_limited" : "unavailable" });
  const out = await r.json();
  const text = (out.content ?? []).filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("");
  return reply(200, { text, truncated: out.stop_reason === "max_tokens" });
});

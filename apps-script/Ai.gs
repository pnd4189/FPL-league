/**
 * Ai.gs — AI gateway client (OpenAI-compatible)
 * HTCV FPL 2026-2027
 *
 * PRIMARY: Mercury 3 by Inception Labs (api.inceptionlabs.ai)
 *   – fast diffusion LM, OpenAI-compatible, Vietnamese-capable
 *   – API key in Script Properties: INCEPTION_API_KEY
 *
 * FALLBACK: Dahl Inference free tier (inference.dahl.global)
 *   – API key in Script Properties: DAHL_API_KEY
 *   – Only tried when Mercury is unreachable / over quota
 *
 * The AI layer is optional: every caller must cope with a failure, because the
 * allowance can run out, the gateway can be down, and model ids rotate
 * with network capacity.
 */

// ─── Mercury 3 (Inception Labs) — Primary ────────────────────────────────────

const INCEPTION_BASE_URL = "https://api.inceptionlabs.ai/v1";
const INCEPTION_MODEL = "mercury-3";
// instant | low | medium | high. mercury-3 defaults to low when omitted.
const INCEPTION_REASONING = "medium";
// Reasoning tokens count inside max_completion_tokens, so the answer budget needs this much room on top.
const INCEPTION_REASONING_TOKENS = 4000;

// ─── Dahl Inference — Fallback ───────────────────────────────────────────────

const AI_BASE_URL = "https://inference.dahl.global";
const AI_MODELS_TTL = 3600;     // seconds — how long the model list is trusted
const AI_FETCH_TIMEOUT_MS = 55000;
// A further model is only tried while this little time has passed since the request began: one
// attempt can run a minute, and the browser gives up after 90 seconds.
const AI_LATE_START_MS = 25000;

// Models tried in this order when the Dahl gateway offers them.
const AI_MODEL_PREFERENCE = [
  "MiniMaxAI/MiniMax-M2.7",
  "zai-org/GLM-5.3-Flash",
  "deepseek-ai/DeepSeek-V4-Flash-0731"
];

// ─── Key helpers ─────────────────────────────────────────────────────────────

function getInceptionKey_() {
  return (PropertiesService.getScriptProperties().getProperty("INCEPTION_API_KEY") || "").trim();
}

/** True when at least one provider key is set; callAi_ picks Mercury first and Dahl as the fallback. */
function hasAiKey_() {
  return !!(getInceptionKey_() || getAiKey_());
}

function getAiKey_() {
  return (PropertiesService.getScriptProperties().getProperty("DAHL_API_KEY") || "").trim();
}

/** Model ids the Dahl gateway currently serves, preferred ones first. */
function getAiModels_() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get("ai_models");
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) { /* refetch below */ }
  }

  const response = UrlFetchApp.fetch(AI_BASE_URL + "/v1/models", {
    headers: { Authorization: "Bearer " + getAiKey_() },
    muteHttpExceptions: true
  });
  if (response.getResponseCode() !== 200) return [];

  const offered = (JSON.parse(response.getContentText()).data || []).map(function (m) { return m.id; });
  const ordered = AI_MODEL_PREFERENCE.filter(function (id) { return offered.indexOf(id) !== -1; })
    .concat(offered.filter(function (id) { return AI_MODEL_PREFERENCE.indexOf(id) === -1; }));
  try {
    cache.put("ai_models", JSON.stringify(ordered), AI_MODELS_TTL);
  } catch (e) { /* tiny payload, never expected to fail */ }
  return ordered;
}

/** Remove a reasoning model's visible "thinking" so only the answer remains. */
function stripThinking_(text) {
  let out = String(text || "").replace(/<think>[\s\S]*?<\/think>/g, "");
  // An unclosed block means the reply was cut off while still thinking.
  if (out.indexOf("<think>") !== -1) return "";
  return out.replace(/^\s+|\s+$/g, "");
}

/** The model sometimes writes markdown despite being told not to; the page shows plain text. */
function plainText_(text) {
  return String(text || "").replace(/\*\*|__/g, "").replace(/^\s{0,3}#{1,6}\s+/gm, "").replace(/^\s*[-*]\s+/gm, "").replace(/^\s+|\s+$/g, "");
}

// ─── Mercury 3 call ──────────────────────────────────────────────────────────

/**
 * Try Mercury 3 first. Returns the same shape as callAi_ so callers don't care.
 * Mercury is fast (~2-6s) and handles Vietnamese well.
 */
function callMercury_(messages, opts) {
  const options = opts || {};
  const key = getInceptionKey_();
  if (!key) return null; // no key → skip, let callAi_ try Dahl

  const started = Date.now();
  let response;
  try {
    response = UrlFetchApp.fetch(INCEPTION_BASE_URL + "/chat/completions", {
      method: "post",
      contentType: "application/json",
      headers: { Authorization: "Bearer " + key },
      muteHttpExceptions: true,
      payload: JSON.stringify({
        model: INCEPTION_MODEL,
        messages: messages,
        max_completion_tokens: (options.maxTokens || 1500) + INCEPTION_REASONING_TOKENS,
        temperature: options.temperature === undefined ? 0.6 : options.temperature,
        reasoning_effort: INCEPTION_REASONING
      })
    });
  } catch (e) {
    return null; // network error → fall through to Dahl
  }

  const code = response.getResponseCode();
  if (code === 402) return { ok: false, text: "", model: INCEPTION_MODEL, ms: Date.now() - started, usage: null, error: "no_tokens" };
  if (code === 401 || code === 403) return { ok: false, text: "", model: INCEPTION_MODEL, ms: Date.now() - started, usage: null, error: "auth" };
  if (code !== 200) return null; // other errors → fall through to Dahl

  let body;
  try {
    body = JSON.parse(response.getContentText());
  } catch (e) {
    return null;
  }
  const text = plainText_(stripThinking_(body.choices && body.choices[0] && body.choices[0].message && body.choices[0].message.content));
  if (!text) return null; // empty → try Dahl
  return { ok: true, text: text, model: INCEPTION_MODEL, ms: Date.now() - started, usage: body.usage || null, error: "" };
}

// ─── Unified call: Mercury first, Dahl fallback ─────────────────────────────

/**
 * One chat completion, trying Mercury 3 first, then falling back to Dahl models.
 *
 * @param {Array<{role: string, content: string}>} messages
 * @param {{maxTokens?: number, temperature?: number, startedAt?: number}} [opts] startedAt: when the whole
 *   request began, so a late failure does not start yet another slow attempt
 * @return {{ok: boolean, text: string, model: string, ms: number, usage: Object|null, error: string}}
 *   error is one of "no_key", "no_tokens", "busy", "auth", "empty", "failed"
 */
function callAi_(messages, opts) {
  const options = opts || {};

  // 1. Try Mercury 3 (primary)
  const mercury = callMercury_(messages, options);
  if (mercury) return mercury; // either success or a definitive error (auth/quota)

  // Mercury hung or failed late: a Dahl attempt would outlast the browser's wait.
  if (getInceptionKey_() && options.startedAt && Date.now() - options.startedAt > AI_LATE_START_MS) {
    return { ok: false, text: "", model: INCEPTION_MODEL, ms: 0, usage: null, error: "failed" };
  }

  // 2. Fallback to Dahl
  if (!getAiKey_()) {
    // No Dahl key either — and no Mercury key was the reason we're here
    if (!getInceptionKey_()) return { ok: false, text: "", model: "", ms: 0, usage: null, error: "no_key" };
    // Mercury key exists but call failed → report as generic failure
    return { ok: false, text: "", model: INCEPTION_MODEL, ms: 0, usage: null, error: "failed" };
  }

  let models;
  try {
    models = getAiModels_();
  } catch (e) {
    models = [];
  }
  if (!models.length) models = AI_MODEL_PREFERENCE.slice();

  let error = "failed";
  let attempts = 0;
  for (const model of models.slice(0, 3)) {
    if (attempts > 0 && options.startedAt && Date.now() - options.startedAt > AI_LATE_START_MS) break;
    attempts++;
    const started = Date.now();
    let response;
    try {
      response = UrlFetchApp.fetch(AI_BASE_URL + "/v1/chat/completions", {
        method: "post",
        contentType: "application/json",
        headers: { Authorization: "Bearer " + getAiKey_() },
        muteHttpExceptions: true,
        payload: JSON.stringify({
          model: model,
          messages: messages,
          max_tokens: options.maxTokens || 1500,
          temperature: options.temperature === undefined ? 0.4 : options.temperature
        })
      });
    } catch (e) {
      error = "failed";
      continue;
    }

    const code = response.getResponseCode();
    // Out of tokens or a bad key will not improve on another model.
    if (code === 402) return { ok: false, text: "", model: model, ms: Date.now() - started, usage: null, error: "no_tokens" };
    if (code === 401 || code === 403) return { ok: false, text: "", model: model, ms: Date.now() - started, usage: null, error: "auth" };
    if (code !== 200) {
      error = code === 429 ? "busy" : "failed";
      continue;
    }

    let body;
    try {
      body = JSON.parse(response.getContentText());
    } catch (e) {
      error = "failed";
      continue;
    }
    const text = plainText_(stripThinking_(body.choices && body.choices[0] && body.choices[0].message && body.choices[0].message.content));
    if (!text) {
      error = "empty";
      continue;
    }
    return { ok: true, text: text, model: model, ms: Date.now() - started, usage: body.usage || null, error: "" };
  }
  return { ok: false, text: "", model: "", ms: 0, usage: null, error: error };
}

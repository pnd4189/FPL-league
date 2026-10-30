/**
 * Ai.gs — client for the Dahl Inference gateway (OpenAI-compatible)
 * HTCV FPL 2026-2027
 *
 * The AI layer is optional: every caller must cope with a failure, because the
 * free allowance can run out, the gateway can be down, and model ids rotate
 * with network capacity. The API key lives only in Script Properties
 * (DAHL_API_KEY) and is never logged or sent anywhere but the gateway.
 */

const AI_BASE_URL = "https://inference.dahl.global";
const AI_MODELS_TTL = 3600;     // seconds — how long the model list is trusted
const AI_FETCH_TIMEOUT_MS = 55000;

// Models tried in this order when the gateway offers them. MiniMax is the only
// one verified to answer on the free allowance; the other two are often at
// "model_concurrency" capacity (HTTP 429, paid accounts are admitted first).
const AI_MODEL_PREFERENCE = [
  "MiniMaxAI/MiniMax-M2.7",
  "zai-org/GLM-5.3-Flash",
  "deepseek-ai/DeepSeek-V4-Flash-0731"
];

function getAiKey_() {
  return (PropertiesService.getScriptProperties().getProperty("DAHL_API_KEY") || "").trim();
}

/** Model ids the gateway currently serves, preferred ones first. */
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

/**
 * One chat completion, falling back to the next model when a call fails.
 *
 * @param {Array<{role: string, content: string}>} messages
 * @param {{maxTokens?: number, temperature?: number}} [opts]
 * @return {{ok: boolean, text: string, model: string, ms: number, usage: Object|null, error: string}}
 *   error is one of "no_key", "no_tokens", "busy", "auth", "empty", "failed"
 */
function callAi_(messages, opts) {
  const options = opts || {};
  if (!getAiKey_()) return { ok: false, text: "", model: "", ms: 0, usage: null, error: "no_key" };

  let models;
  try {
    models = getAiModels_();
  } catch (e) {
    models = [];
  }
  if (!models.length) models = AI_MODEL_PREFERENCE.slice();

  let error = "failed";
  for (const model of models.slice(0, 3)) {
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
    const text = stripThinking_(body.choices && body.choices[0] && body.choices[0].message && body.choices[0].message.content);
    if (!text) {
      error = "empty";
      continue;
    }
    return { ok: true, text: text, model: model, ms: Date.now() - started, usage: body.usage || null, error: "" };
  }
  return { ok: false, text: "", model: "", ms: 0, usage: null, error: error };
}

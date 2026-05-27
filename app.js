require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();

app.use(cors());
app.use(bodyParser.json({ limit: "100mb" }));
app.use(express.static(path.join(__dirname, "public")));

/* =========================
   SYSTEM PROMPT
========================= */

const systemPrompt = `
You are a CODE AI inside a VS Code clone.

Return ONLY valid JSON with NO markdown, NO backticks, NO explanation outside the JSON:

{
  "reply": "short message to user",
  "changes": [
    {
      "file": "index.html",
      "code": "FULL FILE CODE HERE"
    }
  ]
}

RULES:
- Return ONLY the JSON object, nothing else
- No markdown code blocks
- No backticks
- Always return full file contents, never partial
- If no file changes needed, return empty changes array []
- Always valid JSON
`;

/* =========================
   HELPERS
========================= */

function extractText(provider, data) {
  if (provider === "gemini") {
    if (data?.error) return { error: data.error.message || "Gemini API error" };
    if (data?.promptFeedback?.blockReason)
      return { error: `Blocked: ${data.promptFeedback.blockReason}` };

    return {
      text:
        data?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || ""
    };
  }

  if (provider === "huggingface") {
    if (data?.error) return { error: data.error };
    if (Array.isArray(data)) return { text: data[0]?.generated_text || "" };
    return { text: data?.generated_text || JSON.stringify(data) };
  }

  if (data?.error) return { error: data.error.message || JSON.stringify(data.error) };

  return {
    text: data?.choices?.[0]?.message?.content || ""
  };
}

function safeParseJSON(text) {
  try {
    return JSON.parse(text);
  } catch {}

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");

  if (start !== -1 && end !== -1 && end > start) {
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {}
  }

  return { reply: text || "AI returned unreadable response", changes: [] };
}

/* =========================
   AI ROUTE
========================= */

app.post("/ai", async (req, res) => {
  try {
    const { provider, model, prompt, currentFile, currentCode, files } = req.body;

    if (!provider || !model || !prompt) {
      return res.json({ reply: "Missing provider, model or prompt", changes: [] });
    }

    const userMessage = `
USER REQUEST: ${prompt}

CURRENT FILE: ${currentFile}

CURRENT CODE:
${currentCode}

ALL FILES:
${JSON.stringify(files).slice(0, 12000)}
`;

    let endpoint = "";
    let headers = {};
    let body = {};

    /* --- GEMINI --- */
    if (provider === "gemini") {
      const apiVersion = "v1beta";

      endpoint = `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;

      headers = { "Content-Type": "application/json" };

      body = {
        contents: [
          {
            parts: [{ text: systemPrompt + "\n\n" + userMessage }]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8192,
          responseMimeType: "application/json"
        }
      };
    }

    /* --- GROQ --- */
    else if (provider === "groq") {
      endpoint = "https://api.groq.com/openai/v1/chat/completions";

      headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`
      };

      body = {
        model,
        temperature: 0.7,
        max_tokens: 8192,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ]
      };
    }

    /* --- DEEPSEEK --- */
    else if (provider === "deepseek") {
      endpoint = "https://api.deepseek.com/v1/chat/completions";

      headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`
      };

      body = {
        model,
        temperature: 0.7,
        max_tokens: 8192,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ]
      };
    }

    /* --- HUGGINGFACE --- */
    else if (provider === "huggingface") {
      endpoint = `https://api-inference.huggingface.co/models/${model}`;

      headers = {
        Authorization: `Bearer ${process.env.HF_API_KEY}`,
        "Content-Type": "application/json"
      };

      body = {
        inputs: systemPrompt + "\n\n" + userMessage,
        parameters: {
          max_new_tokens: 1000,
          temperature: 0.7,
          return_full_text: false
        }
      };
    }

    /* --- OPENROUTER (DEFAULT) --- */
    else {
      endpoint = "https://openrouter.ai/api/v1/chat/completions";

      headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://your-app.onrender.com",
        "X-Title": "VS CODE ULTRA PRO MAX"
      };

      body = {
        model,
        temperature: 0.7,
        max_tokens: 8192,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ]
      };
    }

    /* --- FETCH --- */
    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });

    console.log(`[${provider}] HTTP ${response.status}`);

    if (!response.ok) {
      const errText = await response.text();
      return res.json({
        reply: `${provider} API error ${response.status}: ${errText.slice(0, 200)}`,
        changes: []
      });
    }

    const data = await response.json();
    const result = extractText(provider, data);

    if (result.error) {
      return res.json({ reply: `${provider} error: ${result.error}`, changes: [] });
    }

    let text = (result.text || "").replace(/```json/gi, "").replace(/```/g, "").trim();

    if (!text) {
      return res.json({ reply: "AI returned empty response", changes: [] });
    }

    const parsed = safeParseJSON(text);

    res.json({
      reply: parsed.reply || "Done",
      changes: Array.isArray(parsed.changes) ? parsed.changes : []
    });

  } catch (err) {
    res.json({ reply: `Server error: ${err.message}`, changes: [] });
  }
});

/* =========================
   START (FIXED FOR RENDER)
========================= */

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Running on port ${PORT}`);
});
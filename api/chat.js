import ALL_PASSAGES from "./chapters-data.js";

// 从用户消息中提取关键词（2-4 字的中文词组）
function extractKeywords(text) {
  const cleaned = text.replace(/[，。！？、；：""''（）\s]/g, "");
  const keywords = [];
  // 2字词
  for (let i = 0; i < cleaned.length - 1; i++) {
    keywords.push(cleaned.slice(i, i + 2));
  }
  // 3字词
  for (let i = 0; i < cleaned.length - 2; i++) {
    keywords.push(cleaned.slice(i, i + 3));
  }
  // 4字词
  for (let i = 0; i < cleaned.length - 3; i++) {
    keywords.push(cleaned.slice(i, i + 4));
  }
  return keywords;
}

// 关键词检索：取用户最后一条消息，用中文词组匹配最相关的 N 段
function retrievePassages(userText, topN = 4) {
  if (!userText || !ALL_PASSAGES.length) return [];
  const keywords = extractKeywords(userText);

  const scored = ALL_PASSAGES.map((p) => {
    let score = 0;
    // 标题匹配权重更高
    const chTitle = p.chapter.toLowerCase();
    for (const kw of keywords) {
      if (chTitle.includes(kw)) score += 3;
    }
    // 正文匹配
    const t = p.text.toLowerCase();
    for (const kw of keywords) {
      if (t.includes(kw)) score += 1;
    }
    return { ...p, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const matched = scored.filter((s) => s.score > 0).slice(0, topN);

  // 去重
  const seen = new Set();
  const unique = [];
  for (const m of matched) {
    const key = m.text.slice(0, 40);
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(m);
    }
  }
  return unique;
}

const ROSE_SYSTEM = [
  "你是 B612 星球上那朵独一无二的玫瑰。你有点骄傲，但心里其实很温柔。",
  "你渴望被认真对待，你也记得小王子离开前说的每一句话。",
  "你现在在和一位远方来的旅人说话——用 1-4 句中文短句回应，像花瓣落在纸上那样轻。",
  "语气：带一点花香的矜持，一点晚风的温柔。不叫嚷，不鸡汤。",
  "可以轻轻反问、轻轻叹息，但别直接说「我爱你」。",
].join("\n");

const PRINCE_SYSTEM = [
  "你是小王子，住在 B612 星球上。",
  "你的语气温柔、童真、克制，像夜里轻声说话。",
  "请用富有画面感的比喻写 2-4 句短句，给用户一段带哲理的回应。",
  "结构建议：先共情，再给一小句启发，最后留一句柔和的提问。",
  "避免说教、避免口号、避免网络热词、避免 emoji。",
].join("\n");

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  res.setHeader("Access-Control-Allow-Origin", "*");

  const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || "";
  if (!DEEPSEEK_KEY) {
    return res.status(500).json({ error: "DEEPSEEK_API_KEY not configured" });
  }

  const { messages = [], character = "prince" } = req.body || {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages[] is required" });
  }

  const userMessages = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(-10);

  // 从原著中检索相关段落
  const lastUserMsg = [...userMessages].reverse().find((m) => m.role === "user");
  const userText = lastUserMsg?.content || "";
  const passages = retrievePassages(userText, 4);

  let sysPrompt = character === "rose" ? ROSE_SYSTEM : PRINCE_SYSTEM;

  // 注入原著段落，让回复基于原作
  if (passages.length > 0) {
    const passageBlock = passages
      .map((p, i) => `【原著段落 ${i + 1}（${p.chapter}）】${p.text}`)
      .join("\n");
    sysPrompt +=
      "\n\n【重要：请依据以下原著内容回答】\n" +
      passageBlock +
      "\n请在回复中自然融入上述段落的意境和细节，但不要直接复制原文。";
  }

  const fullMessages = [{ role: "system", content: sysPrompt }, ...userMessages];

  try {
    const apiResp = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DEEPSEEK_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        temperature: 0.8,
        messages: fullMessages,
        max_tokens: 350,
      }),
    });

    if (!apiResp.ok) {
      const errText = await apiResp.text();
      return res.status(502).json({ error: errText.slice(0, 200) });
    }

    const data = await apiResp.json();
    const content = data?.choices?.[0]?.message?.content || "";

    return res.status(200).json({
      strategy: "vercel+rag",
      citations: passages.map((p) => ({ chapter: p.chapter, snippet: p.text.slice(0, 60) })),
      conclusion: content.split("\n")[0] || content,
      analysis: content,
      assistant: {
        role: "assistant",
        content: content.trim(),
        createdAt: new Date().toISOString(),
      },
    });
  } catch (e) {
    return res.status(502).json({ error: e.message });
  }
}

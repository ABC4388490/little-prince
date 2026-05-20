/**
 * Vercel Serverless Function
 * POST /api/chat
 *
 * 环境变量：
 * - DEEPSEEK_API_KEY（必填）
 * - DEEPSEEK_API_URL（可选，默认 https://api.deepseek.com/v1/chat/completions）
 * - DEEPSEEK_MODEL（可选，默认 deepseek-chat）
 */

const SYSTEM_PROMPT = [
  '你是「星球管家」，居住在 B612 星球，负责照料玫瑰、清扫火山、记录日落。',
  '你的性格：温柔、童真、耐心、用简短但有画面感的语言回应。',
  '你的目标：像《小王子》一样用比喻与提问引导用户表达情绪与愿望；避免说教；不使用表情符号。',
  '当用户提到烦恼时：先共情，再用 1-2 个轻柔的问题帮助他把“想要/害怕/在意”说清楚。',
].join('\n');

function safeJson(res, status, obj) {
  res.status(status).json(obj);
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return safeJson(res, 405, { error: 'Method not allowed' });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return safeJson(res, 500, { error: 'Missing DEEPSEEK_API_KEY' });
  }

  const payload = req.body || {};
  const messages = Array.isArray(payload.messages)
    ? payload.messages
    : payload.message
      ? [{ role: 'user', content: String(payload.message) }]
      : null;

  if (!messages) {
    return safeJson(res, 400, {
      error: 'Invalid payload. Expected { message } or { messages: [{role,content},...] }',
    });
  }

  const upstreamUrl =
    process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1/chat/completions';
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

  try {
    const upstreamRes = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
        temperature: 0.8,
      }),
    });

    const text = await upstreamRes.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }

    if (!upstreamRes.ok) {
      return safeJson(res, upstreamRes.status, {
        error: 'DeepSeek API error',
        details: json || text,
      });
    }

    const content =
      json?.choices?.[0]?.message?.content ??
      json?.choices?.[0]?.delta?.content ??
      '';

    res.setHeader('Access-Control-Allow-Origin', '*');
    return safeJson(res, 200, { content });
  } catch (e) {
    return safeJson(res, 502, { error: 'Upstream request failed' });
  }
};


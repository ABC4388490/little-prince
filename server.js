/**
 * 本地开发用 Node 代理服务：
 * - 静态文件：直接从项目根目录读取（例如 /chat.html）
 * - API：POST /api/chat 转发到 DeepSeek（API Key 仅存环境变量）
 *
 * 启动：
 *   set DEEPSEEK_API_KEY=你的key
 *   node server.js
 * 访问：
 *   http://127.0.0.1:3000/chat.html
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = Number(process.env.PORT || 3000);
const ROOT = process.cwd();

const SYSTEM_PROMPT = [
  '你是「星球管家」，居住在 B612 星球，负责照料玫瑰、清扫火山、记录日落。',
  '你的性格：温柔、童真、耐心、用简短但有画面感的语言回应。',
  '你的目标：像《小王子》一样用比喻与提问引导用户表达情绪与愿望；避免说教；不使用表情符号。',
  '当用户提到烦恼时：先共情，再用 1-2 个轻柔的问题帮助他把“想要/害怕/在意”说清楚。',
].join('\n');

function sendJson(res, statusCode, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function contentTypeByExt(ext) {
  switch (ext) {
    case '.html':
      return 'text/html; charset=utf-8';
    case '.js':
      return 'text/javascript; charset=utf-8';
    case '.css':
      return 'text/css; charset=utf-8';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.svg':
      return 'image/svg+xml; charset=utf-8';
    default:
      return 'application/octet-stream';
  }
}

async function handleChat(req, res) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return sendJson(res, 500, {
      error: 'Missing DEEPSEEK_API_KEY env var on server',
    });
  }

  const raw = await readBody(req);
  const payload = safeJsonParse(raw);
  if (!payload || (!payload.message && !Array.isArray(payload.messages))) {
    return sendJson(res, 400, {
      error: 'Invalid payload. Expected { message } or { messages: [{role,content},...] }',
    });
  }

  const messages = Array.isArray(payload.messages)
    ? payload.messages
    : [{ role: 'user', content: String(payload.message || '') }];

  const upstreamUrl =
    process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1/chat/completions';
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

  const upstreamBody = {
    model,
    messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
    temperature: 0.8,
  };

  let upstreamRes;
  try {
    upstreamRes = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(upstreamBody),
    });
  } catch (e) {
    return sendJson(res, 502, { error: 'Upstream request failed' });
  }

  const text = await upstreamRes.text();
  const json = safeJsonParse(text);
  if (!upstreamRes.ok) {
    return sendJson(res, upstreamRes.status, {
      error: 'DeepSeek API error',
      details: json || text,
    });
  }

  const content =
    json?.choices?.[0]?.message?.content ??
    json?.choices?.[0]?.delta?.content ??
    '';

  return sendJson(res, 200, { content });
}

function serveStatic(req, res, pathname) {
  const cleanPath = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.join(ROOT, decodeURIComponent(cleanPath));

  // 防目录穿越
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end('Not Found');
    }
    res.writeHead(200, { 'Content-Type': contentTypeByExt(path.extname(filePath)) });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || '127.0.0.1'}`);

  if (url.pathname === '/health') {
    return sendJson(res, 200, { ok: true });
  }

  if (url.pathname === '/api/chat') {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      });
      return res.end();
    }
    if (req.method !== 'POST') {
      return sendJson(res, 405, { error: 'Method not allowed' });
    }
    res.setHeader('Access-Control-Allow-Origin', '*');
    return handleChat(req, res);
  }

  return serveStatic(req, res, url.pathname);
});

server.listen(PORT, '0.0.0.0', () => {
  // eslint-disable-next-line no-console
  console.log(`Local server listening on http://127.0.0.1:${PORT}`);
});


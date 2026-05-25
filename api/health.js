export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  let ragLoaded = false;
  let ragCount = 0;
  try {
    const data = require("./chapters-data.js");
    ragLoaded = Array.isArray(data);
    ragCount = ragLoaded ? data.length : 0;
  } catch (e) {
    ragLoaded = false;
    ragCount = -1;
  }
  res.status(200).json({
    status: "ok",
    deepseek: process.env.DEEPSEEK_API_KEY ? "configured" : "missing",
    rag: { loaded: ragLoaded, count: ragCount },
  });
}

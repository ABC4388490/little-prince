export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.status(200).json({
    status: "ok",
    deepseek: process.env.DEEPSEEK_API_KEY ? "configured" : "missing",
  });
}

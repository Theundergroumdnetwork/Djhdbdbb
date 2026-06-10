import { Router } from "express";

const router = Router();

router.post("/tts", async (req, res) => {
  const { text, voice = "Brian" } = req.body as { text?: string; voice?: string };

  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return res.status(400).json({ error: "text is required" });
  }

  const url = `https://api.streamelements.com/kappa/v2/speech?voice=${encodeURIComponent(voice)}&text=${encodeURIComponent(text)}`;

  try {
    const upstream = await fetch(url, {
      headers: { "User-Agent": "BlankVex/1.0" },
    });

    if (!upstream.ok) {
      req.log.warn({ status: upstream.status }, "StreamElements TTS returned error");
      return res.status(502).json({ error: "TTS service unavailable" });
    }

    const buffer = await upstream.arrayBuffer();
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.setHeader("Content-Length", buffer.byteLength.toString());
    return res.send(Buffer.from(buffer));
  } catch (err: unknown) {
    req.log.error({ err }, "TTS proxy failed");
    return res.status(500).json({ error: "TTS generation failed" });
  }
});

export default router;

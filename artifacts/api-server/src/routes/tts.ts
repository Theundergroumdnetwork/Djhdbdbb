import { Router } from "express";

const router = Router();

const VOICE = "Brian";
const CHUNK_MAX = 250;

function splitTextIntoChunks(text: string): string[] {
  // Split at sentence boundaries first, then by word if needed
  const sentences = text.split(/(?<=[.!?,;])\s+/);
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    const candidate = current ? current + " " + sentence : sentence;
    if (candidate.length <= CHUNK_MAX) {
      current = candidate;
    } else {
      if (current) chunks.push(current.trim());
      if (sentence.length <= CHUNK_MAX) {
        current = sentence;
      } else {
        // Split long sentence by words
        const words = sentence.split(" ");
        current = "";
        for (const word of words) {
          const c = current ? current + " " + word : word;
          if (c.length <= CHUNK_MAX) {
            current = c;
          } else {
            if (current) chunks.push(current.trim());
            current = word;
          }
        }
      }
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.filter((c) => c.length > 0);
}

async function fetchChunk(text: string): Promise<ArrayBuffer> {
  const url = `https://api.streamelements.com/kappa/v2/speech?voice=${VOICE}&text=${encodeURIComponent(text)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (!res.ok) throw new Error(`StreamElements ${res.status}`);
  return res.arrayBuffer();
}

router.post("/tts", async (req, res) => {
  const { text } = req.body as { text?: string };
  if (!text || typeof text !== "string" || !text.trim()) {
    return res.status(400).json({ error: "text is required" });
  }

  try {
    const chunks = splitTextIntoChunks(text);
    req.log.info({ chunks: chunks.length }, "TTS: fetching chunks");

    // Fetch all chunks sequentially to avoid rate limiting
    const buffers: ArrayBuffer[] = [];
    for (const chunk of chunks) {
      const buf = await fetchChunk(chunk);
      buffers.push(buf);
    }

    // Concatenate MP3 buffers directly — valid for same-codec streams
    const total = buffers.reduce((s, b) => s + b.byteLength, 0);
    const combined = Buffer.allocUnsafe(total);
    let offset = 0;
    for (const buf of buffers) {
      combined.set(new Uint8Array(buf), offset);
      offset += buf.byteLength;
    }

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "public, max-age=3600");
    return res.send(combined);
  } catch (err: unknown) {
    req.log.error({ err }, "TTS failed");
    const msg = err instanceof Error ? err.message : "TTS failed";
    return res.status(500).json({ error: msg });
  }
});

export default router;

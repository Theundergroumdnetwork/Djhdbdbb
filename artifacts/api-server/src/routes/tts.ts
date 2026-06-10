import { Router } from "express";

const router = Router();
const CHUNK_MAX = 150;

function splitChunks(text: string): string[] {
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
        const words = sentence.split(" ");
        current = "";
        for (const word of words) {
          const c = current ? current + " " + word : word;
          if (c.length <= CHUNK_MAX) { current = c; }
          else { if (current) chunks.push(current.trim()); current = word; }
        }
      }
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.filter((c) => c.length > 0);
}

async function googleTTS(text: string): Promise<ArrayBuffer> {
  const url =
    "https://translate.google.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=" +
    encodeURIComponent(text);
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Referer: "https://translate.google.com/",
      Accept: "audio/mpeg,audio/*;q=0.9,*/*;q=0.8",
    },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Google TTS ${res.status}`);
  const buf = await res.arrayBuffer();
  if (buf.byteLength < 200) throw new Error("Empty audio response");
  return buf;
}

async function soundOfText(text: string): Promise<ArrayBuffer> {
  const postRes = await fetch("https://api.soundoftext.com/sounds", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ engine: "Google", data: { text, voice: "en-US" } }),
    signal: AbortSignal.timeout(10000),
  });
  if (!postRes.ok) throw new Error(`SoundOfText post ${postRes.status}`);
  const { id } = (await postRes.json()) as { id: string };

  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const poll = await fetch(`https://api.soundoftext.com/sounds/${id}`, {
      signal: AbortSignal.timeout(5000),
    });
    const data = (await poll.json()) as { status: string; location?: string };
    if (data.status === "Done" && data.location) {
      const audio = await fetch(data.location, { signal: AbortSignal.timeout(10000) });
      return audio.arrayBuffer();
    }
    if (data.status === "Error") throw new Error("SoundOfText error");
  }
  throw new Error("SoundOfText timeout");
}

async function fetchChunk(text: string): Promise<ArrayBuffer> {
  try {
    return await googleTTS(text);
  } catch (e) {
    return await soundOfText(text);
  }
}

router.post("/tts", async (req, res) => {
  const { text } = req.body as { text?: string };
  if (!text || typeof text !== "string" || !text.trim()) {
    return res.status(400).json({ error: "text is required" });
  }

  try {
    const chunks = splitChunks(text);
    req.log.info({ chunks: chunks.length }, "TTS: generating");

    // Fetch all chunks in parallel (max 3 concurrent)
    const results: ArrayBuffer[] = new Array(chunks.length);
    const queue = chunks.map((chunk, i) => ({ chunk, i }));
    const inFlight = new Set<Promise<void>>();

    const run = async ({ chunk, i }: { chunk: string; i: number }) => {
      results[i] = await fetchChunk(chunk);
    };

    for (const item of queue) {
      const p = run(item).finally(() => inFlight.delete(p as Promise<void>));
      inFlight.add(p as Promise<void>);
      if (inFlight.size >= 3) await Promise.race(inFlight);
    }
    await Promise.all(inFlight);

    const total = results.reduce((s, b) => s + b.byteLength, 0);
    const combined = Buffer.allocUnsafe(total);
    let offset = 0;
    for (const buf of results) {
      combined.set(new Uint8Array(buf), offset);
      offset += buf.byteLength;
    }

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "public, max-age=3600");
    return res.send(combined);
  } catch (err: unknown) {
    req.log.error({ err }, "TTS failed");
    return res.status(500).json({ error: err instanceof Error ? err.message : "TTS failed" });
  }
});

export default router;

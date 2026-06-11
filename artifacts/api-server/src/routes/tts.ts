import { Router } from "express";
import { SpeakTextBody } from "@workspace/api-zod";

const router = Router();

function extractWordTimestamps(
  characters: string[],
  charStartTimes: number[],
  charEndTimes: number[]
): Array<{ word: string; start: number; end: number }> {
  const words: Array<{ word: string; start: number; end: number }> = [];
  let currentWord = "";
  let wordStart = 0;

  for (let i = 0; i < characters.length; i++) {
    const char = characters[i];
    if (char === " " || char === "\n") {
      if (currentWord.trim()) {
        words.push({ word: currentWord.trim(), start: wordStart, end: charEndTimes[i - 1] ?? charEndTimes[i] });
      }
      currentWord = "";
    } else {
      if (!currentWord) {
        wordStart = charStartTimes[i];
      }
      currentWord += char;
    }
  }
  if (currentWord.trim()) {
    words.push({ word: currentWord.trim(), start: wordStart, end: charEndTimes[charEndTimes.length - 1] });
  }

  return words;
}

router.post("/tts/speak", async (req, res) => {
  const parseResult = SpeakTextBody.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: "text and voiceId are required" });
  }

  const { text, voiceId } = parseResult.data;
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "ELEVENLABS_API_KEY not configured. Please add your ElevenLabs API key." });
  }

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_turbo_v2_5",
          voice_settings: {
            stability: 0.4,
            similarity_boost: 0.8,
            style: 0.35,
            use_speaker_boost: true,
          },
        }),
        signal: AbortSignal.timeout(60000),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      req.log.error({ status: response.status, err }, "ElevenLabs TTS error");
      return res.status(500).json({ error: `ElevenLabs error: ${response.status} - ${err}` });
    }

    const data = (await response.json()) as {
      audio_base64: string;
      alignment: {
        characters: string[];
        character_start_times_seconds: number[];
        character_end_times_seconds: number[];
      };
    };

    const words = extractWordTimestamps(
      data.alignment.characters,
      data.alignment.character_start_times_seconds,
      data.alignment.character_end_times_seconds
    );

    return res.json({
      audioBase64: data.audio_base64,
      words,
    });
  } catch (err: unknown) {
    req.log.error({ err }, "TTS failed");
    return res.status(500).json({ error: err instanceof Error ? err.message : "TTS failed" });
  }
});

export default router;

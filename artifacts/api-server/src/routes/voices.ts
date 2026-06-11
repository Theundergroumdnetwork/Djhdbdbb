import { Router } from "express";

const router = Router();

const CURATED_VOICES = [
  { id: "nPczCjzI2devNBz1zQrb", name: "Brian", category: "premade" },
  { id: "pNInz6obpgDQGcFmaJgB", name: "Adam", category: "premade" },
  { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel", category: "premade" },
  { id: "AZnzlk1XvdvUeBnXmlld", name: "Domi", category: "premade" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Bella", category: "premade" },
  { id: "ErXwobaYiN019PkySvjV", name: "Antoni", category: "premade" },
  { id: "MF3mGyEYCl7XYWbV9V6O", name: "Elli", category: "premade" },
  { id: "TxGEqnHWrfWFTfGW9XjX", name: "Josh", category: "premade" },
  { id: "VR6AewLTigWG4xSOukaG", name: "Arnold", category: "premade" },
  { id: "pMsXgVXv3BLzUgSXRplE", name: "Serena", category: "premade" },
];

router.get("/voices", async (req, res) => {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    const fallback = CURATED_VOICES.map((v) => ({
      ...v,
      previewUrl: null,
    }));
    return res.json(fallback);
  }

  try {
    const response = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: {
        "xi-api-key": apiKey,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const fallback = CURATED_VOICES.map((v) => ({ ...v, previewUrl: null }));
      return res.json(fallback);
    }

    const data = (await response.json()) as {
      voices: Array<{
        voice_id: string;
        name: string;
        category: string;
        preview_url?: string;
      }>;
    };

    const curatedIds = new Set(CURATED_VOICES.map((v) => v.id));
    const curatedFromApi = data.voices
      .filter((v) => curatedIds.has(v.voice_id))
      .map((v) => ({
        id: v.voice_id,
        name: v.name,
        category: v.category || "premade",
        previewUrl: v.preview_url ?? null,
      }));

    const found = new Set(curatedFromApi.map((v) => v.id));
    const fallbackMissing = CURATED_VOICES.filter((v) => !found.has(v.id)).map((v) => ({
      ...v,
      previewUrl: null,
    }));

    return res.json([...curatedFromApi, ...fallbackMissing]);
  } catch (err: unknown) {
    req.log.error({ err }, "Failed to fetch voices");
    const fallback = CURATED_VOICES.map((v) => ({ ...v, previewUrl: null }));
    return res.json(fallback);
  }
});

export default router;

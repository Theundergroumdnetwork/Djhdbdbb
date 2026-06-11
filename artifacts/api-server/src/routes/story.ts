import { Router } from "express";
import OpenAI from "openai";
import { GenerateStoryBody } from "@workspace/api-zod";

const router = Router();

const STORY_PROMPTS: Record<string, string> = {
  aita: `Write a compelling Reddit AITA (Am I The Asshole) post. 
Create a title that starts with "AITA for" followed by something dramatic and specific. 
The story should be 200-300 words, written in first person, with specific details, 
a clear conflict, and an emotionally charged ending that leaves the reader wanting to 
comment. Make it feel completely authentic like a real Reddit post.`,
  relationship: `Write a compelling Reddit relationship drama post from r/relationships or r/AmIOverreacting.
The title should describe the situation briefly. The story should be 200-300 words, 
written in first person with specific details about people and situations. 
Include a dramatic revelation or conflict.`,
  revenge: `Write a compelling Reddit petty revenge or pro revenge story.
The title should summarize the revenge taken. The story should be 200-300 words, 
written in first person, building up to a satisfying conclusion where the poster 
gets justice.`,
  family: `Write a compelling Reddit family drama post from r/family or r/raisedbynarcissists.
The title should hint at the family conflict. The story should be 200-300 words, 
written in first person with specific family dynamics and a clear conflict.`,
  work: `Write a compelling Reddit workplace drama post from r/antiwork or r/WorkplaceConflicts.
The title should describe the workplace situation. The story should be 200-300 words, 
written in first person about a toxic boss, coworker drama, or satisfying quitting story.`,
  roommate: `Write a compelling Reddit roommate conflict story from r/badroommates.
The title should describe the roommate situation. The story should be 200-300 words, 
written in first person about outrageous roommate behavior and conflict resolution.`,
};

router.post("/story/generate", async (req, res) => {
  const parseResult = GenerateStoryBody.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: "Invalid request body" });
  }

  const { category, customTitle } = parseResult.data;

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "OPENROUTER_API_KEY not configured" });
  }

  const client = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey,
    defaultHeaders: {
      "HTTP-Referer": "https://replit.com",
      "X-Title": "Reddit Story Generator",
    },
  });

  const categoryKey = category.toLowerCase().replace(/\s+/g, "_");
  const promptTemplate = STORY_PROMPTS[categoryKey] || STORY_PROMPTS.aita || "";

  const systemPrompt = `You are a Reddit story writer specializing in viral, emotionally engaging posts. 
Your stories feel completely authentic — specific names, relatable situations, raw emotions. 
Never use generic filler. Every detail should feel real and lived-in.
Format your response as JSON with exactly two fields: "title" (the Reddit post title) and "story" (the full story text, no title included).
The story text should be suitable for text-to-speech narration — no markdown, no asterisks, just plain flowing text.`;

  const userPrompt = customTitle
    ? `Write a Reddit story with this exact title: "${customTitle}". 
The story should be 200-300 words, written in first person, emotionally engaging, 
with specific details. Return JSON with "title" and "story" fields.`
    : promptTemplate + `\n\nReturn valid JSON with exactly "title" and "story" string fields.`;

  try {
    const completion = await client.chat.completions.create({
      model: "meta-llama/llama-3.3-70b-instruct",
      max_tokens: 8192,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return res.status(500).json({ error: "No response from AI" });
    }

    let parsed: { title: string; story: string };
    try {
      parsed = JSON.parse(content);
    } catch {
      return res.status(500).json({ error: "Failed to parse AI response" });
    }

    if (!parsed.title || !parsed.story) {
      return res.status(500).json({ error: "Invalid AI response structure" });
    }

    return res.json({ title: parsed.title, story: parsed.story });
  } catch (err: unknown) {
    req.log.error({ err }, "Story generation failed");
    const message = err instanceof Error ? err.message : "Story generation failed";
    return res.status(500).json({ error: message });
  }
});

export default router;

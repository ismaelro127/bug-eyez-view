import type { NextApiRequest, NextApiResponse } from "next";
import { logger } from "../../web/utils/logger";

type SummaryResponse = {
  summary?: string;
  tags?: string[];
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SummaryResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { title, description, channel } = req.body || {};

    if (!title && !description && !channel) {
      return res.status(400).json({ error: "Missing summary input" });
    }

    if (!process.env.OPENAI_API_KEY) {
      logger.error("Missing OPENAI_API_KEY");
      return res.status(500).json({ error: "AI service not configured" });
    }

    const safeTitle = String(title || "Live News").slice(0, 200);
    const safeDescription = String(description || "").slice(0, 1200);
    const safeChannel = String(channel || "").slice(0, 120);

    const prompt = `
Summarize this TV program in 3–4 short sentences.
Then provide 3–5 topic tags using #hashtags.

Channel: ${safeChannel}
Title: ${safeTitle}
Description: ${safeDescription}
`.trim();

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.4,
        max_tokens: 260,
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      logger.error("OpenAI API error:", data);
      return res.status(502).json({ error: "AI summary service failed" });
    }

    const text =
      data?.choices?.[0]?.message?.content?.trim() ||
      "No summary generated.";

    const tags = (text.match(/#\w+/g) || []).map((tag: string) =>
      tag.slice(1)
    );

    return res.status(200).json({
      summary: text,
      tags,
    });
  } catch (err) {
    logger.error("AI summary error:", err);
    return res.status(500).json({ error: "AI summary failed" });
  }
}
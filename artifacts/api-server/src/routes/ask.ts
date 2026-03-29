import { Router, type IRouter, type Request, type Response } from "express";
import { geminiSearchStream, geminiSearchAnswer, wikipediaFallback } from "../lib/web-search";

const router: IRouter = Router();

/** AI Q&A with Gemini + Google Search grounding */
router.post("/study/ask", async (req: Request, res: Response) => {
  const { question, reviewerContent } = req.body;

  if (!question || typeof question !== "string" || question.trim().length < 2) {
    res.status(400).json({ error: "A question is required." });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  res.write(`data: ${JSON.stringify({ status: "searching" })}\n\n`);

  const hasReviewer =
    typeof reviewerContent === "string" && reviewerContent.trim().length > 50;

  const prompt = `You are an expert academic tutor. Answer the student's question clearly, structured, and thoroughly.
${hasReviewer ? "Use the provided study reviewer as your primary reference, then supplement with Google Search results." : "Use Google Search to find accurate, up-to-date information."}

Rules:
- Format with bullet points or short paragraphs
- Cite web sources naturally in the text when used (e.g., "According to [Source]...")
- Walk through reasoning for application/problem-solving questions step by step
- Keep the answer focused on the student's actual question

STUDENT QUESTION: ${question}`;

  try {
    const sources = await geminiSearchStream(
      prompt,
      hasReviewer ? reviewerContent : undefined,
      (text) => {
        res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
      },
    );

    if (sources.length > 0) {
      res.write(`data: ${JSON.stringify({ sources })}\n\n`);
    } else {
      // Try Wikipedia as supplementary source
      const wiki = await wikipediaFallback(question);
      if (wiki) {
        res.write(`data: ${JSON.stringify({ sources: [wiki] })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error({ err }, "Failed to answer question with Gemini");
    // Fallback: return error
    res.write(
      `data: ${JSON.stringify({ error: "Failed to generate answer. Please try again." })}\n\n`,
    );
    res.end();
  }
});

/** Web-enhance: Gemini + Google Search grounding for additional reviewer content */
router.post("/study/web-enhance", async (req: Request, res: Response) => {
  const { topic, reviewerContent } = req.body;

  if (!topic || typeof topic !== "string") {
    res.status(400).json({ error: "Topic is required." });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  res.write(`data: ${JSON.stringify({ status: "searching" })}\n\n`);

  const prompt = `You are supplementing a study reviewer with additional facts from Google Search.

Search for the most current, accurate, and relevant information about: "${topic}"

Then generate a concise supplement section using this EXACT format:

## ${topic} — Additional Web Sources

**Keyword/Concept**: Precise fact or context from web sources (cite the source naturally).

Rules:
- Include information that ADDS to what a typical student might already know
- 6–12 keyword entries max
- Each definition must be factual and grounded in search results
- Start immediately with the ## heading
- No preamble or closing remarks

Context from existing reviewer (do not repeat these exact definitions):
${(reviewerContent ?? "").slice(0, 1200)}`;

  try {
    const sources = await geminiSearchStream(
      prompt,
      undefined,
      (text) => {
        res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
      },
    );

    res.write(`data: ${JSON.stringify({ done: true, sources })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error({ err }, "Failed to web-enhance with Gemini");

    // Fallback to Wikipedia
    try {
      const wiki = await wikipediaFallback(topic);
      if (wiki) {
        res.write(`data: ${JSON.stringify({ status: "generating" })}\n\n`);
        res.write(
          `data: ${JSON.stringify({ content: `## ${topic} — Additional Web Sources\n\n**${wiki.title}**: ${wiki.snippet}` })}\n\n`,
        );
        res.write(`data: ${JSON.stringify({ done: true, sources: [wiki] })}\n\n`);
      } else {
        res.write(`data: ${JSON.stringify({ error: "Web search unavailable. Please try again." })}\n\n`);
      }
    } catch {
      res.write(`data: ${JSON.stringify({ error: "Web search unavailable. Please try again." })}\n\n`);
    }
    res.end();
  }
});

export default router;

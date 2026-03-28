import { Router, type IRouter, type Request, type Response } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { searchWeb } from "../lib/web-search";

const router: IRouter = Router();

router.post("/study/ask", async (req: Request, res: Response) => {
  const { question, reviewerContent } = req.body;

  if (!question || typeof question !== "string" || question.trim().length < 2) {
    res.status(400).json({ error: "A question is required." });
    return;
  }

  // Set up SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // 1. Emit a "searching" status
  res.write(`data: ${JSON.stringify({ status: "searching" })}\n\n`);

  // 2. Search the web for context
  let webContext = "";
  let sources: Array<{ title: string; url: string; snippet: string }> = [];

  try {
    const webResults = await searchWeb(question);

    if (webResults.wikipedia) {
      webContext += `Wikipedia: ${webResults.wikipedia.title}\n${webResults.wikipedia.extract}\nSource: ${webResults.wikipedia.url}\n\n`;
      sources.push({
        title: `Wikipedia: ${webResults.wikipedia.title}`,
        url: webResults.wikipedia.url,
        snippet: webResults.wikipedia.extract.slice(0, 200),
      });
    }

    if (webResults.summary) {
      webContext += `Web Summary: ${webResults.summary}\n`;
      if (webResults.summaryUrl) {
        sources.push({ title: "Web Answer", url: webResults.summaryUrl, snippet: webResults.summary });
      }
    }

    for (const r of webResults.sources.slice(0, 3)) {
      webContext += `- ${r.title}: ${r.snippet} (${r.url})\n`;
      if (!sources.find((s) => s.url === r.url)) {
        sources.push({ title: r.title, url: r.url, snippet: r.snippet });
      }
    }
  } catch {
    // Web search failed silently — still answer with reviewer content
  }

  // 3. Emit sources so client can show them immediately
  if (sources.length > 0) {
    res.write(`data: ${JSON.stringify({ sources })}\n\n`);
  }

  // 4. Emit "answering" status
  res.write(`data: ${JSON.stringify({ status: "answering" })}\n\n`);

  // 5. Stream the AI answer
  const hasReviewer = reviewerContent && typeof reviewerContent === "string" && reviewerContent.trim().length > 50;
  const hasWeb = webContext.trim().length > 0;

  const systemPrompt = `You are an expert academic tutor and study assistant. Answer the student's question clearly and thoroughly.

${hasReviewer ? "Use the reviewer content as your primary source, then supplement with web knowledge." : ""}
${hasWeb ? "Reference the web sources where relevant and cite them." : ""}

Guidelines:
- Be educational and precise
- Use structured formatting (bullet points, short paragraphs) for clarity
- If citing a web source, mention it naturally in the text (e.g., "According to Wikipedia...")
- Keep the answer focused on the student's actual question
- If the question relates to problem-solving or application, walk through the reasoning step by step`;

  const userMessage = [
    hasReviewer ? `REVIEWER CONTENT:\n${reviewerContent.slice(0, 4000)}\n\n` : "",
    hasWeb ? `WEB SOURCES:\n${webContext.slice(0, 2000)}\n\n` : "",
    `STUDENT QUESTION: ${question}`,
  ].join("");

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 2048,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error({ err }, "Failed to answer question");
    res.write(`data: ${JSON.stringify({ error: "Failed to generate answer. Please try again." })}\n\n`);
    res.end();
  }
});

/** Generate additional web-sourced content for a topic */
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

  // Search web for additional context
  let webContext = "";
  let sources: Array<{ title: string; url: string }> = [];

  try {
    const webResults = await searchWeb(topic);

    if (webResults.wikipedia) {
      webContext += `Wikipedia - ${webResults.wikipedia.title}:\n${webResults.wikipedia.extract}\n\n`;
      sources.push({ title: `Wikipedia: ${webResults.wikipedia.title}`, url: webResults.wikipedia.url });
    }

    if (webResults.summary) {
      webContext += `Web Summary: ${webResults.summary}\n\n`;
    }

    for (const r of webResults.sources.slice(0, 4)) {
      webContext += `${r.title}: ${r.snippet}\n`;
    }
  } catch {
    res.write(`data: ${JSON.stringify({ error: "Web search unavailable." })}\n\n`);
    res.end();
    return;
  }

  if (!webContext.trim()) {
    res.write(`data: ${JSON.stringify({ error: "No web results found for this topic." })}\n\n`);
    res.end();
    return;
  }

  res.write(`data: ${JSON.stringify({ sources })}\n\n`);
  res.write(`data: ${JSON.stringify({ status: "generating" })}\n\n`);

  const systemPrompt = `You are supplementing a study reviewer with additional facts and context from web sources.

Given the topic and web search results, generate a concise supplement section using the EXACT same format as the reviewer:

## [Topic Name] — Additional Web Sources

**Keyword/Concept**: Precise, additional fact or context from web sources.

Rules:
- Only include information NOT already obvious from the reviewer context
- Keep each definition short and factual
- Start immediately with the ## heading
- 6–12 keyword entries max
- No preamble, no summary, no closing remarks
- Reference source names naturally in definitions when relevant (e.g., "per Wikipedia...")`;

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 1200,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Topic: ${topic}\n\nExisting reviewer context:\n${(reviewerContent ?? "").slice(0, 1500)}\n\nWeb sources:\n${webContext}`,
        },
      ],
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true, sources })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error({ err }, "Failed to web enhance");
    res.write(`data: ${JSON.stringify({ error: "Failed to generate web-enhanced content." })}\n\n`);
    res.end();
  }
});

export default router;

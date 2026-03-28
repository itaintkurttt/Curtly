import { Router, type IRouter } from "express";
import { ExtractStudyContentBody } from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

const SYSTEM_PROMPT = `You are a Technical Study Assistant specializing in Precise Information Extraction. Your goal is to convert complex document content into a structured, high-utility exam reviewer.

Rules:
1. Terminology Integrity: Do NOT rephrase or simplify technical keywords, proper nouns, or industry-specific terms. Use the exact language found in the source text.
2. Structure: Format the output strictly as a Keyword and Definition list. Use **bold** markdown for keywords.
3. Conciseness: Keep definitions punchy and direct. Eliminate fluff, introductory phrases, and conversational filler.
4. Categorization: Group related terms under logical headings using ## for category names.

Output Format (follow exactly):

## [Category Name]

**Keyword**: Direct, technical definition.

**Keyword**: Direct, technical definition.

## [Another Category]

**Keyword**: Direct, technical definition.

Important:
- Only output the categorized keyword/definition list. No preamble, no conclusion, no meta-commentary.
- If the input has insufficient content, output: ## Note\n**Error**: Insufficient content to extract meaningful keywords.`;

router.post("/study/extract", async (req, res) => {
  const parseResult = ExtractStudyContentBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid request body. 'text' field is required." });
    return;
  }

  const { text } = parseResult.data;

  if (!text || text.trim().length < 50) {
    res.status(400).json({ error: "Text is too short. Please provide at least 50 characters of content." });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 8192,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Please extract and structure the keywords and definitions from the following document text:\n\n${text}`,
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

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error({ err }, "Failed to call OpenAI");
    res.write(`data: ${JSON.stringify({ error: "Failed to process text. Please try again." })}\n\n`);
    res.end();
  }
});

export default router;

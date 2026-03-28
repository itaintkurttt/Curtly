import { Router, type IRouter, type Request, type Response } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

const QUIZ_SYSTEM_PROMPT = `You are a quiz generator. Given structured reviewer content (keyword-definition pairs grouped by topic), generate multiple choice questions.

Rules:
1. Generate 4-6 questions per major topic section (## heading).
2. Each question must have exactly 4 answer choices labeled A, B, C, D.
3. All answer choices must be plausible and closely related to the actual topic — no trick or obviously wrong answers.
4. Only one answer is correct.
5. Questions must test understanding of the keywords and definitions in the reviewer content.
6. Do NOT ask meta questions about the document or reviewer format.
7. Output ONLY valid JSON in this exact format — no extra text before or after:

{
  "sections": [
    {
      "title": "Section Title",
      "questions": [
        {
          "question": "Question text here?",
          "choices": ["A. ...", "B. ...", "C. ...", "D. ..."],
          "answer": "A",
          "explanation": "Brief explanation of why A is correct."
        }
      ]
    }
  ]
}`;

router.post("/quiz/generate", async (req: Request, res: Response) => {
  const { content } = req.body;

  if (!content || typeof content !== "string" || content.trim().length < 50) {
    res.status(400).json({ error: "Reviewer content is required to generate a quiz." });
    return;
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 4096,
      messages: [
        { role: "system", content: QUIZ_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Generate a multiple choice quiz from this reviewer:\n\n${content}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    let quiz: unknown;
    try {
      quiz = JSON.parse(raw);
    } catch {
      res.status(500).json({ error: "Failed to parse quiz response. Please try again." });
      return;
    }

    res.json({ quiz });
  } catch (err) {
    req.log.error({ err }, "Failed to generate quiz");
    res.status(500).json({ error: "Failed to generate quiz. Please try again." });
  }
});

export default router;

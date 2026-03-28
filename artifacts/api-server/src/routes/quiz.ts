import { Router, type IRouter, type Request, type Response } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

const QUIZ_SYSTEM_PROMPT = `You are an academic quiz generator for students. Given structured reviewer content, generate TWO sets of multiple choice questions.

PART 1 — Reviewer-Based Questions (recall & comprehension):
- 3–5 questions per major topic (## heading)
- Directly test terms, definitions, and concepts from the reviewer
- All 4 choices must be plausible and topic-related

PART 2 — Situational & Application Questions:
- 3–5 questions total (not per section) across the whole reviewer
- Focus on APPLYING concepts to real scenarios, problem-solving, case analysis, or theory application
- DO NOT just restate definitions — test higher-order thinking (e.g., "A company experiences X, which concept best explains why...")
- Questions should feel like real exam situational/case-based questions
- All 4 choices must be plausible (no obviously wrong answers)

Output ONLY valid JSON in this exact structure (no extra text):

{
  "reviewerBased": {
    "sections": [
      {
        "title": "Section Title",
        "questions": [
          {
            "question": "Question text?",
            "choices": ["A. ...", "B. ...", "C. ...", "D. ..."],
            "answer": "A",
            "explanation": "Brief explanation."
          }
        ]
      }
    ]
  },
  "situational": {
    "questions": [
      {
        "question": "Scenario-based question...",
        "choices": ["A. ...", "B. ...", "C. ...", "D. ..."],
        "answer": "B",
        "explanation": "Explanation of why B is correct in this context."
      }
    ]
  }
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
      max_completion_tokens: 6000,
      messages: [
        { role: "system", content: QUIZ_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Generate a two-part quiz from this reviewer:\n\n${content}`,
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

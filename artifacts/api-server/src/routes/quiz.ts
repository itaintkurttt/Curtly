import { Router, type IRouter, type Request, type Response } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

const TERM_DEF_PROMPT = `You are an academic quiz generator. Given structured reviewer content, generate multiple choice questions that test TERM RECALL and DEFINITION COMPREHENSION.

Rules:
- 3–5 questions per major topic (## heading in reviewer)
- Questions should test: exact definitions, what a term means, identifying a term from its description
- All 4 choices must be plausible (e.g., similar-sounding terms, common misconceptions)
- No scenario questions — keep it direct: "What is X?", "Which term refers to Y?", "X is best defined as..."

Output ONLY valid JSON in this structure:
{
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
}`;

const SITUATIONAL_PROMPT = `You are an academic quiz generator. Given reviewer content, generate SITUATIONAL and APPLICATION multiple choice questions.

Rules:
- 5–8 questions total across the whole reviewer
- Focus ONLY on higher-order thinking: scenario analysis, theory application, problem-solving, case-based questions
- Format: "A company/student/person experiences [scenario]... which concept best explains / what should they do / what is the most likely outcome..."
- DO NOT restate definitions — these must require thinking, not memorizing
- All 4 choices must be plausible (no obviously wrong answers)

Output ONLY valid JSON in this structure:
{
  "questions": [
    {
      "question": "Scenario-based question...",
      "choices": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "answer": "B",
      "explanation": "Explanation of why B is correct in this context."
    }
  ]
}`;

const BOTH_PROMPT = `You are an academic quiz generator. Given reviewer content, generate TWO sets of questions.

PART 1 — Term & Definition (recall & comprehension):
- 3–5 questions per major topic (## heading)
- Test exact terms, definitions, and concept identification
- All 4 choices must be plausible

PART 2 — Situational & Application:
- 4–6 questions total across the whole reviewer
- Scenario-based, higher-order thinking — apply concepts to real situations
- DO NOT restate definitions

Output ONLY valid JSON:
{
  "reviewerBased": {
    "sections": [
      {
        "title": "Section Title",
        "questions": [
          {
            "question": "...",
            "choices": ["A. ...", "B. ...", "C. ...", "D. ..."],
            "answer": "A",
            "explanation": "..."
          }
        ]
      }
    ]
  },
  "situational": {
    "questions": [
      {
        "question": "...",
        "choices": ["A. ...", "B. ...", "C. ...", "D. ..."],
        "answer": "B",
        "explanation": "..."
      }
    ]
  }
}`;

router.post("/quiz/generate", async (req: Request, res: Response) => {
  const { content, type = "both" } = req.body;

  if (!content || typeof content !== "string" || content.trim().length < 50) {
    res.status(400).json({ error: "Reviewer content is required to generate a quiz." });
    return;
  }

  const validTypes = ["termdef", "situational", "both"];
  if (!validTypes.includes(type as string)) {
    res.status(400).json({ error: "Invalid quiz type." });
    return;
  }

  const systemPrompt =
    type === "termdef"
      ? TERM_DEF_PROMPT
      : type === "situational"
      ? SITUATIONAL_PROMPT
      : BOTH_PROMPT;

  const userMessage =
    type === "termdef"
      ? `Generate term & definition quiz questions from this reviewer:\n\n${content}`
      : type === "situational"
      ? `Generate situational quiz questions from this reviewer:\n\n${content}`
      : `Generate a two-part quiz from this reviewer:\n\n${content}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 6000,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    let quizData: unknown;
    try {
      quizData = JSON.parse(raw);
    } catch {
      res.status(500).json({ error: "Failed to parse quiz response. Please try again." });
      return;
    }

    // Normalize response shape
    if (type === "termdef") {
      res.json({ quiz: { reviewerBased: quizData, situational: { questions: [] } } });
    } else if (type === "situational") {
      res.json({ quiz: { reviewerBased: { sections: [] }, situational: quizData } });
    } else {
      res.json({ quiz: quizData });
    }
  } catch (err) {
    req.log.error({ err }, "Failed to generate quiz");
    res.status(500).json({ error: "Failed to generate quiz. Please try again." });
  }
});

export default router;

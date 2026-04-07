import { Router, type IRouter } from "express";
import { ExtractStudyContentBody } from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";
import { ai } from "@workspace/integrations-gemini-ai";
import multer from "multer";
import os from "os";
import fs from "fs/promises";
import path from "path";
// @ts-ignore — pdf-parse v1 is CJS with no type declarations
import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import JSZip from "jszip";

const router: IRouter = Router();

// Preserve original file extension so parsers can detect file type
const upload = multer({
  storage: multer.diskStorage({
    destination: os.tmpdir(),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    },
  }),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
});

const ALLOWED_EXTENSIONS = new Set([".pdf", ".docx", ".doc", ".pptx", ".ppt", ".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"]);
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"]);

/** Extract plain text from a PPTX file buffer by reading slide XML */
async function extractPptxText(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const slideFiles = Object.keys(zip.files)
    .filter((name) => name.match(/^ppt\/slides\/slide\d+\.xml$/))
    .sort();

  const texts: string[] = [];
  for (const slideFile of slideFiles) {
    const xml = await zip.files[slideFile].async("text");
    // Extract all text between <a:t> tags
    const matches = xml.match(/<a:t[^>]*>([^<]+)<\/a:t>/g) ?? [];
    const slideText = matches.map((m) => m.replace(/<[^>]+>/g, "")).join(" ");
    if (slideText.trim()) texts.push(slideText.trim());
  }
  return texts.join("\n\n");
}

/** Extract plain text from a DOCX file buffer */
async function extractDocxText(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

/** Extract plain text from a PDF file buffer */
async function extractPdfText(buffer: Buffer): Promise<string> {
  const result = await pdfParse(buffer);
  return result.text;
}

/** Extract text from an image using Gemini Vision API */
async function extractImageText(buffer: Buffer): Promise<string> {
  const base64 = buffer.toString("base64");
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        role: "user",
        parts: [
          {
            text: "Extract all visible text and information from this image. Return only the extracted text content, nothing else.",
          },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64,
            },
          },
        ],
      },
    ],
  });
  const text = (response as unknown as { text?: () => string }).text?.() ?? "";
  return text;
}

const SYSTEM_PROMPT = `Role: Act as a Precise Academic Curator and Subject Matter Expert.

Task: Analyze the uploaded modules and generate a Single, Comprehensive Study Reviewer. Your goal is "Zero Information Loss"—do not summarize to the point of losing connection to the source material.

Mandatory Extraction Protocols:

Verbatim Lists: If the module contains a list of types, steps, categories, or rules, extract the full list. Do not condense them into a single sentence.

Technical Terminology: Identify and define every bolded, underlined, or specifically named technical term, acronym, or jargon found in the text.

The "Hidden" Specifics: Look for specific numbers, timeframes (e.g., "the 10-minute rule"), specialized tools, or unique methodologies that could be used for multiple-choice questions.

Anatomy/Components: If the material mentions parts of a system, benefits to specific body parts, or lines of equipment, list them individually with their specific functions.

Process Logic: For any "how-to" or "procedure" sections, maintain the exact step-by-step sequence as presented in the slides.

Structural Requirements — use these exact markdown headings in order (include only sections relevant to the material):

## Core Definitions & Theories
(The "What" and "Why" — all key terms, concepts, and theoretical foundations)

## Systems, Classifications, & Types
(The "Technical Framework" — categories, taxonomies, types, and classifications)

## Procedures, Methodologies, & Steps
(The "How-to" — step-by-step processes in exact sequence)

## Specialized Tools, Gear, or Requirements
(Equipment, tools, materials, or prerequisites)

## Safety, Exceptions, & Critical Warnings
(Warnings, contraindications, edge cases, and critical notes)

Constraints:
- Do not use "fluff" or introductory filler. Start directly with the first ## heading.
- No document title, file name, author, date, or metadata before the first heading.
- No closing remarks or summaries after the last bullet.
- Use bullet points for readability; every bullet must be information-dense.
- Preserve exact numbers, names, timeframes, and terminology from the source — never paraphrase technical specifics.
- Omit any section heading if that category has no relevant content in the source material.
- If the input has insufficient content: ## Core Definitions & Theories\n- **Error**: Insufficient content to extract meaningful information.`;

// Parse a file and return extracted text
router.post("/study/parse-file", upload.single("file"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded." });
    return;
  }

  const ext = path.extname(req.file.originalname).toLowerCase();
  const filePath = req.file.path;

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    await fs.unlink(filePath).catch(() => {});
    res.status(400).json({ error: "Unsupported file type. Please upload a PDF, DOCX, PPTX, or image file (JPG, PNG, WebP)." });
    return;
  }

  let text = "";
  try {
    const buffer = await fs.readFile(filePath);
    await fs.unlink(filePath).catch(() => {});

    if (ext === ".pdf") {
      text = await extractPdfText(buffer);
    } else if (ext === ".docx" || ext === ".doc") {
      text = await extractDocxText(buffer);
    } else if (ext === ".pptx" || ext === ".ppt") {
      text = await extractPptxText(buffer);
    } else if (IMAGE_EXTENSIONS.has(ext)) {
      text = await extractImageText(buffer);
    }

    if (!text || text.trim().length < 20) {
      res.status(422).json({ error: "Could not extract readable text from this file. Please ensure it contains legible text or data." });
      return;
    }

    res.json({ text: text.trim() });
  } catch (err) {
    req.log.error({ err }, "Failed to parse file");
    await fs.unlink(filePath).catch(() => {});
    res.status(500).json({ error: "Failed to parse file. Please ensure the file is not corrupted or password-protected." });
  }
});

// Extract study content from raw text (SSE streaming)
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

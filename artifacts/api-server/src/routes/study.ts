import { Router, type IRouter } from "express";
import { ExtractStudyContentBody } from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";
import { ai } from "@workspace/integrations-gemini-ai";
import multer from "multer";
import os from "os";
import fs from "fs/promises";
import path from "path";
// The package's CJS entry trips Node's ESM loader; load the ESM build directly.
import { YoutubeTranscript } from "youtube-transcript/dist/youtube-transcript.esm.js";
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

const IMAGE_MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".bmp": "image/bmp",
};

/** Extract text from an image using Gemini Vision API */
async function extractImageText(buffer: Buffer, ext: string): Promise<string> {
  const base64 = buffer.toString("base64");
  const mimeType = IMAGE_MIME_TYPES[ext] ?? "image/jpeg";
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType,
              data: base64,
            },
          },
          {
            text: "You are an OCR and visual analysis assistant. Extract ALL visible text, headings, bullet points, captions, labels, diagrams, tables, and notes from this image. Preserve structure (headings, lists) using plain text and markdown. If the image contains handwritten notes, infographics, screenshots, slides, or photographs of pages, transcribe everything legible. Also briefly describe any non-text visual information (diagrams, charts) that conveys educational content. Return only the extracted/transcribed content, no preamble.",
          },
        ],
      },
    ],
    config: { maxOutputTokens: 8192 },
  });
  const text = (response as unknown as { text?: string }).text ?? "";
  return text;
}

/** Extract a YouTube video ID from common URL formats. Returns null if not parseable. */
function extractYoutubeVideoId(input: string): string | null {
  const trimmed = input.trim();
  // Bare 11-char ID
  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) return trimmed;
  try {
    const u = new URL(trimmed);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
    }
    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      const v = u.searchParams.get("v");
      if (v && /^[A-Za-z0-9_-]{11}$/.test(v)) return v;
      // /embed/<id>, /shorts/<id>, /live/<id>
      const parts = u.pathname.split("/").filter(Boolean);
      if (parts.length >= 2 && ["embed", "shorts", "live", "v"].includes(parts[0])) {
        const id = parts[1];
        if (/^[A-Za-z0-9_-]{11}$/.test(id)) return id;
      }
    }
  } catch {
    // not a URL
  }
  return null;
}

/** Fetch a YouTube transcript (any available caption track). Throws with a friendly message on failure. */
async function fetchYoutubeTranscript(videoId: string): Promise<string> {
  try {
    const segments = await YoutubeTranscript.fetchTranscript(videoId);
    if (!segments || segments.length === 0) {
      throw new Error("This video has no captions available. Try a different video that has subtitles enabled.");
    }
    const text = segments
      .map((s) => (s.text ?? "").replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .join(" ");
    if (!text || text.trim().length < 20) {
      throw new Error("The transcript appears empty. Try a different video.");
    }
    // Decode common HTML entities the transcript scraper leaves behind
    return text
      .replace(/&amp;#39;/g, "'")
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/transcript/i.test(msg) && /disabled|not available|could not/i.test(msg)) {
      throw new Error("Captions are disabled or unavailable for this video. Try one with subtitles.");
    }
    throw err instanceof Error ? err : new Error(String(err));
  }
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
      text = await extractImageText(buffer, ext);
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

// Fetch a YouTube transcript and return it as plain text
router.post("/study/youtube-transcript", async (req, res) => {
  const url = typeof req.body?.url === "string" ? req.body.url : "";
  if (!url.trim()) {
    res.status(400).json({ error: "Please provide a YouTube URL." });
    return;
  }
  const videoId = extractYoutubeVideoId(url);
  if (!videoId) {
    res.status(400).json({ error: "That doesn't look like a valid YouTube URL." });
    return;
  }
  try {
    const text = await fetchYoutubeTranscript(videoId);
    res.json({ text, videoId });
  } catch (err) {
    req.log.warn({ err, videoId }, "Failed to fetch YouTube transcript");
    const msg = err instanceof Error ? err.message : "Failed to fetch transcript.";
    res.status(422).json({ error: msg });
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
  const sourceType = typeof req.body?.sourceType === "string" ? req.body.sourceType : "document";
  const isVideo = sourceType === "video" || sourceType === "youtube";

  if (!text || text.trim().length < 50) {
    res.status(400).json({ error: "Text is too short. Please provide at least 50 characters of content." });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const systemPrompt = isVideo
    ? `${SYSTEM_PROMPT}

Source Context: The material below is an AUTO-GENERATED YOUTUBE VIDEO TRANSCRIPT.
- Refer to it as "the video", "the speaker", "the lecture", or "the presenter" — never "the text" or "the document".
- Use phrasing like "The speaker discusses...", "The presenter explains...", "In the video, ...".
- Transcripts may contain filler words, stutters, mis-transcribed words, and missing punctuation. Silently correct obvious transcription errors when reconstructing terminology, but never invent facts not implied by the transcript.
- Preserve the speaker's exact terminology, names, numbers, and step-by-step sequences.`
    : SYSTEM_PROMPT;

  const userPrefix = isVideo
    ? "Please extract and structure the key concepts, terminology, and definitions from the following YouTube video transcript:"
    : "Please extract and structure the keywords and definitions from the following document text:";

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 8192,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `${userPrefix}\n\n${text}`,
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

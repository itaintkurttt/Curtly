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

const STATIC_SYSTEM_PROMPT = `Role: Act as a friendly Filipino study buddy and tutor. Your job is to help any student truly understand the material — not just memorize it.

Output language: Plain, conversational. Mix English and Filipino/Taglish naturally — kapag mas malinaw or mas madaling intindihin sa Tagalog ang isang concept, gamitin mo. Default to English for technical or academic terms, but explain them in everyday Taglish kapag nakakatulong.

Goal: Don't just summarize — synthesize and expound. Help the student understand the WHY, not just the WHAT.

Generate a Reviewer using these EXACT markdown sections, in this exact order:

## The Core
The direct, accurate info from the source. Use bullet points. Preserve exact terms, numbers, names, steps, and lists from the material — never paraphrase technical specifics.

## The Why
Explain the underlying principles behind those facts. Why does this work this way? What's the reasoning, logic, or cause-and-effect behind the concepts in The Core?

## Closely Related Concepts
2-3 concepts that are NOT explicitly in the source but sit in the same "neighborhood" of the topic. Each one should help the student grasp the bigger context. Make it clear these are supplementary background, e.g. "*(Not in the source — related context)*".

## Real-World Analogy
ONE simple, vivid analogy a Filipino student can picture. Use everyday Pinoy things (jeepney, sari-sari store, kainan, basketball, school setting, etc.) kapag bagay — pero wag pilitin if the topic is too abstract for one.

Hard rules:
- Stay strictly within the neighborhood of the original topic. Do NOT hallucinate facts or drift into unrelated territory.
- No fluff intro, no closing summary, no metadata. Start directly with "## The Core".
- Use bullet points for readability. Bold key terms with **markdown**.
- If the input is too short or unclear, output only:
  ## The Core
  - **Error**: Insufficient content to extract meaningful information.`;

const YOUTUBE_SYSTEM_PROMPT = `Role: Act as a friendly Filipino study buddy and tutor. You are observing a YouTube lesson in full multimodal mode — you can SEE the visuals AND HEAR the audio.

Output language: Plain, conversational. Mix English and Filipino/Taglish naturally — kapag mas malinaw sa Tagalog, gamitin mo. Default to English for technical terms, but explain them in everyday Taglish kapag nakakatulong.

Goal: Observe the WHOLE lesson — on-screen text, slides, whiteboard diagrams, equations, physical demonstrations, AND the speaker's words. Combine what you SEE with what you HEAR into one complete understanding. Don't rely on audio alone.

Generate a Reviewer using these EXACT markdown sections, in this exact order:

## The Core
The key facts, definitions, terms, and steps the lesson teaches. Combine spoken explanations with what's shown on slides, board, screen, or demonstrated physically. Preserve exact terms, numbers, names, and step-by-step sequences.

## The Why
The underlying principles behind what the speaker shows or says. Why is it taught this way? What's the reasoning behind the technique, formula, or process?

## Visual Notes
Things the student would only catch by SEEING the video — diagrams drawn on the board, equations or charts on screen, physical demonstrations, important on-screen text or labels. Don't repeat audio info here; focus on what the visuals add. Kung hindi mo masyadong nakikita ang isang detail, sabihin mo na lang — wag mag-imbento.

## Closely Related Concepts
2-3 concepts NOT explicitly in the lesson but in the same neighborhood, to round out the student's understanding. Mark clearly as supplementary, e.g. "*(Not in the video — related context)*".

## Real-World Analogy
ONE simple, vivid analogy a Filipino student can picture. Use everyday Pinoy things kapag bagay.

Hard rules:
- Stay strictly within the neighborhood of the lesson. Do NOT hallucinate or drift into unrelated topics.
- No fluff intro, no closing summary, no video title or channel metadata. Start directly with "## The Core".
- Refer to the source as "the video", "the lesson", or "the speaker/teacher" — never "the text" or "the document".
- Use bullet points for readability. Bold key terms with **markdown**.`;

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
        { role: "system", content: STATIC_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Generate the study reviewer for the following source material, following all the rules in your instructions:\n\n${text}`,
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

// Multimodal YouTube extraction — Gemini observes video + audio directly via fileData URI.
router.post("/study/extract-youtube", async (req, res) => {
  const url = typeof req.body?.url === "string" ? req.body.url : "";
  const videoId = extractYoutubeVideoId(url);
  if (!videoId) {
    res.status(400).json({ error: "That doesn't look like a valid YouTube URL." });
    return;
  }
  const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const stream = await ai.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { fileData: { fileUri: canonicalUrl, mimeType: "video/mp4" } },
            { text: "Observe this YouTube lesson in full multimodal mode and produce the study reviewer following all the rules in your system instructions." },
          ],
        },
      ],
      config: {
        systemInstruction: YOUTUBE_SYSTEM_PROMPT,
        maxOutputTokens: 8192,
      },
    });

    for await (const chunk of stream) {
      const content = (chunk as unknown as { text?: string }).text ?? "";
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error({ err, videoId }, "Gemini multimodal YouTube extraction failed");
    const raw = err instanceof Error ? err.message : "Failed to process video.";
    const friendly = /quota|rate/i.test(raw)
      ? "AI quota reached. Please try again in a moment."
      : /unsupported|invalid|not found|unavailable|private/i.test(raw)
      ? "This video can't be processed (it may be private, age-restricted, or unavailable). Try a different one."
      : "Failed to process this video. Please try a different one.";
    res.write(`data: ${JSON.stringify({ error: friendly })}\n\n`);
    res.end();
  }
});

export default router;

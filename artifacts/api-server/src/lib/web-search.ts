import { ai } from "@workspace/integrations-gemini-ai";

export interface SearchResult {
  title: string;
  snippet: string;
  url: string;
}

export interface GeminiSearchResponse {
  answer: string;
  sources: SearchResult[];
}

/**
 * Use Gemini with Google Search grounding to answer a question in context.
 * Returns the grounded answer + source list.
 */
export async function geminiSearchAnswer(
  prompt: string,
  context?: string,
): Promise<GeminiSearchResponse> {
  const contents = context
    ? [
        {
          role: "user" as const,
          parts: [
            {
              text: `Context from study materials:\n${context.slice(0, 3000)}\n\n${prompt}`,
            },
          ],
        },
      ]
    : [{ role: "user" as const, parts: [{ text: prompt }] }];

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents,
    config: {
      tools: [{ googleSearch: {} }],
      maxOutputTokens: 8192,
    },
  });

  const answer = response.text ?? "";

  // Extract sources from grounding metadata
  const sources: SearchResult[] = [];
  const chunks =
    (response as unknown as { candidates?: Array<{ groundingMetadata?: { groundingChunks?: Array<{ web?: { uri?: string; title?: string } }> } }> })
      .candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];

  for (const chunk of chunks) {
    if (chunk.web?.uri && chunk.web?.title) {
      sources.push({
        title: chunk.web.title,
        url: chunk.web.uri,
        snippet: "",
      });
    }
  }

  return { answer, sources };
}

/**
 * Stream a Gemini grounded response chunk-by-chunk.
 * Calls onChunk(text) for each streamed piece.
 * Returns final sources when done.
 */
export async function geminiSearchStream(
  prompt: string,
  context: string | undefined,
  onChunk: (text: string) => void,
): Promise<SearchResult[]> {
  const contents = context
    ? [
        {
          role: "user" as const,
          parts: [
            {
              text: `Context from study materials:\n${context.slice(0, 3000)}\n\n${prompt}`,
            },
          ],
        },
      ]
    : [{ role: "user" as const, parts: [{ text: prompt }] }];

  const stream = await ai.models.generateContentStream({
    model: "gemini-3-flash-preview",
    contents,
    config: {
      tools: [{ googleSearch: {} }],
      maxOutputTokens: 8192,
    },
  });

  let lastResponse: unknown = null;

  for await (const chunk of stream) {
    const text = (chunk as { text?: string }).text;
    if (text) {
      onChunk(text);
    }
    lastResponse = chunk;
  }

  // Extract sources from final chunk's grounding metadata
  const sources: SearchResult[] = [];
  const chunks =
    (lastResponse as { candidates?: Array<{ groundingMetadata?: { groundingChunks?: Array<{ web?: { uri?: string; title?: string } }> } }> })
      ?.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];

  for (const chunk of chunks) {
    if ((chunk as { web?: { uri?: string; title?: string } }).web?.uri) {
      const web = (chunk as { web: { uri: string; title?: string } }).web;
      sources.push({ title: web.title ?? web.uri, url: web.uri, snippet: "" });
    }
  }

  return sources;
}

/** Fallback: Wikipedia summary (no API key, always works) */
export async function wikipediaFallback(query: string): Promise<SearchResult | null> {
  try {
    const searchRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&srlimit=1&origin=*`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!searchRes.ok) return null;
    const searchData = (await searchRes.json()) as { query?: { search?: Array<{ title?: string }> } };
    const title = searchData.query?.search?.[0]?.title;
    if (!title) return null;

    const summaryRes = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!summaryRes.ok) return null;
    const summary = (await summaryRes.json()) as {
      title?: string;
      extract?: string;
      content_urls?: { desktop?: { page?: string } };
    };
    if (!summary.extract) return null;
    return {
      title: `Wikipedia: ${summary.title ?? title}`,
      snippet: summary.extract.slice(0, 600),
      url: summary.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`,
    };
  } catch {
    return null;
  }
}

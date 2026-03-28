export interface SearchResult {
  title: string;
  snippet: string;
  url: string;
}

export interface WebSearchResults {
  abstract?: string;
  abstractUrl?: string;
  results: SearchResult[];
}

/** Query DuckDuckGo Instant Answers API */
async function duckDuckGoSearch(query: string): Promise<WebSearchResults> {
  const url = new URL("https://api.duckduckgo.com/");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("no_html", "1");
  url.searchParams.set("skip_disambig", "1");

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": "CurtlyStudyAssistant/1.0" },
    signal: AbortSignal.timeout(6000),
  });

  if (!res.ok) return { results: [] };

  const data = (await res.json()) as {
    Abstract?: string;
    AbstractURL?: string;
    RelatedTopics?: Array<{ Text?: string; FirstURL?: string; Name?: string }>;
    Results?: Array<{ Text?: string; FirstURL?: string }>;
  };

  const results: SearchResult[] = [];

  // Top results
  for (const r of data.Results?.slice(0, 3) ?? []) {
    if (r.Text && r.FirstURL) {
      results.push({ title: r.Text.slice(0, 80), snippet: r.Text, url: r.FirstURL });
    }
  }

  // Related topics (exclude nested categories)
  for (const t of data.RelatedTopics?.slice(0, 5) ?? []) {
    if (t.Text && t.FirstURL && !t.Name) {
      results.push({ title: t.Text.slice(0, 80), snippet: t.Text, url: t.FirstURL });
    }
  }

  return {
    abstract: data.Abstract || undefined,
    abstractUrl: data.AbstractURL || undefined,
    results: results.slice(0, 5),
  };
}

/** Wikipedia summary API for educational depth */
async function wikipediaSummary(query: string): Promise<{ title: string; extract: string; url: string } | null> {
  try {
    const searchRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&srlimit=1&origin=*`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!searchRes.ok) return null;

    const searchData = (await searchRes.json()) as {
      query?: { search?: Array<{ title?: string }> };
    };

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
      title: summary.title ?? title,
      extract: summary.extract.slice(0, 800),
      url: summary.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`,
    };
  } catch {
    return null;
  }
}

/** Combined web search: DDG + Wikipedia */
export async function searchWeb(query: string): Promise<{
  sources: SearchResult[];
  summary?: string;
  summaryUrl?: string;
  wikipedia?: { title: string; extract: string; url: string } | null;
}> {
  const [ddg, wiki] = await Promise.allSettled([
    duckDuckGoSearch(query),
    wikipediaSummary(query),
  ]);

  const ddgResult = ddg.status === "fulfilled" ? ddg.value : { results: [] };
  const wikiResult = wiki.status === "fulfilled" ? wiki.value : null;

  return {
    sources: ddgResult.results,
    summary: ddgResult.abstract,
    summaryUrl: ddgResult.abstractUrl,
    wikipedia: wikiResult,
  };
}

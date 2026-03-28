import { useState, useCallback } from 'react';

export function useStudyStream() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (text: string) => {
    setIsGenerating(true);
    setOutput("");
    setError(null);

    try {
      const response = await fetch('/api/study/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });

      if (!response.ok) {
        throw new Error('Failed to connect to the study assistant. Please try again.');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream available');

      const decoder = new TextDecoder();
      let done = false;
      let accumulated = "";
      let buffer = "";

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          // SSE chunks are separated by double newlines
          const parts = buffer.split('\n\n');
          // Keep the last part in buffer if it's incomplete
          buffer = parts.pop() || "";

          for (const part of parts) {
            const lines = part.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const dataStr = line.slice(6);
                
                if (dataStr.trim() === '[DONE]') {
                  done = true;
                  continue;
                }

                try {
                  const data = JSON.parse(dataStr);
                  if (data.done) {
                    done = true;
                  }
                  if (data.content) {
                    accumulated += data.content;
                    setOutput(accumulated);
                  }
                } catch (e) {
                  // Silently ignore partial JSON chunks; they are rare with \n\n split but possible
                }
              }
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred during generation.');
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const clear = useCallback(() => {
    setOutput("");
    setError(null);
  }, []);

  return { generate, clear, output, isGenerating, error };
}

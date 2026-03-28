import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Send, Globe, Loader2, ExternalLink, Bot, User, Sparkles, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Source {
  title: string;
  url: string;
  snippet?: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  status?: string;
}

interface AskAIPanelProps {
  onClose: () => void;
  reviewerContent: string;
}

export function AskAIPanel({ onClose, reviewerContent }: AskAIPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendQuestion = useCallback(async () => {
    const q = input.trim();
    if (!q || isStreaming) return;

    setInput('');
    const userMsg: Message = { role: 'user', content: q };
    setMessages(prev => [...prev, userMsg]);

    const assistantMsg: Message = { role: 'assistant', content: '', status: 'searching' };
    setMessages(prev => [...prev, assistantMsg]);
    setIsStreaming(true);

    try {
      const res = await fetch('/api/study/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ question: q, reviewerContent }),
      });

      if (!res.ok) {
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: 'Failed to get an answer. Please try again.' };
          return updated;
        });
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = '';
      let accContent = '';
      let sources: Source[] = [];

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';

        for (const part of parts) {
          for (const line of part.split('\n')) {
            if (!line.startsWith('data: ')) continue;
            try {
              const data = JSON.parse(line.slice(6));

              if (data.status) {
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { ...updated[updated.length - 1], status: data.status };
                  return updated;
                });
              }

              if (data.sources) {
                sources = data.sources;
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { ...updated[updated.length - 1], sources };
                  return updated;
                });
              }

              if (data.content) {
                accContent += data.content;
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    content: accContent,
                    status: undefined,
                  };
                  return updated;
                });
              }

              if (data.error) {
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { role: 'assistant', content: data.error };
                  return updated;
                });
              }

              if (data.done) break;
            } catch {
              // partial JSON, skip
            }
          }
        }
      }
    } catch {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'assistant', content: 'Network error. Please try again.' };
        return updated;
      });
    } finally {
      setIsStreaming(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [input, isStreaming, reviewerContent]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendQuestion();
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-stretch justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="relative w-full max-w-lg bg-background border-l border-border/60 shadow-2xl flex flex-col h-full"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 flex-shrink-0 bg-card/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-lg text-foreground">Ask AI</h2>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Globe className="w-3 h-3" /> Answers from reviewer + web sources
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-5">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center min-h-[300px] gap-5 text-center text-muted-foreground">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/15 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-primary/50" />
              </div>
              <div>
                <p className="font-serif font-semibold text-foreground text-base mb-1">Ask anything about the topic</p>
                <p className="text-sm max-w-xs">
                  I'll combine the reviewer content with web sources to give you a comprehensive answer.
                </p>
              </div>
              <div className="space-y-2 w-full max-w-xs">
                {['What is the key difference between X and Y?', 'Explain how this concept works in practice', 'Give me an example of this theory being applied'].map((s) => (
                  <button
                    key={s}
                    onClick={() => { setInput(s); setTimeout(() => inputRef.current?.focus(), 50); }}
                    className="w-full text-left text-xs px-3 py-2 rounded-lg border border-border/60 hover:border-primary/30 hover:bg-primary/[0.02] transition-all text-muted-foreground"
                  >
                    "{s}"
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
              )}

              <div className={`max-w-[85%] ${msg.role === 'user' ? 'order-first' : ''}`}>
                {msg.role === 'user' ? (
                  <div className="bg-primary text-primary-foreground px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm leading-relaxed">
                    {msg.content}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Status indicator */}
                    {msg.status && !msg.content && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/60 border border-border/50 rounded-xl px-4 py-2.5">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        {msg.status === 'searching' ? 'Searching web sources...' : 'Generating answer...'}
                      </div>
                    )}

                    {/* Sources */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                          <Globe className="w-3 h-3" /> Web sources used:
                        </p>
                        {msg.sources.slice(0, 3).map((s, si) => (
                          <a
                            key={si}
                            href={s.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border border-border/50 hover:border-primary/30 bg-muted/30 hover:bg-primary/[0.03] transition-all group"
                          >
                            <span className="flex-1 truncate text-muted-foreground group-hover:text-foreground transition-colors">
                              {s.title.slice(0, 60)}
                            </span>
                            <ExternalLink className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                          </a>
                        ))}
                      </div>
                    )}

                    {/* Answer content */}
                    {msg.content && (
                      <div className="bg-card border border-border/60 rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                        {msg.content}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-muted border border-border/50 flex items-center justify-center flex-shrink-0 mt-1">
                  <User className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="flex-shrink-0 px-4 py-4 border-t border-border/60 bg-card/30">
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about the topic..."
              rows={1}
              disabled={isStreaming}
              className="flex-1 resize-none rounded-xl border border-border/60 bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all placeholder:text-muted-foreground disabled:opacity-50 max-h-32"
              style={{ minHeight: '44px' }}
            />
            <Button
              onClick={sendQuestion}
              disabled={!input.trim() || isStreaming}
              size="sm"
              className="h-11 w-11 p-0 rounded-xl flex-shrink-0"
            >
              {isStreaming ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      </motion.div>
    </div>
  );
}

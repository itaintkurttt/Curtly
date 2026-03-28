import { useState, useRef, useEffect } from 'react';
import { useStudyStream } from '@/hooks/use-study-stream';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FormattedOutput } from '@/components/formatted-output';
import { BookOpenText, Sparkles, Copy, Trash2, CheckCheck, FileText, AlertCircle, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Home() {
  const [input, setInput] = useState("");
  const { generate, clear, output, isGenerating, error } = useStudyStream();
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll output container as new text streams in
  useEffect(() => {
    if (scrollRef.current && isGenerating) {
      const scrollElement = scrollRef.current;
      // Only auto-scroll if we're already near the bottom to avoid fighting user scroll
      const isNearBottom = scrollElement.scrollHeight - scrollElement.scrollTop - scrollElement.clientHeight < 100;
      if (isNearBottom) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [output, isGenerating]);

  const handleGenerate = () => {
    if (!input.trim()) return;
    generate(input);
  };

  const handleClear = () => {
    setInput("");
    clear();
  };

  const handleCopy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background relative selection:bg-primary/20 selection:text-primary-foreground">
      {/* Subtle academic grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
      
      <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-background/80 border-b border-border/60">
        <div className="container mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-primary">
            <div className="bg-primary/10 p-1.5 rounded-lg border border-primary/20">
              <BookOpenText className="w-5 h-5" />
            </div>
            <span className="text-xl font-serif font-bold tracking-tight text-foreground">ScholarAI</span>
          </div>
          <div className="flex items-center text-sm font-medium text-muted-foreground">
            Technical Study Assistant
          </div>
        </div>
      </header>
      
      <main className="flex-1 container mx-auto px-4 lg:px-8 py-8 lg:py-10 max-w-[1400px] relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 h-full min-h-[calc(100vh-10rem)]">
          
          {/* LEFT COLUMN - INPUT */}
          <section className="flex flex-col gap-4">
            <div className="flex items-end justify-between">
              <div>
                <h2 className="text-lg font-serif font-semibold flex items-center gap-2 text-foreground">
                  <FileText className="w-5 h-5 text-primary" />
                  Source Material
                </h2>
                <p className="text-sm text-muted-foreground mt-1">Paste your raw PDF text or lecture notes</p>
              </div>
              <span className="text-xs text-muted-foreground font-mono bg-muted/50 border border-border/50 px-2 py-1 rounded-md">
                {input.length.toLocaleString()} chars
              </span>
            </div>
            
            <div className="relative flex-1 flex flex-col min-h-[350px] lg:min-h-[500px]">
              <Textarea 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Example: The mitochondria is the powerhouse of the cell. It generates most of the chemical energy needed to power the cell's biochemical reactions..."
                className="flex-1 h-full"
              />
            </div>
            
            <div className="flex items-center gap-4 mt-2">
              <Button 
                onClick={handleGenerate} 
                disabled={isGenerating || !input.trim()}
                className="flex-1"
                size="lg"
              >
                {isGenerating ? (
                  <>
                     <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                     Extracting Insights...
                  </>
                ) : (
                  <>
                     <Sparkles className="w-5 h-5" />
                     Generate Reviewer
                  </>
                )}
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                onClick={handleClear}
                disabled={isGenerating || (!input && !output)}
                className="px-6 group"
                title="Clear all"
              >
                <Trash2 className="w-5 h-5 text-muted-foreground group-hover:text-destructive transition-colors" />
              </Button>
            </div>
          </section>

          {/* RIGHT COLUMN - OUTPUT */}
          <section className="flex flex-col gap-4">
            <div className="flex items-end justify-between h-[52px]">
               <div>
                 <h2 className="text-lg font-serif font-semibold flex items-center gap-2 text-foreground">
                   <BookOpenText className="w-5 h-5 text-primary" />
                   Structured Reviewer
                 </h2>
                 <p className="text-sm text-muted-foreground mt-1">Keywords and definitions extracted</p>
               </div>
               
               <AnimatePresence>
                 {output && (
                   <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                     <Button 
                       variant="secondary" 
                       size="sm" 
                       onClick={handleCopy} 
                       className="text-foreground shadow-sm h-9"
                     >
                       {copied ? <CheckCheck className="w-4 h-4 text-green-600 mr-1.5" /> : <Copy className="w-4 h-4 mr-1.5 text-primary" />}
                       {copied ? "Copied!" : "Copy Text"}
                     </Button>
                   </motion.div>
                 )}
               </AnimatePresence>
            </div>

            <div className="flex-1 bg-card border-2 border-border/50 rounded-2xl shadow-xl shadow-black/[0.02] relative overflow-hidden flex flex-col min-h-[350px] lg:min-h-[500px]">
              {error ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-destructive">
                   <div className="bg-destructive/10 p-4 rounded-full mb-4">
                     <AlertCircle className="w-8 h-8 text-destructive" />
                   </div>
                   <h3 className="font-semibold text-lg mb-2">Generation Failed</h3>
                   <p className="text-sm opacity-80 max-w-sm">{error}</p>
                   <Button variant="outline" size="sm" onClick={() => generate(input)} className="mt-6">
                     <RefreshCw className="w-4 h-4 mr-2" /> Try Again
                   </Button>
                </div>
              ) : output ? (
                <div 
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto p-6 md:p-8 scroll-smooth"
                >
                  <FormattedOutput text={output} />
                  
                  {isGenerating && (
                    <div className="flex items-center gap-1.5 mt-6 text-primary p-2">
                      <span className="w-2 h-2 bg-primary/60 rounded-full animate-pulse" />
                      <span className="w-2 h-2 bg-primary/60 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-primary/60 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                  <div className="w-20 h-20 mb-6 rounded-3xl bg-gradient-to-br from-primary/5 to-primary/10 flex items-center justify-center border border-primary/10 shadow-inner">
                    <Sparkles className="w-10 h-10 text-primary/40" />
                  </div>
                  <h3 className="text-xl font-serif font-semibold text-foreground mb-3">Ready to Learn</h3>
                  <p className="max-w-md text-[15px] leading-relaxed">
                    Paste your raw study materials on the left and click generate. I'll distill the content into a clean, scannable exam reviewer highlighting the most important concepts.
                  </p>
                </div>
              )}
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}

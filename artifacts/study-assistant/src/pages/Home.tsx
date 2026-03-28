import { useState, useRef, useEffect, useCallback } from 'react';
import { useStudyStream } from '@/hooks/use-study-stream';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FormattedOutput } from '@/components/formatted-output';
import {
  BookOpenText, Sparkles, Copy, Trash2, CheckCheck,
  FileText, AlertCircle, RefreshCw, Upload, FileUp, X, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ACCEPTED_TYPES = ".pdf,.docx,.doc,.pptx,.ppt";
const ACCEPTED_LABELS = "PDF, DOCX, PPTX";

type InputMode = "text" | "file";

export default function Home() {
  const [input, setInput] = useState("");
  const [inputMode, setInputMode] = useState<InputMode>("text");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { generate, clear, output, isGenerating, error } = useStudyStream();
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current && isGenerating) {
      const el = scrollRef.current;
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
      if (isNearBottom) el.scrollTop = el.scrollHeight;
    }
  }, [output, isGenerating]);

  const handleGenerate = () => {
    if (!input.trim()) return;
    generate(input);
  };

  const handleClear = () => {
    setInput("");
    setSelectedFile(null);
    setParseError(null);
    clear();
  };

  const handleCopy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const parseAndGenerate = useCallback(async (file: File) => {
    setParseError(null);
    setIsParsing(true);
    setInput("");
    clear();

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/study/parse-file", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setParseError(data.error ?? "Failed to parse file.");
        setIsParsing(false);
        return;
      }
      setInput(data.text);
      setIsParsing(false);
      // Auto-generate reviewer after parsing
      generate(data.text);
    } catch {
      setParseError("Network error while parsing file. Please try again.");
      setIsParsing(false);
    }
  }, [clear, generate]);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setParseError(null);
    parseAndGenerate(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
    // Reset so same file can be re-selected
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setInputMode("file");
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const removeFile = () => {
    setSelectedFile(null);
    setParseError(null);
    setInput("");
    clear();
  };

  const busy = isGenerating || isParsing;

  return (
    <div
      className="min-h-screen flex flex-col bg-background relative selection:bg-primary/20 selection:text-primary-foreground"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {/* Subtle academic grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
      {/* Global drag overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-primary/10 border-4 border-dashed border-primary/50 flex items-center justify-center pointer-events-none"
          >
            <div className="bg-card rounded-2xl p-10 shadow-2xl text-center border border-primary/20">
              <FileUp className="w-14 h-14 text-primary mx-auto mb-4" />
              <p className="text-xl font-serif font-semibold text-foreground">Drop your file here</p>
              <p className="text-sm text-muted-foreground mt-1">{ACCEPTED_LABELS} supported</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-background/80 border-b border-border/60">
        <div className="container mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-primary">
            <div className="bg-primary/10 p-1.5 rounded-lg border border-primary/20">
              <BookOpenText className="w-5 h-5" />
            </div>
            <span className="text-xl font-serif font-bold tracking-tight text-foreground">kurt AI</span>
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
                <p className="text-sm text-muted-foreground mt-1">Paste text or upload a file</p>
              </div>

              {/* Mode toggle */}
              <div className="flex items-center bg-muted/60 border border-border/50 rounded-lg p-1 gap-1">
                <button
                  onClick={() => setInputMode("text")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    inputMode === "text"
                      ? "bg-background shadow-sm text-foreground border border-border/60"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" /> Text
                </button>
                <button
                  onClick={() => setInputMode("file")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    inputMode === "file"
                      ? "bg-background shadow-sm text-foreground border border-border/60"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" /> File
                </button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {inputMode === "text" ? (
                <motion.div
                  key="text-mode"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="relative flex-1 flex flex-col min-h-[350px] lg:min-h-[500px]"
                >
                  <div className="absolute top-3 right-3 z-10">
                    <span className="text-xs text-muted-foreground font-mono bg-muted/60 border border-border/40 px-2 py-1 rounded-md">
                      {input.length.toLocaleString()} chars
                    </span>
                  </div>
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Example: The mitochondria is the powerhouse of the cell. It generates most of the chemical energy needed to power the cell's biochemical reactions..."
                    className="flex-1 h-full resize-none pt-10"
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="file-mode"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="flex-1 flex flex-col min-h-[350px] lg:min-h-[500px]"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPTED_TYPES}
                    onChange={handleFileInputChange}
                    className="hidden"
                  />

                  {/* Upload zone */}
                  <div
                    onClick={() => !selectedFile && fileInputRef.current?.click()}
                    className={`flex-1 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all cursor-pointer
                      ${selectedFile
                        ? "border-primary/30 bg-primary/[0.02] cursor-default"
                        : "border-border/60 hover:border-primary/40 hover:bg-primary/[0.02] bg-muted/20"
                      }`}
                  >
                    {!selectedFile ? (
                      <div className="text-center p-8">
                        <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/15 flex items-center justify-center">
                          <FileUp className="w-8 h-8 text-primary/60" />
                        </div>
                        <p className="text-base font-medium text-foreground mb-1">
                          Drop a file or click to browse
                        </p>
                        <p className="text-sm text-muted-foreground mb-4">
                          {ACCEPTED_LABELS} up to 25 MB
                        </p>
                        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                          <Upload className="w-4 h-4 mr-2" /> Choose File
                        </Button>
                      </div>
                    ) : (
                      <div className="w-full p-6 space-y-4">
                        {/* File info card */}
                        <div className="flex items-start gap-3 p-4 bg-background border border-border/60 rounded-xl shadow-sm">
                          <div className="p-2 bg-primary/10 rounded-lg border border-primary/15 mt-0.5">
                            <FileText className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground text-sm truncate">{selectedFile.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); removeFile(); }}
                            className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded-md hover:bg-destructive/10"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Parse status */}
                        {isParsing && (
                          <div className="flex items-center gap-2.5 text-sm text-muted-foreground px-1">
                            <Loader2 className="w-4 h-4 animate-spin text-primary" />
                            <span>Extracting text from file...</span>
                          </div>
                        )}
                        {parseError && (
                          <div className="flex items-start gap-2.5 text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-xl px-4 py-3">
                            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <span>{parseError}</span>
                          </div>
                        )}
                        {!isParsing && !parseError && input && (
                          <div className="flex items-center gap-2 text-sm text-green-600 px-1">
                            <CheckCheck className="w-4 h-4" />
                            <span>Text extracted — {input.length.toLocaleString()} characters</span>
                          </div>
                        )}

                        {/* Change file */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                        >
                          <Upload className="w-4 h-4 mr-2" /> Choose Different File
                        </Button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action buttons */}
            <div className="flex items-center gap-4 mt-2">
              <Button
                onClick={handleGenerate}
                disabled={busy || !input.trim()}
                className="flex-1"
                size="lg"
              >
                {busy ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    {isParsing ? "Parsing File..." : "Extracting Insights..."}
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
                disabled={busy || (!input && !output && !selectedFile)}
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
                    Paste text or upload a PDF, DOCX, or PPTX on the left and click generate. I'll distill the content into a clean, scannable exam reviewer.
                  </p>
                  <div className="flex items-center gap-3 mt-5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5 bg-muted/60 border border-border/50 px-3 py-1.5 rounded-full">
                      <FileText className="w-3.5 h-3.5" /> PDF
                    </span>
                    <span className="flex items-center gap-1.5 bg-muted/60 border border-border/50 px-3 py-1.5 rounded-full">
                      <FileText className="w-3.5 h-3.5" /> DOCX
                    </span>
                    <span className="flex items-center gap-1.5 bg-muted/60 border border-border/50 px-3 py-1.5 rounded-full">
                      <FileText className="w-3.5 h-3.5" /> PPTX
                    </span>
                  </div>
                </div>
              )}
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}

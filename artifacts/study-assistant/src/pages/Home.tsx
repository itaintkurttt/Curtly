import { useState, useRef, useEffect, useCallback } from 'react';
import { useStudyStream } from '@/hooks/use-study-stream';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FormattedOutput } from '@/components/formatted-output';
import { QuizModal } from '@/components/quiz-modal';
import { exportToPdf, exportToDocx } from '@/lib/export';
import { useAuth } from '@/hooks/use-auth';
import { useQueryClient } from '@tanstack/react-query';
import {
  BookOpenText, Sparkles, Copy, Trash2, CheckCheck,
  FileText, AlertCircle, RefreshCw, Upload, FileUp, X, Loader2,
  Archive, LogIn, LogOut, User, Save, FileDown, HelpCircle, Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Archives from './Archives';

const ACCEPTED_TYPES = ".pdf,.docx,.doc,.pptx,.ppt";
const ACCEPTED_LABELS = "PDF, DOCX, PPTX";

type InputMode = "text" | "file";
type AppView = "home" | "archives";

interface UploadedFile {
  file: File;
  status: 'pending' | 'parsing' | 'done' | 'error';
  error?: string;
  text?: string;
}

async function saveReviewer(data: { title: string; sourceText: string; content: string }) {
  const res = await fetch('/api/reviewers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to save reviewer');
  return res.json();
}

export default function Home() {
  const { user, isLoading: authLoading, isAuthenticated, login, logout } = useAuth();
  const queryClient = useQueryClient();

  const [appView, setAppView] = useState<AppView>("home");
  const [input, setInput] = useState("");
  const [inputMode, setInputMode] = useState<InputMode>("text");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [exportState, setExportState] = useState<'idle' | 'pdf' | 'docx'>('idle');
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'saved'>('idle');
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

  const parseFile = useCallback(async (uf: UploadedFile): Promise<string> => {
    const formData = new FormData();
    formData.append("file", uf.file);
    const res = await fetch("/api/study/parse-file", { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Failed to parse file.");
    return data.text as string;
  }, []);

  const parseAndMergeFiles = useCallback(async (files: UploadedFile[]) => {
    const updated = [...files];
    const texts: string[] = [];

    for (let i = 0; i < updated.length; i++) {
      updated[i] = { ...updated[i], status: 'parsing' };
      setUploadedFiles([...updated]);

      try {
        const text = await parseFile(updated[i]);
        updated[i] = { ...updated[i], status: 'done', text };
        texts.push(text);
      } catch (e: unknown) {
        updated[i] = { ...updated[i], status: 'error', error: e instanceof Error ? e.message : 'Parse failed' };
      }
      setUploadedFiles([...updated]);
    }

    const mergedText = texts.join('\n\n');
    if (mergedText.trim()) {
      setInput(mergedText);
      generate(mergedText);
    }
  }, [parseFile, generate]);

  const handleFilesSelected = useCallback((newFiles: FileList | File[]) => {
    const fileArr = Array.from(newFiles);
    const ufList: UploadedFile[] = fileArr.map(f => ({ file: f, status: 'pending' }));
    setUploadedFiles(prev => {
      const merged = [...prev, ...ufList];
      parseAndMergeFiles(merged);
      return merged;
    });
  }, [parseAndMergeFiles]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesSelected(e.target.files);
    }
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      setInputMode("file");
      handleFilesSelected(e.dataTransfer.files);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleGenerate = () => {
    if (!input.trim()) return;
    generate(input);
  };

  const handleClear = () => {
    setInput("");
    setUploadedFiles([]);
    clear();
    setSavingState('idle');
  };

  const handleCopy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportPdf = async () => {
    if (!output) return;
    setExportState('pdf');
    try {
      const title = uploadedFiles[0]?.file.name.replace(/\.[^.]+$/, '') ?? 'reviewer';
      await exportToPdf(output, title);
    } finally {
      setExportState('idle');
    }
  };

  const handleExportDocx = async () => {
    if (!output) return;
    setExportState('docx');
    try {
      const title = uploadedFiles[0]?.file.name.replace(/\.[^.]+$/, '') ?? 'reviewer';
      await exportToDocx(output, title);
    } finally {
      setExportState('idle');
    }
  };

  const handleSave = async () => {
    if (!output || !isAuthenticated) return;
    setSavingState('saving');
    try {
      const title = uploadedFiles[0]?.file.name.replace(/\.[^.]+$/, '') ??
        (input.slice(0, 60).trim() || 'Untitled Reviewer');
      await saveReviewer({ title, sourceText: input, content: output });
      setSavingState('saved');
      queryClient.invalidateQueries({ queryKey: ['reviewers'] });
      setTimeout(() => setSavingState('idle'), 2500);
    } catch {
      setSavingState('idle');
    }
  };

  const busy = isGenerating || uploadedFiles.some(f => f.status === 'parsing');
  const hasOutput = !!output;
  const isParsing = uploadedFiles.some(f => f.status === 'parsing');

  if (appView === 'archives') {
    return (
      <Archives
        onBack={() => setAppView('home')}
        onLoad={(reviewer) => {
          setInput(reviewer.sourceText);
          clear();
          generate(reviewer.sourceText);
          setAppView('home');
        }}
      />
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col bg-background relative selection:bg-primary/20 selection:text-primary-foreground"
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
    >
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
              <p className="text-xl font-serif font-semibold text-foreground">Drop your files here</p>
              <p className="text-sm text-muted-foreground mt-1">{ACCEPTED_LABELS} supported</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quiz Modal */}
      <AnimatePresence>
        {showQuiz && output && (
          <QuizModal content={output} onClose={() => setShowQuiz(false)} />
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-background/80 border-b border-border/60">
        <div className="container mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-primary">
            <div className="bg-primary/10 p-1.5 rounded-lg border border-primary/20">
              <BookOpenText className="w-5 h-5" />
            </div>
            <span className="text-xl font-serif font-bold tracking-tight text-foreground">Curtly</span>
          </div>

          <div className="flex items-center gap-2">
            {!authLoading && isAuthenticated && (
              <Button variant="ghost" size="sm" onClick={() => setAppView('archives')} className="gap-2 hidden sm:flex">
                <Archive className="w-4 h-4" /> Archives
              </Button>
            )}

            {authLoading ? (
              <div className="w-20 h-8 bg-muted animate-pulse rounded-lg" />
            ) : isAuthenticated ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/60 border border-border/50">
                  {user?.profileImageUrl ? (
                    <img src={user.profileImageUrl} alt="avatar" className="w-5 h-5 rounded-full object-cover" />
                  ) : (
                    <User className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span className="text-xs font-medium text-foreground hidden sm:block">
                    {user?.firstName ?? user?.email ?? 'User'}
                  </span>
                </div>
                <Button variant="outline" size="sm" onClick={logout} className="gap-1.5">
                  <LogOut className="w-3.5 h-3.5" /> Log out
                </Button>
              </div>
            ) : (
              <Button size="sm" onClick={login} className="gap-2">
                <LogIn className="w-4 h-4" /> Log in
              </Button>
            )}
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
                <p className="text-sm text-muted-foreground mt-1">Paste text or upload files</p>
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
                  <Upload className="w-3.5 h-3.5" /> Files
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
                  className="flex-1 flex flex-col min-h-[350px] lg:min-h-[500px] gap-3"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPTED_TYPES}
                    multiple
                    onChange={handleFileInputChange}
                    className="hidden"
                  />

                  {/* Upload zone */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/60 hover:border-primary/40 hover:bg-primary/[0.02] bg-muted/20 cursor-pointer transition-all p-6 text-center"
                  >
                    <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/15 flex items-center justify-center">
                      <FileUp className="w-6 h-6 text-primary/60" />
                    </div>
                    <p className="text-sm font-medium text-foreground mb-1">
                      Drop files or click to browse
                    </p>
                    <p className="text-xs text-muted-foreground mb-3">
                      {ACCEPTED_LABELS} — multiple files allowed
                    </p>
                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                      <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Files
                    </Button>
                  </div>

                  {/* File list */}
                  {uploadedFiles.length > 0 && (
                    <div className="flex flex-col gap-2 flex-1 overflow-y-auto">
                      {uploadedFiles.map((uf, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 bg-background border border-border/60 rounded-xl shadow-sm">
                          <div className="p-2 bg-primary/10 rounded-lg border border-primary/15 mt-0.5 flex-shrink-0">
                            <FileText className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground text-sm truncate">{uf.file.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {(uf.file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                            {uf.status === 'parsing' && (
                              <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                                <Loader2 className="w-3 h-3 animate-spin text-primary" />
                                <span>Extracting text...</span>
                              </div>
                            )}
                            {uf.status === 'done' && (
                              <div className="flex items-center gap-1.5 mt-1 text-xs text-green-600">
                                <CheckCheck className="w-3 h-3" />
                                <span>Extracted — {uf.text?.length.toLocaleString()} chars</span>
                              </div>
                            )}
                            {uf.status === 'error' && (
                              <div className="flex items-center gap-1.5 mt-1 text-xs text-destructive">
                                <AlertCircle className="w-3 h-3" />
                                <span>{uf.error}</span>
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => removeFile(i)}
                            className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded-md hover:bg-destructive/10 flex-shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action buttons */}
            <div className="flex items-center gap-3 mt-2">
              <Button
                onClick={handleGenerate}
                disabled={busy || !input.trim()}
                className="flex-1"
                size="lg"
              >
                {busy ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    {isParsing ? "Parsing Files..." : "Extracting Insights..."}
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
                disabled={busy || (!input && !output && uploadedFiles.length === 0)}
                className="px-6 group"
                title="Clear all"
              >
                <Trash2 className="w-5 h-5 text-muted-foreground group-hover:text-destructive transition-colors" />
              </Button>
            </div>

            {/* Mobile archives link */}
            {isAuthenticated && (
              <Button variant="ghost" size="sm" onClick={() => setAppView('archives')} className="gap-2 sm:hidden w-full">
                <Archive className="w-4 h-4" /> View Archives
              </Button>
            )}
          </section>

          {/* RIGHT COLUMN - OUTPUT */}
          <section className="flex flex-col gap-4">
            <div className="flex items-end justify-between" style={{ minHeight: '52px' }}>
              <div>
                <h2 className="text-lg font-serif font-semibold flex items-center gap-2 text-foreground">
                  <BookOpenText className="w-5 h-5 text-primary" />
                  Structured Reviewer
                </h2>
                <p className="text-sm text-muted-foreground mt-1">Keywords and definitions extracted</p>
              </div>

              <AnimatePresence>
                {hasOutput && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleCopy}
                      className="text-foreground shadow-sm h-9"
                      disabled={isGenerating}
                    >
                      {copied ? <CheckCheck className="w-4 h-4 text-green-600 mr-1.5" /> : <Copy className="w-4 h-4 mr-1.5 text-primary" />}
                      {copied ? "Copied!" : "Copy"}
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
              ) : hasOutput ? (
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
                    Paste text or upload PDF, DOCX, or PPTX files and click generate. I'll distill the content into a clean, scannable exam reviewer.
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

            {/* Output action buttons */}
            <AnimatePresence>
              {hasOutput && !isGenerating && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="flex flex-wrap gap-2"
                >
                  {/* Quiz */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowQuiz(true)}
                    className="gap-2"
                  >
                    <HelpCircle className="w-4 h-4 text-primary" />
                    Take Quiz
                  </Button>

                  {/* Export PDF */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportPdf}
                    disabled={exportState !== 'idle'}
                    className="gap-2"
                  >
                    {exportState === 'pdf' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <FileDown className="w-4 h-4 text-primary" />
                    )}
                    Export PDF
                  </Button>

                  {/* Export DOCX */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportDocx}
                    disabled={exportState !== 'idle'}
                    className="gap-2"
                  >
                    {exportState === 'docx' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <FileDown className="w-4 h-4 text-primary" />
                    )}
                    Export DOCX
                  </Button>

                  {/* Save to archive */}
                  {isAuthenticated && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSave}
                      disabled={savingState !== 'idle'}
                      className="gap-2"
                    >
                      {savingState === 'saving' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : savingState === 'saved' ? (
                        <CheckCheck className="w-4 h-4 text-green-600" />
                      ) : (
                        <Save className="w-4 h-4 text-primary" />
                      )}
                      {savingState === 'saved' ? 'Saved!' : 'Save to Archive'}
                    </Button>
                  )}

                  {!isAuthenticated && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={login}
                      className="gap-2 text-muted-foreground"
                    >
                      <LogIn className="w-4 h-4" />
                      Log in to save
                    </Button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </section>

        </div>
      </main>
    </div>
  );
}

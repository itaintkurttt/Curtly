import { useState, useRef, useEffect, useCallback } from 'react';
import { useStudyStream } from '@/hooks/use-study-stream';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FormattedOutput } from '@/components/formatted-output';
import { QuizModal } from '@/components/quiz-modal';
import { AskAIPanel } from '@/components/ask-ai-panel';
import { exportToPdf, exportToDocx } from '@/lib/export';
import { useAuth } from '@/hooks/use-auth';
import { useQueryClient } from '@tanstack/react-query';
import {
  BookOpenText, Sparkles, Trash2, CheckCheck,
  FileText, AlertCircle, Upload, FileUp, X, Loader2,
  Archive, LogIn, LogOut, User, Save, FileDown, HelpCircle, Plus,
  Bot, Globe, ChevronRight, ChevronLeft, BrainCircuit,
  MessageSquareText, Download, FileBadge, Copy, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Archives from './Archives';

const ACCEPTED_TYPES = ".pdf,.docx,.doc,.pptx,.ppt";
const ACCEPTED_LABELS = "PDF, DOCX, PPTX";

const STEPS = [
  { id: 1, title: 'Add Source' },
  { id: 2, title: 'Review & Generate' },
  { id: 3, title: 'Study Mode' },
];

type AppView = "home" | "archives";
type InputMode = "upload" | "text";

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

function extractTopic(output: string, input: string): string {
  const h1 = output.match(/^#\s+(.+)$/m);
  if (h1) return h1[1].trim().slice(0, 100);
  return input.trim().slice(0, 80);
}

export default function Home() {
  const { user, isLoading: authLoading, isAuthenticated, login, logout } = useAuth();
  const queryClient = useQueryClient();

  const [appView, setAppView] = useState<AppView>("home");
  const [step, setStep] = useState(1);
  const [inputMode, setInputMode] = useState<InputMode>("upload");
  const [input, setInput] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [showAskAI, setShowAskAI] = useState(false);
  const [exportState, setExportState] = useState<'idle' | 'pdf' | 'docx'>('idle');
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [copied, setCopied] = useState(false);

  const [webContent, setWebContent] = useState('');
  const [webSources, setWebSources] = useState<Array<{ title: string; url: string }>>([]);
  const [webEnhancing, setWebEnhancing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { generate, clear, output, isGenerating, error } = useStudyStream();

  useEffect(() => {
    if (scrollRef.current && isGenerating) {
      const el = scrollRef.current;
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
      if (isNearBottom) el.scrollTop = el.scrollHeight;
    }
  }, [output, isGenerating]);

  useEffect(() => {
    if (!output) { setWebContent(''); setWebSources([]); }
  }, [output]);

  // When generation completes, advance to step 3
  useEffect(() => {
    if (output && !isGenerating && step === 2) {
      setStep(3);
    }
  }, [output, isGenerating, step]);

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
    const merged = texts.join('\n\n');
    if (merged.trim()) setInput(merged);
  }, [parseFile]);

  const handleFilesSelected = useCallback((newFiles: FileList | File[]) => {
    const fileArr = Array.from(newFiles);
    const ufList: UploadedFile[] = fileArr.map(f => ({ file: f, status: 'pending' }));
    setUploadedFiles(prev => {
      const merged = [...prev, ...ufList];
      parseAndMergeFiles(merged);
      return merged;
    });
  }, [parseAndMergeFiles]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) handleFilesSelected(e.dataTransfer.files);
  };

  const handleGenerate = () => {
    if (!input.trim()) return;
    setWebContent(''); setWebSources([]);
    generate(input);
  };

  const handleClear = () => {
    setInput(''); setUploadedFiles([]); setWebContent(''); setWebSources([]);
    clear(); setSavingState('idle'); setStep(1);
  };

  const handleCopy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output + (webContent ? `\n\n${webContent}` : ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportPdf = async () => {
    if (!output) return;
    setExportState('pdf');
    try {
      const title = uploadedFiles[0]?.file.name.replace(/\.[^.]+$/, '') ?? 'reviewer';
      await exportToPdf(output + (webContent ? `\n\n${webContent}` : ''), title);
    } finally { setExportState('idle'); }
  };

  const handleExportDocx = async () => {
    if (!output) return;
    setExportState('docx');
    try {
      const title = uploadedFiles[0]?.file.name.replace(/\.[^.]+$/, '') ?? 'reviewer';
      await exportToDocx(output + (webContent ? `\n\n${webContent}` : ''), title);
    } finally { setExportState('idle'); }
  };

  const handleSave = async () => {
    if (!output || !isAuthenticated) return;
    setSavingState('saving');
    try {
      const title = uploadedFiles[0]?.file.name.replace(/\.[^.]+$/, '') ?? (input.slice(0, 60).trim() || 'Untitled Reviewer');
      await saveReviewer({ title, sourceText: input, content: output + (webContent ? `\n\n${webContent}` : '') });
      setSavingState('saved');
      queryClient.invalidateQueries({ queryKey: ['reviewers'] });
      setTimeout(() => setSavingState('idle'), 2500);
    } catch { setSavingState('idle'); }
  };

  const handleWebEnhance = useCallback(async () => {
    if (!output || webEnhancing) return;
    setWebEnhancing(true); setWebContent(''); setWebSources([]);
    try {
      const topic = extractTopic(output, input);
      const res = await fetch('/api/study/web-enhance', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ topic, reviewerContent: output.slice(0, 2000) }),
      });
      if (!res.ok) return;
      const reader = res.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      let buffer = '', accContent = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n'); buffer = parts.pop() ?? '';
        for (const part of parts) {
          for (const line of part.split('\n')) {
            if (!line.startsWith('data: ')) continue;
            try {
              const data = JSON.parse(line.slice(6));
              if (data.sources) setWebSources(data.sources);
              if (data.content) { accContent += data.content; setWebContent(accContent); }
            } catch { /* skip */ }
          }
        }
      }
    } catch { /* silent */ }
    finally { setWebEnhancing(false); }
  }, [output, input, webEnhancing]);

  const totalWords = uploadedFiles.reduce((acc, f) => acc + (f.text?.split(/\s+/).length ?? 0), 0);
  const parsedCount = uploadedFiles.filter(f => f.status === 'done').length;
  const isParsing = uploadedFiles.some(f => f.status === 'parsing');
  const busy = isGenerating || isParsing;

  if (appView === 'archives') {
    return (
      <Archives
        onBack={() => setAppView('home')}
        onLoad={(reviewer) => {
          setInput(reviewer.sourceText);
          clear(); generate(reviewer.sourceText);
          setStep(3); setAppView('home');
        }}
      />
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col bg-background relative"
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
    >
      {/* Subtle grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
      {/* Drag overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-primary/10 border-4 border-dashed border-primary/40 flex items-center justify-center pointer-events-none">
            <div className="bg-card rounded-2xl p-10 text-center border border-primary/20">
              <FileUp className="w-14 h-14 text-primary mx-auto mb-4" />
              <p className="text-xl font-serif font-semibold text-foreground">Drop your files here</p>
              <p className="text-sm text-muted-foreground mt-1">{ACCEPTED_LABELS} supported</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Modals */}
      <AnimatePresence>
        {showQuiz && output && (
          <QuizModal content={output + (webContent ? '\n\n' + webContent : '')} onClose={() => setShowQuiz(false)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showAskAI && (
          <AskAIPanel onClose={() => setShowAskAI(false)} reviewerContent={output + (webContent ? '\n\n' + webContent : '')} />
        )}
      </AnimatePresence>
      {/* Header */}
      <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-background/80 border-b border-border/60">
        <div className="container mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-primary/15 p-1.5 rounded-lg border border-primary/25">
              <BookOpenText className="w-5 h-5 text-primary" />
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
                  ) : <User className="w-4 h-4 text-muted-foreground" />}
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
      {/* Step Progress */}
      <div className="w-full bg-card/50 border-b border-border/50 py-6">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex items-center justify-between relative">
            {/* Track line */}
            <div className="absolute left-0 top-4 w-full h-0.5 bg-border/60 -z-10" />
            <div
              className="absolute left-0 top-4 h-0.5 bg-primary -z-10 transition-all duration-500"
              style={{ width: `${((step - 1) / (STEPS.length - 1)) * 100}%` }}
            />
            {STEPS.map((s) => {
              const isActive = step === s.id;
              const isPast = step > s.id;
              return (
                <div key={s.id} className="flex flex-col items-center gap-2 bg-transparent px-3">
                  <button
                    onClick={() => { if (isPast || isActive) setStep(s.id); }}
                    disabled={step < s.id}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                      isActive
                        ? 'border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                        : isPast
                        ? 'border-primary bg-primary/15 text-primary'
                        : 'border-border/60 bg-muted text-muted-foreground'
                    }`}
                  >
                    {isPast ? <CheckCheck className="w-4 h-4" /> : s.id}
                  </button>
                  <span className={`text-xs font-medium whitespace-nowrap ${isActive ? 'text-foreground' : isPast ? 'text-primary' : 'text-muted-foreground'}`}>
                    {s.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept={ACCEPTED_TYPES} multiple onChange={(e) => {
        if (e.target.files?.length) handleFilesSelected(e.target.files);
        e.target.value = "";
      }} className="hidden" />
      <main className="flex-1 relative z-10 pb-20">
        <AnimatePresence mode="wait">

          {/* ── STEP 1: Add Source ── */}
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.22 }}
              className="max-w-2xl mx-auto px-4 pt-10">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-serif font-bold text-foreground mb-2">What are we studying today?</h1>
                <p className="text-muted-foreground">Upload lectures, notes, or readings to generate a smart reviewer.</p>
              </div>

              <div className="bg-card border border-border/60 rounded-2xl shadow-xl p-8">
                {/* Mode toggle */}
                <div className="flex justify-center mb-6">
                  <div className="inline-flex bg-muted/60 border border-border/50 p-1 rounded-xl gap-1">
                    {(['upload', 'text'] as const).map((mode) => (
                      <button key={mode} onClick={() => setInputMode(mode)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${inputMode === mode ? 'bg-background shadow text-foreground border border-border/60' : 'text-muted-foreground hover:text-foreground'}`}>
                        {mode === 'upload' ? <><Upload className="w-3.5 h-3.5 inline mr-1.5" />Upload Files</> : <><FileText className="w-3.5 h-3.5 inline mr-1.5" />Paste Text</>}
                      </button>
                    ))}
                  </div>
                </div>

                {inputMode === 'upload' ? (
                  <div>
                    <div onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-border/60 rounded-xl p-12 flex flex-col items-center text-center hover:border-primary/50 hover:bg-primary/[0.02] cursor-pointer transition-all group">
                      <div className="w-16 h-16 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                        <FileUp className="w-8 h-8 text-primary" />
                      </div>
                      <p className="font-semibold text-foreground mb-1">Drop your files here</p>
                      <p className="text-sm text-muted-foreground mb-4">PDF, DOCX, PPTX — multiple files allowed</p>
                      <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                        <Plus className="w-3.5 h-3.5 mr-1.5" /> Browse Files
                      </Button>
                    </div>

                    {uploadedFiles.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {uploadedFiles.map((uf, i) => (
                          <div key={i} className="flex items-center gap-3 p-3 bg-background border border-border/60 rounded-xl">
                            <div className="p-1.5 bg-primary/10 rounded-lg border border-primary/15">
                              <FileText className="w-4 h-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{uf.file.name}</p>
                              {uf.status === 'parsing' && <p className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Extracting...</p>}
                              {uf.status === 'done' && <p className="text-xs text-green-400 flex items-center gap-1"><CheckCheck className="w-3 h-3" /> {uf.text?.split(/\s+/).length.toLocaleString()} words</p>}
                              {uf.status === 'error' && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {uf.error}</p>}
                            </div>
                            <button onClick={() => setUploadedFiles(prev => prev.filter((_, idx) => idx !== i))}
                              className="text-muted-foreground hover:text-destructive p-1 rounded hover:bg-destructive/10 transition-colors">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="relative">
                    <div className="absolute top-3 right-3 z-10 text-xs text-muted-foreground font-mono bg-muted/60 border border-border/40 px-2 py-1 rounded-md">
                      {input.length.toLocaleString()} chars
                    </div>
                    <Textarea
                      value={input} onChange={(e) => setInput(e.target.value)}
                      placeholder="Paste your notes or lecture transcript here..."
                      className="h-56 resize-none pt-10 bg-background"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end mt-6">
                <Button
                  onClick={() => setStep(2)}
                  disabled={isParsing || (inputMode === 'upload' ? uploadedFiles.filter(f => f.status === 'done').length === 0 : !input.trim())}
                  size="lg"
                  className="gap-2 px-8 text-base"
                >
                  Continue <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 2: Review & Generate ── */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.22 }}
              className="max-w-2xl mx-auto px-4 pt-10">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-serif font-bold text-foreground mb-2">Ready to generate</h1>
                <p className="text-muted-foreground">Your materials have been processed. Let's create your reviewer.</p>
              </div>

              <div className="bg-card border border-border/60 rounded-2xl shadow-xl p-8">
                {uploadedFiles.filter(f => f.status === 'done').length > 0 ? (
                  <div className="flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center mb-5">
                      <FileBadge className="w-10 h-10 text-green-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-1">
                      {parsedCount} File{parsedCount > 1 ? 's' : ''} Ready
                    </h3>
                    <p className="text-muted-foreground mb-6 text-sm">
                      Detected approximately {totalWords.toLocaleString()} words from {uploadedFiles.filter(f => f.status === 'done').map(f => f.file.name).join(', ')}.
                    </p>
                    <div className="bg-primary/[0.06] border border-primary/15 rounded-xl p-4 w-full text-left flex items-start gap-4 mb-6">
                      <div className="bg-primary/15 p-2 rounded-lg text-primary mt-0.5 flex-shrink-0">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">AI Reviewer Generation</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Curtly will extract key concepts and definitions, creating a structured study guide optimized for exam retention.</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground mb-4">Paste your text to continue.</p>
                    <Textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="Paste your notes here..." className="h-40 resize-none" />
                  </div>
                )}

                <div className="flex gap-3 mt-2">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1 gap-2">
                    <ChevronLeft className="w-4 h-4" /> Back
                  </Button>
                  <Button
                    onClick={handleGenerate}
                    disabled={busy || !input.trim()}
                    className="flex-[2] gap-2 py-6 text-base"
                  >
                    {isGenerating ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /> Generating...</>
                    ) : (
                      <><Sparkles className="w-5 h-5" /> Generate Reviewer</>
                    )}
                  </Button>
                </div>

                {/* Error */}
                {error && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                    <Button variant="ghost" size="sm" onClick={handleGenerate} className="ml-auto gap-1.5 text-destructive">
                      <RefreshCw className="w-3.5 h-3.5" /> Retry
                    </Button>
                  </div>
                )}

                {/* Streaming progress */}
                {isGenerating && output && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-primary bg-primary/[0.06] border border-primary/15 rounded-xl px-4 py-3">
                    <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                    <span>Extracting insights from your materials...</span>
                    <div className="ml-auto flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-pulse" />
                      <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ── STEP 3: Study Mode ── */}
          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.22 }}
              className="max-w-3xl mx-auto px-4 pt-8">

              {/* Header row */}
              <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
                <div>
                  <h1 className="text-2xl font-serif font-bold text-foreground">Your Reviewer is Ready</h1>
                  <p className="text-muted-foreground text-sm mt-0.5">
                    {uploadedFiles[0]?.file.name.replace(/\.[^.]+$/, '') ?? (input.slice(0, 50) || 'Study Material')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={handleCopy} className="gap-1.5">
                    {copied ? <CheckCheck className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleClear} className="gap-1.5 text-muted-foreground">
                    <Trash2 className="w-4 h-4" /> Start Over
                  </Button>
                </div>
              </div>

              {/* Reviewer output */}
              <div className="bg-card border border-border/60 rounded-2xl shadow-xl overflow-hidden mb-6">
                <div ref={scrollRef} className="overflow-y-auto max-h-[520px] p-6 md:p-8">
                  <FormattedOutput
                    text={output}
                    webContent={webContent || undefined}
                    webSources={webSources.length > 0 ? webSources : undefined}
                  />
                  {webEnhancing && !webContent && (
                    <div className="mt-4 flex items-center gap-2 text-sm text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3">
                      <Loader2 className="w-4 h-4 animate-spin" /> Searching Gemini web sources...
                    </div>
                  )}
                  {isGenerating && (
                    <div className="flex items-center gap-1.5 mt-6 text-primary p-2">
                      <span className="w-2 h-2 bg-primary/60 rounded-full animate-pulse" />
                      <span className="w-2 h-2 bg-primary/60 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-primary/60 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                    </div>
                  )}
                </div>
              </div>

              {/* "Next Steps" action cards */}
              <h2 className="text-base font-serif font-semibold text-foreground mb-3 px-1">Next Steps</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                {/* Quiz */}
                <button onClick={() => setShowQuiz(true)}
                  className="flex flex-col items-start p-5 bg-card border border-border/60 rounded-2xl hover:border-purple-500/40 hover:shadow-lg hover:-translate-y-0.5 transition-all text-left group">
                  <div className="w-10 h-10 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <BrainCircuit className="w-5 h-5" />
                  </div>
                  <p className="font-semibold text-foreground text-sm mb-0.5">Take a Quiz</p>
                  <p className="text-xs text-muted-foreground">Two-part: recall + situational</p>
                </button>

                {/* Ask AI */}
                <button onClick={() => setShowAskAI(true)}
                  className="flex flex-col items-start p-5 bg-card border border-border/60 rounded-2xl hover:border-primary/40 hover:shadow-lg hover:-translate-y-0.5 transition-all text-left group">
                  <div className="w-10 h-10 bg-primary/10 border border-primary/20 text-primary rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <MessageSquareText className="w-5 h-5" />
                  </div>
                  <p className="font-semibold text-foreground text-sm mb-0.5">Ask AI Tutor</p>
                  <p className="text-xs text-muted-foreground">Powered by Gemini + web</p>
                </button>

                {/* Web Sources */}
                <button onClick={handleWebEnhance} disabled={webEnhancing}
                  className="flex flex-col items-start p-5 bg-card border border-border/60 rounded-2xl hover:border-blue-500/40 hover:shadow-lg hover:-translate-y-0.5 transition-all text-left group disabled:opacity-60">
                  <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    {webEnhancing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Globe className="w-5 h-5" />}
                  </div>
                  <p className="font-semibold text-foreground text-sm mb-0.5">{webContent ? 'Refresh Web' : 'Web Sources'}</p>
                  <p className="text-xs text-muted-foreground">Gemini Google Search</p>
                </button>

                {/* Export PDF */}
                <button onClick={handleExportPdf} disabled={exportState !== 'idle'}
                  className="flex flex-col items-start p-5 bg-card border border-border/60 rounded-2xl hover:border-green-500/40 hover:shadow-lg hover:-translate-y-0.5 transition-all text-left group disabled:opacity-60">
                  <div className="w-10 h-10 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    {exportState === 'pdf' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                  </div>
                  <p className="font-semibold text-foreground text-sm mb-0.5">Export PDF</p>
                  <p className="text-xs text-muted-foreground">Download for printing</p>
                </button>

                {/* Export DOCX */}
                <button onClick={handleExportDocx} disabled={exportState !== 'idle'}
                  className="flex flex-col items-start p-5 bg-card border border-border/60 rounded-2xl hover:border-amber-500/40 hover:shadow-lg hover:-translate-y-0.5 transition-all text-left group disabled:opacity-60">
                  <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    {exportState === 'docx' ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileDown className="w-5 h-5" />}
                  </div>
                  <p className="font-semibold text-foreground text-sm mb-0.5">Export DOCX</p>
                  <p className="text-xs text-muted-foreground">Open in Word</p>
                </button>

                {/* Save */}
                {isAuthenticated && (
                  <button onClick={handleSave} disabled={savingState !== 'idle'}
                    className="flex flex-col items-start p-5 bg-card border border-border/60 rounded-2xl hover:border-rose-500/40 hover:shadow-lg hover:-translate-y-0.5 transition-all text-left group disabled:opacity-60">
                    <div className="w-10 h-10 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      {savingState === 'saving' ? <Loader2 className="w-5 h-5 animate-spin" /> : savingState === 'saved' ? <CheckCheck className="w-5 h-5 text-green-400" /> : <Save className="w-5 h-5" />}
                    </div>
                    <p className="font-semibold text-foreground text-sm mb-0.5">{savingState === 'saved' ? 'Saved!' : 'Save'}</p>
                    <p className="text-xs text-muted-foreground">To your archive</p>
                  </button>
                )}
              </div>

              {/* Mobile archives link */}
              {isAuthenticated && (
                <Button variant="ghost" size="sm" onClick={() => setAppView('archives')} className="gap-2 sm:hidden w-full">
                  <Archive className="w-4 h-4" /> View Archives
                </Button>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </main>
      <footer className="relative z-10 border-t border-border/40">
        <div className="container mx-auto px-4 lg:px-8 h-12 flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-serif font-medium text-foreground/40">Curtly</span>
          <span>Developed by VKM · Powered by Gemini</span>
        </div>
      </footer>
    </div>
  );
}

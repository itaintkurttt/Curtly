import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, CheckCircle2, XCircle, ChevronRight, Trophy, RotateCcw, Loader2, BookOpen, Lightbulb, Layers, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface QuizQuestion {
  question: string;
  choices: string[];
  answer: string;
  explanation: string;
}

interface QuizSection {
  title: string;
  questions: QuizQuestion[];
}

interface Quiz {
  reviewerBased?: { sections: QuizSection[] };
  situational?: { questions: QuizQuestion[] };
  sections?: QuizSection[];
}

interface QuizModalProps {
  onClose: () => void;
  content: string;
}

type QuizType = 'termdef' | 'situational' | 'both';

export function QuizModal({ onClose, content }: QuizModalProps) {
  const [selectedType, setSelectedType] = useState<QuizType | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const generateQuiz = async (type: QuizType) => {
    setSelectedType(type);
    setIsLoading(true);
    setError(null);
    setAnswers({});
    setSubmitted(false);
    setQuiz(null);

    try {
      const res = await fetch('/api/quiz/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content, type }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to generate quiz.');
        return;
      }

      setQuiz(data.quiz as Quiz);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswer = (key: string, choice: string) => {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [key]: choice }));
  };

  const reviewerSections = quiz?.reviewerBased?.sections ?? quiz?.sections ?? [];
  const situationalQuestions = quiz?.situational?.questions ?? [];

  const allReviewerQs = reviewerSections.flatMap((s, si) =>
    s.questions.map((q, qi) => ({ ...q, key: `r-${si}-${qi}` }))
  );
  const allSitQs = situationalQuestions.map((q, qi) => ({ ...q, key: `s-${qi}` }));
  const allQs = selectedType === 'termdef' ? allReviewerQs : selectedType === 'situational' ? allSitQs : [...allReviewerQs, ...allSitQs];

  const getScore = () => {
    const correct = allQs.filter((q) => answers[q.key]?.startsWith(q.answer + '.')).length;
    return { correct, total: allQs.length };
  };

  const score = getScore();
  const pct = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;

  const QuestionCard = ({ q, qKey, index }: { q: QuizQuestion; qKey: string; index: number }) => {
    const selected = answers[qKey];
    const isCorrect = selected?.startsWith(q.answer + '.');
    return (
      <div className="bg-card border border-border/60 rounded-xl p-5">
        <p className="font-medium text-foreground mb-4 leading-relaxed">
          <span className="text-primary font-bold mr-1.5">{index + 1}.</span>
          {q.question}
        </p>
        <div className="space-y-2">
          {q.choices.map((choice, ci) => {
            const isSelected = selected === choice;
            const isCorrectChoice = choice.startsWith(q.answer + '.');
            let cls = 'flex items-start gap-3 p-3 rounded-lg border text-sm cursor-pointer transition-all';
            if (!submitted) {
              cls += isSelected
                ? ' border-primary bg-primary/5 text-foreground'
                : ' border-border/50 hover:border-primary/30 hover:bg-muted/40 text-muted-foreground';
            } else {
              if (isCorrectChoice) cls += ' border-green-500/60 bg-green-500/10 text-green-300';
              else if (isSelected && !isCorrect) cls += ' border-red-500/60 bg-red-500/10 text-red-300';
              else cls += ' border-border/30 text-muted-foreground opacity-50';
            }
            return (
              <div key={ci} className={cls} onClick={() => handleAnswer(qKey, choice)}>
                <span className="font-bold text-xs mt-0.5 min-w-[18px]">{String.fromCharCode(65 + ci)}.</span>
                <span className="flex-1">{choice.replace(/^[A-D]\.\s*/, '')}</span>
                {submitted && isCorrectChoice && <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />}
                {submitted && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />}
              </div>
            );
          })}
        </div>
        {submitted && (
          <p className="text-xs text-muted-foreground mt-3 px-1 italic border-t border-border/30 pt-3">
            {q.explanation}
          </p>
        )}
      </div>
    );
  };

  const TYPE_META = {
    termdef: { label: 'Term & Definition', icon: BookOpen, color: 'primary', accent: 'primary' },
    situational: { label: 'Situational', icon: Lightbulb, color: 'amber', accent: 'amber' },
    both: { label: 'Full Quiz', icon: Layers, color: 'primary', accent: 'primary' },
  };

  const otherType: QuizType | null = selectedType === 'termdef' ? 'situational' : selectedType === 'situational' ? 'termdef' : null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-background border border-border/60 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 flex-shrink-0">
          <div className="flex items-center gap-2">
            {selectedType && !isLoading && (
              <button
                onClick={() => { setSelectedType(null); setQuiz(null); setError(null); setAnswers({}); setSubmitted(false); }}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors mr-1"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <h2 className="font-serif font-bold text-xl text-foreground">
                {selectedType ? TYPE_META[selectedType].label + ' Quiz' : 'Quiz Mode'}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {selectedType === 'termdef' && 'Test your recall of key terms and definitions'}
                {selectedType === 'situational' && 'Apply concepts to real scenarios'}
                {selectedType === 'both' && 'Combined term recall + scenario questions'}
                {!selectedType && 'Choose your quiz type to get started'}
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">

            {/* ── Type Selection ── */}
            {!selectedType && (
              <motion.div key="select" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Term & Definition */}
                  <button
                    onClick={() => generateQuiz('termdef')}
                    className="flex flex-col items-start p-6 bg-card border border-border/60 rounded-2xl hover:border-primary/50 hover:shadow-lg hover:-translate-y-0.5 transition-all text-left group"
                  >
                    <div className="w-12 h-12 bg-primary/10 border border-primary/20 text-primary rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <p className="font-serif font-semibold text-lg text-foreground mb-1">Term & Definition</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Test your recall of key terms, definitions, and concepts directly from the reviewer.
                    </p>
                    <div className="mt-4 flex items-center gap-1 text-xs text-primary font-medium">
                      Start quiz <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </button>

                  {/* Situational */}
                  <button
                    onClick={() => generateQuiz('situational')}
                    className="flex flex-col items-start p-6 bg-card border border-border/60 rounded-2xl hover:border-amber-500/50 hover:shadow-lg hover:-translate-y-0.5 transition-all text-left group"
                  >
                    <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Lightbulb className="w-6 h-6" />
                    </div>
                    <p className="font-serif font-semibold text-lg text-foreground mb-1">Situational</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Apply concepts to real scenarios, case studies, and higher-order thinking questions.
                    </p>
                    <div className="mt-4 flex items-center gap-1 text-xs text-amber-500 font-medium">
                      Start quiz <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </button>
                </div>

                {/* Take Both */}
                <button
                  onClick={() => generateQuiz('both')}
                  className="w-full flex items-center justify-between p-4 bg-muted/40 border border-border/50 rounded-xl hover:border-border hover:bg-muted/60 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-muted border border-border/60 rounded-lg flex items-center justify-center">
                      <Layers className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-foreground">Take Both</p>
                      <p className="text-xs text-muted-foreground">Full adaptive quiz — term recall + scenario questions</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </button>
              </motion.div>
            )}

            {/* ── Loading ── */}
            {isLoading && (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center min-h-[260px] gap-4 text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="font-medium text-foreground">Generating {selectedType === 'termdef' ? 'Term & Definition' : selectedType === 'situational' ? 'Situational' : 'Full'} Quiz…</p>
                <p className="text-sm">
                  {selectedType === 'termdef' && 'Crafting recall and definition questions from your reviewer'}
                  {selectedType === 'situational' && 'Building real-world scenario and application questions'}
                  {selectedType === 'both' && 'Creating a combined set of recall and scenario questions'}
                </p>
              </motion.div>
            )}

            {/* ── Error ── */}
            {error && !isLoading && (
              <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center min-h-[260px] gap-4">
                <p className="text-destructive text-center">{error}</p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => { setSelectedType(null); setError(null); }}>
                    <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
                  </Button>
                  {selectedType && (
                    <Button onClick={() => generateQuiz(selectedType)}>Try Again</Button>
                  )}
                </div>
              </motion.div>
            )}

            {/* ── Quiz Questions ── */}
            {quiz && !isLoading && !error && (
              <motion.div key="quiz" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="space-y-5">

                {/* Score Banner */}
                {submitted && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                    className={`flex items-center gap-4 p-4 rounded-xl border ${
                      pct >= 80 ? 'bg-green-500/10 border-green-500/30 text-green-300' : pct >= 60 ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-red-500/10 border-red-500/30 text-red-300'
                    }`}>
                    <Trophy className="w-6 h-6 flex-shrink-0" />
                    <div>
                      <p className="font-semibold">{score.correct}/{score.total} correct — {pct}%</p>
                      <p className="text-sm opacity-80">{pct >= 80 ? 'Excellent work!' : pct >= 60 ? 'Good effort!' : 'Keep studying!'}</p>
                    </div>
                  </motion.div>
                )}

                {/* Term & Def questions */}
                {(selectedType === 'termdef' || selectedType === 'both') && reviewerSections.length > 0 && (
                  <div className="space-y-6">
                    {selectedType === 'both' && (
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground pb-1 border-b border-border/40">
                        <BookOpen className="w-4 h-4 text-primary" />
                        <span className="text-foreground font-semibold">Part 1 —</span> Term & Definition
                      </div>
                    )}
                    {reviewerSections.map((section, si) => (
                      <div key={si}>
                        {reviewerSections.length > 1 && (
                          <h3 className="text-sm font-serif font-semibold text-foreground mb-3 flex items-center gap-2">
                            <span className="w-1 h-4 bg-primary rounded-full" /> {section.title}
                          </h3>
                        )}
                        <div className="space-y-4">
                          {section.questions.map((q, qi) => {
                            const offset = reviewerSections.slice(0, si).flatMap((s) => s.questions).length;
                            return <QuestionCard key={qi} q={q} qKey={`r-${si}-${qi}`} index={offset + qi} />;
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Situational questions */}
                {(selectedType === 'situational' || selectedType === 'both') && situationalQuestions.length > 0 && (
                  <div className="space-y-4">
                    {selectedType === 'both' && (
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground pb-1 border-b border-border/40 mt-6">
                        <Lightbulb className="w-4 h-4 text-amber-500" />
                        <span className="text-foreground font-semibold">Part 2 —</span> Situational
                      </div>
                    )}
                    <div className="space-y-4">
                      {situationalQuestions.map((q, qi) => (
                        <QuestionCard
                          key={qi} q={q} qKey={`s-${qi}`}
                          index={selectedType === 'both' ? allReviewerQs.length + qi : qi}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Try the other type prompt after submit */}
                {submitted && otherType && (
                  <div className="border border-border/50 bg-muted/20 rounded-xl p-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Want to try the {otherType === 'termdef' ? 'Term & Definition' : 'Situational'} quiz?
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {otherType === 'termdef'
                          ? 'Test your recall of key terms and definitions'
                          : 'Apply what you know to real-world scenarios'}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => generateQuiz(otherType)} className="whitespace-nowrap gap-1.5">
                      {otherType === 'termdef' ? <BookOpen className="w-3.5 h-3.5" /> : <Lightbulb className="w-3.5 h-3.5" />}
                      Switch type
                    </Button>
                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Footer */}
        {quiz && !isLoading && !error && (
          <div className="px-6 py-4 border-t border-border/60 flex items-center justify-between flex-shrink-0">
            <Button
              variant="ghost" size="sm"
              onClick={() => { setAnswers({}); setSubmitted(false); setQuiz(null); setSelectedType(null); }}
              className="gap-2 text-muted-foreground"
            >
              <RotateCcw className="w-4 h-4" /> New Quiz
            </Button>
            <div className="flex items-center gap-3">
              {submitted && (
                <span className="text-sm text-muted-foreground">{score.correct}/{score.total} correct</span>
              )}
              {!submitted ? (
                <Button onClick={() => setSubmitted(true)} disabled={Object.keys(answers).length === 0} className="gap-2">
                  Submit Answers <ChevronRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button variant="outline" onClick={() => { setAnswers({}); setSubmitted(false); }} className="gap-2">
                  <RotateCcw className="w-4 h-4" /> Retry
                </Button>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, CheckCircle2, XCircle, ChevronRight, Trophy, RotateCcw, Loader2, BookOpen, Lightbulb } from 'lucide-react';
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
  // legacy fallback
  sections?: QuizSection[];
}

interface QuizModalProps {
  onClose: () => void;
  content: string;
}

type QuizTab = 'reviewer' | 'situational';

export function QuizModal({ onClose, content }: QuizModalProps) {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [activeTab, setActiveTab] = useState<QuizTab>('reviewer');

  const generateQuiz = async () => {
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
        body: JSON.stringify({ content }),
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

  // Flatten all questions for scoring
  const getAllQuestions = (): Array<QuizQuestion & { key: string; type: QuizTab }> => {
    if (!quiz) return [];

    const reviewerQs = (quiz.reviewerBased?.sections ?? quiz.sections ?? []).flatMap((s, si) =>
      s.questions.map((q, qi) => ({ ...q, key: `r-${si}-${qi}`, type: 'reviewer' as QuizTab }))
    );

    const situationalQs = (quiz.situational?.questions ?? []).map((q, qi) => ({
      ...q,
      key: `s-${qi}`,
      type: 'situational' as QuizTab,
    }));

    return [...reviewerQs, ...situationalQs];
  };

  const allQuestions = getAllQuestions();

  const getScore = (type?: QuizTab) => {
    const qs = type ? allQuestions.filter((q) => q.type === type) : allQuestions;
    const correct = qs.filter((q) => answers[q.key]?.startsWith(q.answer + '.')).length;
    return { correct, total: qs.length };
  };

  const QuestionCard = ({
    q,
    qKey,
    index,
  }: {
    q: QuizQuestion;
    qKey: string;
    index: number;
  }) => {
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

            let cls =
              'flex items-start gap-3 p-3 rounded-lg border text-sm cursor-pointer transition-all';
            if (!submitted) {
              cls += isSelected
                ? ' border-primary bg-primary/5 text-foreground'
                : ' border-border/50 hover:border-primary/30 hover:bg-muted/40 text-muted-foreground';
            } else {
              if (isCorrectChoice) {
                cls += ' border-green-400 bg-green-50 text-green-800';
              } else if (isSelected && !isCorrect) {
                cls += ' border-red-400 bg-red-50 text-red-800';
              } else {
                cls += ' border-border/30 text-muted-foreground opacity-60';
              }
            }

            return (
              <div key={ci} className={cls} onClick={() => handleAnswer(qKey, choice)}>
                <span className="font-bold text-xs mt-0.5 min-w-[18px]">
                  {String.fromCharCode(65 + ci)}.
                </span>
                <span className="flex-1">{choice.replace(/^[A-D]\.\s*/, '')}</span>
                {submitted && isCorrectChoice && (
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                )}
                {submitted && isSelected && !isCorrect && (
                  <XCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                )}
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

  const reviewerSections = quiz?.reviewerBased?.sections ?? quiz?.sections ?? [];
  const situationalQuestions = quiz?.situational?.questions ?? [];

  const reviewerScore = getScore('reviewer');
  const sitScore = getScore('situational');
  const totalScore = getScore();

  const ScoreBanner = ({ score, total }: { score: number; total: number }) => {
    const pct = total > 0 ? Math.round((score / total) * 100) : 0;
    return (
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex items-center gap-4 p-4 rounded-xl border ${
          pct >= 80
            ? 'bg-green-50 border-green-200 text-green-800'
            : pct >= 60
            ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}
      >
        <Trophy className="w-6 h-6 flex-shrink-0" />
        <div>
          <p className="font-semibold">
            {score}/{total} correct — {pct}%
          </p>
          <p className="text-sm opacity-80">
            {pct >= 80 ? 'Excellent!' : pct >= 60 ? 'Good effort!' : 'Keep studying!'}
          </p>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-background border border-border/60 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 flex-shrink-0">
          <div>
            <h2 className="font-serif font-bold text-xl text-foreground">Quiz Mode</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Two-part adaptive quiz</p>
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
          {!quiz && !isLoading && !error && (
            <div className="flex flex-col items-center justify-center min-h-[300px] gap-6 text-center">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/15 flex items-center justify-center">
                <Trophy className="w-10 h-10 text-primary/50" />
              </div>
              <div className="space-y-3">
                <h3 className="font-serif font-semibold text-xl text-foreground">Two-Part Quiz</h3>
                <div className="flex flex-col gap-2 text-sm text-muted-foreground max-w-sm mx-auto text-left">
                  <div className="flex items-start gap-2 bg-muted/40 border border-border/50 rounded-lg p-3">
                    <BookOpen className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-foreground">Part 1: Reviewer-Based</p>
                      <p className="text-xs mt-0.5">Term recall, definitions, concept comprehension</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 bg-muted/40 border border-border/50 rounded-lg p-3">
                    <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-foreground">Part 2: Situational & Applied</p>
                      <p className="text-xs mt-0.5">Scenario analysis, theory application, problem-solving</p>
                    </div>
                  </div>
                </div>
              </div>
              <Button onClick={generateQuiz} size="lg">
                Generate Quiz
              </Button>
            </div>
          )}

          {isLoading && (
            <div className="flex flex-col items-center justify-center min-h-[300px] gap-4 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="font-medium">Generating your two-part quiz...</p>
              <p className="text-sm">Creating recall and situational questions</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center min-h-[300px] gap-4">
              <p className="text-destructive text-center">{error}</p>
              <Button onClick={generateQuiz} variant="outline">
                Try Again
              </Button>
            </div>
          )}

          {quiz && !isLoading && (
            <div className="space-y-5">
              {/* Score summary (after submit) */}
              {submitted && (
                <div className="grid grid-cols-2 gap-3">
                  <ScoreBanner score={reviewerScore.correct} total={reviewerScore.total} />
                  <ScoreBanner score={sitScore.correct} total={sitScore.total} />
                </div>
              )}

              {/* Tab toggle */}
              <div className="flex items-center bg-muted/60 border border-border/50 rounded-xl p-1 gap-1">
                <button
                  onClick={() => setActiveTab('reviewer')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'reviewer'
                      ? 'bg-background shadow-sm text-foreground border border-border/60'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  Reviewer-Based
                  <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                    {reviewerSections.flatMap((s) => s.questions).length}
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('situational')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'situational'
                      ? 'bg-background shadow-sm text-foreground border border-border/60'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  Situational
                  <span className="text-xs bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded-full">
                    {situationalQuestions.length}
                  </span>
                </button>
              </div>

              {/* PART 1: Reviewer-Based */}
              <AnimatePresence mode="wait">
                {activeTab === 'reviewer' && (
                  <motion.div
                    key="reviewer"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <BookOpen className="w-4 h-4 text-primary" />
                      Term recall and concept comprehension from the reviewer
                    </div>
                    {reviewerSections.map((section, si) => (
                      <div key={si}>
                        <h3 className="text-base font-serif font-semibold text-foreground mb-4 flex items-center gap-2">
                          <span className="w-1.5 h-5 bg-primary rounded-full" />
                          {section.title}
                        </h3>
                        <div className="space-y-4">
                          {section.questions.map((q, qi) => {
                            const offset = reviewerSections.slice(0, si).flatMap((s) => s.questions).length;
                            return (
                              <QuestionCard key={qi} q={q} qKey={`r-${si}-${qi}`} index={offset + qi} />
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}

                {/* PART 2: Situational */}
                {activeTab === 'situational' && (
                  <motion.div
                    key="situational"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Lightbulb className="w-4 h-4 text-amber-500" />
                      Apply concepts to real scenarios and solve problems
                    </div>
                    {situationalQuestions.length === 0 ? (
                      <div className="text-center text-muted-foreground py-12">
                        <p>No situational questions were generated.</p>
                        <Button variant="outline" size="sm" onClick={generateQuiz} className="mt-4">
                          Regenerate
                        </Button>
                      </div>
                    ) : (
                      situationalQuestions.map((q, qi) => (
                        <QuestionCard key={qi} q={q} qKey={`s-${qi}`} index={qi} />
                      ))
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Footer */}
        {quiz && !isLoading && (
          <div className="px-6 py-4 border-t border-border/60 flex items-center justify-between flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setAnswers({});
                setSubmitted(false);
                setQuiz(null);
              }}
              className="gap-2 text-muted-foreground"
            >
              <RotateCcw className="w-4 h-4" /> Regenerate
            </Button>
            <div className="flex items-center gap-2">
              {submitted && (
                <span className="text-sm text-muted-foreground">
                  Total: {totalScore.correct}/{totalScore.total}
                </span>
              )}
              {!submitted ? (
                <Button
                  onClick={() => setSubmitted(true)}
                  disabled={Object.keys(answers).length === 0}
                  className="gap-2"
                >
                  Submit Answers <ChevronRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => {
                    setAnswers({});
                    setSubmitted(false);
                  }}
                  className="gap-2"
                >
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

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, CheckCircle2, XCircle, ChevronRight, Trophy, RotateCcw, Loader2 } from 'lucide-react';
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
  sections: QuizSection[];
}

interface QuizModalProps {
  onClose: () => void;
  content: string;
}

export function QuizModal({ onClose, content }: QuizModalProps) {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [flatQuestions, setFlatQuestions] = useState<Array<QuizQuestion & { sectionTitle: string; key: string }>>([]);

  const generateQuiz = async () => {
    setIsLoading(true);
    setError(null);
    setAnswers({});
    setSubmitted(false);

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

      const q = data.quiz as Quiz;
      setQuiz(q);

      const flat = q.sections.flatMap((s, si) =>
        s.questions.map((q, qi) => ({
          ...q,
          sectionTitle: s.title,
          key: `${si}-${qi}`,
        }))
      );
      setFlatQuestions(flat);
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

  const handleSubmit = () => {
    setSubmitted(true);
  };

  const handleRetry = () => {
    setAnswers({});
    setSubmitted(false);
    setQuiz(null);
    setFlatQuestions([]);
  };

  const score = submitted
    ? flatQuestions.filter((q) => {
        const selected = answers[q.key];
        return selected && selected.startsWith(q.answer + '.');
      }).length
    : 0;

  const total = flatQuestions.length;
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;

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
            <p className="text-sm text-muted-foreground mt-0.5">Test your knowledge</p>
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
              <div>
                <h3 className="font-serif font-semibold text-xl text-foreground mb-2">Ready for a Quiz?</h3>
                <p className="text-muted-foreground max-w-sm">
                  Generate multiple-choice questions based on this reviewer's content.
                </p>
              </div>
              <Button onClick={generateQuiz} size="lg">
                Generate Quiz
              </Button>
            </div>
          )}

          {isLoading && (
            <div className="flex flex-col items-center justify-center min-h-[300px] gap-4 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="font-medium">Generating your quiz...</p>
              <p className="text-sm">This may take a moment</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center min-h-[300px] gap-4">
              <p className="text-destructive text-center">{error}</p>
              <Button onClick={generateQuiz} variant="outline">Try Again</Button>
            </div>
          )}

          {quiz && !isLoading && (
            <div className="space-y-8">
              {/* Score banner */}
              {submitted && (
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
                  <Trophy className="w-7 h-7 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-lg">
                      {score}/{total} correct — {pct}%
                    </p>
                    <p className="text-sm opacity-80">
                      {pct >= 80 ? 'Excellent work!' : pct >= 60 ? 'Good effort, keep studying!' : 'Keep practicing!'}
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Questions by section */}
              {quiz.sections.map((section, si) => (
                <div key={si}>
                  <h3 className="text-lg font-serif font-semibold text-foreground mb-4 flex items-center gap-2">
                    <span className="w-1.5 h-5 bg-primary rounded-full inline-block opacity-80" />
                    {section.title}
                  </h3>
                  <div className="space-y-5">
                    {section.questions.map((q, qi) => {
                      const key = `${si}-${qi}`;
                      const selected = answers[key];
                      const isCorrect = selected?.startsWith(q.answer + '.');
                      return (
                        <div key={qi} className="bg-card border border-border/60 rounded-xl p-5">
                          <p className="font-medium text-foreground mb-4 leading-relaxed">
                            <span className="text-primary font-bold mr-1.5">{qi + 1}.</span>
                            {q.question}
                          </p>
                          <div className="space-y-2">
                            {q.choices.map((choice, ci) => {
                              const letter = String.fromCharCode(65 + ci);
                              const isSelected = selected === choice;
                              const isCorrectChoice = choice.startsWith(q.answer + '.');

                              let cls = 'flex items-start gap-3 p-3 rounded-lg border text-sm cursor-pointer transition-all';
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
                                <div
                                  key={ci}
                                  className={cls}
                                  onClick={() => handleAnswer(key, choice)}
                                >
                                  <span className="font-bold text-xs mt-0.5 min-w-[18px]">{letter}.</span>
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
                            <p className="text-xs text-muted-foreground mt-3 px-1 italic">
                              {q.explanation}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {quiz && !isLoading && (
          <div className="px-6 py-4 border-t border-border/60 flex items-center justify-between flex-shrink-0">
            <Button variant="ghost" size="sm" onClick={handleRetry} className="gap-2 text-muted-foreground">
              <RotateCcw className="w-4 h-4" /> Regenerate
            </Button>
            {!submitted ? (
              <Button
                onClick={handleSubmit}
                disabled={Object.keys(answers).length === 0}
                className="gap-2"
              >
                Submit Answers <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button variant="outline" onClick={handleRetry} className="gap-2">
                <RotateCcw className="w-4 h-4" /> Try Again
              </Button>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}

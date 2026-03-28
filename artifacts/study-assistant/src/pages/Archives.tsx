import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { BookOpenText, Trash2, ArrowLeft, Clock, FileText, Loader2, Archive } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { FormattedOutput } from '@/components/formatted-output';

interface ReviewerItem {
  id: number;
  title: string;
  content: string;
  sourceText: string;
  createdAt: string;
}

async function fetchReviewers(): Promise<ReviewerItem[]> {
  const res = await fetch('/api/reviewers', { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch reviewers');
  const data = await res.json();
  return data.reviewers;
}

async function deleteReviewer(id: number): Promise<void> {
  const res = await fetch(`/api/reviewers/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok && res.status !== 204) throw new Error('Failed to delete reviewer');
}

interface ArchivesProps {
  onBack: () => void;
  onLoad: (reviewer: ReviewerItem) => void;
}

export default function Archives({ onBack, onLoad }: ArchivesProps) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<ReviewerItem | null>(null);

  const { data: reviewers = [], isLoading, error } = useQuery({
    queryKey: ['reviewers'],
    queryFn: fetchReviewers,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteReviewer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviewers'] });
      if (selected && selected.id === deleteMutation.variables) {
        setSelected(null);
      }
    },
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-background/80 border-b border-border/60">
        <div className="container mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
            <div className="flex items-center gap-2.5 text-primary">
              <div className="bg-primary/10 p-1.5 rounded-lg border border-primary/20">
                <Archive className="w-5 h-5" />
              </div>
              <span className="text-xl font-serif font-bold tracking-tight text-foreground">My Archives</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground hidden sm:block">
            {reviewers.length} saved reviewer{reviewers.length !== 1 ? 's' : ''}
          </p>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 lg:px-8 py-8 max-w-[1400px] relative z-10">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p>Loading your archives...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 text-destructive">
            <p>Failed to load archives. Please try again.</p>
          </div>
        ) : reviewers.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-muted-foreground text-center">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/5 to-primary/10 flex items-center justify-center border border-primary/10">
              <Archive className="w-10 h-10 text-primary/40" />
            </div>
            <h3 className="text-xl font-serif font-semibold text-foreground">No saved reviewers yet</h3>
            <p className="max-w-sm text-[15px]">
              Generate a reviewer and click "Save to Archive" to store it here for future reference.
            </p>
            <Button variant="outline" onClick={onBack}>
              <BookOpenText className="w-4 h-4 mr-2" /> Create a Reviewer
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
            {/* Sidebar list */}
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-medium text-muted-foreground px-1 mb-1">Saved Reviewers</h3>
              <AnimatePresence>
                {reviewers.map((r) => (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                  >
                    <button
                      onClick={() => setSelected(r)}
                      className={`w-full text-left p-4 rounded-xl border transition-all group ${
                        selected?.id === r.id
                          ? 'bg-primary/5 border-primary/30 shadow-sm'
                          : 'bg-card border-border/60 hover:border-primary/20 hover:bg-primary/[0.02]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground text-sm truncate">{r.title}</p>
                          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {new Date(r.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteMutation.mutate(r.id);
                          }}
                          disabled={deleteMutation.isPending && deleteMutation.variables === r.id}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                        >
                          {deleteMutation.isPending && deleteMutation.variables === r.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Reviewer content */}
            <div className="bg-card border-2 border-border/50 rounded-2xl shadow-xl shadow-black/[0.02] min-h-[500px] flex flex-col">
              {selected ? (
                <>
                  <div className="flex items-center justify-between px-6 py-4 border-b border-border/60">
                    <div>
                      <h2 className="font-serif font-semibold text-lg text-foreground">{selected.title}</h2>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(selected.createdAt).toLocaleString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => onLoad(selected)}
                    >
                      <FileText className="w-4 h-4 mr-1.5" /> Load & Edit
                    </Button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 md:p-8">
                    <FormattedOutput text={selected.content} />
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                  <BookOpenText className="w-12 h-12 text-primary/30 mb-4" />
                  <p className="font-serif font-semibold text-foreground">Select a reviewer to preview it</p>
                  <p className="text-sm mt-1">Click any item from the list on the left</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

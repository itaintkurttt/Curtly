import React from 'react';
import { cn } from '@/lib/utils';

export function FormattedOutput({ text, className }: { text: string; className?: string }) {
  const lines = text.split('\n');

  return (
    <div className={cn("space-y-1 font-sans text-base", className)}>
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-3" />;
        
        // Document / Section Headings
        if (line.startsWith('# ')) {
          return (
            <h1 key={i} className="text-2xl lg:text-3xl font-serif font-bold text-primary mt-8 mb-5 border-b border-border/60 pb-3 leading-tight shadow-sm shadow-primary/5 rounded-sm px-1">
              {parseInline(line.slice(2))}
            </h1>
          );
        }
        
        // Category Headings
        if (line.startsWith('## ')) {
          return (
            <h2 key={i} className="text-xl lg:text-2xl font-serif font-bold text-foreground mt-8 mb-4 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-primary rounded-full inline-block opacity-80" />
              {parseInline(line.slice(3))}
            </h2>
          );
        }
        
        // Sub-categories
        if (line.startsWith('### ')) {
          return (
            <h3 key={i} className="text-lg font-serif font-semibold text-foreground mt-6 mb-3">
              {parseInline(line.slice(4))}
            </h3>
          );
        }
        
        // Lists
        if (line.match(/^[-*]\s/)) {
          return (
            <li key={i} className="ml-6 mb-3 text-muted-foreground list-disc marker:text-primary/40 leading-relaxed pl-1">
              {parseInline(line.slice(2))}
            </li>
          );
        }

        // Paragraphs (mostly keywords and definitions)
        return (
          <p key={i} className="mb-4 text-muted-foreground leading-relaxed text-[15px] sm:text-base">
            {parseInline(line)}
          </p>
        );
      })}
    </div>
  );
}

// Helper to parse exactly **bold** text as polished academic badges
function parseInline(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong 
          key={i} 
          className="font-semibold text-foreground bg-primary/[0.04] px-1.5 py-0.5 rounded-md mx-0.5 border border-primary/10 shadow-sm transition-colors hover:bg-primary/[0.08]"
        >
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

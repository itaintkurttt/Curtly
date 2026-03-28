import React from 'react';
import { cn } from '@/lib/utils';
import { Globe, ExternalLink } from 'lucide-react';

interface FormattedOutputProps {
  text: string;
  className?: string;
  webContent?: string;
  webSources?: Array<{ title: string; url: string }>;
}

export function FormattedOutput({ text, className, webContent, webSources }: FormattedOutputProps) {
  return (
    <div className={cn("space-y-1 font-sans text-base", className)}>
      {/* Primary reviewer content */}
      <ContentBlock lines={text.split('\n')} />

      {/* Web-sourced section */}
      {webContent && (
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border/40">
            <div className="w-6 h-6 rounded-md bg-blue-500/10 border border-blue-400/30 flex items-center justify-center flex-shrink-0">
              <Globe className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <span className="text-sm font-semibold text-blue-600">Additional Info from Web Sources</span>
          </div>

          {/* Sources list */}
          {webSources && webSources.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {webSources.map((s, i) => (
                <a
                  key={i}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border border-blue-300/50 bg-blue-50/50 text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  <Globe className="w-3 h-3" />
                  {s.title.slice(0, 40)}
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              ))}
            </div>
          )}

          {/* Web content with blue accent */}
          <div className="border-l-2 border-blue-400/40 pl-4">
            <ContentBlock lines={webContent.split('\n')} isWeb />
          </div>
        </div>
      )}
    </div>
  );
}

function ContentBlock({ lines, isWeb = false }: { lines: string[]; isWeb?: boolean }) {
  return (
    <>
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-3" />;

        if (line.startsWith('# ')) {
          return (
            <h1
              key={i}
              className={cn(
                "text-2xl lg:text-3xl font-serif font-bold mt-8 mb-5 border-b pb-3 leading-tight rounded-sm px-1",
                isWeb
                  ? "text-blue-700 border-blue-200/60"
                  : "text-primary border-border/60 shadow-sm shadow-primary/5",
              )}
            >
              {parseInline(line.slice(2))}
            </h1>
          );
        }

        if (line.startsWith('## ')) {
          return (
            <h2
              key={i}
              className={cn(
                "text-xl lg:text-2xl font-serif font-bold mt-8 mb-4 flex items-center gap-2",
                isWeb ? "text-blue-600" : "text-foreground",
              )}
            >
              <span
                className={cn(
                  "w-1.5 h-6 rounded-full inline-block opacity-80",
                  isWeb ? "bg-blue-400" : "bg-primary",
                )}
              />
              {parseInline(line.slice(3))}
            </h2>
          );
        }

        if (line.startsWith('### ')) {
          return (
            <h3
              key={i}
              className={cn(
                "text-lg font-serif font-semibold mt-6 mb-3",
                isWeb ? "text-blue-600" : "text-foreground",
              )}
            >
              {parseInline(line.slice(4))}
            </h3>
          );
        }

        if (line.match(/^[-*]\s/)) {
          return (
            <li
              key={i}
              className={cn(
                "ml-6 mb-3 list-disc leading-relaxed pl-1",
                isWeb ? "text-blue-700/80 marker:text-blue-400/60" : "text-muted-foreground marker:text-primary/40",
              )}
            >
              {parseInline(line.slice(2))}
            </li>
          );
        }

        return (
          <p
            key={i}
            className={cn(
              "mb-4 leading-relaxed text-[15px] sm:text-base",
              isWeb ? "text-slate-600" : "text-muted-foreground",
            )}
          >
            {parseInline(line, isWeb)}
          </p>
        );
      })}
    </>
  );
}

function parseInline(text: string, isWeb = false) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong
          key={i}
          className={cn(
            "font-semibold px-1.5 py-0.5 rounded-md mx-0.5 border shadow-sm transition-colors",
            isWeb
              ? "text-blue-700 bg-blue-50 border-blue-200/60 hover:bg-blue-100/60"
              : "text-foreground bg-primary/[0.04] border-primary/10 hover:bg-primary/[0.08]",
          )}
        >
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

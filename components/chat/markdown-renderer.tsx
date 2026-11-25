'use client';

import React from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatMarkdownProps {
  content: string;
}

export function ChatMarkdown({ content }: ChatMarkdownProps) {
  if (!content) return null;

  return (
    <div className="prose prose-sm prose-slate max-w-none text-slate-800 leading-relaxed break-words">
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-base font-bold tracking-tight text-slate-950 mt-4 mb-2 pb-1.5 border-b border-slate-200/80">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-sm font-bold tracking-tight text-slate-900 mt-4 mb-1.5">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mt-3.5 mb-1">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-xs font-semibold text-slate-800 mt-2.5 mb-1">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="text-[13.5px] leading-relaxed text-slate-700 my-2 last:mb-0">
              {children}
            </p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-slate-950">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="italic text-slate-700">{children}</em>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-5 space-y-1.5 my-2.5 text-[13.5px] text-slate-700 marker:text-[#B45309]">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 space-y-1.5 my-2.5 text-[13.5px] text-slate-700 marker:text-slate-500 font-medium">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed pl-0.5">{children}</li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border border-slate-200/80 bg-slate-50/80 px-3.5 py-2.5 my-2.5 rounded-xl text-xs text-slate-700">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-xl border border-slate-200/90 bg-white">
              <table className="w-full text-xs text-left border-collapse tabular-nums">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-slate-50/90 text-slate-800 font-semibold border-b border-slate-200">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-slate-100">{children}</tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-slate-50/70 transition-colors">{children}</tr>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 font-semibold text-slate-900 whitespace-nowrap">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 text-slate-700 tabular-nums">
              {children}
            </td>
          ),
          code: ({ children, className }) => {
            const isCodeBlock = className?.includes('language-');
            if (isCodeBlock) {
              return (
                <div className="my-2.5 p-3 rounded-xl bg-slate-900 text-slate-100 text-xs font-mono overflow-x-auto border border-slate-800 shadow-2xs">
                  <code>{children}</code>
                </div>
              );
            }
            return (
              <code className="px-1.5 py-0.5 rounded-md bg-slate-100 border border-slate-200/80 font-mono text-[12px] text-slate-800 font-medium">
                {children}
              </code>
            );
          },
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#B45309] hover:text-[#B45309] font-semibold underline underline-offset-2 transition-colors inline-flex items-center gap-0.5"
            >
              {children}
            </a>
          ),
          hr: () => <hr className="my-3.5 border-slate-200/80" />,
        }}
      >
        {content}
      </Markdown>
    </div>
  );
}

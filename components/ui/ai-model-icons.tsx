'use client';

import React from 'react';
import { Sparkles, Bot, Brain } from 'lucide-react';

interface ModelIconProps {
  className?: string;
  size?: number;
}

export function DeepSeekIcon({ className = 'w-4 h-4' }: ModelIconProps) {
  return (
    <div className={`flex items-center justify-center rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 ${className}`}>
      <Brain className="w-full h-full p-0.5" />
    </div>
  );
}

export function ChatGPTIcon({ className = 'w-4 h-4' }: ModelIconProps) {
  return (
    <div className={`flex items-center justify-center rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ${className}`}>
      <Bot className="w-full h-full p-0.5" />
    </div>
  );
}

export function GeminiIcon({ className = 'w-4 h-4' }: ModelIconProps) {
  return (
    <div className={`flex items-center justify-center rounded bg-violet-500/10 text-violet-600 dark:text-violet-400 ${className}`}>
      <Sparkles className="w-full h-full p-0.5" />
    </div>
  );
}

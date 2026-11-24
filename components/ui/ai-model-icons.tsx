'use client';

import React from 'react';
import Image from 'next/image';
import { siClaude, siGooglegemini } from 'simple-icons';

interface ModelIconProps {
  className?: string;
}

export function AgentIcon({ className = 'w-4 h-4' }: ModelIconProps) {
  return <Image src="/ai-agent-icon.svg" alt="" width={48} height={48} className={className} />;
}

export function ClaudeIcon({ className = 'w-4 h-4' }: ModelIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill={`#${siClaude.hex}`} className={className} aria-hidden="true">
      <path d={siClaude.path} />
    </svg>
  );
}

export function ChatGPTIcon({ className = 'w-4 h-4' }: ModelIconProps) {
  return <Image src="/assets/openai.ico" alt="" width={24} height={24} className={className} unoptimized />;
}

export function GeminiIcon({ className = 'w-4 h-4' }: ModelIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill={`#${siGooglegemini.hex}`} className={className} aria-hidden="true">
      <path d={siGooglegemini.path} />
    </svg>
  );
}

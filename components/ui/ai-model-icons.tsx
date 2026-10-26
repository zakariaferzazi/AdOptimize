import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
}

/**
 * DeepSeek AI Model SVG Icon
 * Edit this SVG path to customize the DeepSeek whale / logo.
 */
export function DeepSeekIcon({ className = 'w-4 h-4', size = 16 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* DeepSeek stylized whale body & tail */}
      <path d="M21.5 12.8c-.4-1.9-1.6-3.5-3.3-4.5-2-1.2-4.5-1.5-6.8-1-2.5.6-4.7 2.2-6 4.4-1.1 1.9-1.3 4.1-.7 6.1.5 1.8 1.8 3.3 3.5 4.1 1.5.7 3.2.9 4.9.6 2.2-.4 4.2-1.7 5.5-3.5.7-.9 1.1-2 1.3-3.2.1-.6-.2-1.3-.8-1.5-.6-.2-1.3.2-1.5.8-.2.9-.5 1.7-1.1 2.5-.9 1.4-2.5 2.3-4.2 2.6-1.3.2-2.7.1-3.8-.5-1.3-.6-2.2-1.8-2.6-3.2-.5-1.6-.3-3.3.6-4.8 1.1-1.7 2.8-3 4.8-3.5 1.8-.4 3.7-.2 5.3.8 1.3.8 2.2 2.1 2.5 3.6.1.7.7 1.2 1.5 1.1.7-.1 1.2-.7 1-1.4z" />
      <circle cx="9.2" cy="11.5" r="1.3" />
      <path d="M19.8 8c1.1-.8 2.3-1.2 3.7-1.3-.4 1.3-1 2.3-1.9 3.1-.4-.6-1-1.2-1.8-1.8z" />
    </svg>
  );
}

/**
 * ChatGPT / OpenAI SVG Icon
 * Edit this SVG path to customize the ChatGPT spiral / logo.
 */
export function ChatGPTIcon({ className = 'w-4 h-4', size = 16 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* OpenAI ChatGPT geometric spiral vortex */}
      <path d="M20.5 10.3a5.2 5.2 0 0 0-.4-4 5.3 5.3 0 0 0-4.9-2.7 5.2 5.2 0 0 0-3.2-1.6 5.3 5.3 0 0 0-5.1 2.9 5.2 5.2 0 0 0-3.5 1.7 5.3 5.3 0 0 0-.7 5.5 5.2 5.2 0 0 0-1.8 3.5 5.3 5.3 0 0 0 2 5.3 5.2 5.2 0 0 0 3.2 1.6 5.3 5.3 0 0 0 5.1-2.9 5.2 5.2 0 0 0 3.5-1.7 5.3 5.3 0 0 0 .8-5.5 5.2 5.2 0 0 0 1.8-3.5 5.3 5.3 0 0 0-2-5.3l-.2.1Zm-7.7 11.2a3.8 3.8 0 0 1-2.4-.9l.1-.1 4-2.3a.8.8 0 0 0 .4-.7v-5.6l1.7 1v4.8a3.8 3.8 0 0 1-3.8 3.8Zm-8.6-4.1a3.8 3.8 0 0 1-.5-2.5l.1.1 4 2.3a.8.8 0 0 0 .8 0l4.8-2.8v2l-4.1 2.4a3.8 3.8 0 0 1-5.1-1.5Zm-1.4-8.8a3.8 3.8 0 0 1 1.9-1.7v4.7a.8.8 0 0 0 .4.7l4.8 2.8-1.7 1-4.1-2.4a3.8 3.8 0 0 1-1.3-5.1Zm13.5 4.3-4.8-2.8 1.7-1 4.1 2.4a3.8 3.8 0 0 1 1.3 5.1 3.8 3.8 0 0 1-1.9 1.7v-4.7a.8.8 0 0 0-.4-.7Zm2.1-3.8-4-2.3a.8.8 0 0 0-.8 0l-4.8 2.8v-2l4.1-2.4a3.8 3.8 0 0 1 5.5 3.9ZM9.5 12.8l2.5-1.5 2.5 1.5v2.9l-2.5 1.5-2.5-1.5v-2.9Z" />
    </svg>
  );
}

/**
 * Google Gemini SVG Icon
 * Edit this SVG path to customize the 4-point radiant diamond star.
 */
export function GeminiIcon({ className = 'w-4 h-4', size = 16 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Google Gemini 4-Point Radiant Spark Star */}
      <path d="M12 0c.3 6.6 5.4 11.7 12 12-6.6.3-11.7 5.4-12 12-.3-6.6-5.4-11.7-12-12C6.6 11.7 11.7 6.6 12 0Z" />
    </svg>
  );
}

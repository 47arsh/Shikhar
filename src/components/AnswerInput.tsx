"use client";

import { useCallback } from "react";

interface AnswerInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  checking: boolean;
  disabled: boolean;
  error?: string;
  maxLength?: number;
}

export function AnswerInput({
  value,
  onChange,
  onSubmit,
  checking,
  disabled,
  error,
  maxLength = 60,
}: AnswerInputProps) {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !checking && !disabled) {
        onSubmit();
      }
    },
    [checking, disabled, onSubmit],
  );

  return (
    <div className="w-full max-w-md space-y-3">
      <label htmlFor="answer-input" className="block text-sm font-medium text-shikhar-dusk sr-only">
        Your answer
      </label>
      <div className="relative">
        <input
          id="answer-input"
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={checking || disabled}
          maxLength={maxLength}
          autoComplete="off"
          spellCheck={false}
          className={`w-full px-4 py-3 text-lg text-shikhar-dusk bg-white border border-shikhar-dawn rounded-xl focus:ring-2 focus:ring-shikhar-dawn focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
          placeholder="Type your answer..."
          aria-label="Your answer"
          aria-invalid={error ? "true" : "false"}
          aria-busy={checking}
        />
        {checking && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-shikhar-dawn animate-pulse" />
            <div className="w-2 h-2 rounded-full bg-shikhar-dawn animate-pulse" style={{ animationDelay: "0.2s" }} />
            <div className="w-2 h-2 rounded-full bg-shikhar-dawn animate-pulse" style={{ animationDelay: "0.4s" }} />
          </div>
        )}
      </div>
      <button
        onClick={onSubmit}
        disabled={checking || disabled || !value.trim()}
        className={`w-full py-3 px-6 rounded-xl font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg ${
          checking || disabled || !value.trim()
            ? "bg-slate-300 text-slate-500"
            : "bg-shikhar-dusk hover:bg-shikhar-dusk/90 focus:ring-2 focus:ring-shikhar-dawn"
        }`}
        aria-label="Submit answer"
      >
        {checking ? "Checking..." : "Submit"}
      </button>
      {error && (
        <p className="text-sm text-destructive text-center bg-destructive/10 px-3 py-2 rounded border border-destructive/20">
          {error}
        </p>
      )}
      <p className="text-xs text-slate-500 text-right">
        {value.length}/{maxLength}
      </p>
    </div>
  );
}

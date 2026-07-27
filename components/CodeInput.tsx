"use client";

import {
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";
import { CODE_DIGITS, NATO_WORDS, parseCode, splitCode } from "@/lib/codes";
import { copy } from "@/lib/copy";

interface CodeInputProps {
  onSubmit: (code: string) => void;
  disabled?: boolean;
}

/**
 * A word picker plus four digit slots, not a free-text field. Pasting a
 * full KILO-7742 string fills both parts; digits advance on input.
 */
export function CodeInput({ onSubmit, disabled = false }: CodeInputProps) {
  const [word, setWord] = useState("");
  const [digits, setDigits] = useState<string[]>(
    Array.from({ length: CODE_DIGITS }, () => ""),
  );
  const digitRefs = useRef<Array<HTMLInputElement | null>>([]);
  const submitRef = useRef<HTMLButtonElement>(null);

  const complete = word !== "" && digits.every((d) => d !== "");

  const fillFrom = (raw: string): boolean => {
    const parsed = parseCode(raw);
    if (!parsed) return false;
    const { word: w, digits: d } = splitCode(parsed);
    setWord(w);
    setDigits(d.split(""));
    submitRef.current?.focus();
    return true;
  };

  const handlePaste = (event: ClipboardEvent<HTMLElement>) => {
    const text = event.clipboardData.getData("text");
    if (fillFrom(text)) {
      event.preventDefault();
    }
  };

  const handleDigitChange = (
    index: number,
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const value = event.target.value.replace(/\D/g, "").slice(-1);
    setDigits((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
    if (value && index < CODE_DIGITS - 1) {
      digitRefs.current[index + 1]?.focus();
    }
  };

  const handleDigitKeyDown = (
    index: number,
    event: KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "Backspace" && digits[index] === "" && index > 0) {
      digitRefs.current[index - 1]?.focus();
    }
    if (event.key === "Enter" && complete) {
      submit();
    }
  };

  const submit = () => {
    if (!complete || disabled) return;
    onSubmit(`${word}-${digits.join("")}`);
  };

  return (
    <form
      className="code-input"
      onPaste={handlePaste}
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <fieldset className="code-input__fields" disabled={disabled}>
        <legend className="sr-only">{copy.joinLegend}</legend>
        <label className="sr-only" htmlFor="code-word">
          {copy.codeWordLabel}
        </label>
        <select
          id="code-word"
          className="code-input__word"
          value={word}
          onChange={(event) => setWord(event.target.value)}
        >
          <option value="" disabled>
            {copy.codeWordPlaceholder}
          </option>
          {NATO_WORDS.map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>
        <div className="code-input__digits">
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                digitRefs.current[index] = el;
              }}
              className="code-input__digit"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={digit}
              aria-label={copy.codeDigitLabel(index + 1, CODE_DIGITS)}
              onChange={(event) => handleDigitChange(index, event)}
              onKeyDown={(event) => handleDigitKeyDown(index, event)}
              onFocus={(event) => event.currentTarget.select()}
            />
          ))}
        </div>
        <button
          ref={submitRef}
          type="submit"
          className="button button--line"
          disabled={!complete}
        >
          {copy.ctaJoin}
        </button>
      </fieldset>
    </form>
  );
}

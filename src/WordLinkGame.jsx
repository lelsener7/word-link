import React, { useState, useEffect, useRef } from "react";

// ---- Helpers ----
const onlyLetters = (s) => (s || "").replace(/[^a-z]/gi, "");
const sanitizePuzzle = (arr) =>
  (arr || []).map((w) => onlyLetters(String(w)).toLowerCase()).filter(Boolean);

// Default puzzle
// const defaultPuzzle = () => ["coffee", "table", "tennis", "racket"];
const defaultPuzzle = () => ["credit", "card", "game", "plan"];

export default function WordLinkGame() {
  // Game state
  const [words, setWords] = useState(defaultPuzzle());
  const [revealedUpTo, setRevealedUpTo] = useState(0); // index of last revealed word
  const [attempts, setAttempts] = useState(() => Array(defaultPuzzle().length).fill(0));
  const [feedback, setFeedback] = useState("");

  // Active-row typing state
  const [typed, setTyped] = useState(""); // user-typed characters for non-sticky slots
  const [sticky, setSticky] = useState({}); // { [wordIndex]: Array(wordLength). correct letters locked in-place }
  const inputRef = useRef(null);
  const rowRefs = useRef([]); // for auto-scrolling active row into view

  // Derived
  const isComplete = revealedUpTo >= words.length - 1;
  const nextIndex = Math.min(revealedUpTo + 1, words.length - 1);
  const currentTarget = !isComplete ? words[nextIndex] : null;
  const totalGuesses = attempts.reduce((a, b) => a + (b || 0), 0);

  // Reveal rule: +1 letter every 2 wrong guesses (min 1). Solved words show all letters.
  const revealedLettersFor = (i) => {
    if (i === 0 || i <= revealedUpTo) return words[i].length;
    const g = attempts[i] || 0;
    return Math.min(1 + Math.floor(g / 2), words[i].length);
  };

  // Keep attempts/sticky shape in sync if the puzzle changes
  useEffect(() => {
    setAttempts((prev) => {
      if (prev.length === words.length) return prev;
      return Array(words.length).fill(0);
    });
    setSticky({});
    setTyped("");
    setRevealedUpTo(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [words.length]);

  // Reset typed & prep sticky array when we move to a new active word
  useEffect(() => {
    setTyped("");
    setSticky((s) => ({ ...s, [nextIndex]: Array(words[nextIndex]?.length || 0).fill("") }));
  }, [nextIndex, words]);

  // Auto-scroll the active row into view on mobile
  useEffect(() => {
    const el = rowRefs.current[nextIndex];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [nextIndex]);

  // Optional backend hook: allow runtime puzzle replacement
  useEffect(() => {
    window.setWordLinkPuzzle = (arr) => {
      const clean = sanitizePuzzle(arr);
      if (clean.length > 1) setWords(clean);
    };
    return () => {
      delete window.setWordLinkPuzzle;
    };
  }, []);

  // Remaining non-sticky positions for the active row
  const remainingSlots = (() => {
    if (!currentTarget) return 0;
    const revealed = revealedLettersFor(nextIndex);
    const stick = sticky[nextIndex] || [];
    const stickyCount = stick.slice(revealed).filter(Boolean).length;
    return Math.max(0, currentTarget.length - revealed - stickyCount);
  })();

  // Submit current guess
  const submitGuess = () => {
    if (isComplete || !currentTarget) return;

    const revealed = revealedLettersFor(nextIndex);
    const stick = sticky[nextIndex] || [];

    // Build the full guess from: prefix + (sticky letters or typed letters)
    let fullArr = currentTarget.slice(0, revealed).split("");
    let typedIdx = 0;
    for (let pos = revealed; pos < currentTarget.length; pos++) {
      const s = stick[pos];
      if (s) {
        fullArr.push(s);
      } else {
        fullArr.push((typed[typedIdx] || "").toLowerCase());
        typedIdx++;
      }
    }
    const full = fullArr.join("");

    // Count attempt
    setAttempts((prev) => {
      const copy = [...prev];
      copy[nextIndex] = (copy[nextIndex] || 0) + 1;
      return copy;
    });

    if (full === currentTarget.toLowerCase()) {
      setRevealedUpTo(nextIndex);
      setTyped("");
      setFeedback("Correct!");
      setTimeout(() => setFeedback(""), 600);
    } else {
      // Lock correct-in-position letters ("sticky") & clear non-sticky typed
      const prevStick =
        sticky[nextIndex] && sticky[nextIndex].length
          ? [...sticky[nextIndex]]
          : Array(currentTarget.length).fill("");
      let tIdx = 0;
      for (let pos = revealed; pos < currentTarget.length; pos++) {
        if (prevStick[pos]) continue;
        const candidate = typed[tIdx] ? typed[tIdx].toLowerCase() : "";
        if (candidate && candidate === currentTarget[pos].toLowerCase()) {
          prevStick[pos] = candidate;
        }
        tIdx++;
      }
      setSticky((s) => ({ ...s, [nextIndex]: prevStick }));
      setTyped(""); // clear all non-sticky letters after a wrong guess
      setFeedback("Not quite — try again.");
      setTimeout(() => setFeedback(""), 900);
    }
  };

  // Keyboard handling for active row
  const handleKeyDown = (e) => {
    if (!currentTarget) return;
    if (e.key === "Enter") {
      e.preventDefault();
      submitGuess();
      return;
    }
    if (e.key === "Backspace") {
      e.preventDefault();
      setTyped((t) => t.slice(0, -1));
      return;
    }
    if (/^[a-zA-Z]$/.test(e.key)) {
      e.preventDefault();
      setTyped((t) => (t + e.key).toLowerCase().slice(0, remainingSlots));
    }
  };

  // Letter box row
  const Boxes = ({ word, revealedCount, activeIndex, rowIndex }) => {
    const w = word;
    const stick = sticky[rowIndex] || [];
    const isActive = rowIndex === activeIndex && !isComplete;
    const solved = rowIndex === 0 || rowIndex <= revealedUpTo;

    // Build display state for each position
    const chars = [];
    let typedPtr = 0;
    for (let i = 0; i < w.length; i++) {
      if (i < revealedCount) {
        chars.push({ ch: w[i], state: "prefix" }); // revealed by rule
      } else if (isActive && stick[i]) {
        chars.push({ ch: stick[i], state: "sticky" }); // correct-in-position from prior guess
      } else if (isActive) {
        const ch = typed[typedPtr] || "";
        chars.push({ ch, state: ch ? "typed" : "empty" });
        if (ch) typedPtr++;
      } else if (solved) {
        chars.push({ ch: w[i], state: "solved" });
      } else {
        chars.push({ ch: "-", state: "masked" }); // future rows
      }
    }

    return (
      <div
        className="flex select-none"
        onClick={() => isActive && inputRef.current?.focus()}
        role="group"
        aria-label={isActive ? "Type the remaining letters" : undefined}
      >
        {chars.map((c, idx) => {
          const isCursor =
            isActive && c.state === "empty" && chars.findIndex((x) => x.state === "empty") === idx;
          // Smaller boxes on mobile; larger on sm+
          const base =
            "w-7 h-9 mr-1 grid place-items-center rounded-md border text-sm font-mono sm:w-10 sm:h-12 sm:mr-2 sm:text-lg";
          let cls = "border-slate-300 bg-white text-slate-900";
          if (c.state === "prefix") cls = "border-emerald-300 bg-emerald-50 text-emerald-800";
          if (c.state === "sticky") cls = "border-emerald-300 bg-emerald-50 text-emerald-800"; // sticky is green like correct
          if (c.state === "solved") cls = "border-emerald-300 bg-emerald-50 text-emerald-800";
          if (c.state === "masked") cls = "border-slate-300 bg-white text-slate-400";
          return (
            <span
              key={idx}
              className={`${base} ${cls} ${isCursor ? "ring-2 ring-indigo-400" : ""}`}
            >
              {(c.ch || "").toUpperCase()}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-3 sm:p-6">
      <div className="w-full max-w-xl sm:max-w-2xl">
        <div className="bg-white/90 backdrop-blur rounded-2xl shadow-xl p-3 sm:p-6 border border-slate-200 max-h-[92vh] sm:max-h-none overflow-auto">
          {/* Header */}
          <header className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Word Link by King P</h1>
              <p className="text-slate-500 text-xs sm:text-sm">
                Each word links to the next: bus -> stop -> sign. After every two wrong guesses, an extra letter appears.
                Letters in the right spot stay.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs sm:text-sm">
                Total guesses: <span className="font-semibold">{totalGuesses}</span>
              </span>
              <button
                onClick={() => {
                  setRevealedUpTo(0);
                  setAttempts(Array(words.length).fill(0));
                  setSticky({});
                  setTyped("");
                  setFeedback("");
                }}
                className="px-3 py-2 rounded-xl border border-slate-300 text-sm hover:bg-slate-50"
              >
                Reset
              </button>
            </div>
          </header>

          {/* Game list */}
          <section className="mt-3">
            <ul className="grid gap-2 sm:gap-3">
              {words.map((w, i) => {
                const revealed = revealedLettersFor(i);
                const isActive = i === nextIndex && !isComplete;
                return (
                  <li
                    ref={(el) => (rowRefs.current[i] = el)}
                    key={i}
                    className={`flex items-center justify-between gap-2 sm:gap-3 rounded-xl border p-2 sm:p-3 transition-colors ${
                      isActive
                        ? "border-indigo-400 bg-indigo-50 ring-1 ring-indigo-200"
                        : i <= revealedUpTo
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex-1 flex items-center gap-2 sm:gap-3 flex-wrap">
                      <span
                        className={`inline-flex w-6 h-6 sm:w-7 sm:h-7 items-center justify-center rounded-full text-[11px] sm:text-xs font-semibold ${
                          i <= revealedUpTo
                            ? "bg-emerald-600 text-white"
                            : isActive
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {i + 1}
                      </span>

                      <Boxes
                        word={w}
                        revealedCount={revealed}
                        activeIndex={nextIndex}
                        rowIndex={i}
                      />

                      {/* Hidden input lives on the active row; typing happens here */}
                      {isActive && (
                        <input
                          ref={inputRef}
                          type="text"
                          inputMode="latin"
                          enterKeyHint="go"
                          autoCapitalize="none"
                          autoCorrect="off"
                          spellCheck={false}
                          autoFocus
                          value={typed}
                          onChange={(e) =>
                            setTyped(
                              onlyLetters(e.target.value).toLowerCase().slice(0, remainingSlots)
                            )
                          }
                          onKeyDown={handleKeyDown}
                          className="absolute opacity-0 pointer-events-none"
                          aria-hidden
                        />
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>

            {!isComplete && feedback && (
              <div className="mt-3 text-sm text-slate-600">{feedback}</div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

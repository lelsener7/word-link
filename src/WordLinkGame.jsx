import React, { useState, useEffect, useRef } from "react";

const onlyLetters = (s) => (s || "").replace(/[^a-z]/gi, "");
// const defaultPuzzle = () => ["house", "call", "center", "cut", "over"];
// const defaultPuzzle = () => ["coffee", "table", "tennis", "racket"];
const defaultPuzzle = () => ["credit", "card", "game", "plan"];

export default function WordLinkGame() {
  const [builderOpen, setBuilderOpen] = useState(false);
  const [builderText, setBuilderText] = useState(defaultPuzzle().join("\n"));
  const [words, setWords] = useState(defaultPuzzle());
  const [revealedUpTo, setRevealedUpTo] = useState(0);
  const [attempts, setAttempts] = useState(() => Array(defaultPuzzle().length).fill(0));
  const [feedback, setFeedback] = useState("");
  const [typed, setTyped] = useState("");
  const [sticky, setSticky] = useState({});
  const inputRef = useRef(null);

  const isComplete = revealedUpTo >= words.length - 1;
  const nextIndex = Math.min(revealedUpTo + 1, words.length - 1);
  const currentTarget = !isComplete ? words[nextIndex] : null;

  const revealedLettersFor = (i) => {
    if (i === 0 || i <= revealedUpTo) return words[i].length;
    const g = attempts[i] || 0;
    return Math.min(1 + Math.floor(g / 2), words[i].length);
  };

  useEffect(() => {
    setTyped("");
    setSticky((s) => ({ ...s, [nextIndex]: Array(words[nextIndex]?.length || 0).fill("") }));
  }, [nextIndex, words]);

  const remainingSlots = (() => {
    if (!currentTarget) return 0;
    const revealed = revealedLettersFor(nextIndex);
    const stick = sticky[nextIndex] || [];
    const stickyCount = stick.slice(revealed).filter(Boolean).length;
    return Math.max(0, currentTarget.length - revealed - stickyCount);
  })();

  const submitGuess = () => {
    if (isComplete || !currentTarget) return;
    const revealed = revealedLettersFor(nextIndex);
    const stick = sticky[nextIndex] || [];
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
      const prevStick = (sticky[nextIndex] && sticky[nextIndex].length) ? [...sticky[nextIndex]] : Array(currentTarget.length).fill("");
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

  const Boxes = ({ word, revealedCount, activeIndex, rowIndex }) => {
    const w = word;
    const stick = sticky[rowIndex] || [];
    const isActive = rowIndex === activeIndex && !isComplete;
    const solved = rowIndex === 0 || rowIndex <= revealedUpTo;

    const chars = [];
    let typedPtr = 0;
    for (let i = 0; i < w.length; i++) {
      if (i < revealedCount) {
        chars.push({ ch: w[i], state: "prefix" });
      } else if (isActive && stick[i]) {
        chars.push({ ch: stick[i], state: "sticky" });
      } else if (isActive) {
        const ch = typed[typedPtr] || "";
        chars.push({ ch, state: ch ? "typed" : "empty" });
        if (ch) typedPtr++;
      } else if (solved) {
        chars.push({ ch: w[i], state: "solved" });
      } else {
        chars.push({ ch: "-", state: "masked" });
      }
    }

    return (
      <div className="flex select-none" onClick={() => isActive && inputRef.current?.focus()}>
        {chars.map((c, idx) => {
          const isCursor = isActive && c.state === "empty" && chars.findIndex(x => x.state === "empty") === idx;
          // const base = "w-10 h-12 mr-2 grid place-items-center rounded-lg border text-lg font-mono";
          const base = "w-8 h-10 mr-1 grid place-items-center rounded-md border text-base font-mono sm:w-10 sm:h-12 sm:mr-2 sm:text-lg";
          let cls = "border-slate-300 bg-white text-slate-900";
          if (c.state === "prefix") cls = "border-emerald-300 bg-emerald-50 text-emerald-800";
          // if (c.state === "sticky") cls = "border-blue-300 bg-blue-50 text-blue-800";
          if (c.state === "sticky") cls = "border-emerald-300 bg-emerald-50 text-emerald-800";
          if (c.state === "solved") cls = "border-emerald-300 bg-emerald-50 text-emerald-800";
          if (c.state === "masked") cls = "border-slate-300 bg-white text-slate-400";
          return (
            <span key={idx} className={`${base} ${cls} ${isCursor ? "ring-2 ring-indigo-400" : ""}`}>
              {(c.ch || "").toUpperCase()}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="w-full max-w-2xl">
        <div className="bg-white/90 backdrop-blur rounded-2xl shadow-xl p-4 sm:p-6 border border-slate-200 max-h-[90vh] sm:max-h-none overflow-auto">
          <header className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Word Link by Boarlettie</h1>
              <p className="text-slate-500 text-sm">
                Each word links to the next — e.g., <span className="italic">school → bus → stop → sign</span>.<br />
                After every two wrong guesses, one more letter is revealed.<br />
                Incorrect guesses with a correct letter placement are revealed.
              </p>
{/*               <p className="text-slate-500 text-xs sm:text-sm">
              Each word links to the next. After every two wrong guesses, an extra letter appears. Letters in the right spot stay.
              <span className="hidden sm:inline"> Example: <span className="italic">coffee → table → tennis → racket</span>.</span>
              </p> */}
            </div>
            <button
              onClick={() => setBuilderOpen(!builderOpen)}
              className="px-3 py-2 rounded-xl bg-blue-600 text-white text-sm hover:bg-blue-500"
            >
              {builderOpen ? "Close Builder" : "Open Builder"}
            </button>
          </header>
          {builderOpen && (
            <div className="mt-4">
              <textarea
                value={builderText}
                onChange={(e) => setBuilderText(e.target.value)}
                rows={6}
                className="w-full border rounded-lg p-2 font-mono text-sm"
                placeholder="Enter one word per line"
              />
              <button
                onClick={() => {
                  const newWords = builderText.split("\n").map(w => onlyLetters(w).toLowerCase()).filter(Boolean);
                  if (newWords.length > 1) {
                    setWords(newWords);
                    setRevealedUpTo(0);
                    setAttempts(Array(newWords.length).fill(0));
                    setSticky({});
                    setTyped("");
                    setFeedback("");
                  }
                }}
                className="mt-2 px-3 py-2 rounded-xl bg-green-600 text-white text-sm hover:bg-green-500"
              >
                Load Puzzle
              </button>
            </div>
          )}
          <section className="mt-6">
            <ul className="grid gap-3">
              {words.map((w, i) => {
                const revealed = revealedLettersFor(i);
                const isActive = i === nextIndex && !isComplete;
                return (
                  <li
                    key={i}
                    className={`flex items-center justify-between gap-3 rounded-xl border p-3 transition-colors ${
                      isActive
                        ? "border-indigo-400 bg-indigo-50"
                        : i <= revealedUpTo
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex-1 flex items-center gap-3">
                      <span className={`inline-flex w-7 h-7 items-center justify-center rounded-full text-xs font-semibold ${i <= revealedUpTo ? "bg-emerald-600 text-white" : isActive ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-700"}`}>{i + 1}</span>
                      <Boxes word={w} revealedCount={revealed} activeIndex={nextIndex} rowIndex={i} />
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
                          onChange={(e) => setTyped(onlyLetters(e.target.value).toLowerCase().slice(0, remainingSlots))}
                          onKeyDown={handleKeyDown}
                          className="absolute opacity-0 pointer-events-none"
                          aria-hidden
                        />
                      )}
                    </div>
                    <div className="text-sm text-slate-600">Guesses: <span className="font-semibold">{attempts[i] || 0}</span></div>
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

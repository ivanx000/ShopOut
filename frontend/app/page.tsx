"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Inter, Rock_Salt } from "next/font/google";

const rockSalt = Rock_Salt({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const inter = Inter({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
});

const PREFIX = "I want to… ";

export default function Home() {
  const router = useRouter();

  const [goal, setGoal] = useState(PREFIX);
  const [isFocused, setIsFocused] = useState(false);
  const [userHasEdited, setUserHasEdited] = useState(false);

  const placeholders = [
    "feel more settled in my apartment in Toronto",
    "get back into creative habits",
    "host the best dinner parties",
  ];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    // Only run animation if user hasn't edited
    if (userHasEdited) return;

    const interval = setInterval(() => {
      setFade(false);

      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % placeholders.length);
        setFade(true);
      }, 500);
    }, 3000);

    return () => clearInterval(interval);
  }, [userHasEdited]);

  const goTo3DDemo = () => {
    const cleanedGoal = goal.replace(PREFIX, "").trim();
    if (!cleanedGoal) return;
    router.push(
      `/3d-demo?goal=${encodeURIComponent(cleanedGoal)}`,
    );
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center mr-2 ml-2 relative">
      {/* Title */}
      <div
        className={`${rockSalt.className} text-7xl lg:text-7xl text-center text-gray-100`}
      >
        Shop for <br />
        Outcomes!
      </div>

      {/* Search Bar */}
      <div className="mt-10 w-[420px] lg:w-[650px] max-w-2xl">
        <div className="relative">
          <input
            type="text"
            value={goal}
            onChange={(e) => {
              setGoal(e.target.value);
              setUserHasEdited(true);
            }}
            onFocus={(e) => {
              setIsFocused(true);
              requestAnimationFrame(() => {
                e.target.selectionStart = e.target.selectionEnd =
                  e.target.value.length;
              });
            }}
            onBlur={() => setIsFocused(false)}
            className={`${inter.className} text-sm lg:text-lg w-full pl-4 pr-14 py-3 text-gray-400 rounded-full border bg-gray-100 border-gray-300 focus:outline-none`}
          />

          {/* Animated suggestion (after prefix) */}
          {goal === PREFIX && !isFocused && !userHasEdited && (
            <span
              className={`absolute left-[7rem] top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none transition-opacity duration-500 ${
                fade ? "opacity-100" : "opacity-0"
              }`}
            >
              {placeholders[currentIndex]}
            </span>
          )}

          {/* Go Button - Inside input */}
          <button
            onClick={goTo3DDemo}
            disabled={!goal.trim() || goal.trim() === PREFIX.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-gray-400 rounded-full flex items-center justify-center disabled:opacity-40 hover:bg-gray-500 transition-colors"
          >
            <svg 
              className="w-6 h-6 translate-x-0.5" 
              viewBox="0 0 24 24" 
              fill="none"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 12h16M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

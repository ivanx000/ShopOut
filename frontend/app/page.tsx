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

  const placeholders = [
    "feel more settled in my apartment in Toronto",
    "get back into creative habits",
    "host the best dinner parties",
  ];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);

      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % placeholders.length);
        setFade(true);
      }, 500);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const goTo3DDemo = () => {
    if (goal.trim() === PREFIX.trim()) return;
    router.push(
      `/3d-demo?goal=${encodeURIComponent(goal.replace(PREFIX, ""))}`,
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
      <div className="flex mt-10 w-110 lg:w-200 relative">
        <div className="relative flex-1">
          <input
            type="text"
            value={goal}
            onChange={(e) => {
              if (!e.target.value.startsWith(PREFIX)) return;
              setGoal(e.target.value);
            }}
            onFocus={(e) => {
              setIsFocused(true);
              requestAnimationFrame(() => {
                e.target.selectionStart = e.target.selectionEnd =
                  e.target.value.length;
              });
            }}
            onBlur={() => setIsFocused(false)}
            className={`${inter.className} text-sm lg:text-lg w-full px-4 py-4 text-gray-400 rounded-lg border bg-gray-100 border-gray-300 focus:outline-none`}
          />

          {/* Animated suggestion (after prefix) */}
          {goal === PREFIX && !isFocused && (
            <span
              className={`absolute left-[7rem] top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none transition-opacity duration-500 ${
                fade ? "opacity-100" : "opacity-0"
              }`}
            >
              {placeholders[currentIndex]}
            </span>
          )}
        </div>

        {/* Go Button */}
        <button
          onClick={goTo3DDemo}
          disabled={goal.trim() === PREFIX.trim()}
          className="ml-2 lg:ml-5 w-15 lg:w-20 bg-gray-300 font-semibold text-gray-700 py-2 px-4 rounded-lg disabled:opacity-50 disabled:text-gray-600"
        >
          Go
        </button>
      </div>
    </div>
  );
}

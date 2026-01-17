"use client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function Home() {
  const [goal, setGoal] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const router = useRouter();
  const placeholders = [
    "to feel more settled in my apartment in Toronto",
    "to get back into creative habits",
    "to host the best dinner parties",
  ];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false); // start fade out

      setTimeout(() => {
        // switch to next placeholder
        setCurrentIndex((prev) => (prev + 1) % placeholders.length);
        setFade(true); // fade back in
      }, 500); // fade-out duration
    }, 3000); // total time before next placeholder

    return () => clearInterval(interval); // cleanup on unmount
  }, []);

  const goToLoadingPage = () => {
    if (goal.trim() === "") return; // extra safety
    router.push(`/loading_page?goal=${encodeURIComponent(goal)}`);
  };

  return (
    <>
      <div className="min-h-screen flex flex-col items-center justify-center mr-2 ml-2 relative">
        {/* Background Video (optional, add your <video> here) */}

        {/* Page Title */}
        <div className="text-7xl lg:text-8xl text-center text-gray-100">
          Shop for <br></br>Outcomes!
        </div>

        {/* Search Bar */}
        <div className="text-m flex mt-10 w-110 lg:w-200 relative">
          {/* Input wrapper */}
          <div className="relative flex-1">
            {/* Static prefix */}
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              I want…
            </span>

            {/* Input field */}
            <input
              type="text"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              className="text-sm lg:text-lg w-full pl-20 px-4 py-4 text-gray-400 rounded-lg border bg-gray-100 border-gray-300 focus:outline-none"
              placeholder=""
            />

            {/* Animated fading placeholder after static prefix */}
            {!goal && !isFocused && (
              <span
                className={`absolute left-20 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none transition-opacity duration-500 ${
                  fade ? "opacity-100" : "opacity-0"
                }`}
              >
                {placeholders[currentIndex]}
              </span>
            )}
          </div>

          {/* Go Button */}
          <button
            onClick={goToLoadingPage}
            disabled={goal.trim() === ""}
            className="ml-2 lg:ml-5 w-15 lg:w-20 bg-gray-300 text-gray-700 font-bold py-2 px-4 rounded-lg disabled:opacity-50 disabled:text-gray-600"
          >
            Go
          </button>
        </div>
      </div>
    </>
  );
}

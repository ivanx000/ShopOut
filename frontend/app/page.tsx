"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Home() {
  const [goal, setGoal] = useState("");
  const router = useRouter();

  const goToPromptResults = () => {
    if (goal.trim() === "") return; // extra safety
    router.push(`/prompt_results?goal=${encodeURIComponent(goal)}`);
  };

  return (
    <>
      <div className="min-h-screen flex flex-col items-center justify-center mr-2 ml-2">
        <div className="text-7xl lg:text-8xl text-center">
          What do you want to achieve?
        </div>

        <div className="flex mt-10">
          <input
            type="text"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="I just moved to Toronto and need to feel settled.."
            className="text-sm lg:text-lg w-100 lg:w-200 px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black"
          />

          <button
            onClick={goToPromptResults}
            disabled={goal.trim() === ""}
            className="w-15 lg:w-20 ml-2 lg:ml-5 bg-blue-500 text-white font-bold py-2 px-4 rounded-lg
            disabled:opacity-50"
          >
            Go
          </button>
        </div>
      </div>
    </>
  );
}

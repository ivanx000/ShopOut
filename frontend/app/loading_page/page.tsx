"use client";
import { Suspense, useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getRecommendations } from "@/lib/api";

function LoadingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const hasStartedFetch = useRef(false);
  const goal = searchParams.get("goal");

  useEffect(() => {
    // Prevent multiple fetches
    if (!goal || hasStartedFetch.current) {
      return;
    }

    hasStartedFetch.current = true;

    const fetchRecommendations = async () => {
      try {
        console.log("Fetching recommendations for:", goal);
        const data = await getRecommendations(goal);
        console.log("Received data:", data);

        // Verify data structure
        if (
          !data ||
          !data.vibe_analysis ||
          !data.products ||
          !Array.isArray(data.products)
        ) {
          console.error("Invalid data structure received:", data);
          setError("Invalid response format from server");
          return;
        }

        // Store results in localStorage to pass to results page
        localStorage.setItem("recommendations", JSON.stringify(data));
        localStorage.setItem("originalGoal", goal);

        // Verify it was stored
        const verify = localStorage.getItem("recommendations");
        console.log(
          "Data stored in localStorage, verification:",
          verify ? "success" : "failed",
        );
        console.log("Stored data preview:", verify?.substring(0, 100));

        // Small delay to ensure localStorage is written, then redirect
        setTimeout(() => {
          console.log("Redirecting to prompt_results");
          router.push("/prompt_results");
        }, 100);
      } catch (err) {
        console.error("Error fetching recommendations:", err);
        setError(
          err instanceof Error ? err.message : "Failed to get recommendations",
        );
      }
    };

    fetchRecommendations();
  }, [goal]); // Removed router from dependencies

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <div className="text-red-500 mb-4 text-4xl">Error: {error}</div>
        <button
          onClick={() => router.push("/")}
          className="mt-4 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="animate-pulse text-4xl text-gray-900">Loading recommendations...</div>
        <div className="mt-4 text-lg text-gray-600">Analyzing your vibe...</div>
      </div>
    </div>
  );
}

export default function LoadingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-pulse text-4xl text-gray-900">Loading...</div>
      </div>
    }>
      <LoadingPageContent />
    </Suspense>
  );
}

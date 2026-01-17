"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { RecommendationResponse, SearchProduct } from "@/lib/api";

export default function PromptResults() {
  const router = useRouter();
  const [data, setData] = useState<RecommendationResponse | null>(null);
  const [goal, setGoal] = useState<string>("");
  const [loadingProducts, setLoadingProducts] = useState<
    Record<number, boolean>
  >({});

  useEffect(() => {
    // Small delay to ensure localStorage is available (in case of race condition)
    const timer = setTimeout(() => {
      // Get data from localStorage
      const storedData = localStorage.getItem("recommendations");
      const storedGoal = localStorage.getItem("originalGoal");

      console.log(
        "Suggested products page - storedData:",
        storedData ? "exists" : "missing",
      );
      console.log("Suggested products page - storedGoal:", storedGoal);
      if (storedData) {
        console.log("Stored data preview:", storedData.substring(0, 200));
      }

      if (!storedData || !storedGoal) {
        console.log("No data found in localStorage, redirecting to home");
        router.push("/");
        return;
      }

      try {
        const parsedData = JSON.parse(storedData);
        console.log("Parsed data:", parsedData);

        // Validate data structure
        if (
          !parsedData.vibe_analysis ||
          !parsedData.products ||
          !Array.isArray(parsedData.products)
        ) {
          console.error("Invalid data structure:", parsedData);
          router.push("/");
          return;
        }

        setData(parsedData);
        setGoal(storedGoal);

        // Clean up localStorage after reading
        localStorage.removeItem("recommendations");
        localStorage.removeItem("originalGoal");
      } catch (err) {
        console.error("Error parsing stored data:", err);
        router.push("/");
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [router]);

  const handleViewProducts = (index: number, productName: string) => {
    if (!productName) return; // extra safety
    router.push(
      `/suggested_products?index=${index}&productName=${encodeURIComponent(productName)}`,
    );
  };

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center text-4xl">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.push("/")}
          className="mb-6 text-blue-500 hover:text-blue-700 underline"
        >
          ← Back to Home
        </button>

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Your Recommendations</h1>
          <p className="text-lg text-gray-600 mb-2">
            <span className="font-semibold">Your goal:</span> {goal}
          </p>
          <p className="text-lg text-gray-700">{data.vibe_analysis}</p>
        </div>

        <div className="space-y-6">
          <h2 className="text-3xl font-semibold mb-4">Suggested Products</h2>
          {data.products.map((product, index) => {
            // Random delay between 0 and 1.5 seconds
            const delay = (Math.random() * 4.5).toFixed(2) + "s";

            return (
              <div
                key={index}
                className="bob border border-gray-200 bg-gray-100 rounded-lg p-6 hover:shadow-lg transition-shadow"
                style={{ animationDelay: delay }}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-2xl font-bold">{product.name}</h3>
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    {product.category}
                  </span>
                </div>
                <p className="text-gray-600 mt-2 mb-4">{product.reason}</p>

                <button
                  onClick={() => handleViewProducts(index, product.name)}
                  disabled={loadingProducts[index]}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Browse {product.name + "s"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

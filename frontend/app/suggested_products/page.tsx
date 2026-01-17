"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RecommendationResponse, SearchProduct } from "@/lib/api";

interface Props {
  params: {
    index: string;
    productName: string;
  };
}

export default function SuggestionsPage({ params }: Props) {
  const index = Number(params.index);
  const productName = params.productName;
  const router = useRouter();
  const [data, setData] = useState<RecommendationResponse | null>(null);
  const [expandedProduct, setExpandedProduct] = useState<number | null>(null);
  const [searchResults, setSearchResults] = useState<
    Record<number, SearchProduct[]>
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

  const handleViewProducts = async (index: number, productName: string) => {
    // If already expanded, collapse it
    if (expandedProduct === index) {
      setExpandedProduct(null);
      return;
    }

    // If we already have results for this product, just expand
    if (searchResults[index]) {
      setExpandedProduct(index);
      return;
    }

    // Otherwise, fetch products
    setLoadingProducts((prev) => ({ ...prev, [index]: true }));
    setExpandedProduct(index);

    try {
      const results = await searchProducts(productName, 10);
      setSearchResults((prev) => ({ ...prev, [index]: results.products }));
    } catch (error) {
      console.error("Error searching products:", error);
      setSearchResults((prev) => ({ ...prev, [index]: [] }));
    } finally {
      setLoadingProducts((prev) => ({ ...prev, [index]: false }));
    }
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
        {/* Show actual products */}
        {expandedProduct === index && searchResults[index] && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="text-xl font-semibold mb-3">
              Found {searchResults[index].length} products for "{productName}"
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {searchResults[index].map((item, itemIndex) => (
                <div
                  key={itemIndex}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-48 object-cover rounded mb-2"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  )}
                  <h5 className="font-semibold text-lg mb-1 line-clamp-2">
                    {item.title}
                  </h5>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xl font-bold text-green-600">
                      ${item.price.toFixed(2)} {item.currency}
                    </span>
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                      {item.platform}
                    </span>
                  </div>
                  {item.rating && (
                    <p className="text-sm text-gray-600 mb-2">
                      ⭐ {item.rating}
                    </p>
                  )}
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-700 underline text-sm"
                  >
                    View on {item.platform} →
                  </a>
                </div>
              ))}
            </div>
            {searchResults[index].length === 0 && (
              <p className="text-gray-500 text-center py-4">
                No products found. Try a different search term.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

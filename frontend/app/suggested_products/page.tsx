"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RecommendationResponse, searchProducts, SearchProduct } from "@/lib/api";

export default function SuggestionsPage() {
  const router = useRouter();
  const [data, setData] = useState<RecommendationResponse | null>(null);
  const [goal, setGoal] = useState<string>("");
  const [expandedProduct, setExpandedProduct] = useState<number | null>(null);
  const [searchResults, setSearchResults] = useState<Record<number, SearchProduct[]>>({});
  const [loadingProducts, setLoadingProducts] = useState<Record<number, boolean>>({});

  useEffect(() => {
    // Small delay to ensure localStorage is available (in case of race condition)
    const timer = setTimeout(() => {
      // Get data from localStorage
      const storedData = localStorage.getItem("recommendations");
      const storedGoal = localStorage.getItem("originalGoal");

      console.log("Suggested products page - storedData:", storedData ? "exists" : "missing");
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
        if (!parsedData.vibe_analysis || !parsedData.products || !Array.isArray(parsedData.products)) {
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
    setLoadingProducts(prev => ({ ...prev, [index]: true }));
    setExpandedProduct(index);

    try {
      const results = await searchProducts(productName, 10);
      setSearchResults(prev => ({ ...prev, [index]: results.products }));
    } catch (error) {
      console.error("Error searching products:", error);
      setSearchResults(prev => ({ ...prev, [index]: [] }));
    } finally {
      setLoadingProducts(prev => ({ ...prev, [index]: false }));
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

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Your Recommendations</h1>
          <p className="text-lg text-gray-600 mb-2">
            <span className="font-semibold">Your goal:</span> {goal}
          </p>
          <p className="text-lg text-gray-700">{data.vibe_analysis}</p>
        </div>

        <div className="space-y-6">
          <h2 className="text-3xl font-semibold mb-4">Suggested Products</h2>
          {data.products.map((product, index) => (
            <div
              key={index}
              className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-2xl font-bold">{product.name}</h3>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                  {product.category}
                </span>
              </div>
              <p className="text-gray-600 mt-2 mb-4">{product.reason}</p>
              
              {/* Button to view actual products */}
              <button
                onClick={() => handleViewProducts(index, product.name)}
                disabled={loadingProducts[index]}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingProducts[index] ? "Searching..." : expandedProduct === index ? "Hide Products" : "View Products"}
              </button>

              {/* Show actual products when expanded */}
              {expandedProduct === index && searchResults[index] && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="text-xl font-semibold mb-3">
                    Found {searchResults[index].length} products for "{product.name}"
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
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        )}
                        <h5 className="font-semibold text-lg mb-1 line-clamp-2">{item.title}</h5>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xl font-bold text-green-600">
                            ${item.price.toFixed(2)} {item.currency}
                          </span>
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                            {item.platform}
                          </span>
                        </div>
                        {item.rating && (
                          <p className="text-sm text-gray-600 mb-2">⭐ {item.rating}</p>
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
          ))}
        </div>
      </div>
    </div>
  );
}

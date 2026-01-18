"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { RecommendationResponse, searchProducts, SearchProduct, getRecommendations } from "@/lib/api";
import Product3DModel from "@/components/3d/Product3DModel";
import { Rock_Salt } from "next/font/google";

const rockSalt = Rock_Salt({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

// Product 3D Component
function Product3D({ 
  position, 
  productName,
  productReason,
  isSelected, 
  onClick,
  color,
  modelFile,
  scale,
  offset
}: { 
  position: [number, number, number];
  productName: string;
  productReason: string;
  isSelected: boolean;
  onClick: () => void;
  color: string;
  modelFile: string;
  scale?: number;
  offset?: [number, number, number];
}) {
  return (
    <group position={position} onClick={onClick}>
      <Product3DModel 
        position={[0, 0, 0]} 
        color={color}
        modelFile={modelFile}
        scale={scale}
        offset={offset}
        isSelected={isSelected}
      />
    </group>
  );
}

// 3D Scene Component
function Scene({ 
  products, 
  selectedIndex, 
  onProductClick 
}: { 
  products: { name: string; reason: string; category: string }[];
  selectedIndex: number | null;
  onProductClick: (index: number) => void;
}) {
  // Safety check
  if (!products || products.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-2xl text-gray-600">No products available</div>
      </div>
    );
  }

  // Scattered positions for models (same z-depth for consistency)
  const positions: [number, number, number][] = [
    [-9, 1.5, 0],
    [5, -3, 0],
    [-1.5, 4.5, 0],
    [8, 2.5, 0],
    [-4, -2.365, 0],
  ];

  const colors = ["#ffffff", "#ffffff", "#ffffff", "#ffffff", "#ffffff"];
  
  // Map product names to their model files
  const modelFiles = ["candle.obj", "diffuser.obj", "journal.obj", "pillow.obj", "tea.obj"];
  
  // Adjust scales for each model - larger fixed sizes
  const scales = [0.020, 0.013, 0.016, 0.0055, 0.013]; // candle, diffuser, journal, pillow, tea  
  // Adjust offsets to center rotation for each model [x, y, z]
  const offsets: [number, number, number][] = [
    [0, 0, 0],     // candle
    [0, 0, 0],     // diffuser
    [0, 0, 0],     // journal
    [0, 0, 0],     // pillow
    [0, 0, 0],     // tea
  ];
  return (
    <Canvas 
      key={`canvas-${selectedIndex}`}
      camera={{ position: selectedIndex !== null ? [0, 0, 6] : [0, 0, 14], fov: selectedIndex !== null ? 50 : 50 }}
      gl={{ alpha: true }}
      style={{ background: 'transparent' }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <pointLight position={[-10, -10, -5]} intensity={0.5} />
      
      {products.slice(0, 5).map((product, index) => {
        // Always render all boxes, but position selected one in center
        const isSelected = selectedIndex === index;
        const position: [number, number, number] = isSelected 
          ? [0, 0, 0]  // Center position when selected
          : selectedIndex !== null 
            ? [10, 10, 10] // Hide other boxes far away when one is selected
            : positions[index]; // Scattered position when nothing selected
        
        return (
          <Product3D
            key={index}
            position={position}
            productName={product.name}
            productReason={product.reason}
            isSelected={isSelected}
            onClick={() => onProductClick(index)}
            color={colors[index % colors.length]}
            modelFile={modelFiles[index]}
            scale={scales[index]}
            offset={offsets[index]}
          />
        );
      })}
      
      <OrbitControls enablePan={false} enableZoom={false} enableRotate={false} />
    </Canvas>
  );
}

function ThreeDDemoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const goal = searchParams.get("goal");
  
  const [data, setData] = useState<RecommendationResponse | null>(null);
  const [selectedProductIndex, setSelectedProductIndex] = useState<number | null>(null);
  const [searchResults, setSearchResults] = useState<SearchProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedProductDetail, setSelectedProductDetail] = useState<SearchProduct | null>(null);
  const [shownProductUrls, setShownProductUrls] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!goal) {
      router.push("/");
      return;
    }

    const fetchRecommendations = async () => {
      try {
        const result = await getRecommendations(goal);
        setData(result);
      } catch (error) {
        console.error("Error fetching recommendations:", error);
        router.push("/");
      }
    };

    fetchRecommendations();
  }, [goal, router]);

  const handleProductClick = async (index: number) => {
    if (selectedProductIndex === index) {
      setSelectedProductIndex(null);
      setSearchResults([]);
      return;
    }

    setSelectedProductIndex(index);
    setLoadingProducts(true);

    if (data && data.products[index]) {
      try {
        const results = await searchProducts(data.products[index].name, 6);
        setSearchResults(results.products);
        // Track shown product URLs
        const urls = results.products.map(p => p.url);
        setShownProductUrls(prev => new Set([...Array.from(prev), ...urls]));
      } catch (error) {
        console.error("Error searching products:", error);
        setSearchResults([]);
      } finally {
        setLoadingProducts(false);
      }
    }
  };

  const handleRefresh = async () => {
    if (selectedProductIndex === null || !data || isRefreshing) return;
    
    setIsRefreshing(true);
    setLoadingProducts(true);
    setSearchResults([]);
    setSelectedProductDetail(null);
    
    try {
      const productName = data.products[selectedProductIndex].name;
      
      // Keep calling API until we get products we haven't shown
      let attempts = 0;
      const maxAttempts = 5;
      let newProducts: SearchProduct[] = [];
      
      while (attempts < maxAttempts) {
        const results = await searchProducts(productName, 12); // Request more to filter
        
        // Filter out already shown products
        const unseenProducts = results.products.filter(
          p => !shownProductUrls.has(p.url)
        );
        
        if (unseenProducts.length >= 6) {
          newProducts = unseenProducts.slice(0, 6);
          break;
        } else if (unseenProducts.length > 0) {
          newProducts = unseenProducts;
          break;
        }
        
        attempts++;
      }
      
      if (newProducts.length > 0) {
        setSearchResults(newProducts);
        // Track new product URLs
        const urls = newProducts.map(p => p.url);
        setShownProductUrls(prev => new Set([...Array.from(prev), ...urls]));
      } else {
        // If we couldn't get new products, just refresh anyway
        const results = await searchProducts(productName, 6);
        setSearchResults(results.products);
        const urls = results.products.map(p => p.url);
        setShownProductUrls(prev => new Set([...Array.from(prev), ...urls]));
      }
    } catch (error) {
      console.error("Error refreshing products:", error);
    } finally {
      setIsRefreshing(false);
      setLoadingProducts(false);
    }
  };

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className={`${rockSalt.className} text-2xl text-white`}>Loading recommendations...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Header - Only show when no product is selected */}
      {selectedProductIndex === null && (
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 bg-white hover:bg-gray-100 rounded-lg text-gray-500"
          >
            ← Back to Home
          </button>
        </div>
      )}

      {/* Main Content - Window Layout */}
      <div className="h-screen flex items-center justify-center p-8">
        <div className={`w-full max-w-7xl h-full transition-all duration-300 ${selectedProductIndex !== null ? 'border-2 border-gray-200 rounded-2xl shadow-xl bg-white/80 backdrop-blur-sm' : 'border-0'} overflow-hidden`}>
          <div className="flex h-full">
            {/* Left Side - 3D Scene or Product Detail */}
            <div className={`transition-all duration-500 ${selectedProductIndex !== null ? 'w-1/3 border-r-2 border-gray-200' : 'w-full'} bg-transparent`}>
              {selectedProductDetail ? (
                // Product Detail View
                <div className="h-full flex items-center justify-center p-4 relative bg-transparent">
                  <button
                    onClick={() => setSelectedProductDetail(null)}
                    className="absolute top-4 right-4 text-gray-500 bg-white hover:bg-gray-100 text-xl font-bold w-10 h-10 flex items-center justify-center rounded-full shadow-lg transition-all hover:scale-110 z-10"
                  >
                    ✕
                  </button>
                  
                  <div className="flex flex-col items-center w-full h-full justify-center px-12 py-8">
                    {selectedProductDetail.image && (
                      <img
                        src={selectedProductDetail.image}
                        alt={selectedProductDetail.title}
                        className="w-full max-h-[45%] object-contain rounded-lg mb-6"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}
                    <h2 className={`${rockSalt.className} font-bold text-xl mb-4 text-gray-500 text-center line-clamp-2`}>{selectedProductDetail.title}</h2>
                    <p style={{ color: '#3A7E8B' }} className="font-bold text-4xl mb-6">
                      ${selectedProductDetail.price.toFixed(2)}
                    </p>
                    
                    <div className="space-y-2 mb-4 w-full">
                      {selectedProductDetail.platform && (
                        <p className="text-gray-400 text-base text-center">
                          <span className="font-medium">Platform:</span> {selectedProductDetail.platform}
                        </p>
                      )}
                      {selectedProductDetail.rating && (
                        <div className="flex items-center justify-center gap-2 text-base">
                          <span className="text-gray-400 font-medium">Rating: {selectedProductDetail.rating}</span>
                          <span className="flex items-center text-xl">
                            {(() => {
                              const ratingNum = parseFloat(selectedProductDetail.rating);
                              const stars = [];
                              for (let i = 1; i <= 5; i++) {
                                stars.push(
                                  <span key={i} className={i <= Math.floor(ratingNum) ? "text-yellow-500" : "text-gray-300"}>
                                    ★
                                  </span>
                                );
                              }
                              return stars;
                            })()}
                          </span>
                        </div>
                      )}
                      {selectedProductDetail.condition && (
                        <p className="text-gray-400 text-base text-center">
                          <span className="font-medium">Condition:</span> {selectedProductDetail.condition}
                        </p>
                      )}
                    </div>
                    
                    <a
                      href={selectedProductDetail.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full max-w-sm text-center px-6 py-3 bg-white hover:bg-gray-100 text-gray-500 rounded-lg font-semibold transition-colors text-base border border-gray-200"
                    >
                      View Product →
                    </a>
                  </div>
                </div>
              ) : (
                // 3D Scene - Only render when no product detail is shown
                <div className="h-full relative">
                  {!selectedProductDetail && (
                    <>
                      <Suspense fallback={
                        <div className="h-full flex items-center justify-center">
                          <div className={`${rockSalt.className} text-2xl text-white`}>Loading 3D scene...</div>
                        </div>
                      }>
                        <Scene
                          products={data.products}
                          selectedIndex={selectedProductIndex}
                          onProductClick={handleProductClick}
                        />
                      </Suspense>
                      
                      {/* 2D Text Overlays - Only show when no product is selected */}
                      {selectedProductIndex === null && data.products.slice(0, 5).map((product, index) => {
                        // Map 3D positions to 2D screen positions - positioned below models
                        const textPositions = [
                          { left: '15%', top: '52%' },  // candle: [-9, 1.5]
                          { left: '68%', top: '85%' },  // diffuser: moved right
                          { left: '47%', top: '27%' },  // journal: [-1.5, 4.5] - moved up and right
                          { left: '80%', top: '43%' },  // pillow: [8, 2.5] - moved up and left
                          { left: '35%', top: '82%' },  // tea: [-4, -1.5]
                        ];
                        
                        return (
                          <div
                            key={index}
                            className="absolute pointer-events-none text-center"
                            style={{
                              left: textPositions[index].left,
                              top: textPositions[index].top,
                              transform: 'translate(-50%, 0)',
                            }}
                          >
                            <div className={`${rockSalt.className} text-white text-base font-bold mb-1 drop-shadow-lg`}>
                              {product.name}
                            </div>
                            <div className="text-white text-base drop-shadow-lg max-w-[180px]">
                              {product.reason}
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Right Side - Product Grid (Horizontal) */}
            {selectedProductIndex !== null && (
              <div className="w-2/3 bg-transparent p-6 flex flex-col h-full">
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`${rockSalt.className} text-xl font-bold text-gray-500`}>
                    {data.products[selectedProductIndex].name}
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={handleRefresh}
                      disabled={isRefreshing}
                      className="w-10 h-10 bg-white hover:bg-gray-100 rounded-lg text-gray-500 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      title="Refresh products"
                    >
                      <svg 
                        className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`}
                        viewBox="0 0 24 24" 
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                      </svg>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedProductIndex(null);
                        setSearchResults([]);
                        setSelectedProductDetail(null);
                      }}
                      className="px-4 py-2 bg-white hover:bg-gray-100 rounded-lg text-gray-500 font-medium"
                    >
                      ← Back
                    </button>
                  </div>
                </div>
                
                {loadingProducts ? (
                  <div className="flex items-center justify-center flex-1">
                    <div className="text-xl text-gray-500">Searching for products...</div>
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="grid grid-cols-3 gap-3 h-full">
                    {searchResults.map((product, index) => (
                      selectedProductDetail?.url === product.url ? (
                        // Placeholder for selected product
                        <div
                          key={index}
                          className="bg-white rounded-lg p-3 border-2 border-gray-200 border-dashed flex items-center justify-center"
                        >
                          <p className="text-gray-400 text-xs text-center">Viewing</p>
                        </div>
                      ) : (
                        <div
                          key={index}
                          onClick={() => setSelectedProductDetail(product)}
                          className="bg-gray-50 rounded-lg p-3 cursor-pointer hover:shadow-lg hover:scale-105 transition-all border border-gray-200 flex flex-col h-full"
                        >
                          {product.image && (
                            <img
                              src={product.image}
                              alt={product.title}
                              className="w-full h-32 object-cover rounded-lg mb-2"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          )}
                          <h4 className="font-semibold text-xs mb-2 line-clamp-2 text-gray-600 flex-1">{product.title}</h4>
                          <p style={{ color: '#3A7E8B' }} className="font-bold text-sm">
                            ${product.price.toFixed(2)}
                          </p>
                        </div>
                      )
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center flex-1">
                    <p className="text-gray-400">No products found</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ThreeDDemo() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className={`${rockSalt.className} text-2xl text-white`}>Loading...</div>
      </div>
    }>
      <ThreeDDemoContent />
    </Suspense>
  );
}

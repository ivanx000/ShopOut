"use client";
import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import dynamic from "next/dynamic";

// Dynamically import to avoid SSR issues with Three.js
const CottageModel = dynamic(() => import("../../components/3d/CottageModel"), {
  ssr: false,
});

const cottages = [
  { color: "#8B7355", name: "Brown Cottage", model: "cottage_obj.obj" as const },
  { color: "#D2691E", name: "Orange Cottage", model: "cottage_obj2.obj" as const },
  { color: "#A0522D", name: "Sienna Cottage", model: "cottage_obj.obj" as const },
  { color: "#CD853F", name: "Peru Cottage", model: "cottage_obj2.obj" as const },
  { color: "#DEB887", name: "Tan Cottage", model: "cottage_obj.obj" as const },
];

function CottageCanvas({ color, name, model }: { color: string; name: string; model: "cottage_obj.obj" | "cottage_obj2.obj" }) {
  return (
    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-2xl overflow-hidden">
      <Suspense fallback={
        <div className="h-[300px] flex items-center justify-center">
          <p className="text-white">Loading {name}...</p>
        </div>
      }>
        <Canvas style={{ height: "300px", width: "100%" }}>
          <PerspectiveCamera makeDefault position={[5, 2, 5]} />
          <ambientLight intensity={0.6} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <pointLight position={[-10, -10, -5]} intensity={0.5} />
          <spotLight position={[0, 10, 0]} intensity={0.8} />
          
          <CottageModel color={color} position={[0, 0, 0]} modelFile={model} />
        </Canvas>
      </Suspense>
      <div className="bg-gray-900 text-white text-center py-2 font-semibold">
        {name}
      </div>
    </div>
  );
}

export default function ThreeDDemo() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-gray-950">
      <h1 className="text-5xl font-bold mb-4 text-white">Cottage Collection</h1>
      <p className="text-gray-400 mb-8 text-center max-w-2xl">
        5 cottage models - hover to enlarge, click to log to console (F12), drag to rotate each cottage
      </p>
      
      {/* Olympic ring arrangement: 3 top, 2 bottom */}
      <div className="w-full max-w-7xl space-y-6">
        {/* Top row - 3 Cottages */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {cottages.slice(0, 3).map((cottage, index) => (
            <CottageCanvas key={index} color={cottage.color} name={cottage.name} model={cottage.model} />
          ))}
        </div>
        
        {/* Bottom row - 2 Cottages centered */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {cottages.slice(3, 5).map((cottage, index) => (
            <CottageCanvas key={index + 3} color={cottage.color} name={cottage.name} model={cottage.model} />
          ))}
        </div>
      </div>

      <div className="mt-8 text-center text-gray-400 text-sm">
        <p>💡 Hover over cottages to see them grow</p>
        <p>🖱️ Click cottages to log info to console</p>
        <p>🎮 Drag to rotate each cottage independently • Scroll to zoom</p>
      </div>
    </div>
  );
}

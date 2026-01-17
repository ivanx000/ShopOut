"use client";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import InteractiveMesh from "./InteractiveMesh";

export default function Scene3D() {
  // Arranged like Olympic rings - 3 on top, 2 on bottom
  const meshes = [
    { position: [-3, 1, 0] as [number, number, number], color: "#4a90e2", shape: "box" as const },
    { position: [0, 1, 0] as [number, number, number], color: "#e94b3c", shape: "sphere" as const },
    { position: [3, 1, 0] as [number, number, number], color: "#50c878", shape: "torus" as const },
    { position: [-1.5, -1, 0] as [number, number, number], color: "#f39c12", shape: "cone" as const },
    { position: [1.5, -1, 0] as [number, number, number], color: "#9b59b6", shape: "octahedron" as const },
  ];

  return (
    <Canvas style={{ height: "500px", width: "100%" }}>
      <PerspectiveCamera makeDefault position={[0, 0, 8]} />
      
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <pointLight position={[-10, -10, -5]} intensity={0.5} />
      
      {/* Interactive meshes */}
      {meshes.map((mesh, index) => (
        <InteractiveMesh
          key={index}
          position={mesh.position}
          color={mesh.color}
          shape={mesh.shape}
        />
      ))}
      
      {/* Controls for rotating the camera */}
      <OrbitControls enableZoom={true} enablePan={true} />
    </Canvas>
  );
}

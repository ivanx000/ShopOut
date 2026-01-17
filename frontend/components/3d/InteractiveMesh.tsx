"use client";
import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Mesh } from "three";

interface InteractiveMeshProps {
  position: [number, number, number];
  color: string;
  shape: "box" | "sphere" | "torus" | "cone" | "octahedron";
}

export default function InteractiveMesh({ position, color, shape }: InteractiveMeshProps) {
  const meshRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [clicked, setClicked] = useState(false);

  // Rotate on each frame
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.5;
      meshRef.current.rotation.y += delta * 0.3;
      
      // Bounce effect when clicked
      if (clicked) {
        meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 3) * 0.3;
      }
    }
  });

  const renderGeometry = () => {
    switch (shape) {
      case "box":
        return <boxGeometry args={[1, 1, 1]} />;
      case "sphere":
        return <sphereGeometry args={[0.6, 32, 32]} />;
      case "torus":
        return <torusGeometry args={[0.5, 0.2, 16, 32]} />;
      case "cone":
        return <coneGeometry args={[0.6, 1.2, 32]} />;
      case "octahedron":
        return <octahedronGeometry args={[0.7]} />;
      default:
        return <boxGeometry args={[1, 1, 1]} />;
    }
  };

  return (
    <mesh
      ref={meshRef}
      position={position}
      scale={hovered ? 1.2 : 1}
      onClick={() => setClicked(!clicked)}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {renderGeometry()}
      <meshStandardMaterial 
        color={hovered ? "#ff6b6b" : color} 
        roughness={0.3}
        metalness={0.8}
      />
    </mesh>
  );
}

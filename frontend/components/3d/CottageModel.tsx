"use client";
import { useRef, useState, useEffect } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import * as THREE from "three";

interface CottageModelProps {
  position?: [number, number, number];
  color: string;
  modelFile: "cottage_obj.obj" | "cottage_obj2.obj";
}

export default function CottageModel({ 
  position = [0, 0, 0], 
  color,
  modelFile
}: CottageModelProps) {
  const groupRef = useRef<any>(null);
  const [hovered, setHovered] = useState(false);
  
  const obj = useLoader(OBJLoader, `/models/${modelFile}`);

  // Auto-rotate the cottage
  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.3;
    }
  });

  useEffect(() => {
    if (obj && groupRef.current) {
      groupRef.current.traverse((child: any) => {
        if (child.isMesh) {
          child.material = new THREE.MeshStandardMaterial({
            color: color,
            metalness: 0.6,
            roughness: 0.4,
          });
        }
      });
    }
  }, [obj, color]);

  const handleClick = () => {
    console.log("Cottage clicked!", { color, position, modelFile });
  };

  return (
    <group
      ref={groupRef}
      position={position}
      scale={hovered ? 1.15 : 1}
      onClick={handleClick}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <primitive object={obj} />
    </group>
  );
}

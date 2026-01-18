"use client";
import { useRef, useState, useEffect, useMemo } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import * as THREE from "three";

interface CandleModelProps {
  position?: [number, number, number];
  color: string;
}

export default function CandleModel({ 
  position = [0, 0, 0], 
  color
}: CandleModelProps) {
  const groupRef = useRef<any>(null);
  const [hovered, setHovered] = useState(false);
  
  const obj = useLoader(OBJLoader, `/models/candle.obj`);
  
  // Clone the object for each instance
  const clonedObj = useMemo(() => obj.clone(), [obj]);

  // Auto-rotate the candle
  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.3;
    }
  });

  useEffect(() => {
    if (clonedObj && groupRef.current) {
      groupRef.current.traverse((child: any) => {
        if (child.isMesh) {
          // Compute normals for proper lighting
          if (child.geometry) {
            child.geometry.computeVertexNormals();
          }
          
          child.material = new THREE.MeshStandardMaterial({
            color: color,
            metalness: 0.3,
            roughness: 0.7,
            flatShading: false,
          });
          
          // Ensure the material receives shadows and casts shadows
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
    }
  }, [clonedObj, color]);

  const handleClick = () => {
    console.log("Candle clicked!", { color, position });
  };

  return (
    <group
      ref={groupRef}
      position={position}
      scale={hovered ? 0.018 : 0.015}
      onClick={handleClick}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <primitive object={clonedObj} />
    </group>
  );
}

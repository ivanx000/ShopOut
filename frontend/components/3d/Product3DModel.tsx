"use client";
import { useRef, useState, useEffect, useMemo } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import * as THREE from "three";

interface Product3DModelProps {
  position?: [number, number, number];
  color: string;
  modelFile: string; // e.g., "candle.obj", "diffuser.obj", etc.
  scale?: number;
  offset?: [number, number, number]; // Offset to adjust rotation center
  isSelected?: boolean; // Freeze rotation when selected
}

export default function Product3DModel({ 
  position = [0, 0, 0], 
  color,
  modelFile,
  scale = 0.015,
  offset = [0, 0, 0],
  isSelected = false
}: Product3DModelProps) {
  const groupRef = useRef<any>(null);
  const [hovered, setHovered] = useState(false);
  
  const obj = useLoader(OBJLoader, `/models/${modelFile}`);
  
  // Clone the object for each instance
  const clonedObj = useMemo(() => obj.clone(), [obj]);
  
  // Random starting rotation
  const initialRotation = useMemo(() => [
    Math.random() * Math.PI * 2,
    Math.random() * Math.PI * 2,
    Math.random() * Math.PI * 2
  ], []);

  // Consistent frozen rotation for panel view
  const frozenRotation = useMemo(() => [
    Math.PI * 0.15,  // Slight tilt on x-axis
    Math.PI * 0.25,  // Nice angle on y-axis
    0                // No z-axis rotation
  ], []);

  // Auto-rotate the model freely on all axes (unless selected)
  useFrame((state, delta) => {
    if (groupRef.current && !isSelected) {
      groupRef.current.rotation.x += delta * 0.2;
      groupRef.current.rotation.y += delta * 0.3;
      groupRef.current.rotation.z += delta * 0.15;
    }
  });

  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.rotation.x = initialRotation[0];
      groupRef.current.rotation.y = initialRotation[1];
      groupRef.current.rotation.z = initialRotation[2];
    }
  }, [initialRotation]);

  // Set consistent rotation when selected
  useEffect(() => {
    if (groupRef.current && isSelected) {
      groupRef.current.rotation.x = frozenRotation[0];
      groupRef.current.rotation.y = frozenRotation[1];
      groupRef.current.rotation.z = frozenRotation[2];
    }
  }, [isSelected, frozenRotation]);

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
    console.log("Product clicked!", { color, position, modelFile });
  };

  return (
    <group
      ref={groupRef}
      position={position}
      scale={scale}
      onClick={handleClick}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <primitive object={clonedObj} position={offset} />
    </group>
  );
}

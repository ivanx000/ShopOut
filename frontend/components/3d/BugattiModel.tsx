"use client";
import { useRef, useState, useEffect } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import * as THREE from "three";

interface BugattiModelProps {
  position?: [number, number, number];
  color: string;
  rotationSpeed?: number;
}

export default function BugattiModel({ 
  position = [0, 0, 0], 
  color,
  rotationSpeed = 0.5 
}: BugattiModelProps) {
  const groupRef = useRef<any>(null);
  const [hovered, setHovered] = useState(false);
  const [clicked, setClicked] = useState(false);
  
  const obj = useLoader(OBJLoader, "/models/bugatti.obj");

  // Rotate on each frame
  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * rotationSpeed;

      // Bounce effect when clicked
      if (clicked) {
        groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 3) * 0.3;
      }
    }
  });

  useEffect(() => {
    if (obj && groupRef.current) {
      groupRef.current.traverse((child: any) => {
        if (child.isMesh) {
          child.material = new THREE.MeshStandardMaterial({
            color: hovered ? "#ff6b6b" : color,
            metalness: 0.8,
            roughness: 0.3,
          });
        }
      });
    }
  }, [obj, color, hovered]);

  return (
    <group
      ref={groupRef}
      position={position}
      scale={hovered ? 1.2 : 1}
      onClick={() => setClicked(!clicked)}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <primitive object={obj} />
    </group>
  );
}

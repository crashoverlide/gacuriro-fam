import React, { useRef, useMemo, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Points, PointMaterial } from "@react-three/drei";
import * as THREE from "three";

function PinkParticles({ count = 2200 }) {
  const ref = useRef();
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 14;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 16;
    }
    return pos;
  }, [count]);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.getElapsedTime() * 0.07;
    ref.current.rotation.x = Math.sin(t * 0.35) * 0.12;
    ref.current.rotation.y = t * 0.1;
  });

  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color="#ff4d9e"
        size={0.032}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        opacity={0.9}
      />
    </Points>
  );
}

function SoftOrbs() {
  const group = useRef();
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (!group.current) return;
    group.current.rotation.y = t * 0.04;
    group.current.children.forEach((child, i) => {
      child.position.y = Math.sin(t * 0.5 + i * 1.2) * 0.45;
    });
  });

  return (
    <group ref={group}>
      <mesh position={[-3.2, 1.1, -4]}>
        <sphereGeometry args={[1.4, 32, 32]} />
        <meshBasicMaterial color="#7c3aed" transparent opacity={0.18} />
      </mesh>
      <mesh position={[3.4, -0.6, -5]}>
        <sphereGeometry args={[1.8, 32, 32]} />
        <meshBasicMaterial color="#ff2d8a" transparent opacity={0.14} />
      </mesh>
      <mesh position={[0.2, 2.2, -6]}>
        <sphereGeometry args={[1.1, 32, 32]} />
        <meshBasicMaterial color="#4f46e5" transparent opacity={0.12} />
      </mesh>
    </group>
  );
}

export default function CinematicBackground() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        background:
          "radial-gradient(ellipse at 50% 30%, #1a0a2e 0%, #0a0a0a 55%, #000 100%)",
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 6], fov: 55 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        style={{ width: "100%", height: "100%" }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.4} />
          <SoftOrbs />
          <PinkParticles />
        </Suspense>
      </Canvas>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.55) 100%)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
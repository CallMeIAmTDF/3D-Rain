"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import FallingSentence from "@/app/components/FallingSentence";
import MeteorShower from "@/app/components/MeteorShower";

interface SceneProps {}

const sentences: string[] = [
    "Đặng Xuân Thái",
    "IAmTDF",
    "CallMeIAmTDF",
    "TDSoBad",
    "Đặng Xuân Thái",
    "IAmTDF",
    "CallMeIAmTDF",
    "TDSoBad",
];

export default function Scene({}: SceneProps) {
    const canvasRef = useRef<HTMLDivElement>(null);
    const [contextLost, setContextLost] = useState<boolean>(false);
    const [retryCount, setRetryCount] = useState<number>(0);

    useEffect(() => {
        const handleContextLost = (event: Event): void => {
            console.warn('WebGL context lost, attempting recovery...');
            event.preventDefault();
            setContextLost(true);
        };

        const handleContextRestored = (): void => {
            console.log('WebGL context restored successfully');
            setContextLost(false);
            setRetryCount(0);
        };

        const canvas = canvasRef.current?.querySelector('canvas');
        if (canvas) {
            canvas.addEventListener('webglcontextlost', handleContextLost);
            canvas.addEventListener('webglcontextrestored', handleContextRestored);
        }

        return () => {
            if (canvas) {
                canvas.removeEventListener('webglcontextlost', handleContextLost);
                canvas.removeEventListener('webglcontextrestored', handleContextRestored);
            }
        };
    }, []);

    // Auto retry mechanism
    useEffect(() => {
        if (contextLost && retryCount < 3) {
            const timer = setTimeout(() => {
                setRetryCount(prev => prev + 1);
                setContextLost(false);
            }, 2000);

            return () => clearTimeout(timer);
        }
    }, [contextLost, retryCount]);

    if (contextLost) {
        return (
            <div className="flex items-center justify-center h-full bg-gray-900 text-white">
                <div className="text-center">
                    <p className="text-lg mb-2">WebGL Context Lost</p>
                    <p className="text-sm text-gray-400">
                        Attempting to recover... ({retryCount}/3)
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div ref={canvasRef} className="w-full h-full">
            <Canvas
                camera={{
                    position: [0, 0, 10],
                    fov: 75,
                    near: 0.1,
                    far: 1000
                }}
                gl={{
                    preserveDrawingBuffer: false,
                    powerPreference: "high-performance",
                    antialias: window.devicePixelRatio < 2,
                    alpha: true,
                    stencil: false,
                    depth: true,
                    failIfMajorPerformanceCaveat: false
                }}
                dpr={Math.min(window.devicePixelRatio, 2)}
                frameloop="always"
                performance={{
                    min: 0.8,
                    max: 1,
                    debounce: 100
                }}
                onCreated={({ gl, scene, camera }) => {
                    console.log('Canvas created successfully');

                    gl.setClearColor(0x000511, 1); // Very dark blue instead of pure black
                    gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));

                    scene.matrixAutoUpdate = true;

                    scene.fog = new THREE.Fog(0x000511, 20, 100);
                }}
                onError={(error) => {
                    console.error('Canvas error:', error);
                    setContextLost(true);
                }}
            >
                <ambientLight intensity={0.3} color={0x404040} />
                <directionalLight
                    position={[10, 10, 5]}
                    intensity={0.2}
                    color={0xffffff}
                />

                <pointLight
                    position={[-20, 10, -10]}
                    intensity={0.5}
                    color={0x4488ff}
                    distance={50}
                />
                <pointLight
                    position={[20, -10, -20]}
                    intensity={0.3}
                    color={0xff8844}
                    distance={40}
                />

                <OrbitControls
                    enableDamping
                    dampingFactor={0.05}
                    enablePan={true}
                    enableZoom={true}
                    enableRotate={true}
                    maxDistance={30}
                    minDistance={2}
                />

                <MeteorShower
                    meteorCount={60}
                    layers={4}
                    speed={0.025}
                    spawnRate={0.92}
                />

                {sentences.map((text: string, idx: number) => (
                    <FallingSentence
                        key={`sentence-${idx}-${text}`}
                        text={text}
                        basePosition={[0, 0, -idx * 2] as [number, number, number]}
                        spawnInterval={2 + Math.random()}
                        fallSpeed={0.015}
                        maxInstances={6}
                        spawnArea={{
                            width: 10,
                            height: 6,
                            depth: 4
                        }}
                    />
                ))}
            </Canvas>
        </div>
    );
}
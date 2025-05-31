import { useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";

interface TextInstance {
    id: number;
    x: number;
    y: number;
    z: number;
    speed: number;
    color: string;
    size: number;
    opacity: number;
    startTime: number;
    fadeIn: boolean;
    fadeOut: boolean;
}

interface FallingSentenceProps {
    text: string;
    basePosition: [number, number, number];
    spawnInterval?: number;
    fallSpeed?: number;
    maxInstances?: number;
    spawnArea?: {
        width: number;
        height: number;
        depth: number;
    };
}

export default function FallingSentence({
                                            text,
                                            basePosition,
                                            spawnInterval = 2,
                                            fallSpeed = 0.015,
                                            maxInstances = 6,
                                            spawnArea = { width: 10, height: 6, depth: 4 }
                                        }: FallingSentenceProps) {
    const [instances, setInstances] = useState<TextInstance[]>([]);
    const [nextId, setNextId] = useState(0);
    const lastSpawnTime = useRef<number>(0);

    const [baseX, baseY, baseZ] = basePosition || [0, 0, 0];

    const createInstance = (id: number): TextInstance => ({
        id,
        x: (Math.random() - 0.5) * spawnArea.width,
        y: Math.random() * spawnArea.height + 8,
        z: (Math.random() - 0.5) * spawnArea.depth + baseZ,
        speed: fallSpeed + (Math.random() - 0.5) * 0.005,
        color: `hsl(${Math.random() * 360}, 70%, 85%)`,
        size: 0.4 + Math.random() * 0.15,
        opacity: 0,
        startTime: Date.now(),
        fadeIn: true,
        fadeOut: false
    });

    useFrame((state, delta) => {
        const currentTime = state.clock.elapsedTime;

        if (currentTime - lastSpawnTime.current >= spawnInterval && instances.length < maxInstances) {
            const newInstance = createInstance(nextId);
            setInstances(prev => [...prev, newInstance]);
            setNextId(prev => prev + 1);
            lastSpawnTime.current = currentTime;
        }

        setInstances(prev =>
            prev.map(instance => {
                let newInstance = { ...instance };

                newInstance.y -= instance.speed * delta * 60;

                newInstance.x = instance.x + Math.sin(currentTime * 0.5 + instance.id) * 0.03;

                if (instance.fadeIn && instance.opacity < 1) {
                    newInstance.opacity = Math.min(1, instance.opacity + delta * 3);
                    if (newInstance.opacity >= 1) {
                        newInstance.fadeIn = false;
                    }
                }

                if (instance.y < -2 && !instance.fadeOut) {
                    newInstance.fadeOut = true;
                }

                if (instance.fadeOut && instance.opacity > 0) {
                    newInstance.opacity = Math.max(0, instance.opacity - delta * 4);
                }

                return newInstance;
            }).filter(instance => instance.y > -10 && instance.opacity > 0.01)
        );
    });

    useEffect(() => {
        const initialInstances: TextInstance[] = [];
        for (let i = 0; i < Math.min(2, maxInstances); i++) {
            const instance = createInstance(i);
            instance.y = instance.y - i * 4;
            instance.opacity = Math.random() * 0.5 + 0.3;
            instance.fadeIn = false;
            initialInstances.push(instance);
        }
        setInstances(initialInstances);
        setNextId(initialInstances.length);
    }, []);

    return (
        <group>
            {instances.map((instance) => (
                <Text
                    key={instance.id}
                    position={[instance.x, instance.y, instance.z]}
                    fontSize={instance.size}
                    color={instance.color}
                    anchorX="center"
                    anchorY="middle"
                    material-opacity={instance.opacity}
                    material-transparent={true}
                    rotation={[0, 0, Math.sin(instance.startTime * 0.001 + instance.id) * 0.05]}
                >
                    {text}
                </Text>
            ))}
        </group>
    );
}
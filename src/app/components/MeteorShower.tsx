import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface MeteorInstance {
    id: number;
    startPosition: THREE.Vector3;
    endPosition: THREE.Vector3;
    currentPosition: THREE.Vector3;
    progress: number;
    speed: number;
    size: number;
    opacity: number;
    color: THREE.Color;
    layer: number;
    trailLength: number;
}

interface MeteorShowerProps {
    meteorCount?: number;
    layers?: number;
    speed?: number;
    spawnRate?: number;
}

export default function MeteorShower({
                                         meteorCount = 50,
                                         layers = 3,
                                         speed = 0.02,
                                         spawnRate = 0.95
                                     }: MeteorShowerProps) {
    const meteorsRef = useRef<MeteorInstance[]>([]);
    const geometryRef = useRef<THREE.BufferGeometry | null>(null);
    const materialRef = useRef<THREE.ShaderMaterial>(null);
    const meshRef = useRef<THREE.Points>(null);

    const createMeteor = (layer: number): MeteorInstance => {
        const layerDepth = layer * -15 - 10;
        const layerSize = (layers - layer) * 0.5 + 0.3;

        const startX = (Math.random() - 0.5) * 60;
        const startY = Math.random() * 30 + 15;
        const startZ = layerDepth + (Math.random() - 0.5) * 10;

        const endX = startX - Math.random() * 40 - 20;
        const endY = startY - Math.random() * 40 - 30;
        const endZ = startZ - Math.random() * 10;

        return {
            id: Math.random(),
            startPosition: new THREE.Vector3(startX, startY, startZ),
            endPosition: new THREE.Vector3(endX, endY, endZ),
            currentPosition: new THREE.Vector3(startX, startY, startZ),
            progress: 0,
            speed: speed * (0.8 + Math.random() * 0.4) * (layer + 1),
            size: layerSize * (0.7 + Math.random() * 0.6),
            opacity: Math.random() * 0.8 + 0.2,
            color: new THREE.Color().setHSL(
                Math.random() * 0.1 + 0.15,
                Math.random() * 0.5 + 0.5,
                Math.random() * 0.3 + 0.7
            ),
            layer,
            trailLength: Math.random() * 3 + 2
        };
    };

    const initializeMeteors = () => {
        meteorsRef.current = [];
        for (let layer = 0; layer < layers; layer++) {
            const meteorsPerLayer = Math.floor(meteorCount / layers);
            for (let i = 0; i < meteorsPerLayer; i++) {
                meteorsRef.current.push(createMeteor(layer));
            }
        }
    };

    const shaderMaterial = useMemo(() => {
        return new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                pixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
            },
            vertexShader: `
                attribute float size;
                attribute vec3 color;
                attribute float opacity;
                attribute float trail;
                
                varying vec3 vColor;
                varying float vOpacity;
                varying float vTrail;
                
                void main() {
                    vColor = color;
                    vOpacity = opacity;
                    vTrail = trail;
                    
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = size * (300.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                varying float vOpacity;
                varying float vTrail;
                
                void main() {
                    vec2 center = gl_PointCoord - 0.5;
                    float distance = length(center);
                    
                    // Create meteor shape with trail effect
                    float meteor = 1.0 - smoothstep(0.0, 0.5, distance);
                    
                    // Add glow effect
                    float glow = 1.0 - smoothstep(0.0, 0.8, distance);
                    glow *= 0.3;
                    
                    float alpha = (meteor + glow) * vOpacity;
                    
                    gl_FragColor = vec4(vColor, alpha);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
    }, []);

    const updateGeometry = () => {
        if (!meteorsRef.current.length) return;

        const positions = new Float32Array(meteorsRef.current.length * 3);
        const colors = new Float32Array(meteorsRef.current.length * 3);
        const sizes = new Float32Array(meteorsRef.current.length);
        const opacities = new Float32Array(meteorsRef.current.length);
        const trails = new Float32Array(meteorsRef.current.length);

        meteorsRef.current.forEach((meteor, i) => {
            positions[i * 3] = meteor.currentPosition.x;
            positions[i * 3 + 1] = meteor.currentPosition.y;
            positions[i * 3 + 2] = meteor.currentPosition.z;

            colors[i * 3] = meteor.color.r;
            colors[i * 3 + 1] = meteor.color.g;
            colors[i * 3 + 2] = meteor.color.b;

            sizes[i] = meteor.size;
            opacities[i] = meteor.opacity * (1 - meteor.progress * 0.5); // Fade as it falls
            trails[i] = meteor.trailLength;
        });

        if (!geometryRef.current) {
            geometryRef.current = new THREE.BufferGeometry();
        }

        const geometry = geometryRef.current;
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        geometry.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));
        geometry.setAttribute('trail', new THREE.BufferAttribute(trails, 1));
    };

    useMemo(() => {
        initializeMeteors();
        updateGeometry();
    }, [meteorCount, layers]);

    useFrame((state, delta) => {
        if (!meteorsRef.current.length) return;

        meteorsRef.current.forEach((meteor, index) => {
            meteor.progress += meteor.speed * delta;

            meteor.currentPosition.lerpVectors(
                meteor.startPosition,
                meteor.endPosition,
                meteor.progress
            );

            if (meteor.progress >= 1) {
                if (Math.random() < spawnRate) {
                    meteorsRef.current[index] = createMeteor(meteor.layer);
                } else {
                    meteor.progress = 0;
                    meteor.currentPosition.copy(meteor.startPosition);
                }
            }
        });

        updateGeometry();

        if (shaderMaterial.uniforms) {
            shaderMaterial.uniforms.time.value = state.clock.elapsedTime;
        }
    });

    return (
        <group>
            {geometryRef.current && (
                <points ref={meshRef} geometry={geometryRef.current} material={shaderMaterial} />
            )}

            <StarField />
        </group>
    );
}

function StarField() {
    const starsGeometry = useMemo(() => {
        const geometry = new THREE.BufferGeometry();
        const starCount = 200;
        const positions = new Float32Array(starCount * 3);

        for (let i = 0; i < starCount * 3; i += 3) {
            positions[i] = (Math.random() - 0.5) * 100;     // x
            positions[i + 1] = (Math.random() - 0.5) * 100; // y
            positions[i + 2] = (Math.random() - 0.5) * 80;  // z
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        return geometry;
    }, []);

    const starsMaterial = useMemo(() => {
        return new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.5,
            transparent: true,
            opacity: 0.6,
            sizeAttenuation: true
        });
    }, []);

    return <points geometry={starsGeometry} material={starsMaterial} />;
}
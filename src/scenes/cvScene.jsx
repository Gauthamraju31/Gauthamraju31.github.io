import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Computer Vision Scene
 * - Floating bounding boxes with corner brackets
 * - Camera frustum wireframe
 * - Image planes tilted at angles
 * - Grid floor with red tint
 */

/** Animated bounding box with corner brackets */
function BoundingBox({ position, size = [1, 0.7, 0.8], speed = 1 }) {
    const ref = useRef()

    useFrame((state) => {
        if (!ref.current) return
        const t = state.clock.elapsedTime
        ref.current.position.y = position[1] + Math.sin(t * speed + position[0]) * 0.15
        ref.current.rotation.y = Math.sin(t * 0.3 * speed) * 0.1
    })

    return (
        <group ref={ref} position={position}>
            <lineSegments>
                <edgesGeometry args={[new THREE.BoxGeometry(...size)]} />
                <lineBasicMaterial color="#ff1a1a" transparent opacity={0.8} />
            </lineSegments>

            {/* Corner brackets */}
            {[[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
            [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]].map(([cx, cy, cz], i) => (
                <mesh key={i} position={[cx * size[0] / 2, cy * size[1] / 2, cz * size[2] / 2]}>
                    <boxGeometry args={[0.05, 0.05, 0.05]} />
                    <meshBasicMaterial color="#ff1a1a" />
                </mesh>
            ))}

            {/* Label line */}
            <mesh position={[0, size[1] / 2 + 0.1, 0]}>
                <planeGeometry args={[size[0] * 0.6, 0.03]} />
                <meshBasicMaterial color="#ff1a1a" transparent opacity={0.5} />
            </mesh>
        </group>
    )
}

/** Camera frustum wireframe */
function CameraFrustum() {
    const ref = useRef()

    const geometry = useMemo(() => {
        const points = [
            // Near plane
            new THREE.Vector3(-0.3, -0.2, 0),
            new THREE.Vector3(0.3, -0.2, 0),
            new THREE.Vector3(0.3, 0.2, 0),
            new THREE.Vector3(-0.3, 0.2, 0),
            new THREE.Vector3(-0.3, -0.2, 0),
            // Far plane
            new THREE.Vector3(-1.2, -0.8, -3),
            new THREE.Vector3(1.2, -0.8, -3),
            new THREE.Vector3(1.2, 0.8, -3),
            new THREE.Vector3(-1.2, 0.8, -3),
            new THREE.Vector3(-1.2, -0.8, -3),
        ]
        const geo = new THREE.BufferGeometry().setFromPoints(points)
        return geo
    }, [])

    const edgeGeometry = useMemo(() => {
        const points = [
            new THREE.Vector3(-0.3, -0.2, 0), new THREE.Vector3(-1.2, -0.8, -3),
            new THREE.Vector3(0.3, -0.2, 0), new THREE.Vector3(1.2, -0.8, -3),
            new THREE.Vector3(0.3, 0.2, 0), new THREE.Vector3(1.2, 0.8, -3),
            new THREE.Vector3(-0.3, 0.2, 0), new THREE.Vector3(-1.2, 0.8, -3),
        ]
        return new THREE.BufferGeometry().setFromPoints(points)
    }, [])

    useFrame((state) => {
        if (!ref.current) return
        ref.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.2) * 0.3
    })

    return (
        <group ref={ref} position={[3, 1.5, -1]}>
            {/* Camera body */}
            <mesh>
                <boxGeometry args={[0.5, 0.35, 0.3]} />
                <meshBasicMaterial color="#ff1a1a" wireframe />
            </mesh>
            {/* Frustum outline */}
            <line geometry={geometry}>
                <lineBasicMaterial color="#ff1a1a" transparent opacity={0.4} />
            </line>
            {/* Frustum edges */}
            <lineSegments geometry={edgeGeometry}>
                <lineBasicMaterial color="#ff1a1a" transparent opacity={0.3} />
            </lineSegments>
            {/* Lens */}
            <mesh position={[0, 0, -0.2]}>
                <cylinderGeometry args={[0.08, 0.12, 0.15, 8]} rotation={[Math.PI / 2, 0, 0]} />
                <meshBasicMaterial color="#ff3333" wireframe />
            </mesh>
        </group>
    )
}

/** Floating image planes */
function ImagePlane({ position, rotation = [0, 0, 0], size = [1.2, 0.8] }) {
    const ref = useRef()
    const matRef = useRef()

    const material = useMemo(() => new THREE.ShaderMaterial({
        transparent: true,
        uniforms: { uTime: { value: 0 } },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float uTime;
            varying vec2 vUv;
            float rand(vec2 st) { return fract(sin(dot(st, vec2(12.9898, 78.233))) * 43758.5453); }
            void main() {
                vec2 uv = vUv;
                float noise = rand(uv * 50.0 + uTime * 0.3) * 0.08;
                float grid = smoothstep(0.47, 0.5, fract(uv.x * 20.0)) * 0.05;
                grid += smoothstep(0.47, 0.5, fract(uv.y * 15.0)) * 0.05;
                float border = step(0.02, uv.x) * step(uv.x, 0.98) * step(0.02, uv.y) * step(uv.y, 0.98);
                float borderLine = 1.0 - border;
                vec3 color = vec3(0.1, 0.02, 0.02) + noise + grid;
                color += vec3(1.0, 0.1, 0.1) * borderLine * 0.3;
                gl_FragColor = vec4(color, 0.7);
            }
        `,
    }), [])

    useFrame((state) => {
        material.uniforms.uTime.value = state.clock.elapsedTime
        if (ref.current) {
            ref.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.5 + position[0]) * 0.1
        }
    })

    return (
        <mesh ref={ref} position={position} rotation={rotation}>
            <planeGeometry args={size} />
            <primitive object={material} attach="material" />
        </mesh>
    )
}

/** Data stream particles */
function DataStream({ count = 100 }) {
    const ref = useRef()
    const positions = useMemo(() => {
        const arr = new Float32Array(count * 3)
        for (let i = 0; i < count; i++) {
            arr[i * 3] = (Math.random() - 0.5) * 10
            arr[i * 3 + 1] = Math.random() * 6 - 1
            arr[i * 3 + 2] = (Math.random() - 0.5) * 8
        }
        return arr
    }, [count])

    useFrame(() => {
        if (!ref.current) return
        const pos = ref.current.geometry.attributes.position.array
        for (let i = 0; i < count; i++) {
            pos[i * 3 + 1] -= 0.01
            if (pos[i * 3 + 1] < -1) {
                pos[i * 3 + 1] = 5
                pos[i * 3] = (Math.random() - 0.5) * 10
            }
        }
        ref.current.geometry.attributes.position.needsUpdate = true
    })

    return (
        <points ref={ref}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
            </bufferGeometry>
            <pointsMaterial color="#ff1a1a" size={0.03} transparent opacity={0.4} sizeAttenuation blending={THREE.AdditiveBlending} depthWrite={false} />
        </points>
    )
}

export default function CvScene() {
    return (
        <group>
            {/* Grid floor */}
            <gridHelper args={[20, 30, '#1a0505', '#0d0303']} position={[0, -1, 0]} />

            {/* Floating bounding boxes */}
            <BoundingBox position={[-2, 1.5, -1]} size={[1.2, 0.8, 0.6]} speed={0.8} />
            <BoundingBox position={[1, 2, -2]} size={[0.9, 0.6, 0.5]} speed={1.2} />
            <BoundingBox position={[-0.5, 0.8, 0]} size={[1.0, 1.0, 0.7]} speed={1.0} />
            <BoundingBox position={[2.5, 1, -1.5]} size={[0.7, 0.5, 0.4]} speed={1.5} />

            {/* Camera frustum */}
            <CameraFrustum />

            {/* Image planes */}
            <ImagePlane position={[-3, 2.5, -3]} rotation={[0, 0.3, 0.05]} size={[1.5, 1.0]} />
            <ImagePlane position={[0, 3, -4]} rotation={[0, -0.1, -0.03]} size={[2.0, 1.2]} />
            <ImagePlane position={[3.5, 1.8, -2]} rotation={[0.1, -0.4, 0.02]} size={[1.2, 0.9]} />

            {/* Data particles */}
            <DataStream count={80} />
        </group>
    )
}

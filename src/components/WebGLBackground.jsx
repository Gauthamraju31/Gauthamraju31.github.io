import React, { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Animated grid + particle field for the homepage background.
 * Uses additive blending for a subtle holographic effect.
 * Performance target: 60fps (low particle count, no shadows).
 */

/** Flowing grid lines on a plane */
function FlowingGrid() {
    const ref = useRef()
    const shaderRef = useRef()

    const material = useMemo(() => new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: {
            uTime: { value: 0 },
        },
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

            void main() {
                vec2 uv = vUv;
                
                // Grid lines
                float gridX = smoothstep(0.47, 0.5, fract(uv.x * 30.0));
                float gridY = smoothstep(0.47, 0.5, fract(uv.y * 30.0 + uTime * 0.05));
                float grid = max(gridX, gridY);
                
                // Fade at edges
                float fadeX = smoothstep(0.0, 0.15, uv.x) * smoothstep(1.0, 0.85, uv.x);
                float fadeY = smoothstep(0.0, 0.15, uv.y) * smoothstep(1.0, 0.85, uv.y);
                float fade = fadeX * fadeY;
                
                // Moving highlight band
                float band = smoothstep(0.0, 0.1, abs(uv.y - fract(uTime * 0.08)));
                float highlight = (1.0 - band) * 0.3;
                
                // Red tint
                vec3 color = vec3(1.0, 0.1, 0.1) * (grid * 0.08 + highlight * 0.04);
                float alpha = (grid * 0.06 + highlight * 0.03) * fade;
                
                gl_FragColor = vec4(color, alpha);
            }
        `,
    }), [])

    useFrame((state) => {
        material.uniforms.uTime.value = state.clock.elapsedTime
    })

    return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
            <planeGeometry args={[40, 40]} />
            <primitive object={material} attach="material" />
        </mesh>
    )
}

/** Floating particles */
function BackgroundParticles({ count = 200 }) {
    const ref = useRef()

    const [positions, velocities] = useMemo(() => {
        const pos = new Float32Array(count * 3)
        const vel = new Float32Array(count * 3)
        for (let i = 0; i < count; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 30
            pos[i * 3 + 1] = (Math.random() - 0.5) * 20
            pos[i * 3 + 2] = (Math.random() - 0.5) * 15
            vel[i * 3] = (Math.random() - 0.5) * 0.002
            vel[i * 3 + 1] = Math.random() * 0.003 + 0.001
            vel[i * 3 + 2] = (Math.random() - 0.5) * 0.002
        }
        return [pos, vel]
    }, [count])

    useFrame(() => {
        if (!ref.current) return
        const pos = ref.current.geometry.attributes.position.array
        for (let i = 0; i < count; i++) {
            pos[i * 3] += velocities[i * 3]
            pos[i * 3 + 1] += velocities[i * 3 + 1]
            pos[i * 3 + 2] += velocities[i * 3 + 2]

            // Reset particles that drift too far
            if (pos[i * 3 + 1] > 12) {
                pos[i * 3] = (Math.random() - 0.5) * 30
                pos[i * 3 + 1] = -10
                pos[i * 3 + 2] = (Math.random() - 0.5) * 15
            }
        }
        ref.current.geometry.attributes.position.needsUpdate = true
    })

    return (
        <points ref={ref}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={count}
                    array={positions}
                    itemSize={3}
                />
            </bufferGeometry>
            <pointsMaterial
                color="#ff1a1a"
                size={0.04}
                transparent
                opacity={0.35}
                sizeAttenuation
                blending={THREE.AdditiveBlending}
                depthWrite={false}
            />
        </points>
    )
}

/** Horizontal scan lines */
function ScanLines() {
    const ref = useRef()
    const material = useMemo(() => new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
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
            void main() {
                float line = smoothstep(0.0, 0.003, abs(fract(vUv.y * 100.0 - uTime * 0.3) - 0.5));
                float alpha = (1.0 - line) * 0.015;
                gl_FragColor = vec4(1.0, 0.1, 0.1, alpha);
            }
        `,
    }), [])

    useFrame((state) => {
        material.uniforms.uTime.value = state.clock.elapsedTime
    })

    return (
        <mesh position={[0, 0, 5]}>
            <planeGeometry args={[40, 30]} />
            <primitive object={material} attach="material" />
        </mesh>
    )
}

/**
 * WebGLBackground — Full-screen R3F canvas behind homepage content.
 * Renders flowing grid, floating particles, and subtle scan lines.
 */
export default function WebGLBackground() {
    return (
        <div className="fixed inset-0 z-0 pointer-events-none">
            <Canvas
                camera={{ position: [0, 5, 12], fov: 50 }}
                gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
                dpr={1}
                style={{ width: '100%', height: '100%' }}
            >
                <FlowingGrid />
                <BackgroundParticles count={150} />
                <ScanLines />
            </Canvas>
        </div>
    )
}

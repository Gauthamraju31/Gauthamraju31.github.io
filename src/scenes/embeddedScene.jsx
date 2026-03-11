import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Embedded Systems Scene
 * - Microcontroller chip model (IC package with pins)
 * - Flowing signal lines (animated data buses)
 * - PCB trace pattern on ground
 * - Capacitors / components
 */

/** IC chip package */
function MicrocontrollerChip() {
    const ref = useRef()

    useFrame((state) => {
        if (!ref.current) return
        ref.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.2) * 0.15
        ref.current.position.y = 1.5 + Math.sin(state.clock.elapsedTime * 0.5) * 0.1
    })

    const pinCount = 8

    return (
        <group ref={ref}>
            {/* Chip body (QFP package) */}
            <mesh>
                <boxGeometry args={[2, 0.3, 2]} />
                <meshStandardMaterial color="#0a0a0a" metalness={0.8} roughness={0.3} />
            </mesh>

            {/* Die marking */}
            <mesh position={[0, 0.16, 0]}>
                <planeGeometry args={[1.4, 1.4]} />
                <meshBasicMaterial color="#1a0505" />
            </mesh>

            {/* Pin 1 indicator */}
            <mesh position={[-0.6, 0.17, -0.6]}>
                <circleGeometry args={[0.08, 16]} />
                <meshBasicMaterial color="#ff1a1a" />
            </mesh>

            {/* Pins — 4 sides */}
            {Array.from({ length: pinCount }, (_, i) => {
                const offset = (i - (pinCount - 1) / 2) * 0.22
                return (
                    <React.Fragment key={`pins-${i}`}>
                        {/* Bottom pins */}
                        <mesh position={[offset, 0, -1.2]}>
                            <boxGeometry args={[0.08, 0.02, 0.4]} />
                            <meshStandardMaterial color="#cc8844" metalness={0.9} roughness={0.2} />
                        </mesh>
                        {/* Top pins */}
                        <mesh position={[offset, 0, 1.2]}>
                            <boxGeometry args={[0.08, 0.02, 0.4]} />
                            <meshStandardMaterial color="#cc8844" metalness={0.9} roughness={0.2} />
                        </mesh>
                        {/* Left pins */}
                        <mesh position={[-1.2, 0, offset]}>
                            <boxGeometry args={[0.4, 0.02, 0.08]} />
                            <meshStandardMaterial color="#cc8844" metalness={0.9} roughness={0.2} />
                        </mesh>
                        {/* Right pins */}
                        <mesh position={[1.2, 0, offset]}>
                            <boxGeometry args={[0.4, 0.02, 0.08]} />
                            <meshStandardMaterial color="#cc8844" metalness={0.9} roughness={0.2} />
                        </mesh>
                    </React.Fragment>
                )
            })}

            {/* Text label on chip */}
            <mesh position={[0, 0.17, 0.2]}>
                <planeGeometry args={[0.8, 0.06]} />
                <meshBasicMaterial color="#ff1a1a" transparent opacity={0.6} />
            </mesh>
            <mesh position={[0, 0.17, 0]}>
                <planeGeometry args={[0.5, 0.04]} />
                <meshBasicMaterial color="#ff1a1a" transparent opacity={0.3} />
            </mesh>
        </group>
    )
}

/** Animated signal lines flowing between components */
function SignalLines({ count = 12 }) {
    const linesRef = useRef([])

    const lines = useMemo(() => {
        return Array.from({ length: count }, (_, i) => {
            const angle = (i / count) * Math.PI * 2
            const radius = 3 + Math.random() * 2
            return {
                start: [Math.cos(angle) * 1.3, 0, Math.sin(angle) * 1.3],
                end: [Math.cos(angle) * radius, -0.5 + Math.random() * 0.5, Math.sin(angle) * radius],
                phase: Math.random() * Math.PI * 2,
            }
        })
    }, [count])

    return (
        <group position={[0, 1.5, 0]}>
            {lines.map((line, i) => (
                <SignalLine key={i} start={line.start} end={line.end} phase={line.phase} />
            ))}
        </group>
    )
}

function SignalLine({ start, end, phase }) {
    const ref = useRef()
    const pulseRef = useRef()

    useFrame((state) => {
        if (!pulseRef.current) return
        const t = (state.clock.elapsedTime * 0.8 + phase) % 1
        pulseRef.current.position.x = start[0] + (end[0] - start[0]) * t
        pulseRef.current.position.y = start[1] + (end[1] - start[1]) * t
        pulseRef.current.position.z = start[2] + (end[2] - start[2]) * t
        pulseRef.current.material.opacity = Math.sin(t * Math.PI) * 0.8
    })

    const points = useMemo(() => [
        new THREE.Vector3(...start),
        new THREE.Vector3(...end),
    ], [start, end])

    return (
        <group>
            <line>
                <bufferGeometry>
                    <bufferAttribute
                        attach="attributes-position"
                        count={2}
                        array={new Float32Array([...start, ...end])}
                        itemSize={3}
                    />
                </bufferGeometry>
                <lineBasicMaterial color="#ff1a1a" transparent opacity={0.15} />
            </line>

            {/* Pulse dot */}
            <mesh ref={pulseRef}>
                <sphereGeometry args={[0.04, 8, 8]} />
                <meshBasicMaterial color="#ff1a1a" transparent opacity={0.8} />
            </mesh>
        </group>
    )
}

/** PCB trace pattern on ground */
function PCBTraces() {
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
                vec2 uv = vUv;
                // Orthogonal trace pattern
                float h = step(0.49, fract(uv.x * 15.0)) * step(fract(uv.y * 8.0), 0.8);
                float v = step(0.49, fract(uv.y * 15.0)) * step(fract(uv.x * 8.0), 0.8);
                float trace = max(h, v);
                
                // Fade at edges
                float fade = smoothstep(0.0, 0.2, uv.x) * smoothstep(1.0, 0.8, uv.x)
                            * smoothstep(0.0, 0.2, uv.y) * smoothstep(1.0, 0.8, uv.y);
                
                vec3 color = vec3(0.6, 0.1, 0.05) * trace;
                gl_FragColor = vec4(color, trace * 0.15 * fade);
            }
        `,
    }), [])

    useFrame((state) => {
        material.uniforms.uTime.value = state.clock.elapsedTime
    })

    return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
            <planeGeometry args={[16, 16]} />
            <primitive object={material} attach="material" />
        </mesh>
    )
}

/** Small passive components scattered around */
function PassiveComponents() {
    const components = useMemo(() => {
        return Array.from({ length: 12 }, (_, i) => ({
            pos: [
                (Math.random() - 0.5) * 8,
                -0.3,
                (Math.random() - 0.5) * 8,
            ],
            type: i % 3, // 0=cap, 1=resistor, 2=LED
            rot: Math.random() * Math.PI,
        }))
    }, [])

    return (
        <group>
            {components.map((c, i) => (
                <mesh key={i} position={c.pos} rotation={[0, c.rot, 0]}>
                    {c.type === 0 && <cylinderGeometry args={[0.08, 0.08, 0.2, 8]} />}
                    {c.type === 1 && <boxGeometry args={[0.15, 0.06, 0.06]} />}
                    {c.type === 2 && <sphereGeometry args={[0.05, 8, 8]} />}
                    <meshBasicMaterial color={c.type === 2 ? '#ff1a1a' : '#331111'} wireframe={c.type !== 2} />
                </mesh>
            ))}
        </group>
    )
}

export default function EmbeddedScene() {
    return (
        <group>
            <PCBTraces />
            <MicrocontrollerChip />
            <SignalLines count={10} />
            <PassiveComponents />

            {/* Grid helper */}
            <gridHelper args={[16, 20, '#1a0505', '#0a0303']} position={[0, -0.5, 0]} />
        </group>
    )
}

import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * FPV Drone Scene
 * - Wireframe drone model (body + arms + props)
 * - Animated camera path (moving rings)
 * - Trail particles
 * - Terrain grid
 */

/** Wireframe drone built from primitive geometries */
function DroneWireframe() {
    const ref = useRef()
    const propRefs = [useRef(), useRef(), useRef(), useRef()]

    useFrame((state) => {
        if (!ref.current) return
        const t = state.clock.elapsedTime

        // Hover + slight tilt
        ref.current.position.y = 2 + Math.sin(t * 1.5) * 0.2
        ref.current.rotation.x = Math.sin(t * 0.5) * 0.08
        ref.current.rotation.z = Math.cos(t * 0.3) * 0.05

        // Spin props
        propRefs.forEach((p, i) => {
            if (p.current) {
                p.current.rotation.y += 0.4 + i * 0.02
            }
        })
    })

    const armPositions = [
        [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1]
    ]

    return (
        <group ref={ref}>
            {/* Central body */}
            <mesh>
                <boxGeometry args={[0.6, 0.15, 0.6]} />
                <meshBasicMaterial color="#ff1a1a" wireframe />
            </mesh>

            {/* Arms + motors + propellers */}
            {armPositions.map((pos, i) => (
                <group key={i} position={pos}>
                    {/* Arm */}
                    <mesh position={[-pos[0] * 0.35, 0, -pos[2] * 0.35]}>
                        <boxGeometry args={[Math.abs(pos[0]) * 0.8, 0.04, 0.04]} />
                        <meshBasicMaterial color="#ff1a1a" wireframe />
                    </mesh>
                    <mesh position={[-pos[0] * 0.35, 0, -pos[2] * 0.35]} rotation={[0, Math.PI / 4, 0]}>
                        <boxGeometry args={[0.04, 0.04, Math.abs(pos[2]) * 0.8]} />
                        <meshBasicMaterial color="#ff1a1a" wireframe />
                    </mesh>

                    {/* Motor housing */}
                    <mesh position={[0, 0.08, 0]}>
                        <cylinderGeometry args={[0.08, 0.1, 0.12, 6]} />
                        <meshBasicMaterial color="#ff3333" wireframe />
                    </mesh>

                    {/* Propeller */}
                    <group ref={propRefs[i]} position={[0, 0.15, 0]}>
                        <mesh>
                            <boxGeometry args={[0.6, 0.01, 0.06]} />
                            <meshBasicMaterial color="#ff1a1a" transparent opacity={0.6} />
                        </mesh>
                        <mesh rotation={[0, Math.PI / 2, 0]}>
                            <boxGeometry args={[0.6, 0.01, 0.06]} />
                            <meshBasicMaterial color="#ff1a1a" transparent opacity={0.6} />
                        </mesh>
                    </group>
                </group>
            ))}

            {/* Camera gimbal */}
            <mesh position={[0, -0.12, 0.15]}>
                <boxGeometry args={[0.12, 0.08, 0.15]} />
                <meshBasicMaterial color="#ff3333" wireframe />
            </mesh>

            {/* LED indicator */}
            <mesh position={[0, 0.1, 0.35]}>
                <sphereGeometry args={[0.03, 8, 8]} />
                <meshBasicMaterial color="#ff1a1a" />
            </mesh>
        </group>
    )
}

/** Animated path rings showing a flight trajectory */
function FlightPath({ ringCount = 20 }) {
    const ref = useRef()

    useFrame((state) => {
        if (!ref.current) return
        const t = state.clock.elapsedTime
        ref.current.children.forEach((ring, i) => {
            const phase = (t * 0.3 + i / ringCount) % 1
            const angle = phase * Math.PI * 2
            ring.position.x = Math.sin(angle) * 4
            ring.position.z = Math.cos(angle) * 3 - 2
            ring.position.y = 1.5 + Math.sin(phase * Math.PI) * 2
            ring.rotation.x = angle
            ring.rotation.z = phase * Math.PI
            ring.material.opacity = Math.sin(phase * Math.PI) * 0.5
        })
    })

    return (
        <group ref={ref}>
            {Array.from({ length: ringCount }, (_, i) => (
                <mesh key={i}>
                    <torusGeometry args={[0.15, 0.01, 8, 16]} />
                    <meshBasicMaterial color="#ff1a1a" transparent opacity={0.3} wireframe />
                </mesh>
            ))}
        </group>
    )
}

/** Exhaust/trail particles behind drone */
function TrailParticles({ count = 60 }) {
    const ref = useRef()
    const positions = useMemo(() => {
        const arr = new Float32Array(count * 3)
        for (let i = 0; i < count; i++) {
            arr[i * 3] = (Math.random() - 0.5) * 0.5
            arr[i * 3 + 1] = 1.5 + Math.random() * 0.5
            arr[i * 3 + 2] = (Math.random() - 0.5) * 0.5
        }
        return arr
    }, [count])

    useFrame((state) => {
        if (!ref.current) return
        const pos = ref.current.geometry.attributes.position.array
        const t = state.clock.elapsedTime
        for (let i = 0; i < count; i++) {
            pos[i * 3 + 1] -= 0.02
            pos[i * 3] += Math.sin(t + i) * 0.003
            if (pos[i * 3 + 1] < -0.5) {
                pos[i * 3] = (Math.random() - 0.5) * 0.5
                pos[i * 3 + 1] = 1.5
                pos[i * 3 + 2] = (Math.random() - 0.5) * 0.5
            }
        }
        ref.current.geometry.attributes.position.needsUpdate = true
    })

    return (
        <points ref={ref}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
            </bufferGeometry>
            <pointsMaterial color="#ff1a1a" size={0.04} transparent opacity={0.3} sizeAttenuation blending={THREE.AdditiveBlending} depthWrite={false} />
        </points>
    )
}

/** Terrain wireframe */
function TerrainGrid() {
    const ref = useRef()
    const geometry = useMemo(() => {
        const geo = new THREE.PlaneGeometry(20, 20, 30, 30)
        const pos = geo.attributes.position.array
        for (let i = 0; i < pos.length; i += 3) {
            pos[i + 2] = Math.sin(pos[i] * 0.5) * Math.cos(pos[i + 1] * 0.5) * 0.5
        }
        geo.computeVertexNormals()
        return geo
    }, [])

    return (
        <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} geometry={geometry}>
            <meshBasicMaterial color="#1a0505" wireframe />
        </mesh>
    )
}

export default function FpvScene() {
    return (
        <group>
            <TerrainGrid />
            <DroneWireframe />
            <FlightPath ringCount={15} />
            <TrailParticles count={50} />

            {/* Altitude markers */}
            {[0, 1, 2, 3, 4].map(h => (
                <group key={h} position={[-5, h, -5]}>
                    <mesh>
                        <boxGeometry args={[0.02, 0.02, 0.02]} />
                        <meshBasicMaterial color="#ff1a1a" transparent opacity={0.4} />
                    </mesh>
                </group>
            ))}
        </group>
    )
}

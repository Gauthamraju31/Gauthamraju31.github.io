import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Robotics Scene
 * - 6-DOF robot arm skeleton with animated joints
 * - Joint rotation indicators (rings)
 * - Grid workspace
 * - End-effector trail
 */

/** Robot arm with animated inverse kinematics */
function RobotArm() {
    const baseRef = useRef()
    const shoulder = useRef()
    const elbow = useRef()
    const wrist = useRef()
    const wrist2 = useRef()
    const gripper = useRef()

    useFrame((state) => {
        const t = state.clock.elapsedTime * 0.4

        // Animated joint rotations — smooth sinusoidal motion
        if (baseRef.current) baseRef.current.rotation.y = Math.sin(t * 0.5) * 0.8
        if (shoulder.current) shoulder.current.rotation.z = -0.3 + Math.sin(t * 0.7) * 0.3
        if (elbow.current) elbow.current.rotation.z = -0.5 + Math.sin(t * 0.6 + 1) * 0.4
        if (wrist.current) wrist.current.rotation.z = Math.sin(t * 0.8 + 2) * 0.3
        if (wrist2.current) wrist2.current.rotation.x = Math.sin(t + 1) * 0.5
        if (gripper.current) {
            const grip = 0.15 + Math.sin(t * 1.5) * 0.1
            gripper.current.children.forEach((finger, i) => {
                finger.position.x = i === 0 ? -grip : grip
            })
        }
    })

    return (
        <group position={[0, -1, 0]}>
            {/* Base platform */}
            <mesh position={[0, 0.1, 0]}>
                <cylinderGeometry args={[0.6, 0.7, 0.2, 16]} />
                <meshBasicMaterial color="#ff1a1a" wireframe />
            </mesh>

            {/* Base rotation joint */}
            <group ref={baseRef} position={[0, 0.2, 0]}>
                <JointRing position={[0, 0, 0]} axis="y" />

                {/* Shoulder tower */}
                <mesh position={[0, 0.5, 0]}>
                    <boxGeometry args={[0.3, 1, 0.3]} />
                    <meshBasicMaterial color="#ff1a1a" wireframe />
                </mesh>

                {/* Shoulder joint */}
                <group ref={shoulder} position={[0, 1, 0]}>
                    <JointRing position={[0, 0, 0]} axis="z" />

                    {/* Upper arm */}
                    <mesh position={[0, 0.9, 0]}>
                        <boxGeometry args={[0.2, 1.8, 0.2]} />
                        <meshBasicMaterial color="#ff1a1a" wireframe />
                    </mesh>

                    {/* Elbow joint */}
                    <group ref={elbow} position={[0, 1.8, 0]}>
                        <JointRing position={[0, 0, 0]} axis="z" />

                        {/* Forearm */}
                        <mesh position={[0, 0.7, 0]}>
                            <boxGeometry args={[0.15, 1.4, 0.15]} />
                            <meshBasicMaterial color="#ff1a1a" wireframe />
                        </mesh>

                        {/* Wrist joint 1 */}
                        <group ref={wrist} position={[0, 1.4, 0]}>
                            <JointRing position={[0, 0, 0]} axis="z" size={0.12} />

                            {/* Wrist segment */}
                            <mesh position={[0, 0.2, 0]}>
                                <boxGeometry args={[0.12, 0.4, 0.12]} />
                                <meshBasicMaterial color="#ff1a1a" wireframe />
                            </mesh>

                            {/* Wrist joint 2 (roll) */}
                            <group ref={wrist2} position={[0, 0.4, 0]}>
                                <JointRing position={[0, 0, 0]} axis="x" size={0.1} />

                                {/* End effector mount */}
                                <mesh position={[0, 0.15, 0]}>
                                    <boxGeometry args={[0.1, 0.1, 0.1]} />
                                    <meshBasicMaterial color="#ff3333" wireframe />
                                </mesh>

                                {/* Gripper */}
                                <group ref={gripper} position={[0, 0.25, 0]}>
                                    {/* Left finger */}
                                    <mesh position={[-0.15, 0, 0]}>
                                        <boxGeometry args={[0.04, 0.3, 0.06]} />
                                        <meshBasicMaterial color="#ff1a1a" wireframe />
                                    </mesh>
                                    {/* Right finger */}
                                    <mesh position={[0.15, 0, 0]}>
                                        <boxGeometry args={[0.04, 0.3, 0.06]} />
                                        <meshBasicMaterial color="#ff1a1a" wireframe />
                                    </mesh>
                                </group>
                            </group>
                        </group>
                    </group>
                </group>
            </group>
        </group>
    )
}

/** Joint rotation ring indicator */
function JointRing({ position, axis = 'y', size = 0.2 }) {
    const ref = useRef()

    useFrame((state) => {
        if (!ref.current) return
        ref.current.material.opacity = 0.3 + Math.sin(state.clock.elapsedTime * 2) * 0.15
    })

    const rotation = axis === 'y' ? [Math.PI / 2, 0, 0] :
        axis === 'z' ? [0, 0, 0] :
            [0, Math.PI / 2, 0]

    return (
        <mesh ref={ref} position={position} rotation={rotation}>
            <torusGeometry args={[size, 0.01, 8, 32]} />
            <meshBasicMaterial color="#ff1a1a" transparent opacity={0.4} />
        </mesh>
    )
}

/** End-effector trail showing movement path */
function EndEffectorTrail({ count = 50 }) {
    const ref = useRef()
    const positions = useMemo(() => new Float32Array(count * 3), [count])
    const indexRef = useRef(0)

    useFrame((state) => {
        const t = state.clock.elapsedTime * 0.4

        // Approximate end-effector position from joint angles
        const baseAngle = Math.sin(t * 0.5) * 0.8
        const shoulderAngle = -0.3 + Math.sin(t * 0.7) * 0.3
        const elbowAngle = -0.5 + Math.sin(t * 0.6 + 1) * 0.4

        // Rough forward kinematics
        const x = Math.sin(baseAngle) * (1.8 * Math.sin(shoulderAngle) + 1.4 * Math.sin(shoulderAngle + elbowAngle))
        const y = -1 + 1.2 + 1.8 * Math.cos(shoulderAngle) + 1.4 * Math.cos(shoulderAngle + elbowAngle) + 0.7
        const z = Math.cos(baseAngle) * (1.8 * Math.sin(shoulderAngle) + 1.4 * Math.sin(shoulderAngle + elbowAngle))

        if (ref.current) {
            const i = indexRef.current % count
            positions[i * 3] = x
            positions[i * 3 + 1] = y
            positions[i * 3 + 2] = z
            indexRef.current++
            ref.current.geometry.attributes.position.needsUpdate = true
        }
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

/** Coordinate axes at workspace origin */
function WorkspaceAxes() {
    return (
        <group position={[0, -0.99, 0]}>
            {/* X axis */}
            <line>
                <bufferGeometry>
                    <bufferAttribute attach="attributes-position" count={2}
                        array={new Float32Array([0, 0, 0, 2, 0, 0])} itemSize={3} />
                </bufferGeometry>
                <lineBasicMaterial color="#ff4444" transparent opacity={0.5} />
            </line>
            {/* Y axis */}
            <line>
                <bufferGeometry>
                    <bufferAttribute attach="attributes-position" count={2}
                        array={new Float32Array([0, 0, 0, 0, 2, 0])} itemSize={3} />
                </bufferGeometry>
                <lineBasicMaterial color="#44ff44" transparent opacity={0.5} />
            </line>
            {/* Z axis */}
            <line>
                <bufferGeometry>
                    <bufferAttribute attach="attributes-position" count={2}
                        array={new Float32Array([0, 0, 0, 0, 0, 2])} itemSize={3} />
                </bufferGeometry>
                <lineBasicMaterial color="#4444ff" transparent opacity={0.5} />
            </line>
        </group>
    )
}

/** Safety zone boundary */
function SafetyZone() {
    return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.98, 0]}>
            <ringGeometry args={[3.5, 3.55, 48]} />
            <meshBasicMaterial color="#ff1a1a" transparent opacity={0.15} side={THREE.DoubleSide} />
        </mesh>
    )
}

export default function RoboticsScene() {
    return (
        <group>
            {/* Grid floor */}
            <gridHelper args={[12, 20, '#1a0505', '#0a0303']} position={[0, -1, 0]} />

            {/* Robot arm */}
            <RobotArm />

            {/* End-effector trail */}
            <EndEffectorTrail count={80} />

            {/* Workspace markers */}
            <WorkspaceAxes />
            <SafetyZone />

            {/* Additional point light for metallic reflections */}
            <pointLight position={[3, 5, 3]} intensity={0.5} color="#ff2222" distance={15} />
        </group>
    )
}

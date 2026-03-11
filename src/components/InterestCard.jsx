import React, { useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { playSubtleHoverSound, playTileClickSound } from '../utils/sounds'

/**
 * Mini particle system rendered inside each interest card.
 */
function CardParticles({ color = '#ff1a1a', count = 30 }) {
    const ref = useRef()
    const positions = React.useMemo(() => {
        const arr = new Float32Array(count * 3)
        for (let i = 0; i < count; i++) {
            arr[i * 3] = (Math.random() - 0.5) * 4
            arr[i * 3 + 1] = (Math.random() - 0.5) * 3
            arr[i * 3 + 2] = (Math.random() - 0.5) * 2
        }
        return arr
    }, [count])

    useFrame((state) => {
        if (!ref.current) return
        const time = state.clock.elapsedTime
        const pos = ref.current.geometry.attributes.position.array
        for (let i = 0; i < count; i++) {
            pos[i * 3 + 1] += Math.sin(time * 0.5 + i) * 0.001
            pos[i * 3] += Math.cos(time * 0.3 + i * 0.5) * 0.0005
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
                color={color}
                size={0.03}
                transparent
                opacity={0.5}
                sizeAttenuation
                blending={THREE.AdditiveBlending}
                depthWrite={false}
            />
        </points>
    )
}

/**
 * InterestCard — Clickable card with red border, hover glow,
 * 3D tilt on mouse move, and embedded WebGL particles.
 *
 * Fixed height: 180px. Padding: 24px. Icons: 16px.
 */
export default function InterestCard({ title, icon, route, index }) {
    const navigate = useNavigate()
    const cardRef = useRef(null)

    const handleMouseMove = useCallback((e) => {
        const card = cardRef.current
        if (!card) return
        const rect = card.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top

        card.style.setProperty('--mouse-x', `${x}px`)
        card.style.setProperty('--mouse-y', `${y}px`)

        const centerX = rect.width / 2
        const centerY = rect.height / 2
        const rotateX = ((y - centerY) / centerY) * -6
        const rotateY = ((x - centerX) / centerX) * 6
        card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`
    }, [])

    const handleMouseLeave = useCallback(() => {
        const card = cardRef.current
        if (!card) return
        card.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) scale(1)'
    }, [])

    return (
        <motion.div
            ref={cardRef}
            className="interest-card rounded-lg flex flex-col justify-between relative"
            style={{ height: '180px', padding: '20px' }}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
                duration: 0.6,
                delay: 0.3 + index * 0.1,
                ease: [0.16, 1, 0.3, 1],
            }}
            onMouseEnter={playSubtleHoverSound}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={() => {
                playTileClickSound()
                navigate(route)
            }}
        >
            {/* WebGL particle canvas */}
            <div className="absolute inset-0 rounded-lg overflow-hidden opacity-30 pointer-events-none">
                <Canvas
                    camera={{ position: [0, 0, 3], fov: 50 }}
                    gl={{ alpha: true, antialias: false, powerPreference: 'low-power' }}
                    dpr={1}
                    style={{ width: '100%', height: '100%' }}
                >
                    <CardParticles />
                </Canvas>
            </div>

            {/* Top: icon + index */}
            <div className="relative z-10 flex items-center gap-2">
                <span className="text-base leading-none">{icon}</span>
                <span className="text-[var(--color-text-dim)] text-[11px] tracking-[3px] uppercase font-[family-name:var(--font-mono)]">
                    0{index + 1}
                </span>
            </div>

            {/* Bottom: title + explore */}
            <div className="relative z-10">
                <h3 className="font-[family-name:var(--font-heading)] text-base font-semibold text-white tracking-wide">
                    {title}
                </h3>
                <div className="mt-1.5 flex items-center gap-2 text-[11px] text-[var(--color-red)] tracking-[2px] font-[family-name:var(--font-mono)]">
                    <span>Explore</span>
                    <span>→</span>
                </div>
            </div>
        </motion.div>
    )
}

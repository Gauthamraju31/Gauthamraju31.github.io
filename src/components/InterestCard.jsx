import React, { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
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

    // Motion values for smooth 3D tilt
    const x = useMotionValue(0)
    const y = useMotionValue(0)
    const hover = useMotionValue(0)

    // Spring physics configuration for "buttery smooth" movement
    const springConfig = { damping: 20, stiffness: 150, mass: 0.5 }
    const xSpring = useSpring(x, springConfig)
    const ySpring = useSpring(y, springConfig)
    const hoverSpring = useSpring(hover, springConfig)

    // Map spring positions to rotation and scale
    const rotateX = useTransform(ySpring, [-0.5, 0.5], [10, -10])
    const rotateY = useTransform(xSpring, [-0.5, 0.5], [-10, 10])
    const scale = useTransform(hoverSpring, [0, 1], [1, 1.05])

    const handleMouseMove = (e) => {
        const card = cardRef.current
        if (!card) return
        const rect = card.getBoundingClientRect()

        // Calculate normalized mouse position (-0.5 to 0.5)
        const mouseX = (e.clientX - rect.left) / rect.width
        const mouseY = (e.clientY - rect.top) / rect.height

        x.set(mouseX - 0.5)
        y.set(mouseY - 0.5)
        hover.set(1)

        // Still update CSS variables for the spotlight glow effect
        card.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`)
        card.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`)
    }

    const handleMouseLeave = () => {
        x.set(0)
        y.set(0)
        hover.set(0)
    }

    return (
        <motion.div
            ref={cardRef}
            className="interest-card rounded-lg flex flex-col justify-between relative"
            style={{
                height: '180px',
                padding: '20px',
                rotateX,
                rotateY,
                scale,
                transformPerspective: 1000
            }}
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

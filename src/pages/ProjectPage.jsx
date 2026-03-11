import React, { Suspense } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Canvas } from '@react-three/fiber'
import { playSubtleHoverSound, playClickBeepSound } from '../utils/sounds'

// Lazy-load scenes for code splitting
const scenes = {
    'computer-vision': React.lazy(() => import('../scenes/cvScene')),
    'fpv': React.lazy(() => import('../scenes/fpvScene')),
    'embedded': React.lazy(() => import('../scenes/embeddedScene')),
    'robotics': React.lazy(() => import('../scenes/roboticsScene')),
}

const titles = {
    'computer-vision': 'Computer Vision',
    'fpv': 'FPV Drones',
    'embedded': 'Embedded Systems',
    'robotics': 'Robotics',
}

/**
 * ProjectPage — Renders a full-screen WebGL scene for a given specialization.
 * Loads the scene component based on the URL parameter.
 * Overlay shows title + "Project coming soon" message.
 */
export default function ProjectPage() {
    const { specialization } = useParams()
    const navigate = useNavigate()
    const SceneComponent = scenes[specialization]
    const title = titles[specialization] || 'Unknown'

    if (!SceneComponent) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-[var(--color-text-dim)]">Scene not found.</p>
            </div>
        )
    }

    return (
        <motion.div
            className="fixed inset-0 bg-[var(--color-bg)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
            {/* Full-screen R3F Canvas */}
            <Canvas
                camera={{ position: [0, 3, 8], fov: 55 }}
                gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
                dpr={[1, 1.5]}
                style={{ position: 'absolute', inset: 0 }}
            >
                <color attach="background" args={['#050505']} />
                <fog attach="fog" args={['#050505', 12, 40]} />
                <ambientLight intensity={0.15} />
                <directionalLight position={[5, 10, 5]} intensity={0.3} color="#ff4444" />

                <Suspense fallback={null}>
                    <SceneComponent />
                </Suspense>
            </Canvas>

            {/* HUD Overlay */}
            <div className="absolute inset-0 z-10 pointer-events-none flex flex-col">
                {/* Top bar */}
                <div className="flex items-center justify-between px-6 md:px-10 pt-6">
                    <motion.button
                        className="pointer-events-auto flex items-center gap-2 text-xs text-[var(--color-text-dim)] 
                                   hover:text-[var(--color-red)] transition-colors tracking-[2px] uppercase
                                   border border-[var(--color-border-dim)] hover:border-[var(--color-red)]
                                   px-4 py-2 rounded bg-transparent cursor-pointer"
                        onMouseEnter={playSubtleHoverSound}
                        onClick={() => {
                            playClickBeepSound();
                            navigate('/');
                        }}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                        whileHover={{ scale: 1.05 }}
                    >
                        ← Back
                    </motion.button>

                    <motion.span
                        className="text-[10px] text-[var(--color-text-dim)] tracking-[3px]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 }}
                    >
                        SCENE / {specialization.toUpperCase().replace('-', '_')}
                    </motion.span>
                </div>

                {/* Center title */}
                <div className="flex-1 flex flex-col items-center justify-center">
                    <motion.h1
                        className="font-[family-name:var(--font-heading)] text-4xl md:text-6xl font-bold text-white text-center text-glow-red"
                        initial={{ opacity: 0, y: 30, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: 0.2, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    >
                        {title}
                    </motion.h1>

                    {/* Red underline */}
                    <motion.div
                        className="mt-4 h-[2px] w-32 bg-[var(--color-red)] opacity-70"
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ delay: 0.5, duration: 0.8 }}
                    />

                    <motion.p
                        className="mt-6 text-sm text-[var(--color-text-dim)] tracking-[3px] uppercase"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8 }}
                    >
                        Project coming soon
                    </motion.p>

                    {/* Blinking cursor */}
                    <motion.span
                        className="mt-2 text-[var(--color-red)] text-xs"
                        animate={{ opacity: [1, 0, 1] }}
                        transition={{ repeat: Infinity, duration: 1.2 }}
                    >
                        ▌
                    </motion.span>
                </div>

                {/* Bottom indicator */}
                <div className="px-6 md:px-10 pb-6 flex justify-between">
                    <span className="text-[10px] text-[var(--color-text-dim)] tracking-[2px]">
                        WEBGL ACTIVE
                    </span>
                    <span className="text-[10px] text-[var(--color-text-dim)] tracking-[2px]">
                        60 FPS TARGET
                    </span>
                </div>
            </div>
        </motion.div>
    )
}

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { playHoverSound, stopHoverSound } from '../utils/sounds'

/**
 * Global Boot Loader
 * Displays "INITIALIZING SYSTEM" and a red loading bar before the app is revealed.
 */
export default function Loader({ onComplete }) {
    const [progress, setProgress] = useState(0)
    const [started, setStarted] = useState(false)

    useEffect(() => {
        if (!started) return

        // Start the flash capacitor charging whine sound
        playHoverSound(2.5) // ~2.5 seconds to full charge
        let current = 0
        const interval = setInterval(() => {
            current += Math.random() * 15 + 5
            if (current >= 100) {
                current = 100
                clearInterval(interval)
                stopHoverSound() // Instantly end the charging sound
                setTimeout(() => onComplete(), 400) // slight delay at 100%
            }
            setProgress(current)
        }, 80) // update every 80ms

        return () => clearInterval(interval)
    }, [started]) // Only depend on `started` state to prevent rapid unmounting

    return (
        <motion.div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#050505]"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
            <AnimatePresence mode="wait">
                {!started ? (
                    <motion.button
                        key="init-btn"
                        className="text-[12px] text-[var(--color-red)] tracking-[5px] uppercase font-[family-name:var(--font-mono)] border border-[var(--color-red)] px-8 py-3 rounded hover:bg-[rgba(255,26,26,0.1)] transition-colors cursor-pointer"
                        onClick={() => setStarted(true)}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.1 }}
                        whileHover={{ scale: 1.05 }}
                    >
                        INITIALIZE SYSTEM
                    </motion.button>
                ) : (
                    <motion.div
                        key="loading-ui"
                        className="w-64 flex flex-col items-center gap-6"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                    >
                        <motion.div
                            className="text-[12px] text-[var(--color-text-dim)] tracking-[5px] uppercase font-[family-name:var(--font-mono)]"
                            animate={{ opacity: [1, 0.5, 1] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                        >
                            INITIALIZING...
                        </motion.div>

                        {/* Loading Bar Container */}
                        <div className="w-full h-[2px] bg-[var(--color-border-dim)] relative overflow-hidden">
                            {/* The glowing red bar */}
                            <motion.div
                                className="absolute top-0 bottom-0 left-0 bg-[var(--color-red)] shadow-[0_0_12px_rgba(255,26,26,0.6)]"
                                style={{ width: `${progress}%` }}
                            />
                        </div>

                        <div className="text-[10px] text-[var(--color-red)] tracking-[2px] font-[family-name:var(--font-mono)] self-end">
                            {Math.floor(progress)}%
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}

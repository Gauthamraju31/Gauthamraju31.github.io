import React from 'react'
import { motion } from 'framer-motion'

/**
 * Hero — Name header with animated red underline.
 * Constrained to left content column width.
 */
export default function Hero() {
    return (
        <motion.section
            style={{ maxWidth: '66%' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
            {/* Portfolio label */}
            <motion.p
                className="text-[var(--color-text-dim)] text-[11px] tracking-[5px] uppercase mb-4 font-[family-name:var(--font-mono)]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.6 }}
            >
                &gt; PORTFOLIO_
            </motion.p>

            {/* Name */}
            <h1 className="font-[family-name:var(--font-heading)] text-5xl md:text-6xl font-bold text-white tracking-tight leading-[1.1]">
                Gautham
                <span className="block text-[var(--color-red)] text-glow-red">
                    Raju
                </span>
            </h1>

            {/* Red underline divider */}
            <div className="mt-5 mb-4 h-px bg-[var(--color-red)] animate-redline opacity-80" />

            {/* Subtitle */}
            <motion.p
                className="text-[13px] text-[var(--color-text-dim)] tracking-[4px] uppercase font-[family-name:var(--font-mono)]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.6 }}
            >
                Computer Vision Engineer
            </motion.p>
        </motion.section>
    )
}

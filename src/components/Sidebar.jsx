import React from 'react'
import { motion } from 'framer-motion'

/**
 * Sidebar — Contacts + Profile summary.
 * Sits in the right 4-col area, top-aligned with "Interests" title.
 */
export default function Sidebar() {
    return (
        <motion.aside
            className="w-full flex flex-col"
            style={{ gap: '36px' }}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
            {/* Contacts */}
            <div>
                <h2 className="text-[12px] tracking-[5px] uppercase text-[var(--color-red)] mb-5 font-[family-name:var(--font-heading)]">
                    Contacts
                </h2>
                <div className="flex flex-col" style={{ gap: '10px' }}>
                    <ContactLink
                        href="https://github.com"
                        icon={
                            <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                            </svg>
                        }
                        label="GitHub"
                    />
                    <ContactLink
                        href="https://linkedin.com"
                        icon={
                            <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                            </svg>
                        }
                        label="LinkedIn"
                    />
                    <ContactLink
                        href="mailto:hello@example.com"
                        icon={
                            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        }
                        label="Email"
                    />
                </div>
            </div>

            {/* Profile */}
            <div>
                <h2 className="text-[12px] tracking-[5px] uppercase text-[var(--color-red)] mb-5 font-[family-name:var(--font-heading)]">
                    Profile
                </h2>
                <p className="text-[14px] text-[var(--color-text-dim)] leading-[1.8] mb-5 font-[family-name:var(--font-mono)]">
                    Computer Vision Engineer with expertise in real-time video analytics,
                    edge AI deployment, and autonomous systems. Passionate about building
                    high-performance perception pipelines at the intersection of
                    robotics, embedded systems, and deep learning.
                </p>

                {/* Status */}
                <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-[var(--color-red)] animate-glow-pulse" />
                    <span className="text-[11px] text-[var(--color-text-dim)] tracking-[3px] uppercase font-[family-name:var(--font-mono)]">
                        System Online
                    </span>
                </div>
            </div>
        </motion.aside>
    )
}

function ContactLink({ href, icon, label }) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3.5 px-4 py-2.5 border-l-2 border-[var(--color-border-dim)] hover:border-[var(--color-red)] hover:bg-[rgba(255,26,26,0.03)] transition-all duration-300 group"
        >
            <span className="text-[var(--color-text-dim)] group-hover:text-[var(--color-red)] transition-colors">
                {icon}
            </span>
            <span className="text-[14px] text-[var(--color-text-dim)] group-hover:text-white transition-colors tracking-[2px] font-[family-name:var(--font-mono)]">
                {label}
            </span>
            <span className="ml-auto text-[11px] text-[var(--color-text-dim)] opacity-0 group-hover:opacity-100 transition-opacity">
                ↗
            </span>
        </a>
    )
}

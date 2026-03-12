import React, { useRef, useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Hero from '../components/Hero'
import InterestCard from '../components/InterestCard'
import Sidebar from '../components/Sidebar'
import WebGLBackground from '../components/WebGLBackground'
import TerminalTypewriter from '../components/TerminalTypewriter'

const INTERESTS = [
    { title: 'Computer Vision', icon: '👁', route: '/projects/computer-vision' },
    { title: 'FPV Drones', icon: '🛸', route: '/projects/fpv' },
    { title: 'Embedded Systems', icon: '⚡', route: '/projects/embedded' },
    { title: 'Robotics', icon: '🤖', route: '/projects/robotics' },
]

export default function Home() {
    const containerRef = useRef(null)
    const [mouse, setMouse] = useState({ x: 0, y: 0 })

    const handleMouseMove = useCallback((e) => {
        const x = (e.clientX / window.innerWidth - 0.5) * 2
        const y = (e.clientY / window.innerHeight - 0.5) * 2
        setMouse({ x, y })
    }, [])

    useEffect(() => {
        window.addEventListener('mousemove', handleMouseMove)
        return () => window.removeEventListener('mousemove', handleMouseMove)
    }, [handleMouseMove])

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.3 } }}
            transition={{ duration: 0.6 }}
            className="h-screen relative w-full overflow-hidden"
        >
            <WebGLBackground />

            {/* Centered container: max 1300px, 48px horizontal padding */}
            <div
                ref={containerRef}
                className="relative z-10 h-full w-full flex flex-col"
                style={{
                    maxWidth: '1300px',
                    marginLeft: 'auto',
                    marginRight: 'auto',
                    paddingLeft: '48px',
                    paddingRight: '48px',
                    paddingTop: '48px',
                    paddingBottom: '32px',
                    transform: `translate(${mouse.x * 2}px, ${mouse.y * 2}px)`,
                    transition: 'transform 0.1s ease-out',
                }}
            >
                {/* Hero section */}
                <Hero />

                {/* 12-col grid: 8 left + 4 right, 64px column gap */}
                <div
                    className="flex-1 mt-16"
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '2fr 1fr',
                        columnGap: '64px',
                        alignContent: 'start',
                    }}
                >
                    {/* Left: 8 columns — Interests */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4, duration: 0.6 }}
                    >
                        <h2 className="text-[12px] tracking-[5px] uppercase text-[var(--color-red)] mb-8 font-[family-name:var(--font-heading)]">
                            Interests
                        </h2>

                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(2, 1fr)',
                                gap: '20px',
                            }}
                        >
                            {INTERESTS.map((item, i) => (
                                <InterestCard
                                    key={item.title}
                                    title={item.title}
                                    icon={item.icon}
                                    route={item.route}
                                    index={i}
                                />
                            ))}
                        </div>

                        {/* Terminal typewriter — below tiles */}
                        <TerminalTypewriter />
                    </motion.div>

                    {/* Right: 4 columns — Sidebar */}
                    <Sidebar />
                </div>

                {/* Footer — anchored to bottom */}
                <footer className="mt-auto pt-6">
                    <div className="w-full h-px bg-gradient-to-r from-transparent via-[var(--color-border-dim)] to-transparent opacity-40 mb-4" />
                    <p className="text-center text-[10px] text-[var(--color-text-dim)] tracking-[3px] uppercase">
                        © 2026 Gautham Raju — All Systems Operational
                    </p>
                </footer>
            </div>
        </motion.div>
    )
}

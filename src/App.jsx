import React, { useState } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Home from './pages/Home'
import ProjectPage from './pages/ProjectPage'
import Loader from './components/Loader'
import { getIsMuted, toggleGlobalMute, playClickBeepSound, playSubtleHoverSound } from './utils/sounds'

/**
 * App — Root component with animated route transitions.
 * Routes:
 *   /                          → Homepage (Hero + Interest Cards + Sidebar)
 *   /projects/:specialization  → WebGL project scene
 */
export default function App() {
    const location = useLocation()
    const [loading, setLoading] = useState(true)
    const [muted, setMuted] = useState(getIsMuted())

    const handleMuteToggle = () => {
        const newMutedState = toggleGlobalMute()
        setMuted(newMutedState)
        if (!newMutedState) {
            playClickBeepSound()
        }
    }

    return (
        <>
            <button
                onClick={handleMuteToggle}
                onMouseEnter={() => playSubtleHoverSound()}
                className="fixed bottom-6 right-6 z-50 text-[10px] text-[var(--color-text-dim)] tracking-[2px] uppercase font-[family-name:var(--font-mono)] hover:text-[var(--color-red)] transition-colors cursor-pointer"
            >
                [ SOUND: {muted ? 'OFF' : 'ON'} ]
            </button>

            <AnimatePresence mode="wait">
                {loading && (
                    <Loader key="loader" onComplete={() => setLoading(false)} />
                )}
            </AnimatePresence>

            {!loading && (
                <AnimatePresence mode="wait">
                    <Routes location={location} key={location.pathname}>
                        <Route path="/" element={<Home />} />
                        <Route path="/projects/:specialization" element={<ProjectPage />} />
                    </Routes>
                </AnimatePresence>
            )}
        </>
    )
}

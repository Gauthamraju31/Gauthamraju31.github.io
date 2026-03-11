import React, { useState } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Home from './pages/Home'
import ProjectPage from './pages/ProjectPage'
import Loader from './components/Loader'

/**
 * App — Root component with animated route transitions.
 * Routes:
 *   /                          → Homepage (Hero + Interest Cards + Sidebar)
 *   /projects/:specialization  → WebGL project scene
 */
export default function App() {
    const location = useLocation()
    const [loading, setLoading] = useState(true)

    return (
        <>
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

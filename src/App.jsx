import React from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import Home from './pages/Home'
import ProjectPage from './pages/ProjectPage'

/**
 * App — Root component with animated route transitions.
 * Routes:
 *   /                          → Homepage (Hero + Interest Cards + Sidebar)
 *   /projects/:specialization  → WebGL project scene
 */
export default function App() {
    const location = useLocation()

    return (
        <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
                <Route path="/" element={<Home />} />
                <Route path="/projects/:specialization" element={<ProjectPage />} />
            </Routes>
        </AnimatePresence>
    )
}

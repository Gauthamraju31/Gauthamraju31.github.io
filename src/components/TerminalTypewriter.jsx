import React, { useEffect, useState, useRef } from 'react'

const QUOTES = [
    'sudo make me a sandwich',
    'git commit -m "fix: everything"',
    'while true; do coffee; done',
    'ssh root@mars — permission denied',
    'rm -rf bugs/ && pray',
    'apt install motivation --force',
    'ping 8.8.8.8 — destination: unreachable',
    'chmod +x dreams.sh && ./dreams.sh',
    'undefined is not a robot... yet',
    'docker run --rm -it life:latest',
]

const TYPE_SPEED = 55      // ms per character typed
const ERASE_SPEED = 30     // ms per character erased
const HOLD_DURATION = 1800 // ms to hold the full text before erasing
const PAUSE_BETWEEN = 400  // ms pause after full erase before next quote

export default function TerminalTypewriter() {
    const [displayed, setDisplayed] = useState('')
    const [quoteIndex, setQuoteIndex] = useState(0)
    const [phase, setPhase] = useState('typing') // 'typing' | 'holding' | 'erasing' | 'pausing'
    const frameRef = useRef(null)

    useEffect(() => {
        const quote = QUOTES[quoteIndex]

        const schedule = (fn, delay) => {
            frameRef.current = setTimeout(fn, delay)
        }

        if (phase === 'typing') {
            if (displayed.length < quote.length) {
                schedule(() => {
                    setDisplayed(quote.slice(0, displayed.length + 1))
                }, TYPE_SPEED)
            } else {
                setPhase('holding')
            }
        } else if (phase === 'holding') {
            schedule(() => setPhase('erasing'), HOLD_DURATION)
        } else if (phase === 'erasing') {
            if (displayed.length > 0) {
                schedule(() => {
                    setDisplayed(prev => prev.slice(0, -1))
                }, ERASE_SPEED)
            } else {
                setPhase('pausing')
            }
        } else if (phase === 'pausing') {
            schedule(() => {
                setQuoteIndex(i => (i + 1) % QUOTES.length)
                setPhase('typing')
            }, PAUSE_BETWEEN)
        }

        return () => clearTimeout(frameRef.current)
    }, [displayed, phase, quoteIndex])

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontFamily: '"JetBrains Mono", "Fira Code", "Courier New", monospace',
                fontSize: '13px',
                color: 'var(--color-text-dim)',
                marginTop: '28px',
                minHeight: '22px',
                userSelect: 'none',
            }}
        >
            {/* Terminal prompt */}
            <span
                style={{
                    color: 'var(--color-red)',
                    opacity: 0.7,
                    letterSpacing: '0.05em',
                    flexShrink: 0,
                }}
            >
                ~$
            </span>

            {/* Typed text */}
            <span
                style={{
                    color: 'var(--color-text-dim)',
                    opacity: 0.6,
                    letterSpacing: '0.03em',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                }}
            >
                {displayed}
            </span>

            {/* Blinking cursor */}
            <span
                style={{
                    display: 'inline-block',
                    width: '7px',
                    height: '13px',
                    background: 'var(--color-red)',
                    opacity: 0.7,
                    flexShrink: 0,
                    animation: 'termCursorBlink 0.8s step-start infinite',
                }}
            />

            <style>{`
                @keyframes termCursorBlink {
                    0%, 100% { opacity: 0.7; }
                    50%       { opacity: 0;   }
                }
            `}</style>
        </div>
    )
}

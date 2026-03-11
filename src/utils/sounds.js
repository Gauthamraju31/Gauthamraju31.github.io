// Interface sound generators using Web Audio API for a futuristic/cyber feel
// without needing external audio file dependencies.

let audioCtx = null

function getAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume()
    }
    return audioCtx
}

// Global reference to the charging sound so we can stop/cancel it if needed
let chargingOsc = null;
let chargingGain = null;

/**
 * Camera Flash Charge Sound (High pitch whine that scales up)
 * Used for hover interactions and loading screen.
 */
export function playHoverSound(duration = 0.5) {
    if (typeof duration !== 'number') duration = 0.5;
    try {
        const ctx = getAudioContext()

        // Stop any existing charging sound to prevent stacking
        if (chargingOsc) {
            try { chargingOsc.stop(); } catch (e) { }
        }

        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        // Flash capacitor charging whine (starts high, drops slightly then rises sharply to barely audible)
        osc.type = 'sine'

        // Start around 4kHz and ramp up to 12kHz over the duration
        osc.frequency.setValueAtTime(4000, ctx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(12000, ctx.currentTime + duration)

        // Volume envelope: rise quickly, hold, then fade out
        gain.gain.setValueAtTime(0, ctx.currentTime)
        gain.gain.linearRampToValueAtTime(0.02, ctx.currentTime + 0.1) // Low volume to not be annoying
        gain.gain.setValueAtTime(0.02, ctx.currentTime + duration - 0.1)
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration)

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + duration)

        chargingOsc = osc;
        chargingGain = gain;
    } catch (e) {
        // Ignore audio context errors before user interaction
    }
}

export function stopHoverSound() {
    if (chargingOsc && chargingGain) {
        try {
            const ctx = getAudioContext()
            // Quick fade out to avoid pop
            chargingGain.gain.cancelScheduledValues(ctx.currentTime)
            chargingGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.05)
            chargingOsc.stop(ctx.currentTime + 0.05)
        } catch (e) { }
        chargingOsc = null
        chargingGain = null
    }
}

/**
 * Camera Flash Fire Sound (Sharp crack/pop followed by short decay)
 * Used when a tile or link is clicked.
 */
export function playClickSound() {
    try {
        const ctx = getAudioContext()

        // Main impact "pop"
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        // Very fast frequency drop to create a percussive "crack"
        osc.type = 'square'
        osc.frequency.setValueAtTime(2000, ctx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.05)

        // Volume envelope for the pop
        gain.gain.setValueAtTime(0.1, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.15)

        // Noise burst to simulate the physical discharge of the xenon bulb
        const bufferSize = ctx.sampleRate * 0.15; // 150ms of noise
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
        const data = buffer.getChannelData(0)
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1
        }

        const noise = ctx.createBufferSource()
        noise.buffer = buffer

        // Create an aggressive lowpass filter for the "thump" aspect of the flash
        const filter = ctx.createBiquadFilter()
        filter.type = 'bandpass'
        filter.frequency.setValueAtTime(1000, ctx.currentTime)
        filter.Q.value = 1

        const noiseGain = ctx.createGain()
        noiseGain.gain.setValueAtTime(0.15, ctx.currentTime)
        noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)

        noise.connect(filter)
        filter.connect(noiseGain)
        noiseGain.connect(ctx.destination)

        noise.start(ctx.currentTime)

    } catch (e) {
        console.error("Audio error", e)
    }
}

/**
 * Very subtle, quick high-pitch tick/flash for UI hovers
 */
export function playSubtleHoverSound() {
    try {
        const ctx = getAudioContext()
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        // Quick, soft high "tink"
        osc.type = 'sine'
        osc.frequency.setValueAtTime(5000, ctx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(9000, ctx.currentTime + 0.05)

        gain.gain.setValueAtTime(0, ctx.currentTime)
        gain.gain.linearRampToValueAtTime(0.005, ctx.currentTime + 0.01) // Extremely quiet (0.005)
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.05)

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.05)
    } catch (e) { }
}

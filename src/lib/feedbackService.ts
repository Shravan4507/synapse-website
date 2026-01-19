/**
 * Feedback Service
 * Handles sound effects, vibration, and haptic feedback
 */

// ========================================
// VIBRATION
// ========================================

/**
 * Vibrate device (if supported)
 */
export const vibrate = (pattern: number | number[]): void => {
    if ('vibrate' in navigator) {
        navigator.vibrate(pattern)
    }
}

/**
 * Success vibration pattern
 */
export const vibrateSuccess = (): void => {
    vibrate([100, 50, 100]) // Two short bursts
}

/**
 * Error vibration pattern
 */
export const vibrateError = (): void => {
    vibrate([200, 100, 200, 100, 200]) // Three long bursts
}

/**
 * Warning vibration pattern
 */
export const vibrateWarning = (): void => {
    vibrate([150]) // Single medium burst
}

/**
 * Stop all vibrations
 */
export const stopVibration = (): void => {
    if ('vibrate' in navigator) {
        navigator.vibrate(0)
    }
}

// ========================================
// SOUND EFFECTS
// ========================================

// Audio context for sound generation
let audioContext: AudioContext | null = null

/**
 * Initialize audio context (call on user interaction)
 */
export const initAudio = (): void => {
    if (!audioContext) {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
}

/**
 * Play a beep sound
 */
export const playBeep = (frequency = 800, duration = 100, volume = 0.3): void => {
    if (!audioContext) {
        initAudio()
    }

    if (!audioContext) return

    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.frequency.value = frequency
    oscillator.type = 'sine'

    gainNode.gain.setValueAtTime(volume, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000)

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + duration / 1000)
}

/**
 * Success sound - ascending tones
 */
export const playSuccessSound = (): void => {
    playBeep(523, 100, 0.2)  // C
    setTimeout(() => playBeep(659, 100, 0.2), 100)  // E
    setTimeout(() => playBeep(784, 150, 0.2), 200)  // G
}

/**
 * Error sound - descending tones
 */
export const playErrorSound = (): void => {
    playBeep(400, 150, 0.3)  // Low
    setTimeout(() => playBeep(300, 200, 0.3), 150)  // Lower
}

/**
 * Warning sound - mid tone
 */
export const playWarningSound = (): void => {
    playBeep(600, 150, 0.25)
    setTimeout(() => playBeep(600, 150, 0.25), 200)
}

/**
 * Scan sound - quick high beep
 */
export const playScanSound = (): void => {
    playBeep(1000, 50, 0.2)
}

// ========================================
// COMBINED FEEDBACK
// ========================================

export interface FeedbackOptions {
    sound?: boolean
    vibration?: boolean
    flash?: boolean
}

/**
 * Combined success feedback
 */
export const feedbackSuccess = (options: FeedbackOptions = { sound: true, vibration: true }): void => {
    if (options.sound) {
        playSuccessSound()
    }
    if (options.vibration) {
        vibrateSuccess()
    }
    if (options.flash) {
        flashScreen('#00ff88', 200)
    }
}

/**
 * Combined error feedback
 */
export const feedbackError = (options: FeedbackOptions = { sound: true, vibration: true }): void => {
    if (options.sound) {
        playErrorSound()
    }
    if (options.vibration) {
        vibrateError()
    }
    if (options.flash) {
        flashScreen('#ff6b6b', 300)
    }
}

/**
 * Combined warning feedback
 */
export const feedbackWarning = (options: FeedbackOptions = { sound: true, vibration: true }): void => {
    if (options.sound) {
        playWarningSound()
    }
    if (options.vibration) {
        vibrateWarning()
    }
    if (options.flash) {
        flashScreen('#ffb432', 200)
    }
}

/**
 * Quick scan feedback
 */
export const feedbackScan = (options: FeedbackOptions = { sound: true, vibration: false }): void => {
    if (options.sound) {
        playScanSound()
    }
    if (options.vibration) {
        vibrate(30) // Very short
    }
}

// ========================================
// VISUAL FEEDBACK
// ========================================

/**
 * Flash the screen with a color
 */
export const flashScreen = (color: string, duration: number): void => {
    const flash = document.createElement('div')
    flash.style.position = 'fixed'
    flash.style.top = '0'
    flash.style.left = '0'
    flash.style.right = '0'
    flash.style.bottom = '0'
    flash.style.backgroundColor = color
    flash.style.opacity = '0.3'
    flash.style.pointerEvents = 'none'
    flash.style.zIndex = '9999'
    flash.style.transition = `opacity ${duration}ms ease-out`

    document.body.appendChild(flash)

    // Fade out
    setTimeout(() => {
        flash.style.opacity = '0'
    }, 50)

    // Remove element
    setTimeout(() => {
        document.body.removeChild(flash)
    }, duration + 100)
}

/**
 * Create animated checkmark overlay
 */
export const showCheckmark = (success: boolean = true): void => {
    const overlay = document.createElement('div')
    overlay.className = 'scan-checkmark-overlay'
    overlay.innerHTML = `
        <div class="scan-checkmark ${success ? 'success' : 'error'}">
            ${success ? '✓' : '✗'}
        </div>
    `

    // Add styles if not already present
    if (!document.getElementById('scan-checkmark-styles')) {
        const style = document.createElement('style')
        style.id = 'scan-checkmark-styles'
        style.textContent = `
            .scan-checkmark-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                pointer-events: none;
                z-index: 10000;
                animation: fadeOut 1s ease-out forwards;
            }
            
            .scan-checkmark {
                font-size: 8rem;
                font-weight: bold;
                animation: scaleIn 0.3s ease-out;
            }
            
            .scan-checkmark.success {
                color: #00ff88;
                text-shadow: 0 0 30px rgba(0, 255, 136, 0.8);
            }
            
            .scan-checkmark.error {
                color: #ff6b6b;
                text-shadow: 0 0 30px rgba(255, 107, 107, 0.8);
            }
            
            @keyframes scaleIn {
                from {
                    transform: scale(0);
                    opacity: 0;
                }
                to {
                    transform: scale(1);
                    opacity: 1;
                }
            }
            
            @keyframes fadeOut {
                0% { opacity: 1; }
                70% { opacity: 1; }
                100% { opacity: 0; }
            }
        `
        document.head.appendChild(style)
    }

    document.body.appendChild(overlay)

    // Remove after animation
    setTimeout(() => {
        document.body.removeChild(overlay)
    }, 1000)
}

// ========================================
// PREFERENCES
// ========================================

const FEEDBACK_PREFS_KEY = 'feedback_preferences'

export interface FeedbackPreferences {
    soundEnabled: boolean
    vibrationEnabled: boolean
    flashEnabled: boolean
    volume: number
}

/**
 * Get feedback preferences
 */
export const getFeedbackPreferences = (): FeedbackPreferences => {
    try {
        const prefs = localStorage.getItem(FEEDBACK_PREFS_KEY)
        return prefs ? JSON.parse(prefs) : {
            soundEnabled: true,
            vibrationEnabled: true,
            flashEnabled: true,
            volume: 0.3
        }
    } catch (error) {
        return {
            soundEnabled: true,
            vibrationEnabled: true,
            flashEnabled: true,
            volume: 0.3
        }
    }
}

/**
 * Save feedback preferences
 */
export const saveFeedbackPreferences = (prefs: FeedbackPreferences): void => {
    try {
        localStorage.setItem(FEEDBACK_PREFS_KEY, JSON.stringify(prefs))
    } catch (error) {
        console.error('Error saving feedback preferences:', error)
    }
}

/**
 * Get feedback options from preferences
 */
export const getFeedbackOptions = (): FeedbackOptions => {
    const prefs = getFeedbackPreferences()
    return {
        sound: prefs.soundEnabled,
        vibration: prefs.vibrationEnabled,
        flash: prefs.flashEnabled
    }
}

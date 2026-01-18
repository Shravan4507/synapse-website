import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { onAuthChange } from '../../lib/auth'
import { getUserOrAdminDocument, type UserDocument, type AdminDocument } from '../../lib/userService'
import { decodeQRData } from '../../lib/dayPassRegistrationService'
import {
    isVolunteer,
    getVolunteerByUserId,
    markAttendance,
    hasAttendanceToday,
    getTodayDate,
    lookupUserBySynapseId,
    type QRVolunteer
} from '../../lib/qrVerificationService'
import './VolunteerScanner.css'

interface ScanResult {
    success: boolean
    message: string
    data?: {
        synapseId: string
        displayName?: string
        registrations?: { type: string; id: string; name: string }[]
    }
}

export default function VolunteerScanner() {
    const navigate = useNavigate()
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const scanIntervalRef = useRef<number | null>(null)

    // Auth state
    const [loading, setLoading] = useState(true)
    const [volunteer, setVolunteer] = useState<QRVolunteer | null>(null)
    const [userData, setUserData] = useState<UserDocument | AdminDocument | null>(null)

    // Scanner state
    const [cameraActive, setCameraActive] = useState(false)
    const [cameraError, setCameraError] = useState('')
    const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([])
    const [selectedCameraId, setSelectedCameraId] = useState<string>('')

    // Scan result state
    const [scanResult, setScanResult] = useState<ScanResult | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)
    const [scanCount, setScanCount] = useState(0)
    const [lastScannedId, setLastScannedId] = useState('')

    // Cooldown to prevent rapid scanning
    const [cooldown, setCooldown] = useState(false)

    // ========================================
    // AUTHORIZATION CHECK
    // ========================================

    useEffect(() => {
        const unsubscribe = onAuthChange(async (user) => {
            if (!user) {
                navigate('/user-login?returnTo=/scan-qr')
                return
            }

            // Check if user is a volunteer
            const isVol = await isVolunteer(user.uid)
            if (!isVol) {
                navigate('/user-dashboard')
                return
            }

            const volunteerData = await getVolunteerByUserId(user.uid)
            setVolunteer(volunteerData)

            const { data } = await getUserOrAdminDocument(user.uid)
            setUserData(data)

            setLoading(false)
        })

        return () => unsubscribe()
    }, [navigate])

    // ========================================
    // CAMERA MANAGEMENT
    // ========================================

    const getCameras = useCallback(async () => {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices()
            const cameras = devices.filter(device => device.kind === 'videoinput')
            setAvailableCameras(cameras)

            // Prefer back camera on mobile
            const backCamera = cameras.find(cam =>
                cam.label.toLowerCase().includes('back') ||
                cam.label.toLowerCase().includes('rear')
            )
            if (backCamera) {
                setSelectedCameraId(backCamera.deviceId)
            } else if (cameras.length > 0) {
                setSelectedCameraId(cameras[0].deviceId)
            }
        } catch (err) {
            console.error('Error getting cameras:', err)
            setCameraError('Could not access camera list')
        }
    }, [])

    const startCamera = useCallback(async () => {
        try {
            setCameraError('')

            const constraints: MediaStreamConstraints = {
                video: selectedCameraId
                    ? { deviceId: { exact: selectedCameraId } }
                    : { facingMode: 'environment' }
            }

            const stream = await navigator.mediaDevices.getUserMedia(constraints)

            if (videoRef.current) {
                videoRef.current.srcObject = stream
                await videoRef.current.play()
                setCameraActive(true)
            }
        } catch (err) {
            console.error('Error starting camera:', err)
            setCameraError('Could not access camera. Please check permissions.')
        }
    }, [selectedCameraId])

    const stopCamera = useCallback(() => {
        if (videoRef.current?.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream
            stream.getTracks().forEach(track => track.stop())
            videoRef.current.srcObject = null
        }
        setCameraActive(false)

        if (scanIntervalRef.current) {
            clearInterval(scanIntervalRef.current)
            scanIntervalRef.current = null
        }
    }, [])

    // Get cameras on mount
    useEffect(() => {
        getCameras()
        return () => stopCamera()
    }, [getCameras, stopCamera])

    // ========================================
    // QR SCANNING
    // ========================================

    const processQRCode = useCallback(async (qrData: string) => {
        if (isProcessing || cooldown) return
        if (qrData === lastScannedId) return // Prevent duplicate scans

        setIsProcessing(true)
        setLastScannedId(qrData)

        try {
            // Decode QR data
            const decoded = decodeQRData(qrData)

            if (!decoded) {
                setScanResult({
                    success: false,
                    message: 'Invalid QR code. Please scan a valid Synapse pass.'
                })
                setIsProcessing(false)
                return
            }

            // Check self-scan prevention
            if (decoded.synapseId === volunteer?.synapseId) {
                setScanResult({
                    success: false,
                    message: 'You cannot scan your own QR code!'
                })
                setIsProcessing(false)
                return
            }

            // Check if already marked today
            // First, look up the user data from the synapseId
            const scannedUser = await lookupUserBySynapseId(decoded.synapseId)
            const userId = scannedUser?.userId || decoded.synapseId
            const displayName = scannedUser?.displayName || decoded.synapseId

            const alreadyMarked = await hasAttendanceToday(userId)

            if (alreadyMarked) {
                setScanResult({
                    success: false,
                    message: `${displayName} is already marked present today.`,
                    data: {
                        synapseId: decoded.synapseId,
                        displayName,
                        registrations: decoded.registrations
                    }
                })
            } else {
                // Mark attendance with proper user data
                const result = await markAttendance({
                    userId: userId,
                    synapseId: decoded.synapseId,
                    displayName: displayName,
                    email: scannedUser?.email,
                    date: getTodayDate(),
                    attended: true,
                    scannedBy: volunteer?.synapseId || '',
                    scannedByName: userData?.displayName || 'Volunteer',
                    offlineScanned: false,
                    registrations: decoded.registrations
                })

                if (result.success) {
                    setScanResult({
                        success: true,
                        message: `✓ ${displayName} marked present!`,
                        data: {
                            synapseId: decoded.synapseId,
                            displayName,
                            registrations: decoded.registrations
                        }
                    })
                    setScanCount(prev => prev + 1)
                } else {
                    setScanResult({
                        success: false,
                        message: result.error || 'Failed to mark attendance'
                    })
                }
            }
        } catch (error) {
            console.error('Error processing QR:', error)
            setScanResult({
                success: false,
                message: 'Error processing QR code'
            })
        }

        setIsProcessing(false)

        // Start cooldown
        setCooldown(true)
        setTimeout(() => {
            setCooldown(false)
            setLastScannedId('')
        }, 2000)
    }, [isProcessing, cooldown, lastScannedId, volunteer, userData])

    // Scan for QR codes
    useEffect(() => {
        if (!cameraActive || !videoRef.current || !canvasRef.current) return

        const video = videoRef.current
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')

        if (!ctx) return

        // Load QR scanner library dynamically
        const loadQRScanner = async () => {
            // Using a simple approach - check for jsQR library
            if (!(window as unknown as { jsQR: unknown }).jsQR) {
                const script = document.createElement('script')
                script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js'
                script.async = true
                document.body.appendChild(script)
                await new Promise(resolve => script.onload = resolve)
            }

            scanIntervalRef.current = window.setInterval(() => {
                if (video.readyState !== video.HAVE_ENOUGH_DATA) return

                canvas.width = video.videoWidth
                canvas.height = video.videoHeight
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
                const jsQR = (window as unknown as { jsQR: (data: ImageData, width: number, height: number) => { data: string } | null }).jsQR

                if (jsQR) {
                    const code = jsQR(imageData, imageData.width, imageData.height)
                    if (code?.data) {
                        processQRCode(code.data)
                    }
                }
            }, 200) // Scan every 200ms
        }

        loadQRScanner()

        return () => {
            if (scanIntervalRef.current) {
                clearInterval(scanIntervalRef.current)
            }
        }
    }, [cameraActive, processQRCode])

    // ========================================
    // RENDER
    // ========================================

    if (loading) {
        return (
            <div className="scanner-page">
                <div className="loading-state">Loading scanner...</div>
            </div>
        )
    }

    return (
        <div className="scanner-page">
            <div className="scanner-content">
                {/* Header */}
                <div className="scanner-header">
                    <button className="back-btn" onClick={() => navigate('/user-dashboard')}>
                        ← Back
                    </button>
                    <h1 className="scanner-title">QR Scanner</h1>
                    <p className="scanner-subtitle">
                        Scanning as {userData?.displayName || 'Volunteer'}
                    </p>
                </div>

                {/* Stats Bar */}
                <div className="scanner-stats">
                    <div className="stat-item">
                        <span className="stat-value">{scanCount}</span>
                        <span className="stat-label">Scanned Today</span>
                    </div>
                    <div className="stat-item status">
                        <span className={`status-dot ${cameraActive ? 'active' : ''}`}></span>
                        <span className="stat-label">{cameraActive ? 'Camera Active' : 'Camera Off'}</span>
                    </div>
                </div>

                {/* Camera Controls */}
                <div className="camera-controls">
                    {!cameraActive ? (
                        <button className="start-camera-btn" onClick={startCamera}>
                            📷 Start Camera
                        </button>
                    ) : (
                        <button className="stop-camera-btn" onClick={stopCamera}>
                            ⏹️ Stop Camera
                        </button>
                    )}

                    {availableCameras.length > 1 && (
                        <select
                            className="camera-select"
                            value={selectedCameraId}
                            onChange={e => {
                                setSelectedCameraId(e.target.value)
                                if (cameraActive) {
                                    stopCamera()
                                    setTimeout(startCamera, 100)
                                }
                            }}
                        >
                            {availableCameras.map(camera => (
                                <option key={camera.deviceId} value={camera.deviceId}>
                                    {camera.label || `Camera ${availableCameras.indexOf(camera) + 1}`}
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                {cameraError && (
                    <div className="camera-error">{cameraError}</div>
                )}

                {/* Camera View */}
                <div className="camera-container">
                    <video
                        ref={videoRef}
                        className={`camera-video ${cameraActive ? 'active' : ''}`}
                        playsInline
                        muted
                    />
                    <canvas ref={canvasRef} className="camera-canvas" />

                    {cameraActive && (
                        <div className="scan-overlay">
                            <div className="scan-frame">
                                <div className="corner top-left"></div>
                                <div className="corner top-right"></div>
                                <div className="corner bottom-left"></div>
                                <div className="corner bottom-right"></div>
                            </div>
                            {isProcessing && (
                                <div className="processing-indicator">Processing...</div>
                            )}
                        </div>
                    )}

                    {!cameraActive && (
                        <div className="camera-placeholder">
                            <span className="placeholder-icon">📷</span>
                            <p>Click "Start Camera" to begin scanning</p>
                        </div>
                    )}
                </div>

                {/* Scan Result */}
                {scanResult && (
                    <div
                        className={`scan-result ${scanResult.success ? 'success' : 'error'}`}
                        onClick={() => setScanResult(null)}
                    >
                        <div className="result-icon">
                            {scanResult.success ? '✓' : '✗'}
                        </div>
                        <div className="result-message">{scanResult.message}</div>
                        {scanResult.data && (
                            <div className="result-details">
                                <span className="result-id">{scanResult.data.synapseId}</span>
                                {scanResult.data.registrations && (
                                    <div className="result-registrations">
                                        {scanResult.data.registrations.map((reg, i) => (
                                            <span key={i} className="reg-badge">
                                                {reg.type === 'daypass' ? '🎫' : reg.type === 'competition' ? '🏆' : '🎉'} {reg.name}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                        <span className="tap-dismiss">Tap to dismiss</span>
                    </div>
                )}

                {/* Instructions */}
                <div className="scanner-instructions">
                    <h3>Instructions</h3>
                    <ul>
                        <li>Point the camera at the attendee's QR code</li>
                        <li>Keep the QR code within the frame</li>
                        <li>Wait for the confirmation message</li>
                        <li>Each user can only be scanned once per day</li>
                    </ul>
                </div>
            </div>
        </div>
    )
}

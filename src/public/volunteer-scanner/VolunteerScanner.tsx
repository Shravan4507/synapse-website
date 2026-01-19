import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Timestamp } from 'firebase/firestore'
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
    checkPaymentStatus,
    canVolunteerScanEvent,
    updateVolunteerStats,
    type QRVolunteer,
    type Attendance
} from '../../lib/qrVerificationService'
import {
    addToOfflineQueue,
    getOfflineQueue,
    getSyncStatus,
    setupAutoSync,
    isOnline,
    type SyncStatus
} from '../../lib/offlineQueueService'
import {
    feedbackSuccess,
    feedbackError,
    feedbackWarning,
    showCheckmark,
    getFeedbackOptions
} from '../../lib/feedbackService'
import { logAttendanceScan } from '../../lib/auditLogService'
import {
    addToScanHistory,
    getRecentScans,
    type ScanHistoryItem
} from '../../lib/scanHistoryService'
import {
    isInCooldown,
    getRemainingCooldown,
    addCooldown,
    formatCooldownTime
} from '../../lib/duplicatePreventionService'
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

    // Offline & Sync state
    const [online, setOnline] = useState(isOnline())
    const [pendingCount, setPendingCount] = useState(0)

    // Scan History
    const [recentScans, setRecentScans] = useState<ScanHistoryItem[]>([])

    // Debug state
    const [debugInfo, setDebugInfo] = useState({
        jsQRLoaded: false,
        scanAttempts: 0,
        lastScanTime: '',
        videoReady: false,
        scanLoopActive: false,
        errors: [] as string[]
    })

    // Refs for stable scanning
    const processQRCodeRef = useRef<((data: string) => void) | undefined>(undefined)
    const isProcessingRef = useRef(isProcessing)
    const cooldownRef = useRef(cooldown)

    // Update refs when state changes
    useEffect(() => {
        isProcessingRef.current = isProcessing
    }, [isProcessing])

    useEffect(() => {
        cooldownRef.current = cooldown
    }, [cooldown])

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
    // OFFLINE MODE & AUTO-SYNC
    // ========================================

    useEffect(() => {
        // Monitor online/offline status
        const handleOnline = () => {
            console.log('📡 Back online')
            setOnline(true)
        }

        const handleOffline = () => {
            console.log('📴 Went offline')
            setOnline(false)
        }

        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)

        // Setup auto-sync
        const cleanup = setupAutoSync(async (result) => {
            console.log('Auto-sync completed:', result)
            // Removed setSyncStatus as there is no corresponding state variable.
            setPendingCount(getOfflineQueue().length)

            if (result.success > 0) {
                feedbackSuccess(getFeedbackOptions())
            }
        })

        // Update pending count initially
        setPendingCount(getOfflineQueue().length)

        // Poll for pending count updates every 5 seconds
        const intervalId = setInterval(() => {
            setPendingCount(getOfflineQueue().length)
        }, 5000)

        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
            cleanup()
            clearInterval(intervalId)
        }
    }, [])

    // ========================================
    // SCAN HISTORY
    // ========================================

    useEffect(() => {
        // Load recent scans on mount
        setRecentScans(getRecentScans(10))
    }, [scanCount]) // Reload when scanCount changes

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
        setDebugInfo(prev => ({ ...prev, scanLoopActive: false, videoReady: false }));
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
        if (isProcessingRef.current || cooldownRef.current) return
        if (qrData === lastScannedId) return // Prevent duplicate scans

        console.log('Processing QR:', qrData)
        setIsProcessing(true)
        setLastScannedId(qrData)

        try {
            // Decode QR data
            const decoded = decodeQRData(qrData)

            if (!decoded) {
                feedbackError(getFeedbackOptions())
                setScanResult({
                    success: false,
                    message: 'Invalid QR code. Please scan a valid Synapse pass.'
                })
                setIsProcessing(false)
                return
            }

            // Check self-scan prevention
            if (decoded.synapseId === volunteer?.synapseId) {
                feedbackWarning(getFeedbackOptions())
                setScanResult({
                    success: false,
                    message: 'You cannot scan your own QR code!'
                })
                setIsProcessing(false)
                return
            }

            // Check if already marked today
            const scannedUser = await lookupUserBySynapseId(decoded.synapseId)
            const userId = scannedUser?.userId || decoded.synapseId
            const displayName = scannedUser?.displayName || decoded.synapseId

            // ✨ PHASE 3: Check cooldown (prevent rapid duplicate scans)
            if (isInCooldown(decoded.synapseId, volunteer?.synapseId || '')) {
                const remainingTime = getRemainingCooldown(decoded.synapseId, volunteer?.synapseId || '')
                feedbackWarning(getFeedbackOptions())
                setScanResult({
                    success: false,
                    message: `⏱️ Please wait ${formatCooldownTime(remainingTime)} before scanning again`
                })
                setIsProcessing(false)
                return
            }

            const alreadyMarked = await hasAttendanceToday(userId)

            if (alreadyMarked) {
                feedbackWarning(getFeedbackOptions())
                setScanResult({
                    success: false,
                    message: `${displayName} is already marked present today.`,
                    data: {
                        synapseId: decoded.synapseId,
                        displayName,
                        registrations: decoded.registrations
                    }
                })
                setIsProcessing(false)
                return
            }

            // ✨ PHASE 1: Payment Verification
            let paymentVerified = true
            let paymentStatus: 'pending' | 'paid' | 'free' = 'free'

            if (decoded.registrations && decoded.registrations.length > 0) {
                // Check payment for first registration (you can modify this logic)
                const firstReg = decoded.registrations[0]
                const paymentCheck = await checkPaymentStatus(
                    userId,
                    firstReg.type as any,
                    firstReg.id
                )

                paymentVerified = paymentCheck.verified
                paymentStatus = paymentCheck.status

                if (!paymentVerified) {
                    feedbackError(getFeedbackOptions())
                    setScanResult({
                        success: false,
                        message: `⚠ Payment not confirmed for ${displayName}. Status: ${paymentStatus}`,
                        data: {
                            synapseId: decoded.synapseId,
                            displayName,
                            registrations: decoded.registrations
                        }
                    })
                    setIsProcessing(false)
                    return
                }
            }

            // ✨ PHASE 1: Event Authorization Check
            // Check if volunteer is authorized to scan for this event type
            if (decoded.registrations && decoded.registrations.length > 0) {
                const eventType = decoded.registrations[0].type
                const authCheck = await canVolunteerScanEvent(
                    volunteer?.synapseId || '',
                    undefined, // eventId - not checking specific event for now
                    eventType
                )

                if (!authCheck.authorized) {
                    feedbackError(getFeedbackOptions())
                    setScanResult({
                        success: false,
                        message: `❌ Unauthorized: ${authCheck.reason}`,
                    })
                    setIsProcessing(false)
                    return
                }
            }

            // Prepare attendance record
            const attendanceData: Omit<Attendance, 'id' | 'syncedAt'> = {
                userId: userId,
                synapseId: decoded.synapseId,
                displayName: displayName,
                email: scannedUser?.email,
                college: scannedUser?.college,
                date: getTodayDate(),
                attended: true,
                scannedBy: volunteer?.synapseId || '',
                scannedByName: userData?.displayName || 'Volunteer',
                scannedAt: Timestamp.now(), // Add timestamp for offline queue
                offlineScanned: !isOnline(), // Mark if offline
                registrations: decoded.registrations,
                paymentStatus,
                paymentVerified,
                deviceInfo: navigator.userAgent
            }

            // ✨ PHASE 1: Offline Queue OR Direct Save
            let result: { success: boolean; id?: string; error?: string }

            if (isOnline()) {
                // Online: Direct save to Firestore
                result = await markAttendance(attendanceData)

                if (result.success) {
                    // ✨ PHASE 1: Update volunteer stats
                    await updateVolunteerStats(volunteer?.synapseId || '')

                    // ✨ PHASE 1: Log to audit trail
                    await logAttendanceScan(
                        result.id || '',
                        userId,
                        displayName,
                        volunteer?.userId || '',
                        userData?.displayName || 'Volunteer',
                        { paymentStatus, offline: false }
                    )
                }
            } else {
                // Offline: Add to queue
                const queueId = addToOfflineQueue(attendanceData)
                setPendingCount(getOfflineQueue().length)
                result = { success: true, id: queueId }
                console.log('📴 Added to offline queue:', queueId)
            }

            if (result.success) {
                // ✨ PHASE 1: Success Feedback (sound + vibration + visual)
                feedbackSuccess(getFeedbackOptions())
                showCheckmark(true)

                // ✨ PHASE 2: Add to scan history
                addToScanHistory({
                    id: result.id || `scan_${Date.now()}`,
                    synapseId: decoded.synapseId,
                    displayName: displayName,
                    scannedBy: volunteer?.synapseId || '',
                    scannedByName: userData?.displayName || 'Volunteer',
                    success: true,
                    offline: !isOnline(),
                    attendanceId: result.id
                })

                // ✨ PHASE 3: Add to cooldown to prevent rapid re-scans
                addCooldown(decoded.synapseId, volunteer?.synapseId || '')

                setScanResult({
                    success: true,
                    message: isOnline()
                        ? `✓ ${displayName} marked present!`
                        : `📴 ${displayName} queued (offline)`,
                    data: {
                        synapseId: decoded.synapseId,
                        displayName,
                        registrations: decoded.registrations
                    }
                })
                setScanCount(prev => prev + 1)
            } else {
                feedbackError(getFeedbackOptions())
                setScanResult({
                    success: false,
                    message: result.error || 'Failed to mark attendance'
                })
            }
        } catch (error) {
            console.error('Error processing QR:', error)
            feedbackError(getFeedbackOptions())
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
    }, [lastScannedId, volunteer, userData, online])

    // Update processQRCodeRef whenever processQRCode changes
    useEffect(() => {
        processQRCodeRef.current = processQRCode
    }, [processQRCode])

    // Scan for QR codes
    useEffect(() => {
        if (!cameraActive || !videoRef.current || !canvasRef.current) {
            console.log('Scanner inactive:', { cameraActive, hasVideo: !!videoRef.current, hasCanvas: !!canvasRef.current });
            setDebugInfo(prev => ({ ...prev, scanLoopActive: false, videoReady: false }));
            return;
        }

        const video = videoRef.current
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')

        if (!ctx) {
            const error = 'Failed to get canvas 2D context';
            console.error(error);
            setDebugInfo(prev => ({ ...prev, errors: [...prev.errors, error] }));
            return;
        }

        // Load QR scanner library dynamically
        const loadQRScanner = async () => {
            try {
                // Using a simple approach - check for jsQR library
                if (!(window as any).jsQR) {
                    console.log('Loading jsQR library...');
                    const script = document.createElement('script')
                    script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js'
                    script.async = false; // Make it synchronous

                    const loadPromise = new Promise((resolve, reject) => {
                        script.onload = () => {
                            console.log('jsQR library loaded successfully');
                            setDebugInfo(prev => ({ ...prev, jsQRLoaded: true }));
                            resolve(true);
                        };
                        script.onerror = (err) => {
                            const error = 'Failed to load jsQR library';
                            console.error(error, err);
                            setDebugInfo(prev => ({ ...prev, errors: [...prev.errors, error] }));
                            reject(err);
                        };
                    });

                    document.body.appendChild(script);
                    await loadPromise;
                } else {
                    console.log('jsQR library already loaded');
                    setDebugInfo(prev => ({ ...prev, jsQRLoaded: true }));
                }

                console.log('Starting scanning loop...');
                setDebugInfo(prev => ({ ...prev, scanLoopActive: true }));

                let logCounter = 0;
                let successfulScans = 0;

                scanIntervalRef.current = window.setInterval(() => {
                    try {
                        const videoDataReady = video && video.readyState === video.HAVE_ENOUGH_DATA;
                        const dimensionsReady = video && video.videoWidth > 0 && video.videoHeight > 0;

                        // Update debug info
                        if (logCounter % 10 === 0) {
                            setDebugInfo(prev => ({
                                ...prev,
                                videoReady: videoDataReady && dimensionsReady,
                                scanAttempts: prev.scanAttempts + 1,
                                lastScanTime: new Date().toLocaleTimeString()
                            }));
                        }

                        if (!videoDataReady || !dimensionsReady) {
                            if (logCounter % 40 === 0) {
                                console.log('Scanner waiting:', {
                                    videoDataReady,
                                    dimensionsReady,
                                    readyState: video?.readyState,
                                    width: video?.videoWidth,
                                    height: video?.videoHeight
                                });
                            }
                            logCounter++;
                            return;
                        }

                        canvas.width = video.videoWidth;
                        canvas.height = video.videoHeight;
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

                        // jsQR expects (Uint8ClampedArray, width, height)
                        const jsQR = (window as any).jsQR;

                        if (!jsQR) {
                            if (logCounter % 40 === 0) {
                                console.error('jsQR not available on window object');
                                setDebugInfo(prev => ({
                                    ...prev,
                                    jsQRLoaded: false,
                                    errors: [...prev.errors, 'jsQR library not loaded']
                                }));
                            }
                            logCounter++;
                            return;
                        }

                        const code = jsQR(imageData.data, imageData.width, imageData.height);

                        if (code?.data) {
                            successfulScans++;
                            console.log('✅ QR DETECTED!', {
                                data: code.data,
                                location: code.location,
                                totalScans: successfulScans
                            });

                            if (processQRCodeRef.current) {
                                processQRCodeRef.current(code.data);
                            } else {
                                console.error('processQRCodeRef.current is undefined!');
                            }
                        }

                        logCounter++;
                    } catch (err) {
                        console.error('Error in scan loop:', err);
                        setDebugInfo(prev => ({
                            ...prev,
                            errors: [...prev.errors, `Scan error: ${err}`]
                        }));
                    }
                }, 200); // Scan every 200ms
            } catch (error) {
                console.error('Error in loadQRScanner:', error);
                setDebugInfo(prev => ({
                    ...prev,
                    errors: [...prev.errors, `Load error: ${error}`]
                }));
            }
        }

        loadQRScanner()

        return () => {
            if (scanIntervalRef.current) {
                clearInterval(scanIntervalRef.current)
            }
            setDebugInfo(prev => ({ ...prev, scanLoopActive: false }));
        }
    }, [cameraActive])

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
                    <div className="stat-item status">
                        <span className={`status-dot ${online ? 'active' : ''}`}></span>
                        <span className="stat-label">{online ? 'Online' : 'Offline'}</span>
                    </div>
                    {pendingCount > 0 && (
                        <div className="stat-item">
                            <span className="stat-value offline">{pendingCount}</span>
                            <span className="stat-label">Pending Sync</span>
                        </div>
                    )}
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

                {/* Debug Panel */}
                <div className="debug-panel">
                    <h3>🔧 Scanner Status</h3>
                    <div className="debug-grid">
                        <div className="debug-item">
                            <span className="debug-label">jsQR Library:</span>
                            <span className={`debug-value ${debugInfo.jsQRLoaded ? 'success' : 'error'}`}>
                                {debugInfo.jsQRLoaded ? '✓ Loaded' : '✗ Not Loaded'}
                            </span>
                        </div>
                        <div className="debug-item">
                            <span className="debug-label">Video Ready:</span>
                            <span className={`debug-value ${debugInfo.videoReady ? 'success' : 'error'}`}>
                                {debugInfo.videoReady ? '✓ Ready' : '✗ Not Ready'}
                            </span>
                        </div>
                        <div className="debug-item">
                            <span className="debug-label">Scan Loop:</span>
                            <span className={`debug-value ${debugInfo.scanLoopActive ? 'success' : 'error'}`}>
                                {debugInfo.scanLoopActive ? '✓ Active' : '✗ Inactive'}
                            </span>
                        </div>
                        <div className="debug-item">
                            <span className="debug-label">Scan Attempts:</span>
                            <span className="debug-value">{debugInfo.scanAttempts}</span>
                        </div>
                        <div className="debug-item">
                            <span className="debug-label">Last Scan:</span>
                            <span className="debug-value">{debugInfo.lastScanTime || 'Never'}</span>
                        </div>
                        <div className="debug-item">
                            <span className="debug-label">Processing:</span>
                            <span className={`debug-value ${isProcessing ? 'warning' : ''}`}>
                                {isProcessing ? '⏳ Yes' : 'No'}
                            </span>
                        </div>
                    </div>
                    {debugInfo.errors.length > 0 && (
                        <div className="debug-errors">
                            <strong>Errors:</strong>
                            {debugInfo.errors.slice(-3).map((err, i) => (
                                <div key={i} className="debug-error">{err}</div>
                            ))}
                        </div>
                    )}
                    <button
                        className="debug-clear-btn"
                        onClick={() => setDebugInfo(prev => ({ ...prev, errors: [], scanAttempts: 0 }))}
                    >
                        Clear Debug Info
                    </button>
                </div>

                {/* ✨ PHASE 2: Recent Scans */}
                {recentScans.length > 0 && (
                    <div className="recent-scans">
                        <h3>📋 Recent Scans ({recentScans.length})</h3>
                        <div className="scans-list">
                            {recentScans.map((scan, index) => (
                                <div
                                    key={scan.id}
                                    className={`scan-item ${scan.success ? 'success' : 'failed'} ${scan.offline ? 'offline' : ''}`}
                                >
                                    <div className="scan-number">{index + 1}</div>
                                    <div className="scan-info">
                                        <div className="scan-name">{scan.displayName}</div>
                                        <div className="scan-id">{scan.synapseId}</div>
                                    </div>
                                    <div className="scan-meta">
                                        <span className="scan-time">
                                            {new Date(scan.scannedAt).toLocaleTimeString()}
                                        </span>
                                        {scan.offline && <span className="offline-badge">📴</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
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

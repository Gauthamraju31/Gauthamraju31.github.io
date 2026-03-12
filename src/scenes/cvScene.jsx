import React, { useRef, useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import * as ort from 'onnxruntime-web'
import * as THREE from 'three'
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'
import { playClickBeepSound } from '../utils/sounds'

// ─── COCO 80-class labels ────────────────────────────────────────────────────
const COCO_LABELS = [
    'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat',
    'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat',
    'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe', 'backpack',
    'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee', 'skis', 'snowboard', 'sports ball',
    'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard', 'tennis racket',
    'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple',
    'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair',
    'couch', 'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop', 'mouse',
    'remote', 'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'sink',
    'refrigerator', 'book', 'clock', 'vase', 'scissors', 'teddy bear', 'hair drier', 'toothbrush'
]

// ─── Model configuration ─────────────────────────────────────────────────────
// const MODEL_URL = 'https://huggingface.co/nickmuchi/yolov8n-onnx/resolve/main/yolov8n.onnx'
// const MODEL_URL = 'https://huggingface.co/unity/inference-engine-yolo/resolve/ed7f4daf9263d0d31be1d60b9d67c8baea721d60/yolov8n.onnx'
const MODEL_URL = '/models/yolov8n.onnx'
const MODEL_INPUT_SIZE = 640 // YOLOv8n expects 640x640
const CONF_THRESHOLD = 0.45
const IOU_THRESHOLD = 0.5

// Point ONNX Runtime to CDN-hosted WASM binaries (Vite can't serve them from node_modules)
ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.24.3/dist/'

// Use 4 threads when SharedArrayBuffer is available (Firebase / cross-origin-isolated),
// otherwise fall back to single-threaded mode (GitHub Pages).
ort.env.wasm.numThreads = typeof SharedArrayBuffer !== 'undefined' ? 4 : 1

// Pre-allocate the NCHW float buffer once — reused every frame to avoid GC pressure
const _PIXEL_COUNT = MODEL_INPUT_SIZE * MODEL_INPUT_SIZE
const _FLOAT_BUF = new Float32Array(3 * _PIXEL_COUNT)

// ─── Pre-processing: Canvas frame → Float32 NCHW tensor ──────────────────────
// Canvas is already drawn at MODEL_INPUT_SIZE x MODEL_INPUT_SIZE, so no scaling
// is needed — just unpack RGBA → planar RGB float, reusing the pre-alloc buffer.
function preprocessFrame(canvas) {
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    const { data } = ctx.getImageData(0, 0, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE)

    for (let i = 0; i < _PIXEL_COUNT; i++) {
        const base = i << 2                    // i * 4
        _FLOAT_BUF[i] = data[base] / 255.0  // R plane
        _FLOAT_BUF[_PIXEL_COUNT + i] = data[base + 1] / 255.0  // G plane
        _FLOAT_BUF[2 * _PIXEL_COUNT + i] = data[base + 2] / 255.0  // B plane
    }

    // Slice creates a copy — required because ORT takes ownership of the buffer
    return new ort.Tensor('float32', _FLOAT_BUF.slice(), [1, 3, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE])
}

// ─── Post-processing: YOLOv8 output [1, 84, 8400] → detections ───────────────
function postprocessOutput(outputTensor, imgWidth, imgHeight) {
    const data = outputTensor.data // Float32Array
    const [, numFields, numDetections] = outputTensor.dims // [1, 84, 8400]

    const detections = []

    for (let i = 0; i < numDetections; i++) {
        // Extract box coords (center_x, center_y, width, height) — normalized to 640
        const cx = data[0 * numDetections + i]
        const cy = data[1 * numDetections + i]
        const w = data[2 * numDetections + i]
        const h = data[3 * numDetections + i]

        // Find best class score
        let maxScore = 0
        let maxClassIdx = 0
        for (let c = 4; c < numFields; c++) {
            const score = data[c * numDetections + i]
            if (score > maxScore) {
                maxScore = score
                maxClassIdx = c - 4
            }
        }

        if (maxScore < CONF_THRESHOLD) continue

        // Convert from center/wh in 640-space to percentage (0-1)
        const xmin = (cx - w / 2) / MODEL_INPUT_SIZE
        const ymin = (cy - h / 2) / MODEL_INPUT_SIZE
        const xmax = (cx + w / 2) / MODEL_INPUT_SIZE
        const ymax = (cy + h / 2) / MODEL_INPUT_SIZE

        detections.push({
            label: COCO_LABELS[maxClassIdx] || `class_${maxClassIdx}`,
            score: maxScore,
            box: { xmin, ymin, xmax, ymax }
        })
    }

    // Non-Maximum Suppression (greedy)
    return nms(detections, IOU_THRESHOLD)
}

function nms(detections, iouThreshold) {
    // Sort by score descending
    detections.sort((a, b) => b.score - a.score)
    const kept = []

    while (detections.length > 0) {
        const best = detections.shift()
        kept.push(best)
        detections = detections.filter(det => iou(best.box, det.box) < iouThreshold)
    }

    return kept
}

function iou(boxA, boxB) {
    const x1 = Math.max(boxA.xmin, boxB.xmin)
    const y1 = Math.max(boxA.ymin, boxB.ymin)
    const x2 = Math.min(boxA.xmax, boxB.xmax)
    const y2 = Math.min(boxA.ymax, boxB.ymax)

    const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1)
    const areaA = (boxA.xmax - boxA.xmin) * (boxA.ymax - boxA.ymin)
    const areaB = (boxB.xmax - boxB.xmin) * (boxB.ymax - boxB.ymin)

    return intersection / (areaA + areaB - intersection + 1e-6)
}

// ─── React Component ──────────────────────────────────────────────────────────
export default function CvWebcamScene() {
    const videoRef = useRef(null)
    const canvasRef = useRef(null)
    const [stream, setStream] = useState(null)
    const [cameraStatus, setCameraStatus] = useState('initializing')
    const [modelStatus, setModelStatus] = useState('idle')
    const modelStatusRef = useRef('idle')
    const [loadingProgress, setLoadingProgress] = useState(0)
    const [modelErrorMsg, setModelErrorMsg] = useState('')
    const [fps, setFps] = useState(0)
    const [activeModel, setActiveModel] = useState('detection')

    // Object Detection Refs
    const sessionRef = useRef(null)
    const streamRef = useRef(null)          // ref so cleanup always has the live stream
    const isInferencing = useRef(false)
    const latestOutput = useRef(null)

    // Face Mesh Refs
    const faceLandmarkerRef = useRef(null)
    const webglCanvasRef = useRef(null)
    const threeSceneRef = useRef(null)
    const latestFaceLandmarks = useRef(null)

    const renderFrameId = useRef(null)
    const inferenceTimeoutId = useRef(null)
    const inferenceCanvasRef = useRef(null)

    const CV_MODELS = [
        { id: 'detection', name: 'Object Detection', ready: true },
        { id: 'segmentation', name: 'Image Segmentation', ready: false },
        { id: 'keypoints', name: 'Face Keypoints (WIP)', ready: false },
        { id: 'mesh', name: 'Face Mesh', ready: true }
    ]

    // ─── 1. Initialize Webcam ────────────────────────────────────────────
    useEffect(() => {
        async function setupCamera() {
            try {
                const mediaStream = await navigator.mediaDevices.getUserMedia({
                    video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
                    audio: false
                })
                streamRef.current = mediaStream   // write ref before async state update
                setStream(mediaStream)
                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream
                    videoRef.current.onloadedmetadata = () => videoRef.current.play()
                }
                setCameraStatus('ready')
            } catch (err) {
                console.error('[CV] Camera error:', err)
                setCameraStatus('error')
            }
        }
        setupCamera()

        return () => {
            // Use ref — stream state is always null here due to stale closure
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop())
                streamRef.current = null
            }
            if (renderFrameId.current) cancelAnimationFrame(renderFrameId.current)
            if (inferenceTimeoutId.current) clearTimeout(inferenceTimeoutId.current)
            if (threeSceneRef.current && threeSceneRef.current.renderer) {
                threeSceneRef.current.renderer.dispose()
            }
        }
    }, [])

    // ─── 1.5 Setup Three.js for Face Mesh Overlay ─────────────────────────
    useEffect(() => {
        if (!webglCanvasRef.current) return

        const canvas = webglCanvasRef.current
        const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
        renderer.setClearColor(0x000000, 0) // Ensure clear() results in transparent canvas

        // Use OrthographicCamera perfectly matching canvas pixels for 1:1 overlay
        // left=0, right=width, top=0, bottom=height so Y=0 is the top edge
        const camera = new THREE.OrthographicCamera(0, canvas.width, 0, canvas.height, 0.1, 1000)
        camera.position.z = 100

        const scene = new THREE.Scene()

        // Max 478 points in mediapipe face mesh
        const geometry = new THREE.BufferGeometry()
        const positions = new Float32Array(478 * 3)
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

        // Define wireframe material
        const material = new THREE.LineBasicMaterial({
            color: 0xff1a1a,
            transparent: true,
            opacity: 0.8,
            depthTest: false,
            blending: THREE.AdditiveBlending
        })

        const mesh = new THREE.LineSegments(geometry, material)
        // Note: we'll populate the index array dynamically when we have the actual TESSELATION data from mediapipe
        mesh.visible = false
        scene.add(mesh)

        threeSceneRef.current = { renderer, camera, scene, mesh, geometry }

        return () => {
            geometry.dispose()
            material.dispose()
            renderer.dispose()
        }
    }, [])

    // ─── 2. Load ONNX Model ──────────────────────────────────────────────
    useEffect(() => {
        if (activeModel !== 'detection') return

        const loadModel = async () => {
            setModelStatus('loading')
            modelStatusRef.current = 'loading'
            setLoadingProgress(0)

            await new Promise(resolve => setTimeout(resolve, 100))

            try {
                console.log('[CV] Downloading YOLOv8n ONNX model...')

                // Fetch model with progress tracking
                const response = await fetch(MODEL_URL)
                const contentLength = response.headers.get('Content-Length')
                const totalBytes = contentLength ? parseInt(contentLength) : 0

                const reader = response.body.getReader()
                const chunks = []
                let receivedBytes = 0

                while (true) {
                    const { done, value } = await reader.read()
                    if (done) break
                    chunks.push(value)
                    receivedBytes += value.length
                    if (totalBytes > 0) {
                        setLoadingProgress(Math.round((receivedBytes / totalBytes) * 100))
                    }
                }

                const modelBuffer = new Uint8Array(receivedBytes)
                let offset = 0
                for (const chunk of chunks) {
                    modelBuffer.set(chunk, offset)
                    offset += chunk.length
                }

                console.log(`[CV] Model downloaded: ${(receivedBytes / 1024 / 1024).toFixed(1)} MB`)

                // Create ONNX Runtime inference session
                // powerPreference: 'high-performance' forces the Vulkan/RADV adapter
                // instead of the default ANGLE/OpenGLES compatibility-mode adapter,
                // which lacks the compute shader features ONNX RT WebGPU needs.
                const session = await ort.InferenceSession.create(modelBuffer.buffer, {
                    executionProviders: [
                        { name: 'webgpu', powerPreference: 'high-performance' },
                        'webgl',
                        'wasm'
                    ],
                    graphOptimizationLevel: 'all'
                })

                console.log('[CV] ONNX Session created. Inputs:', session.inputNames, 'Outputs:', session.outputNames)
                sessionRef.current = session
                setModelStatus('ready')
                modelStatusRef.current = 'ready'
                setLoadingProgress(100)
            } catch (err) {
                console.error('[CV] Model loading failed:', err)
                setModelStatus('error')
                modelStatusRef.current = 'error'
                setModelErrorMsg(err.message || 'Failed to load ONNX model.')
            }
        }

        loadModel()

        // Cleanup ONNX session on unmount or model switch
        return () => {
            if (sessionRef.current) {
                try {
                    sessionRef.current.release()
                } catch (e) {
                    console.error('Error releasing ONNX session', e)
                }
                sessionRef.current = null
            }
        }
    }, [activeModel])

    // ─── 2.5 Load MediaPipe FaceLandmarker ───────────────────────────────
    useEffect(() => {
        if (activeModel !== 'mesh') {
            if (threeSceneRef.current) threeSceneRef.current.mesh.visible = false
            return
        }

        const loadModel = async () => {
            setModelStatus('loading')
            modelStatusRef.current = 'loading'
            setLoadingProgress(0)

            try {
                console.log('[CV] Downloading MediaPipe Face Mesh model...')

                // Simulate progress since wasm loading isn't perfectly trackable
                const progressInterval = setInterval(() => {
                    setLoadingProgress(p => Math.min(p + 15, 90))
                }, 100)

                const vision = await FilesetResolver.forVisionTasks(
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.12/wasm"
                )

                faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
                        delegate: "CPU"
                    },
                    outputFaceBlendshapes: false,
                    runningMode: "VIDEO",
                    numFaces: 1
                })

                clearInterval(progressInterval)

                // Initialize the ThreeJS Index buffer with the connection mapping
                if (threeSceneRef.current && threeSceneRef.current.geometry) {
                    const connections = FaceLandmarker.FACE_LANDMARKS_TESSELATION
                    const indices = []
                    connections.forEach(conn => {
                        indices.push(conn.start, conn.end)
                    })
                    threeSceneRef.current.geometry.setIndex(indices)
                }

                console.log('[CV] Face Landmarker Session created.')
                setModelStatus('ready')
                modelStatusRef.current = 'ready'
                setLoadingProgress(100)
            } catch (err) {
                console.error('[CV] MediaPipe loading failed:', err)
                setModelStatus('error')
                modelStatusRef.current = 'error'
                setModelErrorMsg(err.message || 'Failed to load MediaPipe model.')
            }
        }

        loadModel()

        // Cleanup MediaPipe allocated memory and contexts on unmount or model switch
        return () => {
            if (faceLandmarkerRef.current) {
                try {
                    faceLandmarkerRef.current.close()
                } catch (e) {
                    console.error('Error closing FaceLandmarker', e)
                }
                faceLandmarkerRef.current = null
            }
        }
    }, [activeModel])

    // ─── 3. Render Loop — Draws overlay on top of video ──────────────────
    const renderLoop = useCallback(() => {
        if (!videoRef.current || videoRef.current.readyState < 2) {
            renderFrameId.current = requestAnimationFrame(renderLoop)
            return
        }

        const video = videoRef.current
        const canvas = canvasRef.current
        const glCanvas = webglCanvasRef.current
        const ctx = canvas ? canvas.getContext('2d') : null
        const threeScene = threeSceneRef.current // We always need to clear it just in case

        // Sync canvas resolution to video display size
        const displayW = video.clientWidth
        const displayH = video.clientHeight

        if (canvas && (canvas.width !== displayW || canvas.height !== displayH)) {
            canvas.width = displayW
            canvas.height = displayH
        }

        if (glCanvas && (glCanvas.width !== displayW || glCanvas.height !== displayH)) {
            glCanvas.width = displayW
            glCanvas.height = displayH

            if (threeScene) {
                threeScene.renderer.setSize(displayW, displayH, false)
                // When resizing orthographic camera, update bounds
                threeScene.camera.right = displayW
                threeScene.camera.top = 0
                threeScene.camera.bottom = displayH
                threeScene.camera.updateProjectionMatrix()
            }

            // Force a re-render on resize to ensure mesh appears immediately if active
            if (activeModel === 'mesh' && threeScene) {
                threeScene.renderer.render(threeScene.scene, threeScene.camera)
            }
        }

        // Calculate actual video display area (object-contain letterboxing)
        const videoAspect = video.videoWidth / video.videoHeight
        const canvasAspect = canvas.width / canvas.height
        let renderW, renderH, offsetX, offsetY

        if (videoAspect > canvasAspect) {
            renderW = canvas.width
            renderH = canvas.width / videoAspect
            offsetX = 0
            offsetY = (canvas.height - renderH) / 2
        } else {
            renderH = canvas.height
            renderW = canvas.height * videoAspect
            offsetX = (canvas.width - renderW) / 2
            offsetY = 0
        }

        // --- 1. Handle 2D Canvas (Detection) ---
        if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height)

            if (activeModel === 'detection') {
                const output = latestOutput.current
                if (output && output.length > 0) {
                    output.forEach(det => {
                        if (!det || !det.box) return
                        const { xmin, ymin, xmax, ymax } = det.box

                        const x = offsetX + xmin * renderW
                        const y = offsetY + ymin * renderH
                        const w = (xmax - xmin) * renderW
                        const h = (ymax - ymin) * renderH

                        // Sci-fi red bounding box
                        ctx.strokeStyle = '#ff1a1a'
                        ctx.lineWidth = 2
                        ctx.strokeRect(x, y, w, h)

                        // Label
                        const labelText = `${det.label} (${Math.round(det.score * 100)}%)`
                        ctx.font = '12px Courier New'
                        const textW = ctx.measureText(labelText).width + 10
                        ctx.fillStyle = 'rgba(255, 26, 26, 0.85)'
                        ctx.fillRect(x, y - 20, textW, 20)
                        ctx.fillStyle = '#ffffff'
                        ctx.fillText(labelText, x + 4, y - 6)

                        // Corner accents
                        const cL = 10
                        ctx.lineWidth = 3
                        ctx.strokeStyle = '#ff1a1a'
                        ctx.beginPath()
                        ctx.moveTo(x, y + cL); ctx.lineTo(x, y); ctx.lineTo(x + cL, y)
                        ctx.moveTo(x + w - cL, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + cL)
                        ctx.moveTo(x, y + h - cL); ctx.lineTo(x, y + h); ctx.lineTo(x + cL, y + h)
                        ctx.moveTo(x + w - cL, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - cL)
                        ctx.stroke()
                    })
                }
            }
        }

        // --- 2. Handle 3D Canvas (Mesh) ---
        if (threeScene) {
            // Always clear the webgl canvas so it doesn't leave ghosts when switching models
            threeScene.renderer.clear()

            if (activeModel === 'mesh') {
                const result = latestFaceLandmarks.current

                if (result && result.faceLandmarks && result.faceLandmarks.length > 0) {
                    const landmarks = result.faceLandmarks[0]
                    const positions = threeScene.geometry.attributes.position.array

                    // Map MediaPipe normalized coords (0-1) to our display pixel coords
                    for (let i = 0; i < landmarks.length; i++) {
                        const lm = landmarks[i]
                        // MediaPipe output is perfectly normalized relative to the actual video source
                        // which has been scaled to renderW x renderH and offset by offsetX/Y
                        positions[i * 3] = offsetX + (lm.x * renderW)
                        positions[i * 3 + 1] = offsetY + (lm.y * renderH)
                        positions[i * 3 + 2] = lm.z * renderW * -1
                    }

                    threeScene.geometry.attributes.position.needsUpdate = true
                    threeScene.mesh.visible = true

                    threeScene.renderer.render(threeScene.scene, threeScene.camera)
                } else {
                    threeScene.mesh.visible = false
                }
            }
        }

        renderFrameId.current = requestAnimationFrame(renderLoop)
    }, [activeModel])

    // ─── 4. Inference Loop — Runs ONNX model on video frames ─────────────
    const runInference = useCallback(async () => {
        if (!videoRef.current || modelStatusRef.current !== 'ready') {
            inferenceTimeoutId.current = setTimeout(runInference, 200)
            return
        }

        // Wait for respective model engine
        if (activeModel === 'detection' && !sessionRef.current) {
            inferenceTimeoutId.current = setTimeout(runInference, 200)
            return
        }
        if (activeModel === 'mesh' && !faceLandmarkerRef.current) {
            inferenceTimeoutId.current = setTimeout(runInference, 200)
            return
        }

        if (isInferencing.current || videoRef.current.readyState < 2) {
            inferenceTimeoutId.current = setTimeout(runInference, 50)
            return
        }

        isInferencing.current = true
        const start = performance.now()

        try {
            const video = videoRef.current

            if (activeModel === 'detection') {
                // Capture video frame to offscreen canvas at model input size
                if (!inferenceCanvasRef.current) {
                    inferenceCanvasRef.current = document.createElement('canvas')
                    inferenceCanvasRef.current.width = MODEL_INPUT_SIZE
                    inferenceCanvasRef.current.height = MODEL_INPUT_SIZE
                }
                const offCanvas = inferenceCanvasRef.current
                const offCtx = offCanvas.getContext('2d', { willReadFrequently: true })
                offCtx.drawImage(video, 0, 0, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE)

                // Pre-process into NCHW Float32 tensor
                const inputTensor = preprocessFrame(offCanvas)

                // Run ONNX inference
                const inputName = sessionRef.current.inputNames[0]
                const feeds = { [inputName]: inputTensor }
                const results = await sessionRef.current.run(feeds)

                // Get output tensor
                const outputName = sessionRef.current.outputNames[0]
                const outputTensor = results[outputName]

                // Post-process: decode boxes + NMS
                const detections = postprocessOutput(outputTensor, video.videoWidth, video.videoHeight)
                latestOutput.current = detections

                // Clear any lingering face mesh data
                latestFaceLandmarks.current = null
            } else if (activeModel === 'mesh') {
                const startTimeMs = performance.now()
                // Process video feed directly — MediaPipe handles WebGL extraction nicely
                const result = faceLandmarkerRef.current.detectForVideo(video, startTimeMs)
                latestFaceLandmarks.current = result

                // Clear any lingering detection boxes
                latestOutput.current = []
            }
        } catch (e) {
            console.error(`[CV] ${activeModel} Inference error:`, e)
        }

        const end = performance.now()
        setFps(Math.round(1000 / (end - start)))
        isInferencing.current = false

        inferenceTimeoutId.current = setTimeout(runInference, 0)
    }, [activeModel])

    // ─── Mount loops ─────────────────────────────────────────────────────
    useEffect(() => {
        renderFrameId.current = requestAnimationFrame(renderLoop)
        inferenceTimeoutId.current = setTimeout(runInference, 100)

        return () => {
            if (renderFrameId.current) cancelAnimationFrame(renderFrameId.current)
            if (inferenceTimeoutId.current) clearTimeout(inferenceTimeoutId.current)
        }
    }, [renderLoop, runInference])

    // ─── JSX ─────────────────────────────────────────────────────────────
    return (
        <div className="absolute inset-0 flex mt-14 p-4 md:p-8 gap-6 pointer-events-auto">

            {/* Main Viewport */}
            <div className="flex-1 relative border border-[var(--color-border-dim)] rounded-lg overflow-hidden bg-black flex items-center justify-center shadow-[0_0_30px_rgba(255,26,26,0.1)] group">
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-contain opacity-90 transition-opacity duration-300 group-hover:opacity-100"
                />

                <canvas
                    ref={canvasRef}
                    className="absolute inset-0 pointer-events-none"
                    style={{ zIndex: 1 }}
                />

                <canvas
                    ref={webglCanvasRef}
                    className="absolute inset-0 pointer-events-none"
                    style={{ zIndex: 2 }}
                />

                {/* Camera States */}
                {cameraStatus === 'initializing' && (
                    <div className="absolute inset-0 flex items-center justify-center flex-col gap-4 bg-black/50 backdrop-blur-sm z-10">
                        <div className="w-8 h-8 rounded-full border-t-2 border-[var(--color-red)] animate-spin" />
                        <p className="text-[var(--color-text-dim)] font-[family-name:var(--font-mono)] text-xs tracking-widest uppercase">Connecting to Camera...</p>
                    </div>
                )}

                {cameraStatus === 'error' && (
                    <div className="absolute inset-0 flex items-center justify-center flex-col gap-4 bg-black/90 backdrop-blur-md z-20">
                        <p className="text-[var(--color-red)] font-[family-name:var(--font-mono)] text-sm tracking-widest uppercase animate-pulse">Camera Access Denied</p>
                        <p className="text-[var(--color-text-dim)] font-[family-name:var(--font-mono)] text-xs max-w-sm text-center">Please allow camera permissions in your browser.</p>
                    </div>
                )}

                {/* Model States */}
                {modelStatus === 'error' && cameraStatus === 'ready' && (
                    <div className="absolute inset-0 flex items-center justify-center flex-col gap-6 bg-black/80 backdrop-blur-sm z-10 px-12 text-center">
                        <p className="text-[var(--color-red)] font-[family-name:var(--font-mono)] text-sm tracking-widest uppercase animate-pulse">Neural Initialization Failed</p>
                        <div className="border border-[var(--color-red)]/30 bg-[rgba(255,26,26,0.05)] p-4 rounded max-w-lg overflow-auto">
                            <p className="text-[var(--color-red)] font-[family-name:var(--font-mono)] text-[10px] whitespace-pre-wrap text-left break-words">
                                ERROR LOG: {modelErrorMsg}
                            </p>
                        </div>
                        <p className="text-[var(--color-text-dim)] font-[family-name:var(--font-mono)] text-[10px] tracking-wider">Try clearing browser cache or refreshing.</p>
                    </div>
                )}

                {modelStatus === 'loading' && (
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 px-12">
                        <p className="text-[var(--color-red)] font-[family-name:var(--font-mono)] text-sm tracking-widest uppercase mb-6 animate-pulse">
                            {activeModel === 'detection' ? 'Downloading YOLOv8n Weights' : 'Downloading MediaPipe Weights'}
                        </p>
                        <div className="w-full max-w-md h-1 bg-gray-900 rounded-full overflow-hidden relative">
                            <motion.div
                                className="h-full bg-[var(--color-red)] origin-left shadow-[0_0_10px_#ff1a1a]"
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: loadingProgress / 100 }}
                                transition={{ ease: "linear", duration: 0.1 }}
                            />
                        </div>
                        <p className="text-[var(--color-text-dim)] font-[family-name:var(--font-mono)] text-[10px] tracking-widest uppercase mt-4">
                            {Math.round(loadingProgress)}% / TARGET: {activeModel === 'detection' ? 'ONNX [WebGPU → WebGL → WASM]' : 'MediaPipe [WASM]'}
                        </p>
                    </div>
                )}

                {/* HUD Elements */}
                <div className="absolute top-4 left-4 border border-[var(--color-red)]/30 bg-black/50 px-3 py-1.5 rounded backdrop-blur text-[10px] font-[family-name:var(--font-mono)] text-[var(--color-red)] tracking-widest uppercase pointer-events-none">
                    REC <span className="inline-block w-2 h-2 bg-[var(--color-red)] rounded-full ml-2 animate-pulse" />
                </div>
                {modelStatus === 'ready' && fps > 0 && (
                    <div className="absolute top-4 right-4 border border-[var(--color-border-dim)] bg-black/50 px-3 py-1.5 rounded backdrop-blur text-[10px] font-[family-name:var(--font-mono)] text-[var(--color-text-dim)] tracking-widest uppercase pointer-events-none">
                        INFERENCE: {fps} FPS
                    </div>
                )}
                <div className="absolute bottom-4 left-4 border-l border-b border-[var(--color-red)]/50 w-8 h-8 pointer-events-none" />
                <div className="absolute bottom-4 right-4 border-r border-b border-[var(--color-red)]/50 w-8 h-8 pointer-events-none" />
                <div className="absolute top-4 left-4 border-l border-t border-[var(--color-red)]/50 w-8 h-8 pointer-events-none" />
                <div className="absolute top-4 right-4 border-r border-t border-[var(--color-red)]/50 w-8 h-8 pointer-events-none" />
            </div>

            {/* Sidebar Controls */}
            <div className="w-64 flex flex-col gap-4 z-0 overflow-y-auto pt-2">
                <div>
                    <h2 className="text-[12px] tracking-[3px] uppercase text-[var(--color-red)] mb-4 font-[family-name:var(--font-heading)]">
                        Model Configuration
                    </h2>
                    <p className="text-[11px] text-[var(--color-text-dim)] tracking-wide font-[family-name:var(--font-mono)] leading-relaxed">
                        Execute YOLOv8n locally via ONNX Runtime Web (WASM). No data leaves your browser.
                    </p>
                </div>

                <div className="flex flex-col gap-3">
                    {CV_MODELS.map((model) => (
                        <button
                            key={model.id}
                            disabled={!model.ready}
                            onClick={() => {
                                if (model.ready && activeModel !== model.id) {
                                    playClickBeepSound()
                                    setActiveModel(model.id)
                                }
                            }}
                            className={`
                                flex flex-col text-left px-4 py-3 border rounded transition-all duration-300 font-[family-name:var(--font-mono)]
                                ${!model.ready ? 'opacity-30 cursor-not-allowed border-gray-900 bg-transparent' :
                                    activeModel === model.id
                                        ? 'border-[var(--color-red)] bg-[rgba(255,26,26,0.05)] shadow-[inset_0_0_15px_rgba(255,26,26,0.1)]'
                                        : 'border-[var(--color-border-dim)] hover:border-[var(--color-red)] hover:bg-[rgba(255,26,26,0.02)] cursor-pointer'
                                }
                            `}
                        >
                            <span className={`text-xs tracking-wider uppercase ${activeModel === model.id ? 'text-white' : 'text-[var(--color-text-dim)]'}`}>
                                {model.name}
                            </span>
                            <span className={`text-[9px] tracking-widest mt-1 ${activeModel === model.id ? 'text-[var(--color-red)]' : 'text-gray-600'}`}>
                                {model.ready ? `TGL -> ${model.id.toUpperCase()}` : 'OFFLINE'}
                            </span>
                        </button>
                    ))}
                </div>

                {/* System Load */}
                <div className="mt-auto border-t border-[var(--color-border-dim)] pt-6">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="w-1.5 h-1.5 bg-[var(--color-text-dim)] rounded-full animate-ping" />
                        <span className="text-[10px] text-[var(--color-text-dim)] tracking-[2px] uppercase font-[family-name:var(--font-mono)]">System Load</span>
                    </div>
                    <div className="h-1 w-full bg-gray-900 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-[var(--color-text-dim)] transition-all duration-300 ease-in-out"
                            style={{ width: `${modelStatus === 'ready' && fps > 0 ? (fps > 20 ? 40 : fps > 10 ? 70 : 95) : 0}%` }}
                        />
                    </div>
                </div>
            </div>

        </div>
    )
}

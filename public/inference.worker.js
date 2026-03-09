/**
 * Web Worker for ONNX model inference.
 * Runs entirely off the main thread so the video feed stays at 60fps.
 */
importScripts('https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort.min.js');

let session = null;
const INPUT_SIZE = 640;
const CONF_THRESHOLD = 0.45;

// ─── Temporal Consistency (5-frame buffer) ──────────────────
const STABILITY_FRAMES = 5;
const stabilityBuffer = [];  // ring buffer of sorted classId strings
let bufferIndex = 0;
const IOU_THRESHOLD = 0.5;

// ─── Init: Load the ONNX model ─────────────────────────────
async function initModel(modelUrl) {
    try {
        ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/';
        session = await ort.InferenceSession.create(modelUrl, {
            executionProviders: ['wasm'],
            graphOptimizationLevel: 'all',
        });
        self.postMessage({ type: 'status', status: 'ready' });
    } catch (err) {
        self.postMessage({ type: 'status', status: 'error', error: err.message });
    }
}

// ─── Preprocess: ImageData → ONNX tensor ────────────────────
function preprocess(imageData) {
    const rgba = new Uint8Array(imageData.data.buffer);
    const ch = INPUT_SIZE * INPUT_SIZE;
    const f = new Float32Array(3 * ch);
    const inv = 1.0 / 255.0;
    for (let i = 0, j = 0; i < ch; i++, j += 4) {
        f[i]          = rgba[j]     * inv;
        f[ch + i]     = rgba[j + 1] * inv;
        f[2 * ch + i] = rgba[j + 2] * inv;
    }
    return new ort.Tensor('float32', f, [1, 3, INPUT_SIZE, INPUT_SIZE]);
}

// ─── Post-process: raw output → bounding boxes ─────────────
function postprocess(output, imgWidth, imgHeight) {
    const data = output.data;
    const numDetections = 8400;
    const numClasses = 7; // apple, banana, boiled_egg, bread, fried_egg, milk, orange
    const scaleX = imgWidth / INPUT_SIZE;
    const scaleY = imgHeight / INPUT_SIZE;
    const boxes = [];

    for (let i = 0; i < numDetections; i++) {
        let maxScore = 0;
        let classId = 0;
        for (let c = 0; c < numClasses; c++) {
            const score = data[(4 + c) * numDetections + i];
            if (score > maxScore) { maxScore = score; classId = c; }
        }
        if (maxScore < CONF_THRESHOLD) continue;

        const cx = data[0 * numDetections + i];
        const cy = data[1 * numDetections + i];
        const w  = data[2 * numDetections + i];
        const h  = data[3 * numDetections + i];

        boxes.push({
            x1: (cx - w / 2) * scaleX, y1: (cy - h / 2) * scaleY,
            x2: (cx + w / 2) * scaleX, y2: (cy + h / 2) * scaleY,
            score: maxScore, classId,
        });
    }
    return nms(boxes, IOU_THRESHOLD);
}

function nms(boxes, iouThreshold) {
    boxes.sort((a, b) => b.score - a.score);
    const kept = [];
    while (boxes.length > 0) {
        const best = boxes.shift();
        kept.push(best);
        boxes = boxes.filter((box) =>
            box.classId !== best.classId || iou(best, box) < iouThreshold
        );
    }
    return kept;
}

function iou(a, b) {
    const x1 = Math.max(a.x1, b.x1), y1 = Math.max(a.y1, b.y1);
    const x2 = Math.min(a.x2, b.x2), y2 = Math.min(a.y2, b.y2);
    const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
    const union = (a.x2 - a.x1) * (a.y2 - a.y1) + (b.x2 - b.x1) * (b.y2 - b.y1) - inter;
    return union > 0 ? inter / union : 0;
}

// ─── Run inference on received frame ────────────────────────
async function runInference(imageData, imgWidth, imgHeight) {
    if (!session) return;

    try {
        const tensor = preprocess(imageData);
        const results = await session.run({ images: tensor });
        const dets = postprocess(results['output0'], imgWidth, imgHeight);

        // ── Temporal stability check ──────────────────────
        const classKey = dets.map(d => d.classId).sort().join(',');

        // Fill the ring buffer
        if (stabilityBuffer.length < STABILITY_FRAMES) {
            stabilityBuffer.push(classKey);
        } else {
            stabilityBuffer[bufferIndex % STABILITY_FRAMES] = classKey;
        }
        bufferIndex++;

        // Stable when buffer is full AND all entries match
        const stable =
            stabilityBuffer.length >= STABILITY_FRAMES &&
            dets.length > 0 &&
            stabilityBuffer.every(k => k === classKey);

        self.postMessage({
            type: 'detections',
            detections: dets,
            stable,
        });
    } catch (err) {
        self.postMessage({ type: 'error', error: err.message });
    }
}

// ─── Message handler ────────────────────────────────────────
self.onmessage = function (e) {
    const { type } = e.data;

    if (type === 'init') {
        initModel(e.data.modelUrl);
    } else if (type === 'infer') {
        runInference(e.data.imageData, e.data.imgWidth, e.data.imgHeight);
    }
};

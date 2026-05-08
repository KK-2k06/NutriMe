/**
 * FINAL OPTIMIZED Web Worker - "Diet Engine" Edition
 * Optimized for individual detection of multiple same-class items (e.g., 4 Vadas).
 */
importScripts('https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort.min.js');

let session = null;
const INPUT_SIZE = 736;

// ─── Operational Thresholds ────────────────────────────────
const CONF_THRESHOLD = 0.25;  // Lowered to capture multiple items reliably

// ─── Stability Buffer ──────────────────────────────────────
const STABILITY_FRAMES = 3; 
const stabilityBuffer = [];
let bufferIndex = 0;

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

function postprocess(output, imgWidth, imgHeight) {
    const data = output.data;
    // New ONNX model has shape [1, 300, 6] because it was exported with end2end (NMS included)
    const numDetections = output.dims[1]; 
    const scaleX = imgWidth / INPUT_SIZE;
    const scaleY = imgHeight / INPUT_SIZE;
    let boxes = [];

    for (let i = 0; i < numDetections; i++) {
        const base = i * 6;
        const score = data[base + 4];
        
        if (score < CONF_THRESHOLD) continue;
        
        const classId = Math.round(data[base + 5]);

        const x1 = data[base + 0];
        const y1 = data[base + 1];
        const x2 = data[base + 2];
        const y2 = data[base + 3];

        boxes.push({
            x1: x1 * scaleX, 
            y1: y1 * scaleY,
            x2: x2 * scaleX, 
            y2: y2 * scaleY,
            score: score, 
            classId: classId
        });
    }
    
    // The new end2end ONNX model already performs NMS internally.
    // Returning boxes directly allows the model's native multi-class detection to shine.
    return boxes;
}

function nms(boxes) {
    boxes.sort((a, b) => b.score - a.score);
    const kept = [];
    
    while (boxes.length > 0) {
        const best = boxes.shift();
        kept.push(best);

        boxes = boxes.filter((box) => {
            const overlap = iou(best, box);
            
            // IF SAME CLASS (Vada vs Vada)
            // If they overlap more than 55%, assume it's the same object and delete.
            // Typical YOLO IOU is 0.45 - 0.60. 0.55 allows multiple items to touch/overlap gently.
            if (box.classId === best.classId) {
                return overlap < SAME_CLASS_IOU;
            }
            
            // IF DIFFERENT CLASSES (Dosa vs Vada)
            // Allow them to overlap significantly (up to 85%)
            return overlap < DIFF_CLASS_IOU;
        });
    }
    return kept;
}

function iou(a, b) {
    const x1 = Math.max(a.x1, b.x1), y1 = Math.max(a.y1, b.y1);
    const x2 = Math.min(a.x2, b.x2), y2 = Math.min(a.y2, b.y2);
    const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
    const areaA = (a.x2 - a.x1) * (a.y2 - a.y1);
    const areaB = (b.x2 - b.x1) * (b.y2 - b.y1);
    const union = areaA + areaB - inter;
    return union > 0 ? inter / union : 0;
}

async function runInference(imageData, imgWidth, imgHeight) {
    if (!session) return;
    try {
        const tensor = preprocess(imageData);
        const results = await session.run({ images: tensor });
        const dets = postprocess(results['output0'], imgWidth, imgHeight);

        if (dets.length > 0) {
            console.log(`[Inference Worker] Detected ${dets.length} item(s):`, dets.map(d => `{ClassID: ${d.classId}, Score: ${d.score.toFixed(2)}}`));
        } else {
            console.log(`[Inference Worker] No items detected in current frame.`);
        }

        const classKey = dets.map(d => d.classId).sort().join(',');
        if (stabilityBuffer.length < STABILITY_FRAMES) {
            stabilityBuffer.push(classKey);
        } else {
            stabilityBuffer[bufferIndex % STABILITY_FRAMES] = classKey;
        }
        bufferIndex++;

        const stable = stabilityBuffer.length >= STABILITY_FRAMES &&
                       dets.length > 0 &&
                       stabilityBuffer.every(k => k === classKey);

        self.postMessage({ type: 'detections', detections: dets, stable });
    } catch (err) {
        self.postMessage({ type: 'error', error: err.message });
    }
}

self.onmessage = function (e) {
    if (e.data.type === 'init') initModel(e.data.modelUrl);
    else if (e.data.type === 'infer') runInference(e.data.imageData, e.data.imgWidth, e.data.imgHeight);
};
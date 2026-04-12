import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Activity, VideoOff, Upload, Video, Camera as CameraIcon, MessageSquare, X, Send, Bot, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { generateChatResponse } from '../lib/aiApi';
import { saveChatMessage, fetchRecentChats } from '../lib/historyApi';

// ─── Detection Config ────────────────────────────────────
const INPUT_SIZE = 640;
const LERP_SPEED = 0.35;
const CLASS_NAMES = ['apple', 'banana', 'boiled_egg', 'bread', 'fried_egg', 'milk', 'orange', 'AlooGobi', 'GulabJamun', 'Samosa', 'Ven Pongal', 'Uzhuntha vadai', 'Paneer briyani', 'Dosa', 'Idly'];
const COLORS = ['#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#007AFF', '#5856D6', '#AF52DE', '#FF6B35', '#E91E8C', '#00BCD4', '#8BC34A', '#FF5722', '#9C27B0', '#F9A825', '#26A69A'];

function captureFrame(offCanvas, video) {
    const ctx = offCanvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(video, 0, 0, INPUT_SIZE, INPUT_SIZE);
    return ctx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE);
}

function matchAndLerp(current, newDets) {
    const result = [];
    const used = new Set();
    for (const det of newDets) {
        let bestIdx = -1, bestDist = Infinity;
        for (let i = 0; i < current.length; i++) {
            if (used.has(i) || current[i].classId !== det.classId) continue;
            const dx = (det.x1 + det.x2) / 2 - (current[i].x1 + current[i].x2) / 2;
            const dy = (det.y1 + det.y2) / 2 - (current[i].y1 + current[i].y2) / 2;
            const dist = dx * dx + dy * dy;
            if (dist < bestDist) { bestDist = dist; bestIdx = i; }
        }
        if (bestIdx >= 0 && bestDist < 90000) {
            used.add(bestIdx);
            result.push({ ...current[bestIdx], tx1: det.x1, ty1: det.y1, tx2: det.x2, ty2: det.y2, score: det.score, classId: det.classId });
        } else {
            result.push({ x1: det.x1, y1: det.y1, x2: det.x2, y2: det.y2, tx1: det.x1, ty1: det.y1, tx2: det.x2, ty2: det.y2, score: det.score, classId: det.classId });
        }
    }
    return result;
}

function drawBoxes(ctx, boxes) {
    for (const b of boxes) {
        const color = COLORS[b.classId % COLORS.length];
        const label = `${CLASS_NAMES[b.classId]} ${(b.score * 100).toFixed(0)}%`;
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.strokeRect(b.x1, b.y1, b.x2 - b.x1, b.y2 - b.y1);
        ctx.font = 'bold 16px Inter, system-ui, sans-serif';
        const tw = ctx.measureText(label).width + 12;
        ctx.fillStyle = color;
        ctx.fillRect(b.x1, b.y1 - 24, tw, 24);
        ctx.fillStyle = '#fff';
        ctx.fillText(label, b.x1 + 6, b.y1 - 7);
    }
}

// ─── BMI & Cardio helpers ────────────────────────────────
function calculateBMI(h, w) { return h && w ? w / ((h / 100) ** 2) : null; }
function getBMICategory(bmi) {
    if (bmi < 18.5) return { label: 'UW', color: '#ef4444', fullName: 'Underweight' };
    if (bmi < 25) return { label: 'NW / HW', color: '#22c55e', fullName: 'Healthy Weight' };
    if (bmi < 30) return { label: 'OW', color: '#fbbf24', fullName: 'Overweight' };
    return { label: 'OB', color: '#ef4444', fullName: 'Obese' };
}
function getBMIMarkerPosition(bmi) {
    // Range 15 to 35
    return ((Math.max(15, Math.min(35, bmi)) - 15) / 20) * 100;
}

function getCardioRiskInfo(prob) {
    if (prob < 0.3) return { label: 'Low Risk', color: '#00d900' };
    if (prob < 0.6) return { label: 'Moderate', color: '#fbbf24' };
    return { label: 'High Risk', color: '#f87171' };
}

// ─── Component ───────────────────────────────────────────
export default function Dashboard() {
    const { getProfile, user } = useAuth();
    const navigate = useNavigate();
    const [bmi, setBmi] = useState(null);
    const [bmiCategory, setBmiCategory] = useState(null);
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [userProfile, setUserProfile] = useState(null);

    // Global Chat state
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [mealHistory, setMealHistory] = useState([]);
    const chatEndRef = useRef(null);

    // Daily calories state
    const [dailyCalories, setDailyCalories] = useState({ calories: 0, goal: 2000 });

    // Camera & Upload state
    const [cameraActive, setCameraActive] = useState(false);
    const [uploadedImage, setUploadedImage] = useState(null);
    const [modelReady, setModelReady] = useState(false);
    const [detections, setDetections] = useState([]);
    const [stable, setStable] = useState(false);
    const videoRef = useRef(null);
    const fileInputRef = useRef(null);

    // Detection refs
    const workerRef = useRef(null);
    const overlayRef = useRef(null);
    const offCanvasRef = useRef(null);
    const animBoxesRef = useRef([]);
    const inferBusyRef = useRef(false);
    const latestDetsRef = useRef([]);

    // ─── Profile fetch ───────────────────────────────────
    useEffect(() => {
        const fetchProfile = async () => {
            const { data } = await getProfile();
            if (data) setUserProfile(data);
            if (data?.height && data?.weight) {
                const v = calculateBMI(data.height, data.weight);
                setBmi(v);
                setBmiCategory(getBMICategory(v));
            }
            if (data?.target_calories) {
                setDailyCalories(prev => ({ ...prev, goal: data.target_calories }));
            }
            setLoadingProfile(false);
        };
        fetchProfile();

        const fetchDailyCaloriesAndHistory = async () => {
            if (!user) return;
            const tz = 'Asia/Kolkata';
            const today = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date());

            const threeDaysAgoDate = new Date();
            threeDaysAgoDate.setDate(threeDaysAgoDate.getDate() - 3);
            const threeDaysAgo = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(threeDaysAgoDate);

            const { data, error } = await supabase
                .from('meal_history')
                .select('*')
                .eq('user_id', user.id)
                .gte('date', threeDaysAgo)
                .lte('date', today);

            if (data) {
                setMealHistory(data);
                const todaysMeals = data.filter(m => m.date === today);
                const total = todaysMeals.reduce((acc, curr) => acc + (curr.kcal || 0), 0);
                setDailyCalories(prev => ({ ...prev, calories: total }));
            }
        };
        fetchDailyCaloriesAndHistory();
    }, [getProfile, user]);

    // ─── Global Chat Init ────────────────────────────────
    useEffect(() => {
        if (!user || !isChatOpen) return;

        const initChat = async () => {
            const hist = await fetchRecentChats(user.id, 'dashboard', 4);
            if (hist && hist.length > 0) {
                setMessages(hist);
            } else {
                setMessages([{ role: 'ai', content: "Hello! I'm your AI Nutrition Assistant. How can I help you with your diet today?" }]);
            }
        };

        if (messages.length === 0) initChat();
    }, [isChatOpen, user]);

    // Sync chat scroll
    useEffect(() => {
        if (isChatOpen) chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping, isChatOpen]);

    const sendMessage = async () => {
        const trimmed = input.trim();
        if (!trimmed || !user) return;

        const userMsg = { role: 'user', content: trimmed };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);
        saveChatMessage(user.id, 'user', trimmed, 'dashboard');

        try {
            const aiResponse = await generateChatResponse(
                [...messages, userMsg],
                userProfile,
                mealHistory,
                null
            );

            setMessages(prev => [...prev, { role: 'ai', content: aiResponse }]);
            await saveChatMessage(user.id, 'ai', aiResponse, 'dashboard');
        } catch (error) {
            console.error('Global Chat error:', error);
            setMessages(prev => [...prev, { role: 'ai', content: "Oops, I'm having trouble connecting right now." }]);
        } finally {
            setIsTyping(false);
        }
    };

    // ─── Init worker (load ONNX model once) ──────────────
    useEffect(() => {
        const worker = new Worker('/inference.worker.js');
        workerRef.current = worker;

        worker.onmessage = (e) => {
            const msg = e.data;
            if (msg.type === 'status' && msg.status === 'ready') {
                setModelReady(true);
            } else if (msg.type === 'detections') {
                animBoxesRef.current = matchAndLerp(animBoxesRef.current, msg.detections);
                latestDetsRef.current = msg.detections;
                setDetections(msg.detections);
                setStable(msg.stable);
                inferBusyRef.current = false;
            } else if (msg.type === 'error') {
                inferBusyRef.current = false;
            }
        };

        worker.postMessage({ type: 'init', modelUrl: '/models/best.onnx' });
        return () => { worker.terminate(); workerRef.current = null; };
    }, []);

    // ─── Draw loop (camera mode only) ────────────────────
    useEffect(() => {
        if (!cameraActive || !modelReady) return;
        let rafId;

        function loop() {
            const overlay = overlayRef.current;
            const video = videoRef.current;
            const offCanvas = offCanvasRef.current;
            const worker = workerRef.current;

            if (!overlay || !video) { rafId = requestAnimationFrame(loop); return; }

            if (worker && offCanvas && !video.paused && !inferBusyRef.current) {
                inferBusyRef.current = true;
                const imageData = captureFrame(offCanvas, video);
                worker.postMessage(
                    { type: 'infer', imageData, imgWidth: video.videoWidth, imgHeight: video.videoHeight },
                    [imageData.data.buffer]
                );
            }

            if (overlay.width !== video.videoWidth) overlay.width = video.videoWidth;
            if (overlay.height !== video.videoHeight) overlay.height = video.videoHeight;

            const ctx = overlay.getContext('2d');
            ctx.clearRect(0, 0, overlay.width, overlay.height);
            const boxes = animBoxesRef.current;
            const vw = overlay.width;
            for (const b of boxes) {
                b.x1 += (b.tx1 - b.x1) * LERP_SPEED;
                b.y1 += (b.ty1 - b.y1) * LERP_SPEED;
                b.x2 += (b.tx2 - b.x2) * LERP_SPEED;
                b.y2 += (b.ty2 - b.y2) * LERP_SPEED;
            }
            const flipped = boxes.map(b => ({ ...b, x1: vw - b.x2, x2: vw - b.x1 }));
            drawBoxes(ctx, flipped);

            rafId = requestAnimationFrame(loop);
        }

        rafId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(rafId);
    }, [cameraActive, modelReady]);

    // ─── Capture handler ─────────────────────────────────
    const handleCapture = useCallback(() => {
        if (cameraActive && stable) {
            const video = videoRef.current;
            if (!video) return;
            const c = document.createElement('canvas');
            c.width = video.videoWidth;
            c.height = video.videoHeight;
            const ctx = c.getContext('2d');
            ctx.drawImage(video, 0, 0);
            const imageDataUrl = c.toDataURL('image/jpeg', 0.92);

            if (videoRef.current?.srcObject) {
                videoRef.current.srcObject.getTracks().forEach(t => t.stop());
                videoRef.current.srcObject = null;
            }

            navigate('/analysis-result', {
                state: {
                    mode: 'camera',
                    imageDataUrl,
                    detections: latestDetsRef.current,
                },
            });
        } else if (uploadedImage) {
            navigate('/analysis-result', {
                state: {
                    mode: 'upload',
                    imageDataUrl: uploadedImage,
                },
            });
        }
    }, [cameraActive, stable, uploadedImage, navigate]);

    // ─── Camera helpers ──────────────────────────────────
    const stopCamera = useCallback(() => {
        if (videoRef.current?.srcObject) {
            videoRef.current.srcObject.getTracks().forEach(t => t.stop());
            videoRef.current.srcObject = null;
        }
        setCameraActive(false);
        animBoxesRef.current = [];
        setDetections([]);
        setStable(false);
    }, []);

    const startCamera = useCallback(async () => {
        setUploadedImage(null);
        setDetections([]);
        setStable(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
            });
            if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
            setCameraActive(true);
        } catch (err) {
            console.error('Camera error:', err);
            alert('Could not access camera. Please check permissions.');
        }
    }, []);

    const handleCameraToggle = useCallback(() => {
        cameraActive ? stopCamera() : startCamera();
    }, [cameraActive, startCamera, stopCamera]);

    const handleFileUpload = useCallback((e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        stopCamera();
        const reader = new FileReader();
        reader.onload = (ev) => setUploadedImage(ev.target.result);
        reader.readAsDataURL(file);
    }, [stopCamera]);

    useEffect(() => {
        return () => {
            if (videoRef.current?.srcObject) videoRef.current.srcObject.getTracks().forEach(t => t.stop());
        };
    }, []);

    const showPlaceholder = !cameraActive && !uploadedImage;
    const captureEnabled = (cameraActive && stable) || !!uploadedImage;

    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col xl:flex-row gap-6 max-w-[1400px] mx-auto"
        >
            {/* Left Col - Camera Feed Area */}
            <div className="flex-1 flex flex-col gap-6">
                <div className="flex-1 bg-white rounded-2xl shadow-[0_2px_12px_rgba(0_0_0_/_0.02)] border border-[#f3f4f6] flex flex-col relative overflow-hidden min-h-[500px]">
                    <div className="absolute top-6 left-6 w-8 h-8 border-t-2 border-l-2 border-[#00d900] opacity-80 z-30"></div>
                    <div className="absolute top-6 right-6 w-8 h-8 border-t-2 border-r-2 border-[#00d900] opacity-80 z-30"></div>
                    <div className="absolute bottom-6 left-6 w-8 h-8 border-b-2 border-l-2 border-[#00d900] opacity-80 z-30"></div>
                    <div className="absolute bottom-6 right-6 w-8 h-8 border-b-2 border-r-2 border-[#00d900] opacity-80 z-30"></div>

                    {showPlaceholder && (
                        <div className="absolute inset-0 z-0 opacity-40 pointer-events-none"
                            style={{ backgroundImage: 'linear-gradient(to right, #f3f4f6 1px, transparent 1px), linear-gradient(to bottom, #f3f4f6 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
                    )}

                    {showPlaceholder && (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-300 z-10 p-4">
                            <Video size={56} className="mb-4 text-[#d1d5db]" />
                            <p className="font-semibold text-[0.95rem] text-[#9ca3af]">
                                {modelReady ? 'Camera feed ready' : 'Loading model...'}
                            </p>
                        </div>
                    )}

                    <video ref={videoRef} playsInline muted className="absolute inset-0 w-full h-full object-cover z-10" style={{ transform: 'scaleX(-1)', display: cameraActive ? 'block' : 'none' }} />
                    <canvas ref={overlayRef} className="absolute inset-0 w-full h-full pointer-events-none z-15" style={{ display: cameraActive ? 'block' : 'none' }} />
                    <canvas ref={offCanvasRef} width={INPUT_SIZE} height={INPUT_SIZE} style={{ display: 'none' }} />
                    {uploadedImage && <img src={uploadedImage} alt="Uploaded" className="absolute inset-0 w-full h-full object-contain z-10 bg-black/5" />}

                    {cameraActive && detections.length > 0 && (
                        <div className={`absolute top-4 right-4 z-30 backdrop-blur-sm rounded-lg px-3 py-1.5 text-[0.75rem] font-semibold flex items-center gap-2 ${stable ? 'bg-[#00d900]/80 text-black' : 'bg-black/60 text-white'}`}>
                            {stable ? <><span className="w-2 h-2 rounded-full bg-black animate-pulse"></span> Ready to capture</> : <><span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></span> Stabilizing...</>}
                        </div>
                    )}

                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20">
                        <button onClick={handleCapture} disabled={!captureEnabled}
                            className={`w-14 h-14 rounded-full border-[3px] flex items-center justify-center shadow-md transition-all cursor-pointer ${captureEnabled ? 'bg-white border-[#00d900] hover:scale-110' : 'bg-gray-100 border-gray-300 opacity-50 cursor-not-allowed'}`}
                            style={captureEnabled && cameraActive ? { animation: 'pulse-glow 2s ease-in-out infinite' } : {}}>
                            <CameraIcon size={20} className={captureEnabled ? 'text-[#111827] fill-[#111827]' : 'text-gray-400 fill-gray-400'} />
                        </button>
                    </div>
                </div>

                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />

                <div className="flex items-center justify-center gap-4">
                    <button onClick={handleCameraToggle}
                        className={`px-6 py-3.5 font-bold rounded-xl flex items-center gap-2.5 cursor-pointer transition-all ${cameraActive ? 'bg-red-500 hover:bg-red-600 text-white shadow-[0_4px_12px_rgba(239_68_68_/_0.2)]' : 'bg-[#00d900] hover:bg-[#00c000] text-black shadow-[0_4px_12px_rgba(0_217_0_/_0.2)]'}`}>
                        {cameraActive ? <><VideoOff size={18} /> Stop Camera</> : <><span className="w-[18px] h-[18px] border-[2px] border-black rounded-[4px] relative flex items-center justify-center border-dashed"></span> Start Camera</>}
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} className="px-6 py-3.5 bg-white hover:bg-[#f9fafb] text-[#111827] font-bold rounded-xl flex items-center gap-2.5 cursor-pointer border border-[#e5e7eb] shadow-sm transition-colors">
                        <Upload size={18} /> Upload Image
                    </button>
                </div>
            </div>

            {/* Right Col - Data Widgets */}
            <div className="w-full xl:w-[320px] shrink-0 flex flex-col gap-6">

                {/* Calories Widget */}
                <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(0_0_0_/_0.02)] border border-[#f3f4f6] p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-[1.1rem]">Calories</h3>
                        <Flame size={18} className="text-[#00d900]" fill="currentColor" strokeWidth={0} />
                    </div>
                    <div className="flex flex-col items-center">
                        <div className="relative w-44 h-44 flex items-center justify-center mb-6">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="40" stroke="#f3f4f6" strokeWidth="8" fill="none" />
                                <circle cx="50" cy="50" r="40" stroke="#00d900" strokeWidth="8" fill="none" strokeDasharray="251.2"
                                    strokeDashoffset={Math.max(0, 251.2 - (251.2 * (dailyCalories.calories / dailyCalories.goal)))} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
                            </svg>
                            <div className="absolute flex flex-col items-center justify-center text-center">
                                <span className="font-bold text-[2rem] leading-none mb-1 text-[#111827]">{dailyCalories.calories.toLocaleString()}</span>
                                <span className="text-[0.75rem] text-[#9ca3af] font-bold">/ {dailyCalories.goal.toLocaleString()} kcal</span>
                            </div>
                        </div>
                        <div className="px-3 py-1 bg-[#00d900]/10 text-[#00d900] text-[0.75rem] font-bold rounded-full">
                            {Math.round((dailyCalories.calories / dailyCalories.goal) * 100)}% of Daily Target
                        </div>
                    </div>
                </div>

                {/* BMI Widget */}
                <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(0_0_0_/_0.02)] border border-[#f3f4f6] p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-[1.1rem]">BMI Overview</h3>
                        <div className="bg-[#00d900] w-[18px] h-[18px] rounded-sm flex items-center justify-center"><div className="w-1.5 h-1.5 bg-white rounded-full"></div></div>
                    </div>
                    {loadingProfile ? (
                        <div className="flex flex-col items-center mb-8 animate-pulse"><div className="w-20 h-10 bg-gray-100 rounded-lg mb-3"></div><div className="w-28 h-6 bg-gray-100 rounded"></div></div>
                    ) : bmi !== null ? (
                        <>
                            <div className="flex flex-col items-center mb-8">
                                <span className="font-extrabold text-[2.5rem] leading-none mb-3 text-[#111827]">{bmi.toFixed(1)}</span>
                                <div 
                                    className="px-4 py-1.5 text-[0.75rem] font-bold rounded-lg uppercase tracking-wider shadow-sm flex flex-col items-center gap-0.5" 
                                    style={{ backgroundColor: `${bmiCategory.color}15`, color: bmiCategory.color, border: `1px solid ${bmiCategory.color}30` }}
                                >
                                    <span>{bmiCategory.label}</span>
                                    <span className="text-[0.6rem] opacity-70 font-medium normal-case">{bmiCategory.fullName}</span>
                                </div>
                            </div>
                             <div className="w-full mb-2 mt-4">
                                <div className="flex justify-between text-[0.65rem] text-[#9ca3af] font-black mb-2.5 px-2">
                                    <span>UW</span>
                                    <span>NW</span>
                                    <span>OW</span>
                                    <span>OB</span>
                                </div>
                                <div className="relative px-[2px]">
                                    <div 
                                        className="h-3 w-full rounded-full shadow-inner" 
                                        style={{ 
                                            background: 'linear-gradient(to right, #ef4444 0%, #fbbf24 17.5%, #22c55e 35%, #22c55e 45%, #fbbf24 60%, #ef4444 85%)' 
                                        }}
                                    ></div>
                                    <div 
                                        className="absolute top-1/2 h-7 w-1.5 bg-white shadow-md z-10 rounded-full border-2 transition-all duration-500 ease-out" 
                                        style={{ 
                                            left: `${getBMIMarkerPosition(bmi)}%`, 
                                            transform: 'translate(-50%, -50%)', 
                                            borderColor: bmiCategory.color 
                                        }}
                                    ></div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center mb-4 text-center"><span className="text-[2rem] font-extrabold text-gray-300 mb-2">--</span><p className="text-[0.8rem] text-gray-400">Complete your profile to see your BMI</p></div>
                    )}
                </div>
            </div>

            {/* Global AI Chat Bubble & Panel */}
            <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">
                <AnimatePresence>
                    {isChatOpen && (
                        <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }} transition={{ duration: 0.2 }}
                            className="bg-white rounded-2xl shadow-xl border border-gray-200 w-[350px] sm:w-[400px] h-[500px] mb-4 flex flex-col overflow-hidden pointer-events-auto">
                            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-[#00d900]/20 flex items-center justify-center"><Bot size={16} className="text-[#00a000]" /></div>
                                    <div><p className="font-bold text-[0.95rem] text-[#111827]">AI Nutritionist</p><div className="flex items-center gap-1.5 mt-0.5"><span className="w-2 h-2 rounded-full bg-[#00d900]" /><span className="text-[0.65rem] text-[#00a000] font-semibold tracking-wide uppercase">Online</span></div></div>
                                </div>
                                <button onClick={() => setIsChatOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X size={18} className="text-gray-500" /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-white/50 scrollbar-hide">
                                {messages.map((msg, i) => (
                                    <motion.div key={i} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                        <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${msg.role === 'ai' ? 'bg-[#00d900]/20 text-[#00a000]' : 'bg-gray-200 text-gray-500'}`}>
                                            {msg.role === 'ai' ? <Bot size={15} /> : <div className="w-full h-full rounded-full overflow-hidden"><img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.full_name || user?.email || 'User')}&background=e5e7eb&color=6b7280`} alt="User" className="w-full h-full object-cover" /></div>}
                                        </div>
                                        <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-[0.85rem] leading-relaxed whitespace-pre-wrap ${msg.role === 'ai' ? 'bg-gray-50 border border-gray-100 text-gray-800' : 'bg-[#e6ffed] border border-[#b3f0c0] text-gray-900'}`}>{msg.content}</div>
                                    </motion.div>
                                ))}
                                {isTyping && <div className="flex gap-3"><div className="shrink-0 w-8 h-8 rounded-full bg-[#00d900]/20 flex items-center justify-center"><Bot size={15} className="text-[#00a000]" /></div><div className="bg-gray-50 border border-gray-100 text-gray-800 rounded-2xl flex items-center px-4 py-3"><Loader2 size={16} className="animate-spin text-[#00a000]" /></div></div>}
                                <div ref={chatEndRef} />
                            </div>
                            <div className="p-3 border-t border-gray-100 bg-white">
                                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus-within:border-[#00d900] focus-within:ring-1 focus-within:ring-[#00d900] transition-all">
                                    <input type="text" placeholder="Ask your AI Nutritionist..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} className="flex-1 bg-transparent text-[0.85rem] text-gray-800 placeholder-gray-400 focus:outline-none min-w-0" />
                                    <button onClick={sendMessage} className="w-8 h-8 rounded-full bg-[#00d900] hover:bg-[#00c000] flex items-center justify-center transition-colors shrink-0 shadow-sm"><Send size={13} className="text-black" /></button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
                <button onClick={() => setIsChatOpen(!isChatOpen)} className="w-14 h-14 bg-[#00d900] hover:bg-[#00c000] rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105 pointer-events-auto mt-4"><MessageSquare size={24} className="text-black" /></button>
            </div>

            <style>{`
                @keyframes pulse-glow {
                    0%, 100% { box-shadow: 0 0 8px rgba(0, 217, 0, 0.3); }
                    50% { box-shadow: 0 0 24px rgba(0, 217, 0, 0.6); }
                }
            `}</style>
        </motion.div>
    );
}

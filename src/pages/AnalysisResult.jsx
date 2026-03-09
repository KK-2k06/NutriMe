import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Pencil, Check, Send, Flame, Dumbbell, Cookie, Droplets, Bot, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { fetchNutritionForDetection } from '../utils/nutritionApi';
import { generateChatResponse } from '../lib/aiApi';
import { saveChatMessage, fetchRecentChats } from '../lib/historyApi';

// ─── Detection helpers (shared with Dashboard) ──────────
const INPUT_SIZE = 640;
const CLASS_NAMES = ['apple', 'banana', 'boiled_egg', 'bread', 'fried_egg', 'milk', 'orange'];
const COLORS = ['#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#007AFF', '#5856D6', '#AF52DE'];

function drawBoxes(ctx, boxes, imgW, imgH) {
    for (const b of boxes) {
        const color = COLORS[b.classId % COLORS.length];

        const bboxArea = (b.x2 - b.x1) * (b.y2 - b.y1);
        const ratio = bboxArea / (imgW * imgH);
        const sizeMatch = ratio <= 0.2 ? 'Sm' : ratio <= 0.4 ? 'Med' : 'Lg';

        let label = `${CLASS_NAMES[b.classId]} (${sizeMatch})`;
        if (b.displayKcal !== undefined) {
            label += ` ${b.displayKcal} kcal`;
        } else {
            label += ` ${(b.score * 100).toFixed(0)}%`;
        }

        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.strokeRect(b.x1, b.y1, b.x2 - b.x1, b.y2 - b.y1);
        ctx.font = `bold ${Math.max(14, imgW * 0.02)}px Inter, system-ui, sans-serif`;
        const tw = ctx.measureText(label).width + 12;
        const lh = Math.max(22, imgW * 0.03);
        ctx.fillStyle = color;
        ctx.fillRect(b.x1, b.y1 - lh, tw, lh);
        ctx.fillStyle = '#fff';
        ctx.fillText(label, b.x1 + 6, b.y1 - lh * 0.25);
    }
}

// ─── Chat components ─────────────────────────────────────
function AiAvatar() {
    return (
        <div className="w-9 h-9 rounded-full bg-[#00d900]/20 flex items-center justify-center shrink-0">
            <Bot size={18} className="text-[#00a000]" />
        </div>
    );
}

function UserAvatar({ name }) {
    return (
        <div className="w-9 h-9 rounded-full bg-gray-200 overflow-hidden shrink-0">
            <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=e5e7eb&color=6b7280`} alt="User" className="w-full h-full object-cover" />
        </div>
    );
}

function TypingDots() {
    return (
        <div className="flex items-center gap-1 px-4 py-3">
            {[0, 1, 2].map(i => (
                <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full bg-gray-400"
                    animate={{ y: [0, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }}
                />
            ))}
        </div>
    );
}

// ─── Main Component ──────────────────────────────────────
export default function AnalysisResult() {
    const { user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const navState = location.state || {};
    const { mode, imageDataUrl, detections: preDetections } = navState;

    const [detections, setDetections] = useState(preDetections || []);
    const [analyzing, setAnalyzing] = useState(mode === 'upload');
    const canvasRef = useRef(null);
    const leftColRef = useRef(null);
    const [chatHeight, setChatHeight] = useState(null);

    // Editing state
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [macros, setMacros] = useState({ calories: 0, protein: 0, carbs: 0, fats: 0 });
    const [enrichedDetections, setEnrichedDetections] = useState(null);

    // ─── Draw image + boxes on canvas ────────────────────
    const renderDetections = useCallback((img, dets) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        drawBoxes(ctx, dets, img.width, img.height);
    }, []);

    useEffect(() => {
        if (detections.length === 0 || !imageDataUrl) return;
        if (enrichedDetections) return;

        const fetchNutrients = () => {
            const img = new Image();
            img.onload = async () => {
                let totalCals = 0, totalP = 0, totalC = 0, totalF = 0;
                const newDetections = [];
                for (const det of detections) {
                    try {
                        const res = await fetchNutritionForDetection(det, img.width, img.height);
                        totalCals += res.calories;
                        totalP += res.protein;
                        totalC += res.carbs;
                        totalF += res.fats;
                        newDetections.push({ ...det, displayKcal: res.calories });
                    } catch (e) {
                        console.error('Error fetching nutrient data:', e);
                        newDetections.push(det);
                    }
                }
                setMacros({
                    calories: totalCals,
                    protein: totalP,
                    carbs: totalC,
                    fats: totalF,
                });
                setEnrichedDetections(newDetections);
                renderDetections(img, newDetections);
            };
            img.src = imageDataUrl;
        };
        fetchNutrients();
    }, [detections, imageDataUrl, enrichedDetections, renderDetections]);

    // Chat state
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const chatEndRef = useRef(null);

    // AI Initialization & Database Context Loading
    useEffect(() => {
        if (!user || analyzing) return;

        const initChat = async () => {
            // 1. Always start fresh for a new scan (No history fetching here)
            // 2. If no messages exist in local state & detection + macros are done, generate first thought
            if (messages.length === 0 && detections.length > 0 && macros.calories > 0) {
                setIsTyping(true);

                // Get User Profile safely
                const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();

                const items = detections.map(d => CLASS_NAMES[d.classId]).filter((v, i, a) => a.indexOf(v) === i).join(', ');
                const mealContext = `Detected meal: ${items}. Breakdown: ${macros.calories}kcal, ${macros.protein}g protein, ${macros.carbs}g carbs, ${macros.fats}g fat. Evaluated strictly against their profile goals.`;

                try {
                    const aiResponse = await generateChatResponse(
                        [{ role: 'user', content: 'Provide immediate feedback on this scanned meal.' }],
                        profile || {},
                        [], // Strict isolation: no history
                        mealContext
                    );

                    const firstMsg = { role: 'ai', content: aiResponse };
                    setMessages([firstMsg]);
                    await saveChatMessage(user.id, 'ai', aiResponse, 'analysis_result');
                } catch (err) {
                    console.error('Initial chat generation error:', err);
                    setMessages([{ role: 'ai', content: `I see you are having ${items}! It looks like a great choice based on your goals.` }]);
                } finally {
                    setIsTyping(false);
                }
            }
        };

        initChat();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, analyzing, detections.length, macros.calories]);

    // Redirect if no image data
    useEffect(() => {
        if (!imageDataUrl) navigate('/dashboard', { replace: true });
    }, [imageDataUrl, navigate]);



    // ─── Camera mode: render pre-analyzed result ─────────
    useEffect(() => {
        if (mode !== 'camera' || !imageDataUrl || !preDetections) return;
        const img = new Image();
        img.onload = () => renderDetections(img, preDetections);
        img.src = imageDataUrl;
    }, [mode, imageDataUrl, preDetections, renderDetections]);

    // ─── Upload mode: lazy inference ─────────────────────
    useEffect(() => {
        if (mode !== 'upload' || !imageDataUrl) return;
        setAnalyzing(true);

        const worker = new Worker('/inference.worker.js');
        let cancelled = false;

        worker.onmessage = (e) => {
            if (cancelled) return;
            const msg = e.data;
            if (msg.type === 'status' && msg.status === 'ready') {
                // Model loaded — run inference
                const img = new Image();
                img.onload = () => {
                    const off = document.createElement('canvas');
                    off.width = INPUT_SIZE; off.height = INPUT_SIZE;
                    const offCtx = off.getContext('2d', { willReadFrequently: true });
                    offCtx.drawImage(img, 0, 0, INPUT_SIZE, INPUT_SIZE);
                    const imageData = offCtx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE);
                    worker.postMessage(
                        { type: 'infer', imageData, imgWidth: img.width, imgHeight: img.height },
                        [imageData.data.buffer]
                    );
                };
                img.src = imageDataUrl;
            } else if (msg.type === 'detections') {
                setDetections(msg.detections);
                setAnalyzing(false);
                // Render on canvas
                const img = new Image();
                img.onload = () => renderDetections(img, msg.detections);
                img.src = imageDataUrl;
                worker.terminate();
            }
        };

        worker.postMessage({ type: 'init', modelUrl: '/models/best.onnx' });

        return () => { cancelled = true; worker.terminate(); };
    }, [mode, imageDataUrl, renderDetections]);



    // Sync chat scroll
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    // Match chat height to left column
    useEffect(() => {
        if (!leftColRef.current) return;
        const ro = new ResizeObserver(() => {
            if (leftColRef.current) setChatHeight(leftColRef.current.offsetHeight);
        });
        ro.observe(leftColRef.current);
        return () => ro.disconnect();
    }, []);

    const sendMessage = async () => {
        const trimmed = input.trim();
        if (!trimmed || !user) return;

        // 1. Optimistic UI update & DB Save for User Message
        const userMsg = { role: 'user', content: trimmed };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);
        saveChatMessage(user.id, 'user', trimmed, 'analysis_result'); // non-blocking

        try {
            // Get user profile safely
            const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();

            // Build meal context hook
            const items = detections.map(d => CLASS_NAMES[d.classId]).filter((v, i, a) => a.indexOf(v) === i).join(', ');
            const mealContext = `The user is actively analyzing a meal containing: ${items} (${macros.calories}kcal, ${macros.protein}g protein, ${macros.carbs}g carbs, ${macros.fats}g fat). You are currently helping them to log or review this meal on the Analysis Results page.`;

            // Prepare history for API (including newest user message)
            const chatLogForAPI = [...messages, userMsg].map(m => ({
                role: m.role,
                content: typeof m.content === 'string' ? m.content : (m.content?.props?.children || '')
            }));

            // 2. Fetch Gemini Response
            const aiResponse = await generateChatResponse(chatLogForAPI, profile || {}, [], mealContext); // Isolated context on analysis page

            // 3. UI Update & DB Save for AI Message
            const aiMsg = { role: 'ai', content: aiResponse };
            setMessages(prev => [...prev, aiMsg]);

            await saveChatMessage(user.id, 'ai', aiResponse, 'analysis_result');
        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, { role: 'ai', content: "Sorry, I ran into an error processing your request." }]);
        } finally {
            setIsTyping(false);
        }
    };

    if (!imageDataUrl) return null;

    // Build summary from detections
    const detectedItems = detections.map(d => CLASS_NAMES[d.classId]).filter((v, i, a) => a.indexOf(v) === i);
    const topDetection = detections.length > 0
        ? `${CLASS_NAMES[detections[0].classId]} (${(detections[0].score * 100).toFixed(0)}%)`
        : 'Analyzing...';

    const MACROS = [
        { id: 'calories', label: 'Calories', value: macros.calories, unit: 'kcal', icon: Flame, color: 'text-gray-500' },
        { id: 'protein', label: 'Protein', value: macros.protein, unit: 'g', icon: Dumbbell, color: 'text-[#00c000]' },
        { id: 'carbs', label: 'Carbs', value: macros.carbs, unit: 'g', icon: Cookie, color: 'text-amber-500' },
        { id: 'fats', label: 'Fats', value: macros.fats, unit: 'g', icon: Droplets, color: 'text-red-400' },
    ];

    const saveMeal = async () => {
        if (!user) return;
        setIsSaving(true);
        try {
            // Get today's date in Indian Standard Time (IST) in YYYY-MM-DD format
            const today = new Intl.DateTimeFormat('en-CA', {
                timeZone: 'Asia/Kolkata',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            }).format(new Date());

            // Upload image to Supabase Storage
            const response = await fetch(imageDataUrl);
            const blob = await response.blob();

            const fileName = `${user.id}/${Date.now()}.jpg`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('meal_images')
                .upload(fileName, blob, { contentType: 'image/jpeg' });

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('meal_images')
                .getPublicUrl(fileName);

            const mealName = detectedItems.length > 0 ? detectedItems[0].charAt(0).toUpperCase() + detectedItems[0].slice(1) : 'Meal';
            const mealDesc = detectedItems.join(', ');

            // Insert into meal_history
            const { error: insertError } = await supabase
                .from('meal_history')
                .insert({
                    user_id: user.id,
                    date: today,
                    meal_name: mealName,
                    meal_desc: mealDesc,
                    image_url: publicUrl,
                    kcal: macros.calories,
                    protein: macros.protein,
                    carbs: macros.carbs,
                    fat: macros.fats
                });

            if (insertError) throw insertError;

            navigate('/dashboard', { replace: true });
        } catch (error) {
            console.error('Failed to save meal:', error);
            alert('Failed to save meal. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-5"
        >
            {/* Top title + actions */}
            <div className="flex items-center justify-between">
                <h1 className="text-[1.7rem] font-bold text-[#111827]">Meal Analysis Results</h1>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsEditing(!isEditing)}
                        className={`flex items-center gap-2 px-5 py-2.5 border rounded-xl text-[0.85rem] font-semibold transition-colors cursor-pointer shadow-sm ${isEditing
                            ? 'bg-[#e6ffed] text-[#00a000] border-[#b3f0c0] hover:bg-[#dcfce7]'
                            : 'border-gray-200 text-[#111827] bg-white hover:bg-gray-50'
                            }`}
                    >
                        {isEditing ? <Check size={14} /> : <Pencil size={14} />}
                        {isEditing ? 'Save Edits' : 'Edit Log'}
                    </button>
                    <button
                        onClick={saveMeal}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-5 py-2.5 bg-[#00d900] hover:bg-[#00c000] disabled:opacity-75 disabled:cursor-wait rounded-xl text-[0.85rem] font-bold text-black shadow-[0_4px_14px_rgba(0,217,0,0.3)] transition-all cursor-pointer"
                    >
                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} strokeWidth={3} />}
                        {isSaving ? 'Saving...' : 'Confirm & Save'}
                    </button>
                </div>
            </div>

            {/* Main layout */}
            <div className="flex flex-col xl:flex-row gap-5 items-start">
                {/* Left column */}
                <div ref={leftColRef} className="flex flex-col gap-4 w-full xl:w-[52%] shrink-0">

                    {/* Captured Meal card */}
                    <div className="bg-white rounded-2xl border border-[#f3f4f6] shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#f3f4f6]">
                            <span className="font-bold text-[0.95rem] text-[#111827]">Captured Meal</span>
                            <span className={`text-[0.68rem] font-bold tracking-widest px-3 py-1 rounded-full border ${analyzing
                                ? 'text-amber-600 bg-amber-50 border-amber-200'
                                : 'text-[#00a000] bg-[#e6ffed] border-[#b3f0c0]'
                                }`}>
                                {analyzing ? 'ANALYZING...' : 'ANALYZED'}
                            </span>
                        </div>
                        <div className="relative bg-[#f2f4f2] p-4">
                            <div className="relative w-full" style={{ paddingTop: '66%' }}>
                                {/* Canvas with image + detection boxes */}
                                <canvas
                                    ref={canvasRef}
                                    className="absolute inset-0 w-full h-full object-contain rounded-xl"
                                />
                                {/* Show raw image while analyzing (upload mode) */}
                                {analyzing && (
                                    <>
                                        <img
                                            src={imageDataUrl}
                                            alt="Uploaded meal"
                                            className="absolute inset-0 w-full h-full object-contain rounded-xl"
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-xl">
                                            <div className="flex items-center gap-3 bg-white/90 backdrop-blur px-5 py-3 rounded-xl shadow-lg">
                                                <Loader2 size={20} className="animate-spin text-[#00d900]" />
                                                <span className="font-semibold text-sm text-gray-700">Running analysis...</span>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Nutritional Breakdown card */}
                    <div className="bg-white rounded-2xl border border-[#f3f4f6] shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5">
                        <h3 className="font-bold text-[1rem] text-[#111827]">Nutritional Breakdown</h3>
                        <p className="text-[0.76rem] text-gray-400 mt-0.5 mb-5">
                            {detectedItems.length > 0
                                ? `Detected: ${detectedItems.join(', ')}`
                                : 'Estimated values based on visual analysis'}
                        </p>
                        <div className="grid grid-cols-4 gap-3">
                            {MACROS.map(({ id, label, value, unit, icon: Icon, color }) => (
                                <div key={label} className="flex flex-col gap-2 p-4 bg-gray-50 rounded-xl border border-[#f3f4f6]">
                                    <div className="flex items-center gap-1.5">
                                        <Icon size={13} className={color} />
                                        <span className={`text-[0.72rem] font-semibold ${color}`}>{label}</span>
                                    </div>
                                    <div className="flex items-center gap-1 mt-1">
                                        {isEditing ? (
                                            <input
                                                type="number"
                                                min="0"
                                                value={value}
                                                onChange={(e) => setMacros(prev => ({ ...prev, [id]: Math.max(0, Number(e.target.value)) }))}
                                                className="w-full max-w-[4rem] bg-white border border-gray-300 rounded px-1.5 py-0.5 text-[1.1rem] font-bold text-[#111827] focus:outline-none focus:border-[#00d900] focus:ring-1 focus:ring-[#00d900]"
                                            />
                                        ) : (
                                            <span className="text-[1.45rem] font-bold text-[#111827] leading-none">
                                                {detections.length > 0 ? value : '--'}
                                            </span>
                                        )}
                                        <span className="text-[0.72rem] text-gray-400 font-semibold">{unit}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right column — chat panel */}
                <div
                    className="flex-1 bg-white rounded-2xl border border-[#f3f4f6] shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex flex-col overflow-hidden"
                    style={chatHeight ? { height: chatHeight } : {}}
                >
                    <div className="flex items-center gap-3 px-5 py-4 border-b border-[#f3f4f6] shrink-0">
                        <AiAvatar />
                        <div>
                            <p className="font-bold text-[0.95rem] text-[#111827]">AI Nutritionist</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="w-2 h-2 rounded-full bg-[#00d900]" />
                                <span className="text-[0.72rem] text-[#00a000] font-semibold">Online</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4 scrollbar-hide min-h-0">
                        {messages.length === 0 && !analyzing && (
                            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
                                Analysis complete. Ask me about your meal!
                            </div>
                        )}
                        {messages.length === 0 && analyzing && (
                            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
                                Analyzing your meal...
                            </div>
                        )}
                        <AnimatePresence initial={false}>
                            {messages.map((msg, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.22 }}
                                    className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                                >
                                    {msg.role === 'ai' ? <AiAvatar /> : <UserAvatar name={user?.user_metadata?.full_name || user?.email} />}
                                    <div
                                        className={`max-w-[85%] rounded-2xl px-4 py-3 text-[0.875rem] leading-relaxed text-[#111827] whitespace-pre-wrap ${msg.role === 'ai'
                                            ? 'bg-gray-50 border border-[#efefef]'
                                            : 'bg-[#e6ffed] border border-[#b3f0c0]'
                                            }`}
                                    >
                                        {typeof msg.content === 'string' ? msg.content : msg.content}
                                    </div>
                                </motion.div>
                            ))}
                            {isTyping && (
                                <motion.div key="typing" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex gap-3">
                                    <AiAvatar />
                                    <div className="bg-gray-50 border border-[#efefef] rounded-2xl"><TypingDots /></div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        <div ref={chatEndRef} />
                    </div>

                    <div className="px-4 py-4 border-t border-[#f3f4f6] shrink-0">
                        <div className="flex items-center gap-3 bg-[#fafafa] border border-gray-200 rounded-xl px-4 py-2.5 focus-within:border-[#00d900] focus-within:ring-1 focus-within:ring-[#00d900] transition-all">
                            <input
                                type="text"
                                placeholder="Ask about this meal..."
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                                className="flex-1 bg-transparent text-[0.88rem] text-[#111827] placeholder-gray-400 focus:outline-none"
                            />
                            <button
                                onClick={sendMessage}
                                className="w-9 h-9 rounded-full bg-[#00d900] hover:bg-[#00c000] flex items-center justify-center transition-colors cursor-pointer shrink-0 shadow-[0_2px_8px_rgba(0,217,0,0.35)]"
                            >
                                <Send size={15} className="text-black" />
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </motion.div >
    );
}

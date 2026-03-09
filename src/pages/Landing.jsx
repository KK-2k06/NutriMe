import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Utensils, BarChart2, Camera, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Landing() {
    const navigate = useNavigate();

    const handleGetStarted = () => {
        navigate('/signup');
    };

    const handleSignIn = () => {
        navigate('/signin');
    };

    const scrollToFeatures = (e) => {
        e.preventDefault();
        const element = document.getElementById('features');
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="min-h-screen bg-[#f7f9f8] font-sans text-[#111827] flex flex-col overflow-x-hidden"
        >
            {/* Navbar */}
            <nav className="flex items-center justify-between px-6 py-5 max-w-[1200px] mx-auto w-full md:px-10 relative">
                <div className="flex items-center gap-2">
                    <Utensils className="text-[#00d900]" size={26} />
                    <span className="font-bold text-[1.3rem] tracking-tight">NutriMe</span>
                </div>
                <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center text-[#4b5563] font-medium text-[0.95rem]">
                    <a href="#features" onClick={scrollToFeatures} className="hover:text-black transition-colors cursor-pointer">Features</a>
                </div>
                <div className="flex items-center gap-4 text-[0.95rem] font-semibold">
                    <button onClick={handleSignIn} className="cursor-pointer px-5 py-[0.6rem] rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors shadow-sm">
                        Sign In
                    </button>
                    <button
                        onClick={handleGetStarted}
                        className="cursor-pointer px-5 py-[0.6rem] border border-transparent rounded-lg bg-[#00d900] hover:bg-[#00c000] text-black transition-colors"
                    >
                        Get Started
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <main className="flex-1 flex flex-col justify-center">
                <div className="max-w-[1200px] mx-auto w-full px-6 md:px-10 py-16 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    {/* Left Col */}
                    <div className="max-w-[540px]">
                        <h1 className="text-[3.5rem] leading-[1.1] font-bold tracking-tight mb-6 text-[#111827]">
                            Track Your Diet<br />
                            with AI-Powered<br />
                            Precision
                        </h1>
                        <p className="text-[1.05rem] text-[#6b7280] mb-8 leading-[1.6]">
                            Our smart diet tracking app uses advanced AI to analyze your meals, providing real-time nutritional insights and helping you reach your health goals faster. No more manual entry.
                        </p>
                        <button
                            onClick={handleGetStarted}
                            className="cursor-pointer px-6 py-3 rounded-lg bg-[#00d900] hover:bg-[#00c000] text-black font-semibold text-[1rem] transition-colors"
                        >
                            Get Started Free
                        </button>
                    </div>

                    {/* Right Col */}
                    <div className="relative">
                        <div className="rounded-[1.5rem] overflow-hidden shadow-2xl relative">
                            {/* Placeholder image that looks like the salad on the dark blue-gray background */}
                            <img
                                src="/milk_orange.png"
                                alt="Detected Milk and Orange"
                                className="w-full h-auto object-cover rounded-[1.5rem] aspect-[4/3]"
                            />

                            {/* Floating Card */}
                            <div className="absolute bottom-6 left-6 bg-white/95 backdrop-blur-md rounded-xl p-4 flex items-center gap-4 shadow-[0_10px_40px_rgba(0,0,0,0.15)] border border-white">
                                <div className="bg-[#00d900]/20 p-2.5 rounded-lg flex items-center justify-center">
                                    <BarChart2 className="text-[#00d900]" size={20} />
                                </div>
                                <div className="pr-4">
                                    <div className="text-[0.7rem] uppercase tracking-wider font-semibold text-[#6b7280] mb-0.5">Image Analyzed</div>
                                    <div className="text-[0.95rem] font-bold text-black tracking-tight">210 kcal • 9g Protein</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Divider / Spacer */}
                <div className="h-16"></div>

                {/* How it works Section */}
                <div id="features" className="scroll-mt-24 max-w-[1000px] mx-auto w-full px-6 md:px-10 text-center mb-16">
                    <div className="text-[#00d900] font-bold text-[0.8rem] tracking-widest uppercase mb-3">
                        Simple Process
                    </div>
                    <h2 className="text-[2.5rem] font-bold mb-4 tracking-tight">How it Works</h2>
                    <p className="text-[#6b7280] max-w-xl mx-auto text-[1.05rem] leading-relaxed">
                        Achieve your diet goals in three simple steps. No typing, no searching. Just point, shoot, and learn.
                    </p>
                </div>

                {/* Steps Grid */}
                <div className="max-w-[1100px] mx-auto w-full px-6 md:px-10 grid grid-cols-1 md:grid-cols-3 gap-8 pb-32">

                    {/* Step 1 */}
                    <div className="relative bg-white rounded-3xl p-8 pt-12 flex flex-col items-center text-center shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-transparent hover:border-gray-100 transition-colors">
                        <div className="absolute -top-[18px] w-9 h-9 rounded-full bg-[#00d900] flex items-center justify-center text-white font-bold text-[0.95rem] shadow-sm">
                            1
                        </div>
                        <div className="w-14 h-14 rounded-full bg-[#00d900]/10 flex items-center justify-center mb-5">
                            <Camera className="text-[#00d900]" size={26} strokeWidth={2.5} />
                        </div>
                        <h3 className="text-[1.2rem] font-bold mb-3 tracking-tight">Scan</h3>
                        <p className="text-[#6b7280] text-[0.95rem] leading-[1.6]">
                            Take a quick photo of your meal using your smartphone camera.
                        </p>
                    </div>

                    {/* Step 2 */}
                    <div className="relative bg-white rounded-3xl p-8 pt-12 flex flex-col items-center text-center shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-transparent hover:border-gray-100 transition-colors">
                        <div className="absolute -top-[18px] w-9 h-9 rounded-full bg-[#00d900] flex items-center justify-center text-white font-bold text-[0.95rem] shadow-sm">
                            2
                        </div>
                        <div className="w-14 h-14 rounded-full bg-[#00d900]/10 flex items-center justify-center mb-5">
                            <BarChart2 className="text-[#00d900]" size={26} strokeWidth={2.5} />
                        </div>
                        <h3 className="text-[1.2rem] font-bold mb-3 tracking-tight">Analyze</h3>
                        <p className="text-[#6b7280] text-[0.95rem] leading-[1.6]">
                            Our advanced AI instantly recognizes the food and calculates the nutritional value.
                        </p>
                    </div>

                    {/* Step 3 */}
                    <div className="relative bg-white rounded-3xl p-8 pt-12 flex flex-col items-center text-center shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-transparent hover:border-gray-100 transition-colors">
                        <div className="absolute -top-[18px] w-9 h-9 rounded-full bg-[#00d900] flex items-center justify-center text-white font-bold text-[0.95rem] shadow-sm">
                            3
                        </div>
                        <div className="w-14 h-14 rounded-full bg-[#00d900]/10 flex items-center justify-center mb-5">
                            <Trophy className="text-[#00d900]" size={26} strokeWidth={2.5} />
                        </div>
                        <h3 className="text-[1.2rem] font-bold mb-3 tracking-tight">Track</h3>
                        <p className="text-[#6b7280] text-[0.95rem] leading-[1.6]">
                            Monitor your daily progress, macros, and stay on track towards your health goals.
                        </p>
                    </div>

                </div>

            </main>

            {/* Footer Section */}
            <section className="bg-[#151a2a] pt-20 pb-0 flex flex-col items-center overflow-hidden mt-auto">

                {/* Huge title ref similar to Google Deepmind Antigravity footer */}
                <div className="w-full flex justify-center pointer-events-none select-none">
                    <h1 className="text-[20vw] leading-[0.8] font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white/10 to-transparent">
                        NutriMe
                    </h1>
                </div>
            </section>
        </motion.div>
    );
}

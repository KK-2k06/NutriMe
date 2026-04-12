import React from 'react';
import { useLocation, useOutlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

export default function AuthLayout() {
    const location = useLocation();
    const outlet = useOutlet();
    const isSignIn = location.pathname === '/signin';

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col min-[900px]:flex-row min-h-screen w-full overflow-x-hidden"
        >
            {/* Left Image Panel */}
            <div className="w-full min-[900px]:w-1/2 shrink-0 relative bg-[url('/diet_bg.png')] bg-cover bg-center flex items-end p-8 min-[900px]:p-12 min-h-[40vh] min-[900px]:min-h-screen text-white">

                {/* Background overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10"></div>

                <div className="relative z-20 max-w-[480px]">
                    <h1 className="text-[2rem] min-[900px]:text-[2.25rem] font-bold leading-[1.2] mb-3">
                        Start your journey to a healthier you.
                    </h1>
                    <p className="text-[1rem] font-normal text-[#e5e7eb] leading-[1.5]">
                        Track your meals, discover new recipes, and achieve your fitness goals with NutriMe.
                    </p>
                </div>
            </div>

            {/* Right Form Panel */}
            <div className="w-full min-[900px]:w-1/2 shrink-0 flex items-center justify-center bg-[#f7f9f8] p-4 min-[900px]:p-8 min-h-[60vh] min-[900px]:min-h-screen overflow-hidden relative">
                {/* Static White Form Container */}
                <div className="bg-white rounded-[1.5rem] w-full max-w-[440px] shadow-[0_4px_20px_rgba(0_0_0_/_0.03)] h-[660px] relative overflow-hidden">
                    <AnimatePresence>
                        {outlet ? React.cloneElement(outlet, { key: location.pathname }) : null}
                    </AnimatePresence>
                </div>
            </div>
        </motion.div>
    );
}

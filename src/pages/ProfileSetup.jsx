import React, { useState } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProfileSetup() {
    const navigate = useNavigate();
    const { user, saveProfile } = useAuth();

    const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');
    const [height, setHeight] = useState('');
    const [weight, setWeight] = useState('');
    const [goal, setGoal] = useState('');
    const [allergies, setAllergies] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!fullName.trim()) {
            setError('Please enter your name.');
            return;
        }
        if (!height || !weight) {
            setError('Please enter your height and weight.');
            return;
        }
        if (!goal) {
            setError('Please select a goal.');
            return;
        }

        setIsLoading(true);
        try {
            const w = parseFloat(weight);
            let target_calories = Math.round(w * 24); // Baseline
            if (goal === 'weight_loss') target_calories -= 500;
            if (goal === 'muscle_gain') target_calories += 500;

            const { error: profileError } = await saveProfile({
                full_name: fullName.trim(),
                height: parseFloat(height),
                weight: w,
                goal,
                target_calories,
                allergies: allergies.trim(),
                profile_completed: true,
            });

            if (profileError) {
                setError(profileError.message);
                return;
            }

            navigate('/dashboard');
        } catch (err) {
            setError('Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="absolute inset-0 w-full h-full p-8 min-[900px]:p-10 flex flex-col justify-start overflow-y-auto scrollbar-hide"
        >
            <h1 className="text-[1.8rem] md:text-[2rem] font-extrabold mb-3 text-[#111827]">Set Up Your Profile</h1>
            <p className="text-[#5a6a62] text-[0.95rem] font-medium mb-8 leading-[1.6]">
                Let's personalize your diet plan for the best results.
            </p>

            {/* Error Message */}
            {error && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-[0.85rem] text-center font-medium"
                >
                    {error}
                </motion.div>
            )}

            <form onSubmit={handleSubmit}>
                <div className="mb-5">
                    <label className="block text-[0.8rem] font-bold text-[#374151] mb-2">Full Name</label>
                    <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full px-4 py-3.5 border border-[#e6f0e9] rounded-xl text-[0.95rem] transition-all bg-[#fafdfa] placeholder-[#9ca3af] focus:outline-none focus:border-[#00d900] focus:bg-white focus:ring-[3px] focus:ring-[rgba(0,217,0,0.1)]"
                        placeholder="Enter your name"
                        disabled={isLoading}
                    />
                </div>

                <div className="flex gap-4 mb-5">
                    <div className="flex-1">
                        <label className="block text-[0.8rem] font-bold text-[#374151] mb-2">Height (cm)</label>
                        <input
                            type="number"
                            value={height}
                            onChange={(e) => setHeight(e.target.value)}
                            className="w-full px-4 py-3.5 border border-[#e6f0e9] rounded-xl text-[0.95rem] transition-all bg-[#fafdfa] placeholder-[#9ca3af] focus:outline-none focus:border-[#00d900] focus:bg-white focus:ring-[3px] focus:ring-[rgba(0,217,0,0.1)]"
                            placeholder="175"
                            disabled={isLoading}
                        />
                    </div>
                    <div className="flex-1">
                        <label className="block text-[0.8rem] font-bold text-[#374151] mb-2">Weight (kg)</label>
                        <input
                            type="number"
                            value={weight}
                            onChange={(e) => setWeight(e.target.value)}
                            className="w-full px-4 py-3.5 border border-[#e6f0e9] rounded-xl text-[0.95rem] transition-all bg-[#fafdfa] placeholder-[#9ca3af] focus:outline-none focus:border-[#00d900] focus:bg-white focus:ring-[3px] focus:ring-[rgba(0,217,0,0.1)]"
                            placeholder="70"
                            disabled={isLoading}
                        />
                    </div>
                </div>

                <div className="mb-5">
                    <label className="block text-[0.8rem] font-bold text-[#374151] mb-2">Primary Goal</label>
                    <div className="relative">
                        <select
                            value={goal}
                            onChange={(e) => setGoal(e.target.value)}
                            className="w-full px-4 py-3.5 border border-[#e6f0e9] rounded-xl text-[0.95rem] transition-all bg-[#fafdfa] text-[#6b7280] focus:text-[#111827] appearance-none focus:outline-none focus:border-[#00d900] focus:bg-white focus:ring-[3px] focus:ring-[rgba(0,217,0,0.1)] cursor-pointer"
                            disabled={isLoading}
                        >
                            <option value="" disabled>Select a goal...</option>
                            <option value="weight_loss">Weight Loss</option>
                            <option value="muscle_gain">Muscle Gain</option>
                            <option value="maintenance">Maintenance</option>
                        </select>
                        <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="mb-8">
                    <label className="block text-[0.8rem] font-bold text-[#374151] mb-2">Allergies or Dietary Restrictions</label>
                    <textarea
                        value={allergies}
                        onChange={(e) => setAllergies(e.target.value)}
                        className="w-full px-4 py-3.5 border border-[#e6f0e9] rounded-xl text-[0.95rem] transition-all bg-[#fafdfa] placeholder-[#9ca3af] focus:outline-none focus:border-[#00d900] focus:bg-white focus:ring-[3px] focus:ring-[rgba(0,217,0,0.1)] resize-none"
                        rows="3"
                        placeholder="e.g., Peanuts, Dairy, Gluten-free"
                        disabled={isLoading}
                    ></textarea>
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-[1rem] bg-[#00d900] hover:bg-[#00c000] disabled:opacity-60 disabled:cursor-not-allowed text-black border-none rounded-xl text-[0.95rem] font-bold cursor-pointer transition-colors duration-200 shadow-sm flex items-center justify-center gap-2"
                >
                    {isLoading ? (
                        <>
                            <Loader2 size={18} className="animate-spin" />
                            Saving Profile...
                        </>
                    ) : (
                        <>
                            Save Profile & Start
                            <ArrowRight size={18} strokeWidth={2.5} />
                        </>
                    )}
                </button>
            </form>
        </motion.div>
    );
}

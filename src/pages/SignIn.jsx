import React, { useState } from 'react';
import { Leaf, Mail, Lock, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function SignIn() {
    const navigate = useNavigate();
    const { signIn } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!email.trim()) {
            setError('Please enter your email address.');
            return;
        }
        if (!password) {
            setError('Please enter your password.');
            return;
        }

        setIsLoading(true);
        try {
            const { data, error: signInError } = await signIn(email, password);

            if (signInError) {
                // Map Supabase error messages to user-friendly ones
                if (signInError.message === 'Invalid login credentials') {
                    setError('Invalid email or password. Please try again.');
                } else {
                    setError(signInError.message);
                }
                return;
            }

            if (data?.user) {
                navigate('/dashboard');
            }
        } catch (err) {
            setError('Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: -30 }} // slides from opposite side
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 30 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="absolute inset-0 w-full h-full p-8 min-[900px]:p-10 flex flex-col justify-center"
        >
            {/* Header Details */}
            <div className="flex flex-col items-center mb-8 text-center">
                <div className="flex items-center gap-2 mb-6">
                    <div className="bg-[#00d900] p-1.5 rounded-full flex items-center justify-center">
                        <Leaf size={20} className="text-black" fill="currentColor" />
                    </div>
                    <span className="font-bold text-[1.25rem] text-[#111827]">NutriMe</span>
                </div>
                <h1 className="text-[1.75rem] font-bold mb-2 text-[#111827]">Welcome back</h1>
                <p className="text-[#6b7280] text-[0.95rem]">Please enter your details to sign in.</p>
            </div>

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

            {/* Form */}
            <form onSubmit={handleSubmit}>
                <div className="mb-4">
                    <label className="block text-[0.8rem] font-semibold text-[#111827] mb-1.5">Email Address</label>
                    <div className="relative flex items-center">
                        <Mail className="absolute left-3.5 text-gray-400" size={18} />
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full pl-10 pr-4 py-[0.7rem] border border-gray-100 rounded-lg text-[0.95rem] transition-all bg-[#f9fafb] placeholder-gray-400 focus:outline-none focus:border-[#00d900] focus:bg-white focus:ring-[3px] focus:ring-[rgba(0_217_0_/_0.1)]"
                            placeholder="you@example.com"
                            disabled={isLoading}
                        />
                    </div>
                </div>

                <div className="mb-5">
                    <label className="block text-[0.8rem] font-semibold text-[#111827] mb-1.5">Password</label>
                    <div className="relative flex items-center">
                        <Lock className="absolute left-3.5 text-gray-400" size={18} />
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-10 pr-4 py-[0.7rem] border border-gray-100 rounded-lg text-[0.95rem] transition-all bg-[#f9fafb] placeholder-gray-400 focus:outline-none focus:border-[#00d900] focus:bg-white focus:ring-[3px] focus:ring-[rgba(0_217_0_/_0.1)]"
                            placeholder="••••••••"
                            disabled={isLoading}
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-[0.75rem] bg-[#00d900] hover:bg-[#00c000] disabled:opacity-60 disabled:cursor-not-allowed text-black border-none rounded-lg text-[0.95rem] font-semibold cursor-pointer transition-colors duration-200 shadow-sm flex items-center justify-center gap-2"
                >
                    {isLoading ? (
                        <>
                            <Loader2 size={18} className="animate-spin" />
                            Signing In...
                        </>
                    ) : (
                        'Sign In'
                    )}
                </button>

                <div className="text-center mt-6 text-[0.875rem] text-[#6b7280]">
                    Don't have an account?
                    <button
                        type="button"
                        onClick={() => navigate('/signup')}
                        disabled={isLoading}
                        className="text-[#00d900] font-semibold ml-1.5 hover:underline decoration-auto cursor-pointer bg-transparent border-none p-0"
                    >
                        Sign Up
                    </button>
                </div>
            </form>
        </motion.div>
    );
}

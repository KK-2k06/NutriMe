import React, { useState } from 'react';
import { Leaf, User, Mail, Lock, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function SignUp() {
    const navigate = useNavigate();
    const { signUp } = useAuth();

    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validation
        if (!fullName.trim()) {
            setError('Please enter your full name.');
            return;
        }
        if (!email.trim()) {
            setError('Please enter your email address.');
            return;
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setIsLoading(true);
        try {
            const { data, error: signUpError } = await signUp(email, password, fullName);

            if (signUpError) {
                setError(signUpError.message);
                return;
            }

            // If sign-up is successful, navigate to profile setup
            if (data?.user) {
                navigate('/profile-setup');
            }
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
            className="absolute inset-0 w-full h-full p-8 min-[900px]:p-10 flex flex-col justify-center"
        >
            {/* Header Details */}
            <div className="flex flex-col items-center mb-8 text-center">
                <div className="flex items-center gap-2 mb-3">
                    <div className="bg-[#00d900] p-1.5 rounded-full flex items-center justify-center">
                        <Leaf size={20} className="text-black" fill="currentColor" />
                    </div>
                    <span className="font-bold text-[1.25rem] text-[#111827]">NutriMe</span>
                </div>
                <h1 className="text-[1.75rem] font-bold mb-2 text-[#111827]">Create Account</h1>
                <p className="text-[#6b7280] text-[0.95rem]">Join NutriMe today and take control.</p>
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

            <form onSubmit={handleSubmit}>
                <div className="mb-4">
                    <label className="block text-[0.8rem] font-semibold text-[#111827] mb-1.5">Full Name</label>
                    <div className="relative flex items-center">
                        <User className="absolute left-3.5 text-gray-400" size={18} />
                        <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="w-full pl-10 pr-4 py-[0.7rem] border border-gray-100 rounded-lg text-[0.95rem] transition-all bg-[#f9fafb] placeholder-gray-400 focus:outline-none focus:border-[#00d900] focus:bg-white focus:ring-[3px] focus:ring-[rgba(0,217,0,0.1)]"
                            placeholder="Enter your full name"
                            disabled={isLoading}
                        />
                    </div>
                </div>

                <div className="mb-4">
                    <label className="block text-[0.8rem] font-semibold text-[#111827] mb-1.5">Email Address</label>
                    <div className="relative flex items-center">
                        <Mail className="absolute left-3.5 text-gray-400" size={18} />
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full pl-10 pr-4 py-[0.7rem] border border-gray-100 rounded-lg text-[0.95rem] transition-all bg-[#f9fafb] placeholder-gray-400 focus:outline-none focus:border-[#00d900] focus:bg-white focus:ring-[3px] focus:ring-[rgba(0,217,0,0.1)]"
                            placeholder="Enter your email address"
                            disabled={isLoading}
                        />
                    </div>
                </div>

                <div className="mb-4">
                    <label className="block text-[0.8rem] font-semibold text-[#111827] mb-1.5">Password</label>
                    <div className="relative flex items-center">
                        <Lock className="absolute left-3.5 text-gray-400" size={18} />
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-10 pr-4 py-[0.7rem] border border-gray-100 rounded-lg text-[0.95rem] transition-all bg-[#f9fafb] placeholder-gray-400 focus:outline-none focus:border-[#00d900] focus:bg-white focus:ring-[3px] focus:ring-[rgba(0,217,0,0.1)]"
                            placeholder="Create a strong password"
                            disabled={isLoading}
                        />
                    </div>
                </div>

                <div className="mb-6">
                    <label className="block text-[0.8rem] font-semibold text-[#111827] mb-1.5">Confirm Password</label>
                    <div className="relative flex items-center">
                        <Lock className="absolute left-3.5 text-gray-400" size={18} />
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full pl-10 pr-4 py-[0.7rem] border border-gray-100 rounded-lg text-[0.95rem] transition-all bg-[#f9fafb] placeholder-gray-400 focus:outline-none focus:border-[#00d900] focus:bg-white focus:ring-[3px] focus:ring-[rgba(0,217,0,0.1)]"
                            placeholder="Repeat your password"
                            disabled={isLoading}
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-[0.75rem] bg-[#00d900] hover:bg-[#00c000] disabled:opacity-60 disabled:cursor-not-allowed text-black border-none rounded-lg text-[0.95rem] font-semibold cursor-pointer mt-2 transition-colors duration-200 shadow-sm flex items-center justify-center gap-2"
                >
                    {isLoading ? (
                        <>
                            <Loader2 size={18} className="animate-spin" />
                            Creating Account...
                        </>
                    ) : (
                        'Create Account'
                    )}
                </button>

                <div className="text-center mt-6 text-[0.875rem] text-[#6b7280]">
                    Already have an account?
                    <button type="button" onClick={() => navigate('/signin')} disabled={isLoading} className="cursor-pointer bg-transparent border-none p-0 text-[#00d900] font-semibold ml-1.5 hover:underline decoration-auto">Sign In</button>
                </div>
            </form>
        </motion.div>
    );
}

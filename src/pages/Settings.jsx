import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Upload, X, ChevronDown, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Settings() {
    const { user, getProfile, saveProfile, signOut } = useAuth();
    const navigate = useNavigate();

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    // Form state
    const [fullName, setFullName] = useState('');
    const [height, setHeight] = useState('');
    const [weight, setWeight] = useState('');
    const [goal, setGoal] = useState('maintenance');
    const [restrictions, setRestrictions] = useState([]);
    const [newRestriction, setNewRestriction] = useState('');
    const [units, setUnits] = useState('metric'); // currently decorative

    // Load profile data
    useEffect(() => {
        const fetchProfile = async () => {
            if (!user) return;
            const { data, error } = await getProfile();
            if (data) {
                setFullName(data.full_name || '');
                setHeight(data.height || '');
                setWeight(data.weight || '');
                setGoal(data.goal || 'maintenance');
                if (data.allergies) {
                    setRestrictions(data.allergies.split(',').map(s => s.trim()).filter(Boolean));
                }
            }
            setIsLoading(false);
        };
        fetchProfile();
    }, [user, getProfile]);

    const addRestriction = () => {
        const trimmed = newRestriction.trim();
        if (trimmed && !restrictions.includes(trimmed)) {
            setRestrictions([...restrictions, trimmed]);
        }
        setNewRestriction('');
    };

    const removeRestriction = (item) => {
        setRestrictions(restrictions.filter(r => r !== item));
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') addRestriction();
    };

    const handleUpdateProfile = async () => {
        setIsSaving(true);
        setMessage({ type: '', text: '' });
        try {
            const w = parseFloat(weight);
            let target_calories = Math.round(w * 24); // Baseline
            if (goal === 'weight_loss') target_calories -= 500;
            if (goal === 'muscle_gain') target_calories += 500;

            const { error } = await saveProfile({
                full_name: fullName.trim(),
                height: parseFloat(height),
                weight: w,
                goal,
                target_calories,
                allergies: restrictions.join(', ')
            });

            if (error) throw error;
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
        } catch (error) {
            console.error('Update failed:', error);
            setMessage({ type: 'error', text: 'Failed to update profile.' });
        } finally {
            setIsSaving(false);
            // Auto hide message after 3 seconds
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        }
    };

    const handleLogout = async () => {
        await signOut();
        navigate('/');
    };

    const inputCls = "w-full px-4 py-3 rounded-lg border border-gray-200 text-[0.9rem] text-[#111827] focus:outline-none focus:border-[#00d900] focus:ring-1 focus:ring-[#00d900] transition-colors bg-white";
    const labelCls = "text-[0.8rem] font-semibold text-gray-500 mb-1.5";
    const sectionCls = "bg-white rounded-2xl border border-[#f3f4f6] p-7 shadow-[0_2px_8px_rgba(0,0,0,0.03)]";

    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-6 max-w-[780px] mx-auto"
        >
            {/* Alerts */}
            {message.text && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-xl text-[0.85rem] font-medium text-center ${message.type === 'success' ? 'bg-[#e6ffed] text-[#00a000] border border-[#b3f0c0]' : 'bg-red-50 text-red-600 border border-red-200'}`}
                >
                    {message.text}
                </motion.div>
            )}

            {/* Account Details */}
            <div className={sectionCls}>
                <h2 className="text-[1.15rem] font-bold text-[#111827] mb-6">Account Details</h2>

                {isLoading ? (
                    <div className="flex items-center justify-center py-10">
                        <Loader2 className="animate-spin text-[#00d900]" size={24} />
                    </div>
                ) : (
                    <div className="flex flex-col sm:flex-row gap-8 items-start">
                        {/* Avatar */}
                        <div className="flex flex-col items-center gap-3 shrink-0">
                            <div className="w-[110px] h-[110px] rounded-full bg-[#fde8d8] flex items-center justify-center overflow-hidden border-4 border-white shadow-md">
                                <img
                                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(fullName || 'User')}&background=ffccb3&color=c0602a&size=110`}
                                    alt="Profile"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <button className="flex items-center gap-1.5 text-[0.8rem] font-semibold text-[#00d900] hover:text-[#00b000] transition-colors cursor-pointer">
                                <Upload size={14} />
                                Upload Picture
                            </button>
                        </div>

                        {/* Fields */}
                        <div className="flex flex-col gap-4 flex-1 w-full">
                            <div className="flex flex-col">
                                <label className={labelCls}>Full Name</label>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className={inputCls}
                                />
                            </div>
                            <div className="flex flex-col">
                                <label className={labelCls}>Email Address</label>
                                <input
                                    type="email"
                                    value={user?.email || ''}
                                    readOnly
                                    className={`${inputCls} bg-gray-50 text-gray-400 cursor-not-allowed`}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Physical Profile */}
            <div className={sectionCls}>
                <h2 className="text-[1.15rem] font-bold text-[#111827] mb-6">Physical Profile</h2>

                <div className="flex gap-5">
                    <div className="flex flex-col flex-1">
                        <label className={labelCls}>Height</label>
                        <div className="flex rounded-lg border border-gray-200 overflow-hidden focus-within:border-[#00d900] focus-within:ring-1 focus-within:ring-[#00d900] transition-all">
                            <input
                                type="number"
                                value={height}
                                onChange={(e) => setHeight(e.target.value)}
                                className="flex-1 px-4 py-3 text-[0.9rem] text-[#111827] focus:outline-none bg-white"
                            />
                            <span className="px-4 flex items-center bg-gray-50 text-gray-400 text-[0.85rem] font-semibold border-l border-gray-200">cm</span>
                        </div>
                    </div>
                    <div className="flex flex-col flex-1">
                        <label className={labelCls}>Weight</label>
                        <div className="flex rounded-lg border border-gray-200 overflow-hidden focus-within:border-[#00d900] focus-within:ring-1 focus-within:ring-[#00d900] transition-all">
                            <input
                                type="number"
                                value={weight}
                                onChange={(e) => setWeight(e.target.value)}
                                className="flex-1 px-4 py-3 text-[0.9rem] text-[#111827] focus:outline-none bg-white"
                            />
                            <span className="px-4 flex items-center bg-gray-50 text-gray-400 text-[0.85rem] font-semibold border-l border-gray-200">kg</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Dietary Goals & Restrictions */}
            <div className={sectionCls}>
                <h2 className="text-[1.15rem] font-bold text-[#111827] mb-6">Dietary Goals & Restrictions</h2>

                <div className="flex flex-col gap-5">
                    {/* Diet Goal */}
                    <div className="flex flex-col">
                        <label className={labelCls}>Diet Goal</label>
                        <div className="relative">
                            <select
                                value={goal}
                                onChange={(e) => setGoal(e.target.value)}
                                className={`${inputCls} appearance-none pr-10 cursor-pointer`}
                            >
                                <option value="weight_loss">Weight Loss</option>
                                <option value="muscle_gain">Muscle Gain</option>
                                <option value="maintenance">Maintenance</option>
                            </select>
                            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                    </div>

                    {/* Allergies & Restrictions */}
                    <div className="flex flex-col gap-3">
                        <label className={labelCls}>Allergies & Restrictions</label>

                        {/* Tags */}
                        {restrictions.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {restrictions.map((item) => (
                                    <span
                                        key={item}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#e6ffed] text-[#00a000] text-[0.8rem] font-semibold rounded-full border border-[#b3f0c0]"
                                    >
                                        {item}
                                        <button
                                            onClick={() => removeRestriction(item)}
                                            className="text-[#00a000] hover:text-red-400 transition-colors cursor-pointer"
                                        >
                                            <X size={13} />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Add input */}
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Add restriction (e.g., Dairy)"
                                value={newRestriction}
                                onChange={(e) => setNewRestriction(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className={`${inputCls} flex-1`}
                            />
                            <button
                                onClick={addRestriction}
                                className="px-5 py-3 bg-[#00d900] hover:bg-[#00c000] text-black font-bold text-[0.85rem] rounded-lg transition-colors cursor-pointer shrink-0"
                            >
                                Add
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* App Preferences */}
            <div className={sectionCls}>
                <h2 className="text-[1.15rem] font-bold text-[#111827] mb-6">App Preferences</h2>

                <div className="flex flex-col gap-2">
                    <label className={labelCls}>Measurement Units</label>
                    <div className="flex items-center gap-6">
                        {[
                            { id: 'metric', label: 'Metric (kg, cm)' },
                            { id: 'imperial', label: 'Imperial (lb, ft)' },
                        ].map(({ id, label }) => (
                            <label key={id} className="flex items-center gap-2.5 cursor-pointer select-none">
                                <div
                                    onClick={() => setUnits(id)}
                                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer ${units === id ? 'border-[#00d900]' : 'border-gray-300'}`}
                                >
                                    {units === id && (
                                        <div className="w-2.5 h-2.5 rounded-full bg-[#00d900]" />
                                    )}
                                </div>
                                <span
                                    onClick={() => setUnits(id)}
                                    className={`text-[0.9rem] font-medium ${units === id ? 'text-[#111827]' : 'text-gray-400'}`}
                                >
                                    {label}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pb-4">
                <button
                    onClick={handleLogout}
                    className="px-6 py-3 rounded-xl border border-gray-200 text-[0.9rem] font-semibold text-[#111827] hover:bg-gray-50 transition-colors cursor-pointer"
                >
                    Logout
                </button>
                <button
                    onClick={handleUpdateProfile}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-8 py-3 bg-[#00d900] hover:bg-[#00c000] text-black font-bold text-[0.9rem] rounded-xl shadow-[0_4px_14px_rgba(0,217,0,0.25)] transition-all cursor-pointer disabled:opacity-75 disabled:cursor-wait"
                >
                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : null}
                    {isSaving ? 'Updating...' : 'Update Profile'}
                </button>
            </div>
        </motion.div>
    );
}

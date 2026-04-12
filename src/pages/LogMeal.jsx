import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Plus, Save, Zap, Utensils, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

const QUICK_ADD_ITEMS = [
    { name: 'Idly', info: '58 kcal • 2g protein', macros: { calories: 58, protein: 2, carbs: 12, fats: 0 } },
    { name: 'Dosa', info: '165 kcal • 4g protein', macros: { calories: 165, protein: 4, carbs: 28, fats: 4 } },
    { name: 'Samosa', info: '262 kcal • 5g protein', macros: { calories: 262, protein: 5, carbs: 31, fats: 13 } },
    { name: 'Boiled Egg', info: '155 kcal • 13g protein', macros: { calories: 155, protein: 13, carbs: 1, fats: 11 } }
];

export default function LogMeal() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const getIstDate = () => {
        return new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit'
        }).format(new Date());
    };

    const getIstTime = () => {
        return new Intl.DateTimeFormat('en-GB', {
            timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit'
        }).format(new Date());
    };

    const [formData, setFormData] = useState({
        name: '',
        date: getIstDate(),
        time: getIstTime(),
        calories: 0,
        protein: 0,
        carbs: 0,
        fats: 0
    });
    const [isSaving, setIsSaving] = useState(false);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: ['calories', 'protein', 'carbs', 'fats'].includes(name) ? Number(value) : value
        }));
    };

    const handleQuickAdd = (item) => {
        setFormData(prev => ({
            ...prev,
            name: item.name,
            ...item.macros
        }));
    };

    const handleSave = async () => {
        if (!user) return;
        if (!formData.name.trim()) return alert('Please enter a meal name.');

        setIsSaving(true);
        try {
            const { error } = await supabase.from('meal_history').insert({
                user_id: user.id,
                date: formData.date,
                meal_name: formData.name,
                meal_desc: 'Manually logged',
                image_url: null, // Explicitly no image
                kcal: formData.calories,
                protein: formData.protein,
                carbs: formData.carbs,
                fat: formData.fats
            });

            if (error) throw error;
            navigate('/meal-history');
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
            className="flex flex-col gap-8 h-full max-w-[1000px] mx-auto text-[#111827]"
        >
            <p className="text-[0.85rem] text-gray-400 font-medium">Manually add your meal details or use quick add for common items.</p>

            <div className="flex flex-col lg:flex-row gap-8 items-start">

                {/* Form Section */}
                <div className="flex-1 w-full bg-white rounded-2xl shadow-[0_2px_12px_rgba(0_0_0_/_0.02)] border border-[#f3f4f6] p-8">

                    <div className="flex flex-col gap-6">

                        {/* Meal Name */}
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-bold text-gray-800">Meal Name</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    placeholder="e.g., Grilled Chicken Salad"
                                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:border-[#00d900] focus:ring-1 focus:ring-[#00d900] transition-colors"
                                />
                                <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            </div>
                        </div>

                        {/* Date and Time */}
                        <div className="flex gap-4">
                            <div className="flex flex-col gap-2 flex-1">
                                <label className="text-sm font-bold text-gray-800">Date</label>
                                <input
                                    type="date"
                                    name="date"
                                    value={formData.date}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 text-gray-700 rounded-lg border border-gray-200 focus:outline-none focus:border-[#00d900] focus:ring-1 focus:ring-[#00d900] transition-colors"
                                />
                            </div>
                            <div className="flex flex-col gap-2 flex-1">
                                <label className="text-sm font-bold text-gray-800">Time</label>
                                <input
                                    type="time"
                                    name="time"
                                    value={formData.time}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 text-gray-700 rounded-lg border border-gray-200 focus:outline-none focus:border-[#00d900] focus:ring-1 focus:ring-[#00d900] transition-colors"
                                />
                            </div>
                        </div>

                        {/* Nutritional Information */}
                        <div className="flex flex-col gap-2 mt-2">
                            <label className="text-lg font-bold text-gray-800 mb-2">Nutritional Information</label>
                            <div className="flex gap-4">

                                <div className="flex flex-col gap-2 flex-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Calories</label>
                                    <div className="relative">
                                        <input type="number" min="0" name="calories" value={formData.calories === 0 ? '' : formData.calories} onChange={handleInputChange} className="w-full px-4 py-3 bg-gray-50 rounded-lg border border-gray-200 focus:outline-none focus:bg-white focus:border-[#00d900] transition-colors font-semibold text-center" />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">kcal</span>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2 flex-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Protein</label>
                                    <div className="relative">
                                        <input type="number" min="0" name="protein" value={formData.protein === 0 ? '' : formData.protein} onChange={handleInputChange} className="w-full px-4 py-3 bg-gray-50 rounded-lg border border-gray-200 focus:outline-none focus:bg-white focus:border-[#00d900] transition-colors font-semibold text-center" />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">g</span>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2 flex-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Carbs</label>
                                    <div className="relative">
                                        <input type="number" min="0" name="carbs" value={formData.carbs === 0 ? '' : formData.carbs} onChange={handleInputChange} className="w-full px-4 py-3 bg-gray-50 rounded-lg border border-gray-200 focus:outline-none focus:bg-white focus:border-[#00d900] transition-colors font-semibold text-center" />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">g</span>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2 flex-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Fats</label>
                                    <div className="relative">
                                        <input type="number" min="0" name="fats" value={formData.fats === 0 ? '' : formData.fats} onChange={handleInputChange} className="w-full px-4 py-3 bg-gray-50 rounded-lg border border-gray-200 focus:outline-none focus:bg-white focus:border-[#00d900] transition-colors font-semibold text-center" />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">g</span>
                                    </div>
                                </div>

                            </div>
                        </div>

                        {/* Save Button */}
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="w-full mt-4 py-4 bg-[#00d900] hover:bg-[#00c000] disabled:bg-[#00d900]/60 text-black font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-[0_4px_14px_rgba(0_217_0_/_0.25)] transition-all"
                        >
                            {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} className="fill-black" />}
                            {isSaving ? 'Saving...' : 'Save Meal'}
                        </button>

                    </div>
                </div>

                {/* Quick Add Section */}
                <div className="w-full lg:w-[320px] bg-white rounded-2xl shadow-[0_2px_12px_rgba(0_0_0_/_0.02)] border border-[#f3f4f6] p-6 lg:p-8 shrink-0">
                    <div className="flex items-center gap-2 mb-6">
                        <Zap className="text-[#00d900] fill-[#00d900]" size={20} />
                        <h2 className="text-lg font-bold">Quick Add</h2>
                    </div>

                    <div className="flex flex-col gap-4">

                        {QUICK_ADD_ITEMS.map((item, idx) => (
                            <div
                                key={idx}
                                onClick={() => handleQuickAdd(item)}
                                className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:border-[#00d900] hover:shadow-sm transition-all cursor-pointer group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center group-hover:bg-[#e6ffed] transition-colors">
                                        <Utensils size={16} className="text-gray-400 group-hover:text-[#00d900] transition-colors" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-sm text-gray-800">{item.name}</span>
                                        <span className="text-xs text-gray-500 font-medium">{item.info}</span>
                                    </div>
                                </div>
                                <button className="text-gray-400 group-hover:text-[#00d900] transition-colors">
                                    <Plus size={20} />
                                </button>
                            </div>
                        ))}

                    </div>
                </div>

            </div>
        </motion.div>
    );
}

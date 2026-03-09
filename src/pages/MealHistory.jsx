import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Flame, Beef, Wheat, Droplets, Loader2, Trash2, Utensils } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

function MacroStat({ value, label }) {
    return (
        <div className="flex flex-col items-center">
            <span className="font-bold text-[1rem] text-[#111827]">{value}</span>
            <span className="text-[0.7rem] text-gray-400 font-medium">{label}</span>
        </div>
    );
}

function MealCard({ meal, onDelete }) {
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDeleteClick = async () => {
        if (!window.confirm(`Are you sure you want to delete ${meal.name}?`)) return;
        setIsDeleting(true);
        await onDelete(meal);
        setIsDeleting(false); // Only useful if the parent fails to remove it fast enough 
    };

    return (
        <motion.div
            whileHover={{ y: -3, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-2xl border border-[#f3f4f6] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex flex-col"
        >
            {/* Image Area */}
            <div className={`relative h-[240px] overflow-hidden shrink-0 flex items-center justify-center ${!meal.image ? 'bg-gradient-to-br from-[#00d900]/10 to-[#00a000]/5' : ''}`}>
                {meal.image && (
                    <>
                        <img
                            src={meal.image}
                            alt={meal.name}
                            className="absolute inset-0 w-full h-full object-cover"
                        />
                        {/* Gradient for text readability */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent pointer-events-none" />
                    </>
                )}

                {/* Top Actions Layer */}
                <div className="absolute top-4 left-4 right-4 flex items-start justify-between z-10">
                    {/* Time badge */}
                    <div className="bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
                        <Clock size={12} className="text-[#111827]" />
                        <span className="text-[0.72rem] font-bold text-[#111827]">{meal.time}</span>
                    </div>

                    {/* Delete button */}
                    <button
                        onClick={handleDeleteClick}
                        disabled={isDeleting}
                        className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm text-red-500 hover:bg-red-50 hover:text-red-600 flex items-center justify-center shadow-sm transition-colors opacity-80 hover:opacity-100 disabled:opacity-50 cursor-pointer"
                        title="Delete meal"
                    >
                        {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                </div>

                {/* Overlapped Name */}
                {meal.image ? (
                    <div className="absolute bottom-4 left-4 right-4 z-10 text-left">
                        <h3 className="font-bold text-[1.2rem] text-white leading-tight drop-shadow-md">
                            {meal.name}
                        </h3>
                    </div>
                ) : (
                    <div className="relative z-10 flex flex-col items-center justify-center pt-8">
                        <div className="w-14 h-14 bg-[#00d900]/20 rounded-full flex items-center justify-center mb-3">
                            <Utensils size={28} className="text-[#00c000]" />
                        </div>
                        <h3 className="font-bold text-[1.3rem] text-[#111827] leading-tight text-center px-4">
                            {meal.name}
                        </h3>
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="p-5 pt-6 bg-white shrink-0">
                {/* Macros */}
                <div className="flex items-center justify-between">
                    <div className="flex flex-col items-center">
                        <span className="font-bold text-[1.1rem] text-[#111827]">{meal.kcal}</span>
                        <span className="text-[0.7rem] text-gray-400 font-medium">kcal</span>
                    </div>
                    <div className="w-px h-10 bg-[#f3f4f6]" />
                    <MacroStat value={meal.protein} label="P" />
                    <div className="w-px h-10 bg-[#f3f4f6]" />
                    <MacroStat value={meal.carbs} label="C" />
                    <div className="w-px h-10 bg-[#f3f4f6]" />
                    <MacroStat value={meal.fat} label="F" />
                </div>
            </div>
        </motion.div>
    );
}

export default function MealHistory() {
    const { user } = useAuth();
    const [historyGroups, setHistoryGroups] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            if (!user) return;
            try {
                const { data, error } = await supabase
                    .from('meal_history')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false });

                if (data) {
                    const groups = {};
                    data.forEach(meal => {
                        const date = meal.date;
                        if (!groups[date]) groups[date] = { items: [], totals: { kcal: 0, protein: 0, carbs: 0, fat: 0 } };

                        const time = new Date(meal.created_at).toLocaleTimeString([], {
                            timeZone: 'Asia/Kolkata',
                            hour: '2-digit',
                            minute: '2-digit'
                        });

                        groups[date].items.push({
                            id: meal.id,
                            time,
                            name: meal.meal_name,
                            desc: meal.meal_desc || 'Analyzed meal',
                            image: meal.image_url || null,
                            kcal: meal.kcal || 0,
                            protein: `${meal.protein || 0}g`,
                            carbs: `${meal.carbs || 0}g`,
                            fat: `${meal.fat || 0}g`
                        });

                        groups[date].totals.kcal += meal.kcal || 0;
                        groups[date].totals.protein += meal.protein || 0;
                        groups[date].totals.carbs += meal.carbs || 0;
                        groups[date].totals.fat += meal.fat || 0;
                    });

                    const formatted = Object.keys(groups).map(d => {
                        const todayLocal = new Date().toLocaleDateString('en-CA'); // e.g. '2023-10-24' based on local timezone, handles offsets better
                        // Quick parsing trick: add 'T00:00:00' to assume local parsing
                        const dObj = new Date(`${d}T00:00:00`);
                        let label = dObj.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });

                        // Basic Today check (can optionally implement exact Yesterday check)
                        const today = new Intl.DateTimeFormat('en-CA', {
                            timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit'
                        }).format(new Date());
                        if (d === today) label = `Today, ${label}`;

                        return {
                            date: label,
                            sortDate: d,
                            totals: {
                                kcal: groups[d].totals.kcal.toLocaleString(),
                                protein: `${groups[d].totals.protein}g`,
                                carbs: `${groups[d].totals.carbs}g`,
                                fat: `${groups[d].totals.fat}g`
                            },
                            items: groups[d].items
                        };
                    });
                    setHistoryGroups(formatted.sort((a, b) => b.sortDate.localeCompare(a.sortDate)));
                }
            } catch (err) {
                console.error('Error fetching history:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchHistory();
    }, [user]);

    const handleDelete = async (mealToDelete) => {
        try {
            // 2. Delete the database row
            const { error: dbError } = await supabase
                .from('meal_history')
                .delete()
                .eq('id', mealToDelete.id)
                .eq('user_id', user.id); // extra safety check

            if (dbError) throw dbError;

            // Re-fetch or manually filter out
            // For simplicity and to update the totals perfectly, let's just trigger a re-fetch instantly:
            setIsLoading(true);
            const { data } = await supabase
                .from('meal_history')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (data) {
                const groups = {};
                data.forEach(meal => {
                    const date = meal.date;
                    if (!groups[date]) groups[date] = { items: [], totals: { kcal: 0, protein: 0, carbs: 0, fat: 0 } };
                    const time = new Date(meal.created_at).toLocaleTimeString([], {
                        timeZone: 'Asia/Kolkata',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                    groups[date].items.push({
                        id: meal.id,
                        time,
                        name: meal.meal_name,
                        desc: meal.meal_desc || 'Analyzed meal',
                        image: meal.image_url || null,
                        kcal: meal.kcal || 0,
                        protein: `${meal.protein || 0}g`,
                        carbs: `${meal.carbs || 0}g`,
                        fat: `${meal.fat || 0}g`
                    });
                    groups[date].totals.kcal += meal.kcal || 0;
                    groups[date].totals.protein += meal.protein || 0;
                    groups[date].totals.carbs += meal.carbs || 0;
                    groups[date].totals.fat += meal.fat || 0;
                });

                const formatted = Object.keys(groups).map(d => {
                    const dObj = new Date(`${d}T00:00:00`);
                    let label = dObj.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
                    const today = new Intl.DateTimeFormat('en-CA', {
                        timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit'
                    }).format(new Date());
                    if (d === today) label = `Today, ${label}`;
                    return {
                        date: label,
                        sortDate: d,
                        totals: {
                            kcal: groups[d].totals.kcal.toLocaleString(),
                            protein: `${groups[d].totals.protein}g`,
                            carbs: `${groups[d].totals.carbs}g`,
                            fat: `${groups[d].totals.fat}g`
                        },
                        items: groups[d].items
                    };
                });
                setHistoryGroups(formatted.sort((a, b) => b.sortDate.localeCompare(a.sortDate)));
            } else {
                setHistoryGroups([]);
            }
        } catch (error) {
            console.error('Failed to delete meal:', error);
            alert('Failed to delete meal. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading && historyGroups.length === 0) { // Keep data visible if doing background re-fetch after delete
        return (
            <div className="flex h-[300px] items-center justify-center">
                <Loader2 size={32} className="animate-spin text-[#00d900]" />
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-10 max-w-[1100px] mx-auto"
        >
            {/* Subtitle */}
            <p className="text-[0.85rem] text-gray-400 font-medium -mb-4">Track your past meals and nutrition progress</p>

            {historyGroups.length === 0 ? (
                <div className="bg-gray-50 border border-gray-100 rounded-2xl flex flex-col items-center justify-center py-20 mt-4 text-center">
                    <Droplets size={48} className="text-gray-300 mb-4" />
                    <h3 className="text-gray-900 font-bold mb-1">No meals recorded</h3>
                    <p className="text-gray-500 text-sm">Capture your first meal to start tracking your history.</p>
                </div>
            ) : historyGroups.map((group, gi) => (
                <div key={gi} className="flex flex-col gap-5">

                    {/* Date header + Daily totals */}
                    <div className="flex items-center justify-between">
                        <h2 className={`font-bold text-[1.15rem] ${gi === 0 ? 'text-[#00c000]' : 'text-[#111827]'}`}>
                            {group.date}
                        </h2>
                        <div className="flex items-center gap-5 text-[0.8rem] font-semibold text-gray-500">
                            <span className="flex items-center gap-1.5"><Flame size={14} className="text-gray-400" /><span className="text-[#111827] font-bold">{group.totals.kcal}</span> kcal</span>
                            <span className="flex items-center gap-1.5"><Beef size={14} className="text-gray-400" /><span className="text-[#111827] font-bold">{group.totals.protein}</span> P</span>
                            <span className="flex items-center gap-1.5"><Wheat size={14} className="text-gray-400" /><span className="text-[#111827] font-bold">{group.totals.carbs}</span> C</span>
                            <span className="flex items-center gap-1.5"><Droplets size={14} className="text-gray-400" /><span className="text-[#111827] font-bold">{group.totals.fat}</span> F</span>
                        </div>
                    </div>

                    {/* Meal cards grid */}
                    <div className="grid gap-5 grid-cols-1 md:grid-cols-3">
                        {group.items.map((meal, mi) => (
                            <MealCard key={meal.id || mi} meal={meal} onDelete={handleDelete} />
                        ))}
                    </div>

                </div>
            ))}
        </motion.div>
    );
}

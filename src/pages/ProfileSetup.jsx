import React, { useState } from 'react';
import {
    Leaf, User, Calendar, Ruler, Scale, Heart,
    Activity, Target, AlertCircle, Loader2, ArrowRight,
    Users
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const INITIAL_PERSON_STATE = {
    age: '',
    gender: '1', // 1: Female, 2: Male
    height: '',
    weight: '',
    apHi: '',
    apLo: '',
    cholesterol: '',
    glucose: '',
    active: true,
    allergies: ''
};

export default function ProfileSetup() {
    const navigate = useNavigate();
    const { user, saveProfile } = useAuth();

    // Multi-Person State
    const [profiles, setProfiles] = useState({
        user: { ...INITIAL_PERSON_STATE, fullName: user?.user_metadata?.full_name || '', goal: '' },
        father: { ...INITIAL_PERSON_STATE, gender: '2' },
        mother: { ...INITIAL_PERSON_STATE, gender: '1' },
        grandfather: { ...INITIAL_PERSON_STATE, gender: '2' },
        grandmother: { ...INITIAL_PERSON_STATE, gender: '1' }
    });

    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const updatePersonField = (person, field, value) => {
        setProfiles(prev => ({
            ...prev,
            [person]: { ...prev[person], [field]: value }
        }));
    };

    const validateForm = () => {
        const requiredFields = ['age', 'height', 'weight', 'apHi', 'apLo', 'cholesterol', 'glucose'];
        const mandatoryProfiles = ['user', 'father', 'mother'];

        for (const person of mandatoryProfiles) {
            for (const field of requiredFields) {
                if (!profiles[person][field]) return `${person.charAt(0).toUpperCase() + person.slice(1)}'s health data is incomplete.`;
            }
        }
        if (!profiles.user.fullName.trim()) return "Please enter your full name.";
        if (!profiles.user.goal) return "Please select your primary goal.";
        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const validationError = validateForm();
        if (validationError) {
            setError(validationError);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        setError('');
        setIsLoading(true);

        try {
            // Predict Cardio Risk for the main User
            let cardioRisk = 0;
            try {
                const response = await fetch('http://localhost:8000/predict', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        age_years: parseInt(profiles.user.age),
                        gender: parseInt(profiles.user.gender),
                        height: parseFloat(profiles.user.height),
                        weight: parseFloat(profiles.user.weight),
                        ap_hi: parseInt(profiles.user.apHi),
                        ap_lo: parseInt(profiles.user.apLo),
                        cholesterol_raw: parseFloat(profiles.user.cholesterol),
                        gluc_raw: parseFloat(profiles.user.glucose),
                        active: profiles.user.active ? 1 : 0
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    cardioRisk = data.cardio_risk_probability;
                }
            } catch (err) {
                console.warn('Backend not available. Proceeding with default risk score.');
            }

            const w = parseFloat(profiles.user.weight);
            let target_calories = Math.round(w * 24);
            if (profiles.user.goal === 'weight_loss') target_calories -= 500;
            if (profiles.user.goal === 'muscle_gain') target_calories += 500;

            // Save comprehensive profile
            const { error: profileError } = await saveProfile({
                full_name: profiles.user.fullName.trim(),
                age: parseInt(profiles.user.age),
                gender: parseInt(profiles.user.gender),
                height: parseFloat(profiles.user.height),
                weight: w,
                systolic_bp: parseInt(profiles.user.apHi),
                diastolic_bp: parseInt(profiles.user.apLo),
                cholesterol_mgdl: parseFloat(profiles.user.cholesterol),
                glucose_mgdl: parseFloat(profiles.user.glucose),
                active: profiles.user.active ? 1 : 0,
                goal: profiles.user.goal,
                target_calories,
                allergies: profiles.user.allergies.trim(),
                cardio_risk_score: cardioRisk,
                profile_completed: true,
                family_health_history: {
                    father: profiles.father,
                    mother: profiles.mother,
                    grandfather: profiles.grandfather,
                    grandmother: profiles.grandmother
                }
            });

            if (profileError) {
                setError(profileError.message);
                return;
            }

            navigate('/dashboard');
        } catch (err) {
            setError('Something went wrong. Please check your connection.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white md:bg-[#f7f9f8] flex flex-col items-center py-6 md:py-16 px-4 font-sans selection:bg-[#00d900]/30 transition-all duration-500">
            <motion.div
                initial={{ opacity: 0, scale: 0.99 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-[850px]"
            >
                <header className="flex flex-col items-center mb-16 text-center">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="bg-[#00d900] p-2 rounded-full flex items-center justify-center shadow-lg shadow-[#00d900]/20">
                            <Leaf size={22} className="text-black" fill="currentColor" />
                        </div>
                        <span className="font-bold text-[1.4rem] tracking-tight text-[#111827]">NutriMe</span>
                    </div>
                    <h1 className="text-[2.25rem] md:text-[2.75rem] font-extrabold mb-3 text-[#111827] tracking-tight">Health Records</h1>
                    <p className="text-[#6b7280] text-[1.05rem] md:text-[1.1rem] max-w-xl font-medium leading-relaxed">
                        Complete clinical metrics for you and your family to unlock deep genetic and nutritional insights.
                    </p>
                </header>

                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-12 p-5 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-[0.95rem] font-bold text-center flex items-center justify-center gap-3 shadow-sm"
                    >
                        <AlertCircle size={20} />
                        {error}
                    </motion.div>
                )}

                <form onSubmit={handleSubmit} className="space-y-24 pb-20">
                    <ProfileSection
                        title="Your Profile"
                        person={profiles.user}
                        isUser={true}
                        updateField={(f, v) => updatePersonField('user', f, v)}
                        isLoading={isLoading}
                    />

                    <Separator label="Paternal Records" />

                    <ProfileSection
                        title="Father's Health Record"
                        person={profiles.father}
                        updateField={(f, v) => updatePersonField('father', f, v)}
                        isLoading={isLoading}
                    />

                    <Separator label="Maternal Records" />

                    <ProfileSection
                        title="Mother's Health Record"
                        person={profiles.mother}
                        updateField={(f, v) => updatePersonField('mother', f, v)}
                        isLoading={isLoading}
                    />

                    <Separator label="Ancestral Records" />

                    <div className="space-y-24">
                        <ProfileSection
                            title="Grandfather's Health Record"
                            person={profiles.grandfather}
                            updateField={(f, v) => updatePersonField('grandfather', f, v)}
                            isLoading={isLoading}
                        />

                        <div className="h-px bg-gray-100 w-full" />

                        <ProfileSection
                            title="Grandmother's Health Record"
                            person={profiles.grandmother}
                            updateField={(f, v) => updatePersonField('grandmother', f, v)}
                            isLoading={isLoading}
                        />
                    </div>

                    <div className="pt-16 border-t border-gray-100">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-[1.1rem] bg-[#00d900] hover:bg-[#00c000] disabled:opacity-60 disabled:cursor-not-allowed text-black border-none rounded-2xl text-[1.15rem] font-bold cursor-pointer transition-all duration-300 shadow-[0_15px_30px_rgba(0_217_0_/_0.2)] flex items-center justify-center gap-3 active:scale-[0.98] hover:shadow-[0_20px_40px_rgba(0_217_0_/_0.25)]"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 size={22} className="animate-spin" />
                                    Finalizing Medical History...
                                </>
                            ) : (
                                <>
                                    Complete Setup
                                    <ArrowRight size={22} strokeWidth={2.5} />
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}

const Separator = ({ label }) => (
    <div className="relative flex items-center py-4">
        <div className="flex-grow border-t border-gray-100"></div>
        <span className="flex-shrink mx-4 text-[0.7rem] font-black uppercase tracking-[0.2em] text-gray-300">{label}</span>
        <div className="flex-grow border-t border-gray-100"></div>
    </div>
);

const ProfileSection = ({ title, person, isUser, updateField, isLoading }) => {
    return (
        <div className="space-y-10">
            <div className="flex items-center gap-4 mb-2">
                <div className="p-2.5 rounded-xl bg-[#f0fdf4] text-[#00d900]">
                    {isUser ? <User size={22} /> : <Users size={22} />}
                </div>
                <h2 className="font-extrabold text-[1.4rem] text-[#111827] tracking-tight">{title}</h2>
            </div>

            <div className="space-y-8">
                {isUser && (
                    <div className="grid grid-cols-1">
                        <InputGroup
                            icon={User}
                            label="Full Name"
                            value={person.fullName}
                            onChange={(v) => updateField('fullName', v)}
                            placeholder="Enter your full name"
                            disabled={isLoading}
                        />
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="grid grid-cols-2 gap-6">
                        <InputGroup
                            icon={Calendar}
                            label="Age"
                            value={person.age}
                            onChange={(v) => updateField('age', v)}
                            placeholder="Age"
                            type="number"
                            disabled={isLoading}
                        />
                        <div className="flex flex-col">
                            <label className="block text-[0.85rem] font-bold text-[#111827] mb-2 px-1">Gender</label>
                            <select
                                value={person.gender}
                                onChange={(e) => updateField('gender', e.target.value)}
                                className="w-full px-4 py-[0.8rem] border border-gray-100 rounded-xl text-[1rem] transition-all bg-[#f9fafb] text-[#111827] focus:outline-none focus:border-[#00d900] focus:bg-white focus:ring-[4px] focus:ring-[rgba(0_217_0_/_0.08)] cursor-pointer font-medium"
                                disabled={isLoading}
                            >
                                <option value="1">Female</option>
                                <option value="2">Male</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        <InputGroup
                            icon={Ruler}
                            label="Height (cm)"
                            value={person.height}
                            onChange={(v) => updateField('height', v)}
                            placeholder="H"
                            type="number"
                            disabled={isLoading}
                        />
                        <InputGroup
                            icon={Scale}
                            label="Weight (kg)"
                            value={person.weight}
                            onChange={(v) => updateField('weight', v)}
                            placeholder="W"
                            type="number"
                            disabled={isLoading}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="grid grid-cols-2 gap-6">
                        <InputGroup
                            icon={Heart}
                            label="Systolic BP"
                            value={person.apHi}
                            onChange={(v) => updateField('apHi', v)}
                            placeholder="Hi"
                            type="number"
                            disabled={isLoading}
                        />
                        <InputGroup
                            icon={Heart}
                            label="Diastolic BP"
                            value={person.apLo}
                            onChange={(v) => updateField('apLo', v)}
                            placeholder="Lo"
                            type="number"
                            disabled={isLoading}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        <InputGroup
                            icon={Activity}
                            label="Cholesterol"
                            value={person.cholesterol}
                            onChange={(v) => updateField('cholesterol', v)}
                            placeholder="mg/dL"
                            type="number"
                            disabled={isLoading}
                        />
                        <InputGroup
                            icon={Activity}
                            label="Glucose"
                            value={person.glucose}
                            onChange={(v) => updateField('glucose', v)}
                            placeholder="mg/dL"
                            type="number"
                            disabled={isLoading}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <label className="block text-[0.85rem] font-bold text-[#111827] mb-3 px-1">Routine Activity</label>
                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={() => updateField('active', true)}
                                className={`flex-1 py-3.5 rounded-xl font-bold transition-all border-2 ${person.active ? 'bg-[#00d900]/10 border-[#00d900] text-[#00a000]' : 'bg-[#f9fafb] border-gray-100 text-gray-400 opacity-60'}`}
                            >
                                Active
                            </button>
                            <button
                                type="button"
                                onClick={() => updateField('active', false)}
                                className={`flex-1 py-3.5 rounded-xl font-bold transition-all border-2 ${!person.active ? 'bg-red-50 border-red-200 text-red-500' : 'bg-[#f9fafb] border-gray-100 text-gray-400 opacity-60'}`}
                            >
                                Sedentary
                            </button>
                        </div>
                    </div>
                    <InputGroup
                        icon={AlertCircle}
                        label="Allergies"
                        value={person.allergies}
                        onChange={(v) => updateField('allergies', v)}
                        placeholder="e.g. Peanuts, Shellfish"
                        disabled={isLoading}
                    />
                </div>

                {isUser && (
                    <div className="pt-6">
                        <div className="flex flex-col">
                            <label className="block text-[0.85rem] font-bold text-[#111827] mb-2 px-1 flex items-center gap-2">
                                <Target size={18} className="text-[#00d900]" />
                                Your Primary Goal
                            </label>
                            <select
                                value={person.goal}
                                onChange={(e) => updateField('goal', e.target.value)}
                                className="w-full px-4 py-[0.8rem] border border-gray-100 rounded-xl text-[1rem] transition-all bg-[#f9fafb] text-[#111827] focus:outline-none focus:border-[#00d900] focus:bg-white focus:ring-[4px] focus:ring-[rgba(0_217_0_/_0.08)] cursor-pointer font-bold"
                                disabled={isLoading}
                            >
                                <option value="" disabled>Select your goal...</option>
                                <option value="weight_loss">Weight Loss</option>
                                <option value="muscle_gain">Muscle Gain</option>
                                <option value="maintenance">Maintenance</option>
                            </select>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const InputGroup = ({ icon: Icon, label, value, onChange, placeholder, type = "text", disabled }) => (
    <div className="flex flex-col w-full">
        <label className="block text-[0.85rem] font-bold text-[#111827] mb-2 px-1">{label}</label>
        <div className="relative flex items-center group">
            <Icon className="absolute left-4 text-gray-400 group-focus-within:text-[#00d900] transition-colors" size={20} />
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full pl-12 pr-4 py-[0.8rem] border border-gray-100 rounded-xl text-[1rem] transition-all bg-[#f9fafb] placeholder-gray-400 focus:outline-none focus:border-[#00d900] focus:bg-white focus:ring-[4px] focus:ring-[rgba(0_217_0_/_0.08)] font-medium"
                placeholder={placeholder}
                disabled={disabled}
            />
        </div>
    </div>
);

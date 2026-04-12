import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Upload, Loader2, User, Users, Calendar,
    Ruler, Scale, Heart, Activity, Target, AlertCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const INITIAL_PERSON_STATE = {
    age: '',
    gender: '1',
    height: '',
    weight: '',
    apHi: '',
    apLo: '',
    cholesterol: '',
    glucose: '',
    active: true,
    allergies: ''
};

export default function Settings() {
    const { user, getProfile, saveProfile, signOut } = useAuth();
    const navigate = useNavigate();

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    // Multi-Person State
    const [profiles, setProfiles] = useState({
        user: { ...INITIAL_PERSON_STATE, fullName: '', goal: '' },
        father: { ...INITIAL_PERSON_STATE, gender: '2' },
        mother: { ...INITIAL_PERSON_STATE, gender: '1' },
        grandfather: { ...INITIAL_PERSON_STATE, gender: '2' },
        grandmother: { ...INITIAL_PERSON_STATE, gender: '1' }
    });

    const updatePersonField = (person, field, value) => {
        setProfiles(prev => ({
            ...prev,
            [person]: { ...prev[person], [field]: value }
        }));
    };

    useEffect(() => {
        const fetchProfile = async () => {
            if (!user) return;
            try {
                const { data } = await getProfile();
                if (data) {
                    const parseNum = (val) => {
                        if (!val && val !== 0) return '';
                        const parsed = parseFloat(val);
                        return isNaN(parsed) ? '' : parsed.toString();
                    };

                    const sanitizeFamily = (person, defaultGender) => {
                        if (!person) return { ...INITIAL_PERSON_STATE, gender: defaultGender };
                        return {
                            age: parseNum(person.age),
                            gender: person.gender?.toString() || defaultGender,
                            height: parseNum(person.height),
                            weight: parseNum(person.weight),
                            apHi: parseNum(person.apHi || person.ap_hi),  // Add backward compatibility loosely
                            apLo: parseNum(person.apLo || person.ap_lo),
                            cholesterol: parseNum(person.cholesterol),
                            glucose: parseNum(person.glucose),
                            active: person.active !== undefined ? Boolean(person.active) : true,
                            allergies: person.allergies || ''
                        };
                    };

                    let familyHistory = data.family_health_history || {};
                    if (typeof familyHistory === 'string') {
                        try {
                            familyHistory = JSON.parse(familyHistory);
                        } catch (e) {
                            console.error("Failed to parse family_health_history string:", e);
                            familyHistory = {};
                        }
                    }

                    setProfiles({
                        user: {
                            fullName: data.full_name || '',
                            age: parseNum(data.age),
                            gender: data.gender?.toString() || '1',
                            height: parseNum(data.height),
                            weight: parseNum(data.weight),
                            apHi: parseNum(data.systolic_bp),
                            apLo: parseNum(data.diastolic_bp),
                            cholesterol: parseNum(data.cholesterol_mgdl),
                            glucose: parseNum(data.glucose_mgdl),
                            active: data.active === 1,
                            allergies: data.allergies || '',
                            goal: data.goal || '',
                            cardio_risk_score: data.cardio_risk_score || null
                        },
                        father: sanitizeFamily(familyHistory?.father, '2'),
                        mother: sanitizeFamily(familyHistory?.mother, '1'),
                        grandfather: sanitizeFamily(familyHistory?.grandfather, '2'),
                        grandmother: sanitizeFamily(familyHistory?.grandmother, '1')
                    });
                }
            } catch (err) {
                console.error("Failed to load profile", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchProfile();
    }, [user, getProfile]);

    const handleUpdateProfile = async () => {
        setIsSaving(true);
        setMessage({ type: '', text: '' });
        try {
            const w = parseFloat(profiles.user.weight) || 0;
            let target_calories = Math.round(w * 24);
            if (profiles.user.goal === 'weight_loss') target_calories -= 500;
            if (profiles.user.goal === 'muscle_gain') target_calories += 500;

            const { error } = await saveProfile({
                full_name: profiles.user.fullName.trim(),
                age: parseInt(profiles.user.age) || null,
                gender: parseInt(profiles.user.gender) || null,
                height: parseFloat(profiles.user.height) || null,
                weight: w || null,
                systolic_bp: parseInt(profiles.user.apHi) || null,
                diastolic_bp: parseInt(profiles.user.apLo) || null,
                cholesterol_mgdl: parseFloat(profiles.user.cholesterol) || null,
                glucose_mgdl: parseFloat(profiles.user.glucose) || null,
                active: profiles.user.active ? 1 : 0,
                goal: profiles.user.goal,
                target_calories,
                allergies: profiles.user.allergies.trim(),
                cardio_risk_score: profiles.user.cardio_risk_score,
                family_health_history: {
                    father: profiles.father,
                    mother: profiles.mother,
                    grandfather: profiles.grandfather,
                    grandmother: profiles.grandmother
                }
            });

            if (error) throw error;
            setMessage({ type: 'success', text: 'All health records updated successfully!' });
        } catch (error) {
            console.error('Update failed:', error);
            setMessage({ type: 'error', text: 'Failed to update profiles. Please check your connection.' });
        } finally {
            setIsSaving(false);
            setTimeout(() => setMessage({ type: '', text: '' }), 4000);
        }
    };

    const handleLogout = async () => {
        await signOut();
        navigate('/');
    };

    const inputCls = "w-full pl-4 pr-4 py-[0.8rem] border border-gray-100 rounded-xl text-[1rem] transition-all bg-[#f9fafb] placeholder-gray-400 focus:outline-none focus:border-[#00d900] focus:bg-white focus:ring-[4px] focus:ring-[rgba(0_217_0_/_0.08)] font-medium";
    const labelCls = "text-[0.85rem] font-bold text-[#111827] mb-2 px-1";
    const sectionCls = "bg-white rounded-[20px] border border-[#f3f4f6] px-8 py-8 shadow-[0_2px_12px_rgba(0_0_0_/_0.02)]";

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center">
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
            className="flex flex-col gap-6 max-w-[850px] mx-auto pb-20"
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

            {/* Account Settings */}
            <div className={sectionCls}>
                <div className="flex items-center gap-4 mb-8">
                    <div className="p-2.5 rounded-xl bg-gray-50 text-gray-400">
                        <User size={22} />
                    </div>
                    <h2 className="font-extrabold text-[1.4rem] text-[#111827] tracking-tight">Account Settings</h2>
                </div>

                <div className="flex flex-col sm:flex-row gap-8 items-start">
                    <div className="flex flex-col items-center gap-4 shrink-0">
                        <div className="w-[100px] h-[100px] rounded-[24px] bg-[#fde8d8] flex items-center justify-center overflow-hidden border-2 border-gray-100 shadow-sm">
                            <img
                                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(profiles.user.fullName || user?.email || 'User')}&background=e2e8f0&color=475569&size=100`}
                                alt="Profile"
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <button className="text-[0.8rem] font-bold text-[#00d900] hover:text-[#00b000] transition-colors flex items-center gap-1.5">
                            <Upload size={14} strokeWidth={2.5} /> Update
                        </button>
                    </div>

                    <div className="flex flex-col gap-6 flex-1 w-full">
                        <div className="flex flex-col">
                            <label className={labelCls}>Full Name</label>
                            <input
                                type="text"
                                value={profiles.user.fullName}
                                onChange={(e) => updatePersonField('user', 'fullName', e.target.value)}
                                className={inputCls}
                                placeholder="Enter your full name"
                            />
                        </div>
                        <div className="flex flex-col">
                            <label className={labelCls}>Auth Email</label>
                            <input
                                type="email"
                                value={user?.email || ''}
                                readOnly
                                className={`${inputCls} bg-gray-50 opacity-60 cursor-not-allowed`}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* User Clinical Profile */}
            <div className={sectionCls}>
                <ProfileSection
                    title="Your Clinical Profile"
                    person={profiles.user}
                    isUser={true}
                    updateField={(f, v) => updatePersonField('user', f, v)}
                    isLoading={isSaving}
                />
            </div>

            <Separator label="Paternal Records" />

            <div className={sectionCls}>
                <ProfileSection
                    title="Father's Health Record"
                    person={profiles.father}
                    updateField={(f, v) => updatePersonField('father', f, v)}
                    isLoading={isSaving}
                />
            </div>

            <Separator label="Maternal Records" />

            <div className={sectionCls}>
                <ProfileSection
                    title="Mother's Health Record"
                    person={profiles.mother}
                    updateField={(f, v) => updatePersonField('mother', f, v)}
                    isLoading={isSaving}
                />
            </div>

            <Separator label="Ancestral Records" />

            <div className={`${sectionCls} mb-6`}>
                <ProfileSection
                    title="Grandfather's Health Record"
                    person={profiles.grandfather}
                    updateField={(f, v) => updatePersonField('grandfather', f, v)}
                    isLoading={isSaving}
                />
            </div>

            <div className={sectionCls}>
                <ProfileSection
                    title="Grandmother's Health Record"
                    person={profiles.grandmother}
                    updateField={(f, v) => updatePersonField('grandmother', f, v)}
                    isLoading={isSaving}
                />
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-6 border-t border-gray-100">
                <button
                    onClick={handleLogout}
                    className="px-6 py-3 rounded-xl border border-gray-200 text-[0.9rem] font-semibold text-[#111827] hover:bg-white transition-colors cursor-pointer"
                >
                    Sign Out
                </button>
                <button
                    onClick={handleUpdateProfile}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-8 py-3 bg-[#00d900] hover:bg-[#00c000] text-black font-bold text-[0.9rem] rounded-xl shadow-[0_4px_14px_rgba(0_217_0_/_0.25)] transition-all cursor-pointer disabled:opacity-75 disabled:cursor-wait"
                >
                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : null}
                    {isSaving ? 'Saving...' : 'Save All Changes'}
                </button>
            </div>

        </motion.div>
    );
}

const Separator = ({ label }) => (
    <div className="relative flex items-center py-2 px-4">
        <div className="flex-grow border-t border-gray-200"></div>
        <span className="flex-shrink mx-4 text-[0.7rem] font-bold uppercase tracking-[0.15em] text-gray-400">{label}</span>
        <div className="flex-grow border-t border-gray-200"></div>
    </div>
);

const ProfileSection = ({ title, person, isUser, updateField, isLoading }) => {
    return (
        <div className="space-y-10">
            <div className="flex items-center gap-4 mb-2">
                <div className="p-2.5 rounded-xl bg-[#f0fdf4] text-[#00d900]">
                    <Activity size={22} />
                </div>
                <h2 className="font-extrabold text-[1.4rem] text-[#111827] tracking-tight">{title}</h2>
            </div>

            <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="grid grid-cols-2 gap-6">
                        <InputGroup
                            icon={Calendar} label="Age" value={person.age}
                            onChange={(v) => updateField('age', v)} placeholder="Age" type="number" disabled={isLoading}
                        />
                        <div className="flex flex-col">
                            <label className="block text-[0.85rem] font-bold text-[#111827] mb-2 px-1">Gender</label>
                            <select
                                value={person.gender} onChange={(e) => updateField('gender', e.target.value)}
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
                            icon={Ruler} label="Height (cm)" value={person.height}
                            onChange={(v) => updateField('height', v)} placeholder="H" type="number" disabled={isLoading}
                        />
                        <InputGroup
                            icon={Scale} label="Weight (kg)" value={person.weight}
                            onChange={(v) => updateField('weight', v)} placeholder="W" type="number" disabled={isLoading}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="grid grid-cols-2 gap-6">
                        <InputGroup
                            icon={Heart} label="Systolic BP" value={person.apHi}
                            onChange={(v) => updateField('apHi', v)} placeholder="Hi" type="number" disabled={isLoading}
                        />
                        <InputGroup
                            icon={Heart} label="Diastolic BP" value={person.apLo}
                            onChange={(v) => updateField('apLo', v)} placeholder="Lo" type="number" disabled={isLoading}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        <InputGroup
                            icon={Activity} label="Cholesterol" value={person.cholesterol}
                            onChange={(v) => updateField('cholesterol', v)} placeholder="mg/dL" type="number" disabled={isLoading}
                        />
                        <InputGroup
                            icon={Activity} label="Glucose" value={person.glucose}
                            onChange={(v) => updateField('glucose', v)} placeholder="mg/dL" type="number" disabled={isLoading}
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
                        icon={AlertCircle} label="Allergies" value={person.allergies}
                        onChange={(v) => updateField('allergies', v)} placeholder="e.g. Peanuts, Shellfish" disabled={isLoading}
                    />
                </div>

                {isUser && (
                    <div className="pt-6">
                        <div className="flex flex-col">
                            <label className="block text-[0.85rem] font-bold text-[#111827] mb-2 px-1 flex items-center gap-2">
                                <Target size={18} className="text-[#00d900]" /> Your Primary Goal
                            </label>
                            <select
                                value={person.goal} onChange={(e) => updateField('goal', e.target.value)}
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
                type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
                className="w-full pl-12 pr-4 py-[0.8rem] border border-gray-100 rounded-xl text-[1rem] transition-all bg-[#f9fafb] placeholder-gray-400 focus:outline-none focus:border-[#00d900] focus:bg-white focus:ring-[4px] focus:ring-[rgba(0_217_0_/_0.08)] font-medium"
            />
        </div>
    </div>
);

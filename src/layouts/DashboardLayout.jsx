import React, { useState, useEffect } from 'react';
import { useLocation, useOutlet, Link } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { LayoutDashboard, PlusCircle, History, Settings, Leaf, MessageSquare } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const PAGE_TITLES = {
    '/dashboard': 'Dashboard',
    '/log-meal': 'Log Meal',
    '/meal-history': 'Meal History',
    '/settings': 'Settings',
};

const NavItem = ({ icon: Icon, label, isActive, to = "#" }) => (
    <Link to={to} className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-2 cursor-pointer transition-colors ${isActive ? 'bg-[#00d900]/10 text-[#00d900] font-bold' : 'text-gray-500 hover:bg-gray-50 font-semibold'}`}>
        <Icon size={20} className={isActive ? 'text-[#00d900]' : ''} strokeWidth={isActive ? 2.5 : 2} />
        <span>{label}</span>
    </Link>
);

export default function DashboardLayout() {
    const location = useLocation();
    const outlet = useOutlet();
    const { user, getProfile } = useAuth();

    const [profileName, setProfileName] = useState('');
    const [userEmail, setUserEmail] = useState('');

    useEffect(() => {
        const fetchProfile = async () => {
            // Set email from auth user
            setUserEmail(user?.email || '');

            // Fetch full name from profiles table
            const { data } = await getProfile();
            if (data?.full_name) {
                setProfileName(data.full_name);
            } else {
                // Fallback to auth metadata
                setProfileName(user?.user_metadata?.full_name || 'User');
            }
        };
        if (user) fetchProfile();
    }, [user]);

    const displayName = profileName || 'User';
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=ffccb3&color=333`;

    return (
        <div className="flex h-screen w-full bg-[#fdfdfd] overflow-hidden font-sans text-[#111827]">
            {/* Sidebar */}
            <aside className="w-[260px] bg-white border-r border-[#f3f4f6] flex flex-col justify-between shrink-0 h-full">
                <div>
                    <div className="p-6">
                        {/* Product branding */}
                        <div className="flex items-center gap-2.5 mb-8">
                            <div className="bg-[#00d900]/15 w-9 h-9 rounded-xl flex items-center justify-center shrink-0">
                                <Leaf size={18} className="text-[#00d900]" fill="currentColor" />
                            </div>
                            <div className="leading-none">
                                <p className="font-bold text-[0.95rem] text-[#111827]">NutriMe</p>
                                <p className="text-[0.7rem] text-gray-400 font-medium">Assistant</p>
                            </div>
                        </div>

                        <nav>
                            <NavItem icon={LayoutDashboard} label="Dashboard" isActive={location.pathname === '/dashboard'} to="/dashboard" />
                            <NavItem icon={PlusCircle} label="Log Meal" isActive={location.pathname === '/log-meal'} to="/log-meal" />
                            <NavItem icon={History} label="Meal History" isActive={location.pathname === '/meal-history'} to="/meal-history" />
                            <NavItem icon={Settings} label="Settings" isActive={location.pathname === '/settings'} to="/settings" />
                        </nav>
                    </div>
                </div>

                <div className="p-6 border-t border-[#f3f4f6]">
                    <div className="flex items-center gap-3">
                        <img src={avatarUrl} alt="User" className="w-10 h-10 rounded-full" />
                        <div>
                            <p className="font-bold text-[0.9rem] leading-none mb-1">{displayName}</p>
                            <p className="text-[0.75rem] text-gray-400">{userEmail}</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-full overflow-hidden">

                {/* Top Header */}
                <header className="h-[68px] bg-white border-b border-[#f3f4f6] px-8 flex items-center justify-between shrink-0">
                    {/* Left: Page title */}
                    <h1 className="font-bold text-[1.1rem] text-[#111827]">
                        {PAGE_TITLES[location.pathname] ?? 'Dashboard'}
                    </h1>
                </header>

                {/* Dashboard Content Area */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8 scrollbar-hide bg-[#fafafa]">
                    <AnimatePresence mode="wait">
                        {outlet ? React.cloneElement(outlet, { key: location.pathname }) : null}
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
}

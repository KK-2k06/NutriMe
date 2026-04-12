import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [session, setSession] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Get the initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
            setUser(session?.user ?? null)
            setLoading(false)
        })

        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setSession(session)
                setUser(session?.user ?? null)
                setLoading(false)
            }
        )

        return () => subscription.unsubscribe()
    }, [])

    // Sign up with email and password
    const signUp = async (email, password, fullName) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                },
            },
        })
        return { data, error }
    }

    // Sign in with email and password
    const signIn = async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })
        return { data, error }
    }

    // Sign out
    const signOut = async () => {
        const { error } = await supabase.auth.signOut()
        return { error }
    }

    // Save profile data to profiles table securely using RPC
    const saveProfile = async (profileData) => {
        const payload = {
            p_id: user.id,
            p_full_name: profileData.full_name,
            p_age: profileData.age,
            p_gender: profileData.gender,
            p_height: profileData.height,
            p_weight: profileData.weight,
            p_systolic_bp: profileData.systolic_bp,
            p_diastolic_bp: profileData.diastolic_bp,
            p_cholesterol_mgdl: profileData.cholesterol_mgdl,
            p_glucose_mgdl: profileData.glucose_mgdl,
            p_active: profileData.active,
            p_goal: profileData.goal,
            p_target_calories: profileData.target_calories,
            p_allergies: profileData.allergies,
            p_cardio_risk_score: profileData.cardio_risk_score !== undefined ? profileData.cardio_risk_score : null,
            p_profile_completed: profileData.profile_completed !== undefined ? profileData.profile_completed : true,
            p_family_health_history: profileData.family_health_history || {}
        };
        
        const { data, error } = await supabase.rpc('secure_upsert_profile', payload);
        return { data, error };
    }

    // Get profile data securely via RPC
    const getProfile = async () => {
        if (!user) return { data: null, error: null }
        const { data, error } = await supabase.rpc('secure_get_profile', { p_id: user.id });
        return { data, error };
    }

    const value = {
        user,
        session,
        loading,
        signUp,
        signIn,
        signOut,
        saveProfile,
        getProfile,
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}

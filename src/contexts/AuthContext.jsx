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

    // Save profile data to profiles table
    const saveProfile = async (profileData) => {
        const { data, error } = await supabase
            .from('profiles')
            .upsert({
                id: user.id,
                ...profileData,
                updated_at: new Date().toISOString(),
            })
            .select()
        return { data, error }
    }

    // Get profile data
    const getProfile = async () => {
        if (!user) return { data: null, error: null }
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()
        return { data, error }
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

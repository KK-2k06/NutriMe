import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute({ children }) {
    const { user, loading } = useAuth()

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f7f9f8]">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-3 border-[#00d900] border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-[#6b7280] text-sm font-medium">Loading...</p>
                </div>
            </div>
        )
    }

    if (!user) {
        return <Navigate to="/signin" replace />
    }

    return children
}

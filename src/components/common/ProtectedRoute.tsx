import { Navigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import { Loader2 } from 'lucide-react'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin, isLoading, session } = useAuth()
  const location = useLocation()

  // Chỉ block khi chưa xác định session lần đầu (chưa có session nào).
  // Nếu đã có session thì KHÔNG unmount — tránh reload trang khi Supabase
  // tự refresh token lúc tab lấy lại focus và fire onAuthStateChange.
  if (isLoading && !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="text-6xl">🚫</div>
          <h2 className="text-xl font-semibold text-foreground">Không có quyền truy cập</h2>
          <p className="text-muted-foreground">Tài khoản của bạn không có quyền Admin.</p>
          <Link to="/" className="text-primary hover:underline">Quay về trang chủ</Link>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

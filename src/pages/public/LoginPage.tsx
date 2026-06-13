import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link, Navigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, Radio, Loader2, AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuth } from '@/features/auth/AuthContext'
import { loginSchema, LoginFormValues } from '@/lib/validators'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { usePortalSettings } from '@/features/settings/useSettings'
import { APP_NAME } from '@/constants'

export function LoginPage() {
  const { signIn, isAdmin, isLoading, session } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { data: settings } = usePortalSettings()
  const portalName = settings?.portal_name || APP_NAME
  const logoUrl = settings?.logo_url || ''
  const [logoError, setLogoError] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { setLogoError(false) }, [logoUrl])

  const from = (location.state as { from?: Location })?.from?.pathname || '/admin'

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  })

  // Wait for auth state before deciding what to render
  if (isLoading && !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (isAdmin) {
    return <Navigate to="/admin" replace />
  }

  const onSubmit = async (data: LoginFormValues) => {
    setError('')
    const { error } = await signIn(data.email, data.password)
    if (error) {
      setError('Email hoặc mật khẩu không đúng. Vui lòng thử lại.')
      return
    }
    navigate(from, { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <div className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl mb-4 overflow-hidden ${logoUrl && !logoError ? '' : 'bg-primary'}`}>
            {logoUrl && !logoError
              ? <img src={logoUrl} alt={portalName} className="h-14 w-14 object-contain" onError={() => setLogoError(true)} />
              : <Radio className="h-7 w-7 text-primary-foreground" />
            }
          </div>
          <h1 className="text-2xl font-bold text-foreground">{portalName}</h1>
          <p className="text-sm text-muted-foreground mt-1">Đăng nhập vào trang quản trị</p>
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2.5 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@company.com"
                autoComplete="email"
                {...register('email')}
                className={errors.email ? 'border-destructive' : ''}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Mật khẩu</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  {...register('password')}
                  className={errors.password ? 'border-destructive pr-10' : 'pr-10'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Đang đăng nhập...
                </>
              ) : 'Đăng nhập'}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground transition-colors">← Quay về trang chủ</Link>
        </p>
      </motion.div>
    </div>
  )
}

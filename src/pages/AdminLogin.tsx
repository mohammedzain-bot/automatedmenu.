import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ChefHat, Eye, EyeOff, Lock, Mail, ArrowLeft } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

export default function AdminLogin() {
  const [email, setEmail] = useState('admin@hotel.com')
  const [password, setPassword] = useState('admin123')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const { signIn, isDemo } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    setLoading(true)

    const { error } = await signIn(email, password)
    if (error) {
      toast.error('Invalid credentials. Please try again.')
      setLoading(false)
    } else {
      toast.success('Welcome back, Admin!')
      navigate('/admin', { replace: true })
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 font-sans text-slate-800">
      <div className="w-full max-w-sm">
        {/* Back to Customer Menu */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back to Hotel Customer Menu</span>
        </Link>

        {/* Brand Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-7 border border-slate-800">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-14 h-14 bg-gradient-to-tr from-amber-600 to-amber-400 rounded-2xl flex items-center justify-center shadow-md mb-3 text-white">
              <ChefHat size={28} />
            </div>
            <h1 className="text-xl font-extrabold text-slate-900">Hotel Staff Login</h1>
            <p className="text-xs text-slate-500 mt-1">
              Access kitchen orders and food menu controls
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Admin Email
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@hotel.com"
                  required
                  autoComplete="email"
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 font-medium text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-slate-900 font-medium text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-slate-900 hover:bg-amber-600 text-white font-bold text-sm rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              {loading ? 'Authenticating…' : 'Sign In to Admin Portal'}
            </button>
          </form>

          {isDemo && (
            <div className="mt-4 pt-4 border-t border-slate-100 text-center">
              <span className="text-[11px] text-slate-400 block mb-2">
                Quick Access (Click to enter instantly)
              </span>
              <button
                type="button"
                onClick={() => {
                  signIn('admin@hotel.com', 'admin123')
                  navigate('/admin', { replace: true })
                }}
                className="w-full py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold rounded-lg transition-colors border border-amber-200"
              >
                ⚡ Instant Staff Demo Access
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

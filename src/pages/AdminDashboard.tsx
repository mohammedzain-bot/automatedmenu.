import { useState } from 'react'
import { Link } from 'react-router-dom'
import { LogOut, UtensilsCrossed, ClipboardList, ChefHat, ExternalLink, ShieldCheck } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import AdminOrders from '../components/admin/AdminOrders'
import AdminMenu from '../components/admin/AdminMenu'
import toast from 'react-hot-toast'

type Tab = 'orders' | 'menu'

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('orders')
  const { signOut, user } = useAuth()

  const handleSignOut = async () => {
    await signOut()
    toast.success('Signed out successfully')
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      {/* Top Header */}
      <header className="bg-slate-900 text-white sticky top-0 z-40 shadow-md">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-sm">
              <ChefHat size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base tracking-tight text-white">
                  Hotel Admin Portal
                </h1>
                <span className="bg-slate-800 text-amber-400 border border-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Staff Only
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {user?.email || 'Admin Staff Logged In'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors"
            >
              <span>View Customer Menu</span>
              <ExternalLink size={13} />
            </Link>

            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-400 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-slate-800"
              title="Sign out"
            >
              <LogOut size={15} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-5xl mx-auto px-4 flex gap-2 border-t border-slate-800 pt-1">
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'orders'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ClipboardList size={15} />
            <span>Incoming Orders</span>
          </button>
          <button
            onClick={() => setActiveTab('menu')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'menu'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <UtensilsCrossed size={15} />
            <span>Food Menu & Pricing</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">
        {activeTab === 'orders' ? <AdminOrders /> : <AdminMenu />}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-4 px-4 text-center text-xs text-slate-400">
        <p className="flex items-center justify-center gap-1">
          <ShieldCheck size={14} className="text-emerald-500" />
          <span>Hotel Administration Dashboard • Realtime Kitchen Sync</span>
        </p>
      </footer>
    </div>
  )
}

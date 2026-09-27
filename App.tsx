import { useReducer, useState, useEffect, useRef, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab  = 'home' | 'search' | 'cart' | 'track' | 'profile'
type Perm = 'prompt' | 'granted' | 'denied'

interface CartItem {
  id: string; name: string; price: number; qty: number
  image: string; restaurant: string
}

interface Toast {
  id: string; msg: string; icon: string; color: string
}

// ─── Cart Reducer ─────────────────────────────────────────────────────────────

type CartAction =
  | { type: 'ADD';     item: Omit<CartItem, 'qty'> }
  | { type: 'REMOVE';  id: string }
  | { type: 'SET_QTY'; id: string; qty: number }
  | { type: 'CLEAR' }

function cartReducer(state: CartItem[], action: CartAction): CartItem[] {
  switch (action.type) {
    case 'ADD': {
      const found = state.find(i => i.id === action.item.id)
      if (found) return state.map(i => i.id === action.item.id ? { ...i, qty: i.qty + 1 } : i)
      return [...state, { ...action.item, qty: 1 }]
    }
    case 'REMOVE':  return state.filter(i => i.id !== action.id)
    case 'SET_QTY': {
      if (action.qty <= 0) return state.filter(i => i.id !== action.id)
      return state.map(i => i.id === action.id ? { ...i, qty: action.qty } : i)
    }
    case 'CLEAR':   return []
  }
}

// ─── Static Data ──────────────────────────────────────────────────────────────

const RESTAURANTS = [
  { id: 'r1', name: 'Smoke & Flame',  cuisine: 'American · Burgers', rating: 4.8, reviews: '2.3k', time: '18–25 min', fee: '$0.99',
    image: 'https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?w=700&h=420&fit=crop&auto=format',
    badge: 'Most Popular', bColor: '#FF4500' },
  { id: 'r2', name: 'Napoli Express', cuisine: 'Italian · Pizza',    rating: 4.6, reviews: '1.8k', time: '25–35 min', fee: 'Free',
    image: 'https://images.unsplash.com/photo-1611915365928-565c527a0590?w=700&h=420&fit=crop&auto=format',
    badge: 'Free Delivery', bColor: '#22C55E' },
  { id: 'r3', name: 'Sakura Garden',  cuisine: 'Japanese · Sushi',   rating: 4.9, reviews: '3.1k', time: '30–40 min', fee: '$1.49',
    image: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=700&h=420&fit=crop&auto=format',
    badge: 'Top Rated', bColor: '#FFB800' },
]

const MENU: Omit<CartItem, 'qty'>[] = [
  { id: 'm1', name: 'Double Stack Smash Burger', price: 14.99,
    image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=300&h=300&fit=crop&auto=format',
    restaurant: 'Smoke & Flame' },
  { id: 'm2', name: 'Crispy Chicken Sandwich', price: 12.49,
    image: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=300&h=300&fit=crop&auto=format',
    restaurant: 'Smoke & Flame' },
  { id: 'm3', name: 'Margherita Pizza 12"', price: 16.99,
    image: 'https://images.unsplash.com/photo-1611599538835-b52a8c2af7fe?w=300&h=300&fit=crop&auto=format',
    restaurant: 'Napoli Express' },
  { id: 'm4', name: 'Salmon Avocado Roll (8pc)', price: 18.99,
    image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=300&h=300&fit=crop&auto=format',
    restaurant: 'Sakura Garden' },
  { id: 'm5', name: 'BBQ Bacon Cheeseburger', price: 16.49,
    image: 'https://images.unsplash.com/photo-1551782450-a2132b4ba21d?w=300&h=300&fit=crop&auto=format',
    restaurant: 'Smoke & Flame' },
  { id: 'm6', name: 'Sushi Deluxe Platter', price: 32.99,
    image: 'https://images.unsplash.com/photo-1611143669185-af224c5e3252?w=300&h=300&fit=crop&auto=format',
    restaurant: 'Sakura Garden' },
]

const CATEGORIES = [
  { label: 'Burgers', emoji: '🍔' }, { label: 'Pizza',  emoji: '🍕' },
  { label: 'Sushi',   emoji: '🍣' }, { label: 'Tacos',  emoji: '🌮' },
  { label: 'Noodles', emoji: '🍜' }, { label: 'Salads', emoji: '🥗' },
]

function uid() { return Math.random().toString(36).slice(2) }

// ─── Toast System ─────────────────────────────────────────────────────────────

function Toasts({ toasts, setToasts }: {
  toasts: Toast[]
  setToasts: React.Dispatch<React.SetStateAction<Toast[]>>
}) {
  useEffect(() => {
    if (toasts.length === 0) return
    const id = toasts[0].id
    const timer = setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3400)
    return () => clearTimeout(timer)
  }, [toasts.length, setToasts])

  return (
    <div className="fixed top-14 left-0 right-0 z-50 flex flex-col items-center gap-2 pointer-events-none px-4">
      {toasts.slice(0, 2).map(t => (
        <div key={t.id} className="animate-slide-up pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-2xl max-w-xs w-full"
          style={{ background: '#1A1A1A', border: '1px solid rgba(255,255,255,0.09)' }}>
          <span className="text-base">{t.icon}</span>
          <span className="text-sm font-semibold flex-1" style={{ color: t.color }}>{t.msg}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Permission Modal ─────────────────────────────────────────────────────────

function PermModal({ type, onGrant, onDeny }: {
  type: 'location' | 'camera' | 'notifications'
  onGrant: () => void
  onDeny:  () => void
}) {
  const config = {
    location:      { icon: '📍', label: 'Location',      desc: 'CRAVE needs your location to find nearby restaurants and track your delivery in real time.' },
    camera:        { icon: '📷', label: 'Camera',        desc: 'Allow camera access to scan QR codes for menus, vouchers, and loyalty rewards.' },
    notifications: { icon: '🔔', label: 'Notifications', desc: 'Get live updates when your order is confirmed, being prepared, and on its way.' },
  }[type]

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center animate-fade-in"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}>
      <div className="w-full max-w-sm rounded-t-[2rem] p-6 pb-10 animate-slide-up"
        style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="w-10 h-1 rounded-full mx-auto mb-6" style={{ background: 'rgba(255,255,255,0.15)' }} />
        <div className="flex flex-col items-center text-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl"
            style={{ background: 'rgba(255,69,0,0.12)', border: '1px solid rgba(255,69,0,0.2)' }}>
            {config.icon}
          </div>
          <div>
            <h3 className="font-display font-black text-xl text-white mb-2">Allow {config.label}?</h3>
            <p className="text-sm leading-relaxed" style={{ color: '#777' }}>{config.desc}</p>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <button onClick={onGrant}
            className="w-full py-4 rounded-2xl font-display font-black text-base transition-all active:scale-[0.97]"
            style={{ background: '#FF4500', color: '#fff' }}>
            Allow Access
          </button>
          <button onClick={onDeny}
            className="w-full py-4 rounded-2xl font-display font-semibold text-base transition-all active:scale-[0.97]"
            style={{ background: 'rgba(255,255,255,0.05)', color: '#666' }}>
            Not Now
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Status Bar ───────────────────────────────────────────────────────────────

function StatusBar() {
  const [time, setTime] = useState('')
  useEffect(() => {
    const update = () => {
      const now = new Date()
      setTime(now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }))
    }
    update()
    const id = setInterval(update, 10000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="flex items-center justify-between px-5 pt-3 pb-1 shrink-0">
      <span className="font-display font-bold text-sm text-white">{time || '9:41 AM'}</span>
      <div className="flex items-center gap-2">
        <div className="flex items-end gap-[2px] h-3.5">
          {[35, 55, 75, 100].map((h, i) => (
            <div key={i} className="w-[3px] rounded-sm"
              style={{ height: `${h}%`, background: i < 3 ? 'rgba(248,248,248,0.9)' : 'rgba(248,248,248,0.25)' }} />
          ))}
        </div>
        <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
          <path d="M8 8.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" fill="rgba(248,248,248,0.9)"/>
          <path d="M8 5C5.9 5 4 5.9 2.7 7.3L4 8.5C5 7.5 6.4 7 8 7s3 .5 4 1.5l1.3-1.2C12 5.9 10.1 5 8 5Z" fill="rgba(248,248,248,0.7)"/>
          <path d="M8 1.5C4.7 1.5 1.7 2.9 0 5.1L1.3 6.3C2.8 4.4 5.2 3.5 8 3.5s5.2.9 6.7 2.8L16 5.1C14.3 2.9 11.3 1.5 8 1.5Z" fill="rgba(248,248,248,0.35)"/>
        </svg>
        <div className="flex items-center gap-[2px]">
          <div className="relative w-[22px] h-[12px] rounded-[3px]" style={{ border: '1.5px solid rgba(248,248,248,0.6)' }}>
            <div className="absolute inset-[1.5px] rounded-[1px] bg-white" style={{ right: '20%' }} />
          </div>
          <div className="w-[2px] h-[6px] rounded-r-sm" style={{ background: 'rgba(248,248,248,0.5)' }} />
        </div>
      </div>
    </div>
  )
}

// ─── Bottom Nav ───────────────────────────────────────────────────────────────

const NAV = [
  { id: 'home'    as Tab, label: 'Home',    d: 'M3 9L12 2L21 9V21H15V15H9V21H3V9Z' },
  { id: 'search'  as Tab, label: 'Search',  d: '' },
  { id: 'cart'    as Tab, label: 'Cart',    d: '' },
  { id: 'track'   as Tab, label: 'Track',   d: '' },
  { id: 'profile' as Tab, label: 'Profile', d: '' },
]

function NavIcon({ id, active }: { id: Tab; active: boolean }) {
  const c = active ? '#FF4500' : '#555'
  const sw = 1.8
  if (id === 'home') return (
    <svg viewBox="0 0 24 24" className="w-[22px] h-[22px]" fill={active ? '#FF4500' : 'none'} stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9L12 2L21 9V21H15V15H9V21H3V9Z"/>
    </svg>
  )
  if (id === 'search') return (
    <svg viewBox="0 0 24 24" className="w-[22px] h-[22px]" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round">
      <circle cx="11" cy="11" r="7.5"/><path d="M20.5 20.5L16 16"/>
    </svg>
  )
  if (id === 'cart') return (
    <svg viewBox="0 0 24 24" className="w-[22px] h-[22px]" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6V20C3 21.1 3.9 22 5 22H19C20.1 22 21 21.1 21 20V6L18 2H6Z"/>
      <path d="M3 6H21"/><path d="M16 10C16 12.2 14.2 14 12 14S8 12.2 8 10"/>
    </svg>
  )
  if (id === 'track') return (
    <svg viewBox="0 0 24 24" className="w-[22px] h-[22px]" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round">
      <circle cx="12" cy="12" r="9.5"/><path d="M12 7V12L15.5 14.5"/>
    </svg>
  )
  return (
    <svg viewBox="0 0 24 24" className="w-[22px] h-[22px]" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round">
      <circle cx="12" cy="8" r="4"/><path d="M4 20C4 16.7 7.6 14 12 14S20 16.7 20 20"/>
    </svg>
  )
}

function BottomNav({ tab, setTab, cartCount }: {
  tab: Tab; setTab: (t: Tab) => void; cartCount: number
}) {
  return (
    <div className="flex items-center justify-around px-2 pt-3 pb-6 shrink-0"
      style={{ background: '#0C0C0C', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
      {NAV.map(item => (
        <button key={item.id} onClick={() => setTab(item.id)}
          className="flex flex-col items-center gap-1.5 relative py-1 px-4 rounded-2xl transition-all active:scale-90"
          style={{ color: tab === item.id ? '#FF4500' : '#555' }}>
          <div className="relative">
            <NavIcon id={item.id} active={tab === item.id} />
            {item.id === 'cart' && cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black"
                style={{ background: '#FF4500', color: '#fff' }}>{cartCount > 9 ? '9+' : cartCount}</span>
            )}
          </div>
          <span className="font-display font-semibold text-[10px] tracking-wide">{item.label}</span>
        </button>
      ))}
    </div>
  )
}

// ─── Home Screen ──────────────────────────────────────────────────────────────

function HomeScreen({ dispatch, addToast, setTab }: {
  dispatch:  React.Dispatch<CartAction>
  addToast:  (msg: string, icon?: string, color?: string) => void
  setTab:    (t: Tab) => void
}) {
  const [cat, setCat] = useState('Burgers')

  function addItem(item: Omit<CartItem, 'qty'>) {
    dispatch({ type: 'ADD', item })
    addToast(`${item.name} added to cart`, '🛍️', '#FFB800')
  }

  return (
    <div className="flex-1 overflow-y-auto pb-2">
      <div className="px-5 pt-2 pb-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="font-display font-bold text-[10px] tracking-[0.15em] uppercase mb-0.5" style={{ color: '#FF4500' }}>DELIVER TO</p>
            <h1 className="font-display font-black text-2xl text-white leading-none">
              Manhattan, NYC <span className="text-lg opacity-60">▾</span>
            </h1>
          </div>
          <div className="w-10 h-10 rounded-2xl overflow-hidden" style={{ border: '2px solid rgba(255,69,0,0.4)', background: '#1a1a1a' }}>
            <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop&auto=format"
              alt="User profile" className="w-full h-full object-cover" />
          </div>
        </div>

        {/* Search bar */}
        <button onClick={() => setTab('search')}
          className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl mb-5 text-left transition-all active:scale-[0.98]"
          style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.06)' }}>
          <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7.5"/><path d="M20.5 20.5L16 16"/>
          </svg>
          <span className="text-sm" style={{ color: '#444' }}>Search restaurants, dishes…</span>
        </button>

        {/* Hero Banner */}
        <div className="relative rounded-3xl overflow-hidden mb-6" style={{ height: 180 }}>
          <div className="absolute inset-0 bg-[#1a1a1a]">
            <img src="https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?w=800&h=400&fit=crop&auto=format"
              alt="Featured: Double Stack Smash Burger" className="w-full h-full object-cover" />
          </div>
          <div className="absolute inset-0" style={{ background: 'linear-gradient(105deg, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.2) 65%, transparent 100%)' }} />
          <div className="absolute inset-0 flex flex-col justify-center pl-5 pr-20">
            <span className="font-display font-bold text-[10px] tracking-[0.15em] uppercase mb-1.5" style={{ color: '#FFB800' }}>🔥 Today's Deal</span>
            <h2 className="font-display font-black text-[26px] leading-[1.1] text-white mb-1.5">Smash Burger<br/>30% OFF</h2>
            <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.55)' }}>Limited time · Smoke & Flame</p>
            <button onClick={() => addItem(MENU[0])}
              className="self-start px-4 py-2.5 rounded-xl font-display font-bold text-xs transition-all active:scale-95"
              style={{ background: '#FF4500', color: '#fff' }}>
              Order Now →
            </button>
          </div>
        </div>

        {/* Categories */}
        <div className="mb-5">
          <h2 className="font-display font-bold text-lg text-white mb-3">What are you craving?</h2>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {CATEGORIES.map(c => (
              <button key={c.label} onClick={() => setCat(c.label)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl font-display font-semibold text-sm whitespace-nowrap shrink-0 transition-all active:scale-95"
                style={{
                  background: cat === c.label ? '#FF4500' : '#141414',
                  color:      cat === c.label ? '#fff'    : '#666',
                  border:     cat === c.label ? 'none'    : '1px solid rgba(255,255,255,0.06)',
                }}>
                {c.emoji} {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Featured items */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-bold text-lg text-white">Popular Now</h2>
            <button onClick={() => setTab('search')} className="font-display font-semibold text-xs" style={{ color: '#FF4500' }}>See all</button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
            {MENU.slice(0, 4).map(item => (
              <div key={item.id} className="shrink-0 w-36 rounded-2xl overflow-hidden transition-all active:scale-[0.97]"
                style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="h-28 bg-[#1a1a1a]">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                </div>
                <div className="p-3">
                  <p className="font-display font-bold text-xs text-white leading-tight mb-1 line-clamp-2">{item.name}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="font-display font-black text-sm" style={{ color: '#FF4500' }}>${item.price}</span>
                    <button onClick={() => addItem(item)}
                      className="w-6 h-6 rounded-full flex items-center justify-center text-sm font-black transition-all active:scale-90"
                      style={{ background: '#FF4500', color: '#fff' }}>+</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Restaurants */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-bold text-lg text-white">Near You</h2>
            <span className="font-display font-semibold text-xs" style={{ color: '#555' }}>3 open now</span>
          </div>
          <div className="flex flex-col gap-3">
            {RESTAURANTS.map(r => (
              <div key={r.id} className="rounded-3xl overflow-hidden transition-all active:scale-[0.98]"
                style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="relative bg-[#1a1a1a]" style={{ height: 148 }}>
                  <img src={r.image} alt={r.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.65) 100%)' }} />
                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full font-display font-bold text-[11px]"
                    style={{ background: r.bColor, color: '#fff' }}>{r.badge}</span>
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-display font-bold text-base text-white">{r.name}</h3>
                      <p className="text-xs mt-0.5" style={{ color: '#555' }}>{r.cuisine}</p>
                    </div>
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl shrink-0" style={{ background: 'rgba(255,184,0,0.1)' }}>
                      <span style={{ color: '#FFB800', fontSize: 11 }}>★</span>
                      <span className="font-display font-black text-xs" style={{ color: '#FFB800' }}>{r.rating}</span>
                      <span className="text-[10px]" style={{ color: '#555' }}>({r.reviews})</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5 text-xs" style={{ color: '#555' }}>
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9.5"/><path d="M12 6.5V12L15.5 14.5"/></svg>
                      {r.time}
                    </span>
                    <span className="text-xs" style={{ color: r.fee === 'Free' ? '#22C55E' : '#555' }}>
                      Delivery: {r.fee}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}

// ─── Search Screen ────────────────────────────────────────────────────────────

function SearchScreen({ dispatch, addToast, locationPerm }: {
  dispatch:     React.Dispatch<CartAction>
  addToast:     (msg: string, icon?: string, color?: string) => void
  locationPerm: Perm
}) {
  const [query,  setQuery]  = useState('')
  const [filter, setFilter] = useState('All')

  const filters = ['All', 'Burgers', 'Pizza', 'Sushi']

  const CAT_RESTAURANT: Record<string, string> = {
    Burgers: 'Smoke & Flame', Pizza: 'Napoli Express', Sushi: 'Sakura Garden',
  }

  const filtered = MENU.filter(item => {
    const matchCat = filter === 'All' || item.restaurant === CAT_RESTAURANT[filter]
    const q = query.toLowerCase()
    const matchQ = q === '' || item.name.toLowerCase().includes(q) || item.restaurant.toLowerCase().includes(q)
    return matchCat && matchQ
  })

  return (
    <div className="flex-1 overflow-y-auto pb-4 px-5 pt-2">
      <h1 className="font-display font-black text-2xl text-white mb-4">Discover</h1>

      {/* Location pill */}
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl mb-4"
        style={{
          background: locationPerm === 'granted' ? 'rgba(34,197,94,0.07)' : '#141414',
          border: `1px solid ${locationPerm === 'granted' ? 'rgba(34,197,94,0.18)' : 'rgba(255,255,255,0.06)'}`,
        }}>
        <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none"
          stroke={locationPerm === 'granted' ? '#22C55E' : '#444'} strokeWidth="2" strokeLinecap="round">
          <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22S19 14.25 19 9C19 5.13 15.87 2 12 2Z"/>
          <circle cx="12" cy="9" r="3"/>
        </svg>
        <p className="text-xs font-semibold" style={{ color: locationPerm === 'granted' ? '#22C55E' : '#444' }}>
          {locationPerm === 'granted'
            ? '40.7128° N, 74.0060° W · Manhattan, NYC'
            : 'Enable location in Profile → better results'}
        </p>
      </div>

      {/* Search input */}
      <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl mb-4"
        style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.07)' }}>
        <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7.5"/><path d="M20.5 20.5L16 16"/>
        </svg>
        <input value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Dishes, restaurants…"
          className="flex-1 bg-transparent text-sm outline-none text-white placeholder:text-[#3a3a3a]" />
        {query && (
          <button onClick={() => setQuery('')} className="text-lg leading-none" style={{ color: '#555' }}>×</button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5 -mx-1 px-1">
        {filters.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className="px-4 py-2 rounded-xl font-display font-semibold text-xs whitespace-nowrap shrink-0 transition-all active:scale-95"
            style={{
              background: filter === f ? '#FF4500' : '#141414',
              color:      filter === f ? '#fff'    : '#555',
              border:     filter === f ? 'none'    : '1px solid rgba(255,255,255,0.06)',
            }}>
            {f}
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">🔍</div>
          <p className="font-display font-bold text-base text-white mb-1">No results</p>
          <p className="text-sm" style={{ color: '#444' }}>Try a different search or filter</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map(item => (
            <div key={item.id} className="rounded-2xl overflow-hidden transition-all active:scale-[0.97]"
              style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="h-28 bg-[#1a1a1a]">
                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
              </div>
              <div className="p-3">
                <p className="font-display font-bold text-xs text-white leading-tight mb-1 line-clamp-2">{item.name}</p>
                <p className="text-[10px] mb-2" style={{ color: '#4a4a4a' }}>{item.restaurant}</p>
                <div className="flex items-center justify-between">
                  <span className="font-display font-black text-sm" style={{ color: '#FF4500' }}>${item.price}</span>
                  <button
                    onClick={() => { dispatch({ type: 'ADD', item }); addToast('Added to cart', '🛍️', '#FFB800') }}
                    className="w-7 h-7 rounded-full flex items-center justify-center font-black text-sm transition-all active:scale-90"
                    style={{ background: '#FF4500', color: '#fff' }}>+</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Cart Screen ──────────────────────────────────────────────────────────────

function CartScreen({ cart, dispatch, addToast, setTab }: {
  cart:      CartItem[]
  dispatch:  React.Dispatch<CartAction>
  addToast:  (msg: string, icon?: string, color?: string) => void
  setTab:    (t: Tab) => void
}) {
  const [promo,        setPromo]        = useState('')
  const [promoApplied, setPromoApplied] = useState(false)

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0)
  const delivery = cart.length > 0 ? 2.99 : 0
  const discount = promoApplied ? subtotal * 0.15 : 0
  const total    = subtotal + delivery - discount

  function applyPromo() {
    if (promo.toUpperCase() === 'CRAVE20') {
      setPromoApplied(true)
      addToast('CRAVE20 applied — 15% off! 🎉', '✅', '#22C55E')
    } else {
      addToast('Invalid promo code', '❌', '#EF4444')
    }
  }

  function handleCheckout() {
    dispatch({ type: 'CLEAR' })
    setPromoApplied(false)
    setPromo('')
    addToast('Order placed! Tracking your delivery 🚀', '✅', '#22C55E')
    setTimeout(() => setTab('track'), 600)
  }

  if (cart.length === 0) return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
      <div className="text-7xl mb-4">🛒</div>
      <h2 className="font-display font-black text-2xl text-white mb-2">Cart is empty</h2>
      <p className="text-sm mb-6" style={{ color: '#555' }}>Add some delicious items to get started</p>
      <button onClick={() => setTab('home')}
        className="px-6 py-3.5 rounded-2xl font-display font-bold text-sm transition-all active:scale-95"
        style={{ background: '#FF4500', color: '#fff' }}>
        Browse Menu
      </button>
    </div>
  )

  return (
    <div className="flex-1 overflow-y-auto pb-4 px-5 pt-3">
      <h1 className="font-display font-black text-2xl text-white mb-4">Your Order</h1>

      {/* Items */}
      <div className="flex flex-col gap-3 mb-5">
        {cart.map(item => (
          <div key={item.id} className="flex items-center gap-3 p-3 rounded-2xl animate-fade-in"
            style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-[#1a1a1a]">
              <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display font-semibold text-sm text-white truncate">{item.name}</p>
              <p className="text-[10px] mt-0.5" style={{ color: '#4a4a4a' }}>{item.restaurant}</p>
              <p className="font-display font-black text-sm mt-1.5" style={{ color: '#FF4500' }}>
                ${(item.price * item.qty).toFixed(2)}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => dispatch({ type: 'SET_QTY', id: item.id, qty: item.qty - 1 })}
                className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-base transition-all active:scale-90"
                style={{ background: '#1A1A1A', color: '#888', border: '1px solid rgba(255,255,255,0.08)' }}>−</button>
              <span className="font-display font-black text-sm text-white w-5 text-center">{item.qty}</span>
              <button
                onClick={() => dispatch({ type: 'SET_QTY', id: item.id, qty: item.qty + 1 })}
                className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-base transition-all active:scale-90"
                style={{ background: '#FF4500', color: '#fff' }}>+</button>
            </div>
          </div>
        ))}
      </div>

      {/* Promo */}
      <div className="flex gap-2 mb-5">
        <input value={promo} onChange={e => setPromo(e.target.value.toUpperCase())}
          placeholder="Promo code — try CRAVE20"
          className="flex-1 px-4 py-3.5 rounded-2xl bg-transparent text-sm outline-none text-white placeholder:text-[#333] font-display"
          style={{ border: '1px solid rgba(255,255,255,0.08)' }} />
        <button onClick={applyPromo} disabled={promoApplied}
          className="px-4 py-3.5 rounded-2xl font-display font-bold text-sm transition-all active:scale-95 shrink-0"
          style={{
            background: promoApplied ? 'rgba(34,197,94,0.1)' : '#1A1A1A',
            color: promoApplied ? '#22C55E' : '#666',
            border: '1px solid rgba(255,255,255,0.07)',
          }}>
          {promoApplied ? '✓' : 'Apply'}
        </button>
      </div>

      {/* Summary */}
      <div className="p-4 rounded-2xl mb-4" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)' }}>
        <h3 className="font-display font-bold text-sm text-white mb-3">Order Summary</h3>
        <div className="flex flex-col gap-2.5">
          <div className="flex justify-between text-sm">
            <span style={{ color: '#555' }}>Subtotal ({cart.reduce((s,i) => s + i.qty, 0)} items)</span>
            <span style={{ color: '#888' }}>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span style={{ color: '#555' }}>Delivery fee</span>
            <span style={{ color: '#888' }}>${delivery.toFixed(2)}</span>
          </div>
          {promoApplied && (
            <div className="flex justify-between text-sm">
              <span style={{ color: '#22C55E' }}>Promo (CRAVE20 · 15%)</span>
              <span style={{ color: '#22C55E' }}>−${discount.toFixed(2)}</span>
            </div>
          )}
          <div className="pt-2.5 flex justify-between" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <span className="font-display font-bold text-white">Total</span>
            <span className="font-display font-black text-xl" style={{ color: '#FF4500' }}>${total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <button onClick={handleCheckout}
        className="w-full py-4 rounded-2xl font-display font-black text-base transition-all active:scale-[0.97]"
        style={{ background: '#FF4500', color: '#fff' }}>
        Place Order · ${total.toFixed(2)}
      </button>
    </div>
  )
}

// ─── Track Screen ─────────────────────────────────────────────────────────────

function TrackScreen() {
  const [step, setStep] = useState(1)
  const [truckX, setTruckX] = useState(-50)

  useEffect(() => {
    const t2 = setTimeout(() => { setStep(2); setTruckX(-15) }, 3500)
    const t3 = setTimeout(() => { setStep(3); setTruckX(15)  }, 8000)
    const t4 = setTimeout(() => { setStep(4); setTruckX(50)  }, 14000)
    return () => { clearTimeout(t2); clearTimeout(t3); clearTimeout(t4) }
  }, [])

  const STEPS = [
    { label: 'Order Confirmed', sub: 'Restaurant received your order',  emoji: '✅' },
    { label: 'Preparing',       sub: 'Chef is crafting your meal',       emoji: '👨‍🍳' },
    { label: 'On the Way',      sub: 'Marcus is heading your way',       emoji: '🛵' },
    { label: 'Delivered!',      sub: 'Enjoy your meal',                  emoji: '🎉' },
  ]

  const eta = step < 3 ? '22 min' : step === 3 ? '8 min' : 'Arrived!'

  return (
    <div className="flex-1 overflow-y-auto pb-4 px-5 pt-3">
      <h1 className="font-display font-black text-2xl text-white mb-4">Live Tracking</h1>

      {/* ETA hero */}
      <div className="p-5 rounded-3xl mb-5"
        style={{ background: 'linear-gradient(140deg, #FF4500 0%, #FF6A00 100%)' }}>
        <div className="flex items-center justify-between mb-1">
          <div>
            <p className="font-display font-bold text-[10px] uppercase tracking-[0.15em] text-white opacity-75 mb-0.5">Estimated Arrival</p>
            <p className="font-display font-black text-5xl text-white leading-none">{eta}</p>
          </div>
          <span className="text-5xl">{STEPS[step - 1].emoji}</span>
        </div>
        <p className="text-sm text-white opacity-75 font-semibold mt-2">{STEPS[step - 1].label} · {STEPS[step - 1].sub}</p>
        <div className="flex gap-1.5 mt-3">
          {STEPS.map((_, i) => (
            <div key={i} className="flex-1 rounded-full transition-all duration-700"
              style={{ height: 3, background: i < step ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.22)' }} />
          ))}
        </div>
      </div>

      {/* Map */}
      <div className="relative rounded-3xl overflow-hidden mb-5"
        style={{ height: 130, background: '#0e0e0e', border: '1px solid rgba(255,255,255,0.06)' }}>
        <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.08 }}>
          {[...Array(5)].map((_, i) => (
            <line key={`h${i}`} x1="0" y1={i * 30} x2="100%" y2={i * 30} stroke="#fff" strokeWidth="1"/>
          ))}
          {[...Array(9)].map((_, i) => (
            <line key={`v${i}`} x1={i * 50} y1="0" x2={i * 50} y2="100%" stroke="#fff" strokeWidth="1"/>
          ))}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-full flex items-center justify-center">
            <div className="w-48 h-[2px] rounded-full" style={{ background: 'rgba(255,69,0,0.3)' }} />
            <div className="absolute left-[25%] text-3xl" style={{ transform: `translateX(${truckX}px)`, transition: 'transform 1.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)' }}>🛵</div>
            <div className="absolute right-[18%] text-2xl">📍</div>
          </div>
        </div>
        <div className="absolute bottom-2.5 left-3 px-2 py-1 rounded-lg text-[10px] font-semibold"
          style={{ background: 'rgba(0,0,0,0.6)', color: '#444' }}>Map simulation</div>
      </div>

      {/* Timeline */}
      <div className="p-4 rounded-2xl mb-4" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)' }}>
        <h3 className="font-display font-bold text-sm text-white mb-4">Order Progress</h3>
        {STEPS.map((s, i) => {
          const done   = i + 1 < step
          const active = i + 1 === step
          return (
            <div key={i} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 transition-all duration-500"
                  style={{
                    background: done ? 'rgba(255,69,0,0.15)' : active ? '#FF4500' : '#141414',
                    border: `2px solid ${done ? 'rgba(255,69,0,0.35)' : active ? '#FF4500' : '#222'}`,
                    color: done ? '#FF4500' : active ? '#fff' : '#333',
                  }}>
                  {done ? '✓' : active ? s.emoji : <span className="text-[10px]">{i + 1}</span>}
                </div>
                {i < STEPS.length - 1 && (
                  <div className="w-[2px] my-1 rounded-full transition-all duration-700"
                    style={{ height: 28, background: done ? 'rgba(255,69,0,0.3)' : '#1a1a1a' }} />
                )}
              </div>
              <div className="pb-4 pt-0.5">
                <p className="font-display font-semibold text-sm transition-colors"
                  style={{ color: active ? '#fff' : done ? '#FF4500' : '#333' }}>{s.label}</p>
                <p className="text-xs" style={{ color: active || done ? '#555' : '#2a2a2a' }}>{s.sub}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Driver */}
      <div className="flex items-center gap-4 p-4 rounded-2xl" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="w-12 h-12 rounded-2xl overflow-hidden shrink-0 bg-[#1a1a1a]">
          <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&auto=format"
            alt="Driver Marcus" className="w-full h-full object-cover" />
        </div>
        <div className="flex-1">
          <p className="font-display font-bold text-sm text-white">Marcus A.</p>
          <div className="flex items-center gap-1 mt-0.5">
            <span style={{ color: '#FFB800', fontSize: 12 }}>★★★★★</span>
            <span className="text-xs" style={{ color: '#4a4a4a' }}>4.97 · 2,841 trips</span>
          </div>
        </div>
        <div className="flex gap-2">
          {['📞', '💬'].map(icon => (
            <button key={icon} className="w-10 h-10 rounded-2xl flex items-center justify-center text-base transition-all active:scale-90"
              style={{ background: '#1A1A1A', border: '1px solid rgba(255,255,255,0.07)' }}>{icon}</button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Profile Screen ───────────────────────────────────────────────────────────

function ProfileScreen({ perms, onRequestPerm, addToast }: {
  perms:          { location: Perm; camera: Perm; notifications: Perm }
  onRequestPerm:  (t: 'location' | 'camera' | 'notifications') => void
  addToast:       (msg: string, icon?: string, color?: string) => void
}) {
  const [devOpen,   setDevOpen]   = useState(false)
  const [errorOpen, setErrorOpen] = useState(false)
  const [fps,       setFps]       = useState(60)
  const renderCount = useRef(0)
  renderCount.current += 1

  useEffect(() => {
    if (!devOpen) return
    const id = setInterval(() => setFps(54 + Math.floor(Math.random() * 8)), 900)
    return () => clearInterval(id)
  }, [devOpen])

  const PERM_ROWS = [
    { type: 'location'      as const, icon: '📍', label: 'Location Services',    sub: 'Precise delivery tracking' },
    { type: 'camera'        as const, icon: '📷', label: 'Camera Access',        sub: 'QR codes & menu scanner' },
    { type: 'notifications' as const, icon: '🔔', label: 'Push Notifications',   sub: 'Order updates & offers' },
  ]

  const statusOf = (p: Perm) => ({
    granted: { label: 'Granted', color: '#22C55E', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.2)'   },
    denied:  { label: 'Denied',  color: '#EF4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.2)'   },
    prompt:  { label: 'Tap to set', color: '#FFB800', bg: 'rgba(255,184,0,0.1)', border: 'rgba(255,184,0,0.2)'  },
  }[p])

  return (
    <div className="flex-1 overflow-y-auto pb-4 px-5 pt-3">

      {/* Profile header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl overflow-hidden bg-[#1a1a1a]">
            <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop&auto=format"
              alt="Alex Rivera" className="w-full h-full object-cover" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black"
            style={{ background: '#FFB800', border: '2px solid #060606', color: '#000' }}>⚡</div>
        </div>
        <div>
          <h2 className="font-display font-black text-xl text-white leading-tight">Alex Rivera</h2>
          <p className="text-xs mt-0.5" style={{ color: '#555' }}>alex@university.edu</p>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 inline-block"
            style={{ background: 'rgba(255,69,0,0.12)', color: '#FF4500' }}>Premium Member</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        {[{ label: 'Orders', value: '47' }, { label: 'Points', value: '1,240' }, { label: 'Saved', value: '$23.80' }].map(s => (
          <div key={s.label} className="p-3 rounded-2xl text-center" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="font-display font-black text-lg text-white leading-none">{s.value}</p>
            <p className="text-[10px] mt-1" style={{ color: '#4a4a4a' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Permissions */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-bold text-base text-white">Device Permissions</h3>
          <span className="text-[10px] font-bold px-2 py-1 rounded-lg" style={{ background: 'rgba(255,184,0,0.1)', color: '#FFB800' }}>Hardware APIs</span>
        </div>
        <div className="flex flex-col gap-2.5">
          {PERM_ROWS.map(p => {
            const s = statusOf(perms[p.type])
            return (
              <div key={p.type} className="flex items-center gap-3 p-4 rounded-2xl"
                style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span className="text-2xl">{p.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-semibold text-sm text-white">{p.label}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: '#4a4a4a' }}>{p.sub}</p>
                </div>
                <button onClick={() => onRequestPerm(p.type)}
                  className="px-3 py-1.5 rounded-xl font-display font-bold text-xs shrink-0 transition-all active:scale-90"
                  style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
                  {s.label}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Camera viewfinder (when granted) */}
      {perms.camera === 'granted' && (
        <div className="relative rounded-2xl overflow-hidden mb-5 animate-scale-in"
          style={{ height: 120, background: '#080808', border: '1px solid rgba(255,69,0,0.15)' }}>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative w-20 h-20">
              {[['top-0 left-0 border-t-2 border-l-2 rounded-tl-lg', 'top-right'],
                ['top-0 right-0 border-t-2 border-r-2 rounded-tr-lg', 'top-right'],
                ['bottom-0 left-0 border-b-2 border-l-2 rounded-bl-lg', 'bottom-left'],
                ['bottom-0 right-0 border-b-2 border-r-2 rounded-br-lg', 'bottom-right'],
              ].map(([cls], i) => (
                <div key={i} className={`absolute w-5 h-5 ${cls}`} style={{ borderColor: '#FF4500' }} />
              ))}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-[85%] h-[2px] rounded-full animate-pulse" style={{ background: 'rgba(255,69,0,0.6)' }} />
              </div>
            </div>
          </div>
          <div className="absolute bottom-2.5 left-3 px-2.5 py-1 rounded-lg font-display font-bold text-[10px]"
            style={{ background: 'rgba(255,69,0,0.15)', color: '#FF4500' }}>📷 Camera Overlay Active</div>
          <div className="absolute top-2.5 right-3 flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#FF4500' }} />
            <span className="text-[10px] font-bold" style={{ color: '#FF4500' }}>LIVE</span>
          </div>
        </div>
      )}

      {/* Notification preview (when granted) */}
      {perms.notifications === 'granted' && (
        <div className="p-4 rounded-2xl mb-5 animate-scale-in" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="font-display font-bold text-xs text-white mb-3 flex items-center gap-2">
            <span>🔔</span> Push Notification Preview
          </p>
          <div className="p-3 rounded-xl" style={{ background: '#0e0e0e', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 rounded-md flex items-center justify-center text-[10px]" style={{ background: '#FF4500' }}>🍽️</div>
              <span className="font-display font-bold text-[11px] text-white">CRAVE</span>
              <span className="text-[9px] ml-auto" style={{ color: '#444' }}>now</span>
            </div>
            <p className="font-semibold text-xs text-white">Your order is on the way! 🛵</p>
            <p className="text-[10px] mt-0.5" style={{ color: '#555' }}>Marcus is 8 minutes away. Track live in-app.</p>
          </div>
        </div>
      )}

      {/* Dev Tools */}
      <div className="mb-4">
        <button onClick={() => setDevOpen(v => !v)}
          className="w-full flex items-center justify-between p-4 rounded-2xl transition-all"
          style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2">
            <span className="text-lg">⚙️</span>
            <span className="font-display font-bold text-sm text-white">Developer Tools</span>
          </div>
          <span className="text-sm transition-transform duration-200 inline-block"
            style={{ color: '#444', transform: devOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
        </button>

        {devOpen && (
          <div className="mt-2 p-4 rounded-2xl animate-slide-up" style={{ background: '#0C0C0C', border: '1px solid rgba(255,255,255,0.06)' }}>

            {/* Performance */}
            <p className="font-display font-bold text-[9px] tracking-[0.18em] uppercase mb-3" style={{ color: '#FF4500' }}>Performance Profiler</p>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[
                { label: 'Frame Rate', value: `${fps}`, unit: 'fps', color: fps >= 58 ? '#22C55E' : '#FFB800' },
                { label: 'Renders',   value: `${renderCount.current}`, unit: '',    color: '#888' },
                { label: 'Memory',    value: '34.2',  unit: 'MB',  color: '#888' },
              ].map(m => (
                <div key={m.label} className="p-2.5 rounded-xl text-center" style={{ background: '#111' }}>
                  <p className="font-display font-black text-lg leading-none" style={{ color: m.color }}>
                    {m.value}<span className="text-[9px] ml-0.5 opacity-70">{m.unit}</span>
                  </p>
                  <p className="text-[9px] mt-1" style={{ color: '#3a3a3a' }}>{m.label}</p>
                </div>
              ))}
            </div>
            <div className="mb-4">
              <div className="flex justify-between text-[9px] mb-1.5" style={{ color: '#3a3a3a' }}>
                <span>Frame rate</span><span style={{ color: fps >= 58 ? '#22C55E' : '#FFB800' }}>{fps}/60 fps</span>
              </div>
              <div className="rounded-full" style={{ height: 4, background: '#1a1a1a' }}>
                <div className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${(fps / 60) * 100}%`, background: fps >= 58 ? '#22C55E' : '#FFB800' }} />
              </div>
            </div>

            {/* Error Catcher */}
            <div className="flex items-center justify-between mb-2">
              <p className="font-display font-bold text-[9px] tracking-[0.18em] uppercase" style={{ color: '#555' }}>Error Catcher</p>
              <button onClick={() => setErrorOpen(v => !v)} className="font-display font-bold text-[9px] transition-all" style={{ color: '#FF4500' }}>
                {errorOpen ? 'Hide' : 'Show Log'}
              </button>
            </div>
            {errorOpen && (
              <div className="p-3 rounded-xl mb-3 animate-slide-up" style={{ background: '#060606', fontFamily: 'monospace' }}>
                <p className="text-[10px]" style={{ color: '#22C55E' }}>[INFO] App mounted — 0 unhandled errors</p>
                <p className="text-[10px]" style={{ color: '#22C55E' }}>[INFO] useReducer(cart) state: stable</p>
                <p className="text-[10px]" style={{ color: '#22C55E' }}>[INFO] React.StrictMode: passing</p>
                <p className="text-[10px]" style={{ color: '#FFB800' }}>
                  [WARN] {Object.values(perms).filter(p => p !== 'granted').length} permission(s) not granted
                </p>
              </div>
            )}

            {/* Build Config */}
            <p className="font-display font-bold text-[9px] tracking-[0.18em] uppercase mb-2" style={{ color: '#555' }}>Build Config</p>
            <div className="p-3 rounded-xl" style={{ background: '#060606', fontFamily: 'monospace' }}>
              {[
                ['version',  '2.4.1'],
                ['env',      'development'],
                ['bundler',  'Vite 8.0'],
                ['react',    '19.0.0'],
                ['platform', 'mobile-web'],
                ['target',   'ES2022'],
              ].map(([k, v]) => (
                <p key={k} className="text-[10px] leading-relaxed">
                  <span style={{ color: '#FF4500' }}>{k}</span>
                  <span style={{ color: '#2a2a2a' }}> = </span>
                  <span style={{ color: '#22C55E' }}>{v}</span>
                </p>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sign out */}
      <button onClick={() => addToast('Signed out', '👋', '#666')}
        className="w-full py-4 rounded-2xl font-display font-bold text-sm transition-all active:scale-[0.97]"
        style={{ background: '#111', color: '#EF4444', border: '1px solid rgba(239,68,68,0.12)' }}>
        Sign Out
      </button>
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [tab,        setTab]        = useState<Tab>('home')
  const [cart,       dispatch]      = useReducer(cartReducer, [])
  const [toasts,     setToasts]     = useState<Toast[]>([])
  const [pendingPerm, setPending]   = useState<'location' | 'camera' | 'notifications' | null>(null)
  const [perms,      setPerms]      = useState<{ location: Perm; camera: Perm; notifications: Perm }>({
    location: 'prompt', camera: 'prompt', notifications: 'prompt',
  })

  const addToast = useCallback((msg: string, icon = '✨', color = '#F8F8F8') => {
    setToasts(prev => [...prev, { id: uid(), msg, icon, color }])
  }, [])

  function requestPerm(type: 'location' | 'camera' | 'notifications') {
    if (perms[type] === 'granted') { addToast(`${type[0].toUpperCase() + type.slice(1)} already granted`, '✅', '#22C55E'); return }
    setPending(type)
  }

  function grantPerm() {
    if (!pendingPerm) return
    setPerms(prev => ({ ...prev, [pendingPerm]: 'granted' }))
    const MSGS = {
      location:      ['Location enabled — 40.7128° N, 74.0060° W', '📍', '#22C55E'],
      camera:        ['Camera access granted',                      '📷', '#22C55E'],
      notifications: ['Push notifications enabled',                 '🔔', '#22C55E'],
    } as const
    const [msg, icon, color] = MSGS[pendingPerm]
    addToast(msg, icon, color)
    setPending(null)
  }

  function denyPerm() {
    if (!pendingPerm) return
    setPerms(prev => ({ ...prev, [pendingPerm]: 'denied' }))
    addToast(`${pendingPerm} access denied`, '🚫', '#EF4444')
    setPending(null)
  }

  const cartCount = cart.reduce((s, i) => s + i.qty, 0)

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#030303' }}>
      <div className="w-full max-w-[420px] min-h-screen flex flex-col relative overflow-hidden" style={{ background: '#060606' }}>

        <StatusBar />

        <div className="flex-1 flex flex-col overflow-hidden">
          {tab === 'home'    && <HomeScreen    dispatch={dispatch} addToast={addToast} setTab={setTab} />}
          {tab === 'search'  && <SearchScreen  dispatch={dispatch} addToast={addToast} locationPerm={perms.location} />}
          {tab === 'cart'    && <CartScreen    cart={cart} dispatch={dispatch} addToast={addToast} setTab={setTab} />}
          {tab === 'track'   && <TrackScreen />}
          {tab === 'profile' && <ProfileScreen perms={perms} onRequestPerm={requestPerm} addToast={addToast} />}
        </div>

        <BottomNav tab={tab} setTab={setTab} cartCount={cartCount} />

        <Toasts toasts={toasts} setToasts={setToasts} />
        {pendingPerm && <PermModal type={pendingPerm} onGrant={grantPerm} onDeny={denyPerm} />}
      </div>
    </div>
  )
}

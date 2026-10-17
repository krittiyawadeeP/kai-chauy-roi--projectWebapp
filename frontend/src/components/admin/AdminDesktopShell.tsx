import React, { useState, useEffect } from 'react';
import { AdminLoginPage } from './AdminLoginPage';
import { AdminPortalView } from './AdminPortalView';
import { authStorage } from '../../services/api';
import { authService } from '../../services/authService';

type AdminTab = 'dashboard' | 'budget' | 'ai' | 'missions' | 'merchants';

const NAV_ITEMS: { key: AdminTab; label: string; icon: string }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: '📊' },
  { key: 'budget', label: 'จัดสรรงบ', icon: '💰' },
  { key: 'ai', label: 'AI วิเคราะห์', icon: '🤖' },
  { key: 'missions', label: 'ภารกิจ', icon: '🎯' },
  { key: 'merchants', label: 'ร้านค้า', icon: '🏪' },
];

export const AdminDesktopShell: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checking, setChecking] = useState(true);
  const [adminName, setAdminName] = useState('เจ้าหน้าที่');

  // Check existing token on mount
  useEffect(() => {
    const token = authStorage.getToken();
    if (!token) { setChecking(false); return; }
    authService.getMe()
      .then(me => {
        if (me?.Role === 'ADMIN' || me?.Role === 'GOVERNMENT') {
          setAdminName(me.Citizen_ID ?? 'เจ้าหน้าที่');
          setIsLoggedIn(true);
        } else {
          authStorage.removeToken();
        }
      })
      .catch(() => authStorage.removeToken())
      .finally(() => setChecking(false));
  }, []);

  const handleLogout = () => {
    authStorage.removeToken();
    setIsLoggedIn(false);
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-[#1c0a00] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return <AdminLoginPage onLoginSuccess={() => setIsLoggedIn(true)} />;
  }

  return (
    <div className="min-h-screen bg-[#fafaf8] flex flex-col">

      {/* ── Top navbar ── */}
      <header className="h-14 bg-gradient-to-r from-[#78350f] via-[#b45309] to-[#d97706] flex items-center justify-between px-8 shadow-lg z-20 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center text-sm font-black text-white border border-white/20">
            รัฐ
          </div>
          <div>
            <span className="text-white font-bold text-sm tracking-tight">ระบบพอร์ทัลภาครัฐ</span>
            <span className="text-amber-200/60 text-[10px] ml-2 hidden lg:inline">โครงการไทยช่วยไทย</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs text-amber-100">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="hidden sm:inline">เจ้าหน้าที่:</span>
            <span className="font-bold font-mono">{adminName}</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs text-amber-200 hover:text-white border border-white/20 hover:border-white/40 px-3 py-1.5 rounded-lg transition-all"
          >
            ออกจากระบบ
          </button>
        </div>
      </header>

      {/* ── Body: sidebar + content ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar */}
        <aside className="w-56 bg-white border-r border-slate-200 flex flex-col flex-shrink-0 shadow-sm">
          <div className="p-4 border-b border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">เมนูหลัก</p>
          </div>
          <nav className="flex-1 p-3 space-y-1">
            {NAV_ITEMS.map(item => (
              /* We pass the active state via URL hash to let AdminPortalView handle it internally.
                 Instead we just scroll to the tab section — simplest approach. */
              <a
                key={item.key}
                href={`#admin-tab-${item.key}`}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-amber-50 hover:text-amber-800 transition-colors group"
              >
                <span className="text-base group-hover:scale-110 transition-transform">{item.icon}</span>
                {item.label}
              </a>
            ))}
          </nav>
          <div className="p-4 border-t border-slate-100">
            <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
              <p className="text-[10px] font-bold text-amber-700">aipass.go.th</p>
              <p className="text-[9px] text-amber-600/70 mt-0.5">Government Portal v2.1</p>
            </div>
          </div>
        </aside>

        {/* Main content area — AdminPortalView renders in scrollable column */}
        <main className="flex-1 overflow-y-auto bg-[#fafaf8]">
          {/* Desktop wrapper: constrain the mobile-designed view to a centered, wider card */}
          <div className="max-w-5xl mx-auto py-6 px-6">
            {/* Page header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-black text-[#78350f] tracking-tight">Government Admin Portal</h1>
                <p className="text-sm text-slate-500 mt-0.5">กระทรวงการคลัง · โครงการไทยช่วยไทย</p>
              </div>
              <span className="inline-flex items-center gap-2 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-4 py-2 rounded-full">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                ระบบออนไลน์
              </span>
            </div>

            {/* The portal content — rendered in a desktop-friendly grid shell */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
              {/* AdminPortalView was designed for 430px mobile; we render it in a capped-width container
                  so it looks native on desktop without re-writing all the card layouts */}
              <div className="max-w-[860px] mx-auto" id="admin-portal-content">
                <AdminPortalView />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

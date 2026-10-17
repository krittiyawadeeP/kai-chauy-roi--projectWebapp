import React, { useState } from 'react';
import { authService } from '../../services/authService';
import { authStorage } from '../../services/api';

interface AdminLoginPageProps {
  onLoginSuccess: () => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({ onLoginSuccess }) => {
  const [citizenId, setCitizenId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authService.login({ Citizen_ID: citizenId, Password: password, role: 'admin' });
      if (res?.token) {
        authStorage.setToken(res.token);
        onLoginSuccess();
      } else {
        setError('ข้อมูลเข้าสู่ระบบไม่ถูกต้อง');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#1c0a00] via-[#451a03] to-[#78350f] flex items-center justify-center p-6 relative overflow-hidden">

      {/* Decorative circles */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full bg-orange-600/10 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/4 w-64 h-64 rounded-full bg-yellow-400/5 blur-2xl pointer-events-none" />

      {/* Card */}
      <div className="relative w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden">

        {/* Top accent bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600" />

        <div className="p-10">
          {/* Logo / Brand */}
          <div className="flex flex-col items-center mb-10">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-xl shadow-amber-900/40 mb-5">
              <span className="text-3xl font-black text-white select-none">รัฐ</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">ระบบพอร์ทัลภาครัฐ</h1>
            <p className="text-sm text-amber-200/70 mt-1.5 text-center">โครงการไทยช่วยไทย · กระทรวงการคลัง</p>
            <span className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-300 bg-amber-400/10 border border-amber-400/20 px-3 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              GOVERNMENT ADMIN PORTAL
            </span>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="admin-login-citizen" className="block text-xs font-bold text-amber-200/80 mb-2 tracking-wide">
                เลขบัตรประชาชน (ผู้ดูแลระบบ)
              </label>
              <input
                id="admin-login-citizen"
                type="text"
                autoComplete="username"
                required
                maxLength={13}
                value={citizenId}
                onChange={e => setCitizenId(e.target.value)}
                placeholder="1 2345 67890 12 3"
                className="w-full bg-white/8 border border-white/15 text-white placeholder-white/25 rounded-xl px-4 py-3.5 text-sm font-mono focus:outline-none focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/20 transition-all"
              />
            </div>

            <div>
              <label htmlFor="admin-login-password" className="block text-xs font-bold text-amber-200/80 mb-2 tracking-wide">
                รหัสผ่าน
              </label>
              <div className="relative">
                <input
                  id="admin-login-password"
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white/8 border border-white/15 text-white placeholder-white/25 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/20 transition-all pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors text-xs"
                >
                  {showPass ? 'ซ่อน' : 'แสดง'}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-rose-500/15 border border-rose-500/30 rounded-xl px-4 py-3 text-sm text-rose-300 text-center">
                {error}
              </div>
            )}

            <button
              id="admin-login-btn"
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-lg shadow-amber-900/40 transition-all duration-200 active:scale-[0.98] mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  กำลังตรวจสอบ...
                </span>
              ) : 'เข้าสู่ระบบ'}
            </button>
          </form>

          {/* Footer note */}
          <p className="text-center text-[11px] text-white/25 mt-8">
            ระบบนี้สงวนไว้สำหรับเจ้าหน้าที่ภาครัฐเท่านั้น<br />
            การเข้าถึงโดยไม่ได้รับอนุญาตมีโทษตามกฎหมาย
          </p>
        </div>
      </div>

      {/* Version badge */}
      <div className="absolute bottom-4 right-4 text-[10px] text-white/20 font-mono">
        aipass.go.th · v2.1
      </div>
    </div>
  );
};

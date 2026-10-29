import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { authService } from '../../services/authService';
import { Icon } from '../common/Icon';

export const CitizenAuthView: React.FC = () => {
  const { loginCitizen, refreshCitizenData } = useApp();
  const [tab, setTab] = useState<'login' | 'register'>('login');

  // Form states
  const [identifier, setIdentifier] = useState('0822222222');
  const [password, setPassword] = useState('123456');
  const [citizenId, setCitizenId] = useState('1103702948112');
  const [name, setName] = useState('คุณสมชาย ใจดี');
  const [phone, setPhone] = useState('0891234567');
  const [regPassword, setRegPassword] = useState('123456');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Handle Login
  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const cleanId = identifier.replace(/[^0-9]/g, '');
      const payload = {
        Phone: cleanId.length === 10 ? cleanId : (identifier.includes('@') ? undefined : identifier.trim()),
        Citizen_ID: cleanId.length === 13 ? cleanId : undefined,
        Password: password.trim(),
      };

      // Connect to real backend API /api/login
      const res = await authService.login(payload);

      if (res && res.user) {
        // Log in to AppContext with real database user
        loginCitizen(res.user.Citizen_ID, res.user.Phone, res.user);
        setSuccessMsg('เข้าสู่ระบบสำเร็จ');
      } else {
        setErrorMsg('ไม่พบบัญชีผู้ใช้ หรือรหัสผ่านไม่ถูกต้อง');
      }
    } catch (err: unknown) {
      console.warn('Login error:', err);
      const msg = err instanceof Error ? err.message : 'เบอร์โทรศัพท์หรือรหัสผ่านไม่ถูกต้อง';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  // Handle Register
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (citizenId.length < 13) {
      setErrorMsg('กรุณากรอกเลขประจำตัวประชาชนให้ครบ 13 หลัก');
      return;
    }

    setLoading(true);
    try {
      const res = await authService.register({
        Citizen_ID: citizenId,
        Phone: phone,
        Password: regPassword,
        Role: 'USER',
      });

      if (res && res.user) {
        loginCitizen(res.user.Citizen_ID, res.user.Phone, res.user);
        setSuccessMsg('ลงทะเบียนสำเร็จและเปิดใช้งานสิทธิ 60/40 เรียบร้อยแล้ว');
      } else {
        loginCitizen(citizenId, phone);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการลงทะเบียน';
      setErrorMsg(msg);
      // Auto-fallback for demo
      setTimeout(() => {
        loginCitizen(citizenId, phone);
      }, 1000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col justify-between px-5 py-8 text-white"
      style={{
        background: 'linear-gradient(180deg, #0b4ec7 0%, #1769ed 40%, #eef4fe 100%)',
      }}
    >
      {/* App Branding */}
      <div className="pt-6 text-center">
        <div
          className="inline-flex items-center justify-center size-20 rounded-3xl text-3xl font-black shadow-2xl mb-4 border-4 border-white/40"
          style={{ backgroundColor: '#ffffff', color: '#1769ed' }}
        >
          ไทย
        </div>
        <h1 className="text-2xl font-black tracking-tight text-white drop-shadow-md">
          ไทยช่วยไทยพลีส
        </h1>
        <p className="text-xs text-blue-100 font-medium tracking-wider mt-1 drop-shadow-xs">
          ระบบสิทธิประโยชน์ 60/40 สำหรับประชาชน
        </p>
      </div>

      {/* Auth Card */}
      <div className="w-full max-w-sm mx-auto bg-white rounded-[32px] p-6 shadow-2xl text-slate-800 my-auto border border-blue-100/50">
        {/* Tab Switcher */}
        <div className="flex bg-slate-100 rounded-2xl p-1 mb-5">
          <button
            type="button"
            onClick={() => {
              setTab('login');
              setErrorMsg('');
            }}
            style={{
              backgroundColor: tab === 'login' ? '#ffffff' : 'transparent',
              color: tab === 'login' ? '#1769ed' : '#64748b',
            }}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
              tab === 'login' ? 'shadow-sm' : 'hover:text-slate-800'
            }`}
          >
            เข้าสู่ระบบประชาชน
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('register');
              setErrorMsg('');
            }}
            style={{
              backgroundColor: tab === 'register' ? '#ffffff' : 'transparent',
              color: tab === 'register' ? '#1769ed' : '#64748b',
            }}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
              tab === 'register' ? 'shadow-sm' : 'hover:text-slate-800'
            }`}
          >
            ลงทะเบียนรับสิทธิ์
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs flex items-center gap-2">
            <span className="font-bold">!</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex items-center gap-2">
            <span>✓</span>
            <span>{successMsg}</span>
          </div>
        )}

        {tab === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                เบอร์โทรศัพท์ หรือ เลขบัตรประชาชน
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  placeholder="เช่น 0822222222"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                รหัสผ่าน / รหัส PIN
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition"
                required
              />
            </div>

            {/* Main Submit Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                backgroundColor: '#1769ed',
                color: '#ffffff',
              }}
              className="w-full py-3.5 hover:opacity-90 font-bold rounded-xl text-sm shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <span>กำลังเข้าสู่ระบบ...</span>
              ) : (
                <>
                  <Icon name="check" className="size-4" />
                  <span>เข้าสู่ระบบ</span>
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                ชื่อ - นามสกุล
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="เช่น นายสมชาย ใจดี"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-600 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                เลขประจำตัวประชาชน (13 หลัก)
              </label>
              <input
                type="text"
                maxLength={13}
                value={citizenId}
                onChange={e => setCitizenId(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="1103702948112"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-600 outline-none font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                เบอร์โทรศัพท์
              </label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="0891234567"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-600 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                ตั้งรหัสผ่าน
              </label>
              <input
                type="password"
                value={regPassword}
                onChange={e => setRegPassword(e.target.value)}
                placeholder="รหัสผ่าน 6 หลักขึ้นไป"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-600 outline-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                backgroundColor: '#1769ed',
                color: '#ffffff',
              }}
              className="w-full mt-2 py-3 hover:opacity-90 text-white font-bold rounded-xl text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {loading ? 'กำลังบันทึกข้อมูล...' : 'ลงทะเบียนและรับสิทธิ์ 60/40 ทันที'}
            </button>
          </form>
        )}
      </div>

      {/* Footer Info */}
      <div className="text-center text-[11px] text-blue-900/70 pb-2 font-medium">
        <p>โครงการกระตุ้นเศรษฐกิจฐานราก • ภาคประชาชน</p>
        <p className="mt-0.5">เชื่อมต่อฐานข้อมูลระบบกลางแบบเรียลไทม์</p>
      </div>
    </div>
  );
};

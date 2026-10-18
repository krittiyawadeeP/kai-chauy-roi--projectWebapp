import React, { useState } from 'react';
import { Building2, LockKeyhole, ArrowLeft } from 'lucide-react';
import { authService } from '../../services/authService';
import { authStorage } from '../../services/api';
import { useApp } from '../../context/AppContext';

export const AdminLoginPage: React.FC<{ onLoginSuccess: () => void }> = ({ onLoginSuccess }) => {
  const { setRole } = useApp();
  const [citizenId, setCitizenId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const login = async (event: React.FormEvent) => {
    event.preventDefault(); setLoading(true); setError('');
    try {
      const result = await authService.login({ Citizen_ID: citizenId.trim(), Password: password, role: 'admin' });
      if (result.user.Role !== 'ADMIN') { authStorage.removeToken(); throw new Error('บัญชีนี้ไม่มีสิทธิ์ผู้ดูแลระบบส่วนกลาง'); }
      setPassword(''); onLoginSuccess();
    } catch (value) { setError(value instanceof Error ? value.message : 'ไม่สามารถเข้าสู่ระบบได้'); }
    finally { setLoading(false); }
  };
  return <div className="admin-workspace min-h-screen border-t-4 border-[#b69a59] bg-[#f1f4f7]">
    <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-6 py-5"><Building2 size={28} className="text-[#9c7b36]" /><div><p className="text-sm font-semibold text-[#173d58]">ระบบบริหารโครงการไทยช่วยไทย</p><p className="mt-1 text-[10px] text-slate-400">ระบบสารสนเทศสำหรับเจ้าหน้าที่ส่วนกลาง</p></div></header>
    <main className="mx-auto grid min-h-[calc(100vh-90px)] max-w-5xl items-center gap-10 px-6 py-12 md:grid-cols-2">
      <section className="hidden pr-10 md:block"><div className="mb-8 grid size-20 place-items-center rounded-full border border-[#b69a59] text-[#9c7b36]"><Building2 size={38} strokeWidth={1.3} /></div><p className="admin-eyebrow">ศูนย์บริหารและติดตามผลโครงการ</p><h1 className="mt-3 text-3xl font-semibold leading-relaxed text-[#173d58]">บริหารนโยบายส่วนกลาง<br />ติดตามเศรษฐกิจรายพื้นที่</h1><p className="mt-5 text-sm leading-7 text-slate-500">ข้อมูลเงินหมุนเวียน การร่วมจ่ายภาครัฐ และการดำเนินโครงการ เพื่อสนับสนุนการบริหารและติดตามผลในระดับภูมิภาคและจังหวัด</p></section>
      <section className="admin-card w-full p-7 sm:p-9"><div className="mb-7"><LockKeyhole size={23} className="mb-4 text-[#9c7b36]" /><h2 className="text-xl font-semibold text-slate-800">เข้าสู่ระบบเจ้าหน้าที่</h2><p className="mt-2 text-xs leading-6 text-slate-500">สำหรับบัญชีผู้ดูแลระบบที่ได้รับสิทธิ์ใช้งาน</p></div>
        <form onSubmit={login} className="space-y-5"><label className="block text-sm font-medium text-slate-600">เลขประจำตัวประชาชน<input id="admin-login-citizen" className="admin-input mt-2" type="text" inputMode="numeric" autoComplete="username" required maxLength={13} value={citizenId} onChange={e => setCitizenId(e.target.value)} /></label><label className="block text-sm font-medium text-slate-600">รหัสผ่าน<div className="relative mt-2"><input id="admin-login-password" className="admin-input !pr-14" autoComplete="current-password" type={showPassword ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)} /><button className="absolute right-3 top-3 text-[11px] text-slate-400" type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}>{showPassword ? 'ซ่อน' : 'แสดง'}</button></div></label>
          {error && <p role="alert" className="border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</p>}
          <button id="admin-login-btn" className="admin-primary w-full !py-3" disabled={loading} type="submit">{loading ? 'กำลังตรวจสอบสิทธิ์…' : 'เข้าสู่ระบบ'}</button>
        </form><p className="mt-7 border-t border-slate-100 pt-5 text-[10px] leading-5 text-slate-400">การเข้าใช้งานส่วนนี้ต้องผ่านการตรวจสอบสิทธิ์ผู้ดูแลระบบ</p><button className="mt-4 flex items-center gap-2 text-xs text-slate-500 hover:text-slate-800" onClick={() => setRole('citizen')}><ArrowLeft size={13} />กลับหน้าประชาชน</button>
      </section>
    </main>
  </div>;
};

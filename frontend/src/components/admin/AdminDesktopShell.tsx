import React, { useEffect, useState } from 'react';
import { Building2, LayoutDashboard, Landmark, FileText, Store, ChartNoAxesCombined, Gift, LogOut, ChevronRight, ArrowLeft } from 'lucide-react';
import { AdminLoginPage } from './AdminLoginPage';
import { AdminPortalView } from './AdminPortalView';
import { GeographicDashboard } from './GeographicDashboard';
import { GlobalPolicyPanel } from './GlobalPolicyPanel';
import { AUTH_EXPIRED_EVENT, authStorage, api } from '../../services/api';
import { authService } from '../../services/authService';
import { useApp } from '../../context/AppContext';
import './admin.css';

type AdminTab = 'dashboard' | 'budget' | 'ai' | 'missions' | 'rewards' | 'merchants';
const navigation = [
  { key: 'dashboard', label: 'ภาพรวมเศรษฐกิจรายพื้นที่', icon: LayoutDashboard },
  { key: 'budget', label: 'นโยบายอัตราร่วมจ่าย', icon: Landmark },
  { key: 'ai', label: 'วิเคราะห์สถานการณ์ร้านค้า', icon: ChartNoAxesCombined },
  { key: 'missions', label: 'จัดการภารกิจโครงการ', icon: FileText },
  { key: 'rewards', label: 'จัดการของรางวัล OTOP', icon: Gift },
  { key: 'merchants', label: 'ทะเบียนร้านค้า', icon: Store },
] as const;

export const AdminDesktopShell: React.FC = () => {
  const { setRole } = useApp();
  const [loggedIn, setLoggedIn] = useState(false);
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState<AdminTab>(() => new URLSearchParams(window.location.search).get('tab') === 'ai' ? 'ai' : 'dashboard');
  const [adminName, setAdminName] = useState('เจ้าหน้าที่ผู้ดูแลระบบ');
  const [sessionExpired, setSessionExpired] = useState(false);
  useEffect(() => {
    const onExpired = () => { setSessionExpired(true); setLoggedIn(false); };
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, []);
  useEffect(() => {
    let active = true;
    if (!authStorage.getToken()) { setChecking(false); return; }
    authService.getMe().then(me => {
      if (!active) return;
      if (me.Role === 'ADMIN') { setAdminName(`เจ้าหน้าที่ ···${me.Citizen_ID.slice(-4)}`); setLoggedIn(true); }
      else authStorage.removeToken();
    }).catch(() => { if (active) authStorage.removeToken(); }).finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, []);
  const logout = async () => {
    try { await api.post('/logout'); } catch { /* An expired server session is already unusable. */ }
    authStorage.removeToken(); setSessionExpired(false); setLoggedIn(false);
  };
  if (checking) return <div className="admin-workspace grid min-h-screen place-items-center bg-slate-100 text-sm text-slate-600" role="status">กำลังตรวจสอบสิทธิ์การใช้งาน…</div>;
  if (!loggedIn) return <AdminLoginPage notice={sessionExpired ? 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง' : undefined} onLoginSuccess={() => { setSessionExpired(false); setLoggedIn(true); }} />;
  return <div className="admin-workspace min-h-screen bg-[#f2f4f7] text-slate-700">
    <div className="h-1 bg-[#b69a59]" />
    <header className="flex min-h-20 items-center justify-between gap-4 border-b border-[#2c4c68] bg-[#16354f] px-5 py-4 text-white lg:px-8">
      <div className="flex items-center gap-3"><div className="grid size-11 shrink-0 place-items-center rounded-full border border-[#b69a59] text-[#d8be80]"><Building2 size={24} strokeWidth={1.5} /></div><div><p className="text-[10px] tracking-[0.16em] text-[#d0bd8d]">ระบบสารสนเทศเพื่อการบริหารโครงการ</p><p className="mt-1 text-base font-semibold lg:text-lg">โครงการไทยช่วยไทย</p></div></div>
      <div className="flex items-center gap-4"><div className="hidden text-right sm:block"><p className="text-xs font-medium">{adminName}</p><p className="mt-1 text-[10px] text-slate-300">ผู้ดูแลระบบส่วนกลาง</p></div><button onClick={logout} className="flex items-center gap-2 border border-white/25 px-3 py-2 text-xs hover:bg-white/10"><LogOut size={14} /><span className="hidden sm:inline">ออกจากระบบ</span></button></div>
    </header>
    <div className="flex flex-col lg:flex-row">
      <aside className="shrink-0 border-b border-slate-200 bg-white lg:sticky lg:top-0 lg:flex lg:min-h-[calc(100vh-84px)] lg:w-64 lg:flex-col lg:self-start lg:border-r">
        <p className="hidden px-6 pb-3 pt-7 text-[10px] tracking-widest text-slate-400 lg:block">การบริหารและติดตามผล</p>
        <nav className="flex gap-1 overflow-x-auto p-2 lg:flex-col lg:px-3" aria-label="เมนูผู้ดูแลระบบ">{navigation.map(item => <button key={item.key} onClick={() => setTab(item.key)} aria-current={tab === item.key ? 'page' : undefined} className={`flex shrink-0 items-center gap-3 border-l-[3px] px-4 py-3.5 text-left text-xs transition-colors ${tab === item.key ? 'border-[#ad8d46] bg-[#eef3f6] font-semibold text-[#173d58]' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}><item.icon size={17} strokeWidth={1.6} /><span>{item.label}</span>{tab === item.key && <ChevronRight size={13} className="ml-auto hidden lg:block" />}</button>)}</nav>
        <div className="mt-auto hidden p-6 lg:block"><button onClick={() => setRole('citizen')} className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-900"><ArrowLeft size={14} />กลับหน้าประชาชน</button><div className="mt-6 border-t border-slate-200 pt-4 text-[10px] leading-5 text-slate-400">ระบบบริหารโครงการไทยช่วยไทย<br />สำหรับเจ้าหน้าที่ผู้มีสิทธิ์ใช้งาน</div></div>
      </aside>
      <main className="min-w-0 flex-1 p-4 lg:p-7 xl:p-9">
        <div className="mx-auto max-w-[1500px]"><p className="mb-6 flex items-center gap-2 text-[11px] text-slate-400">หน้าหลัก <ChevronRight size={11} /><span className="text-slate-600">{navigation.find(item => item.key === tab)?.label}</span></p>
          {tab === 'dashboard' ? <GeographicDashboard /> : tab === 'budget' ? <GlobalPolicyPanel /> : <AdminPortalView activeSection={tab} />}
          <footer className="mt-10 flex flex-wrap justify-between gap-2 border-t border-slate-200 pt-4 text-[10px] text-slate-400"><span>ระบบติดตามและประเมินผลโครงการไทยช่วยไทย</span><span>ข้อมูลสำหรับการบริหารโครงการ</span></footer>
        </div>
      </main>
    </div>
  </div>;
};

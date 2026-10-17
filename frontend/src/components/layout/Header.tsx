import React from 'react';
import {
  Smartphone,
  Monitor,
  User,
  Store,
  Building2,
  RotateCcw,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Role } from '../../types';

export const Header: React.FC = () => {
  const { role, setRole, viewMode, setViewMode, resetAllData } = useApp();

  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 text-slate-100 shadow-md">
      {/* Thai National Colors Accent Bar */}
      <div className="h-1 w-full flex">
        <div className="flex-1 bg-red-600" />
        <div className="flex-1 bg-white" />
        <div className="flex-2 bg-blue-700" />
        <div className="flex-1 bg-white" />
        <div className="flex-1 bg-red-600" />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 p-0.5 shadow-md flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <span className="text-cyan-300 font-black text-xs">ไทย</span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm tracking-tight text-white">ไทยช่วยไทยพลีส</span>
              <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.2 rounded-md font-bold border border-blue-400/20">
                สิทธิ 60/40
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden sm:block">
              Thai Chuay Thai Please • ระบบกระตุ้นเศรษฐกิจชุมชนตามมาตรฐาน aipass.go.th
            </p>
          </div>
        </div>

        {/* Center: Stakeholder Switcher */}
        <div className="flex items-center bg-slate-900/90 p-1 rounded-2xl border border-slate-800 text-xs font-bold shadow-inner">
          <span className="text-[10px] text-slate-400 px-2 hidden md:inline">เลือกมุมมองผู้ใช้:</span>

          <button
            onClick={() => setRole('citizen')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              role === 'citizen'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>ประชาชน</span>
          </button>

          <button
            onClick={() => setRole('merchant')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              role === 'merchant'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>ร้านค้าชุมชน</span>
          </button>

          <button
            onClick={() => setRole('admin')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              role === 'admin'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>ภาครัฐ (Admin)</span>
          </button>
        </div>

        {/* Right side controls: View Mode toggle & Reset Data */}
        <div className="flex items-center gap-2">
          {/* Frame mode toggle */}
          <div className="hidden sm:flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setViewMode('mobile')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'mobile' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="มุมมองแอปมือถือ (Mobile Frame)"
            >
              <Smartphone className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('desktop')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'desktop' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="มุมมองเต็มจอ (Desktop View)"
            >
              <Monitor className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => {
              if (confirm('คุณต้องการรีเซ็ตข้อมูลตัวอย่างกลับเป็นค่าเริ่มต้นหรือไม่?')) {
                resetAllData();
              }
            }}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-xl border border-slate-800 transition-colors text-xs flex items-center gap-1 cursor-pointer"
            title="รีเซ็ตข้อมูลทดสอบ"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="text-[11px] hidden sm:inline">รีเซ็ต</span>
          </button>
        </div>
      </div>
    </header>
  );
};

import React from 'react';
import { Wifi, Battery, Signal } from 'lucide-react';

interface MobileDeviceFrameProps {
  children: React.ReactNode;
}

export const MobileDeviceFrame: React.FC<MobileDeviceFrameProps> = ({ children }) => {
  return (
    <div className="flex justify-center items-center py-4 px-2 min-h-[calc(100vh-65px)]">
      {/* Smartphone Outer Casing */}
      <div className="relative w-full max-w-[420px] h-[860px] max-h-[92vh] bg-slate-950 rounded-[48px] p-3 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.6)] border-4 border-slate-700/80 ring-1 ring-white/10 flex flex-col overflow-hidden">
        {/* Dynamic Island / Notch */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-full z-50 flex items-center justify-between px-3">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-800" />
          <div className="w-2 h-2 rounded-full bg-blue-950 ring-1 ring-blue-500/50" />
        </div>

        {/* Screen Status Bar */}
        <div className="pt-2 px-6 pb-1 flex items-center justify-between text-[11px] font-semibold text-white/90 z-40 bg-slate-950 select-none">
          <span>09:41</span>
          <div className="flex items-center gap-1.5 text-white/90">
            <Signal className="w-3.5 h-3.5" />
            <Wifi className="w-3.5 h-3.5" />
            <Battery className="w-4 h-4" />
          </div>
        </div>

        {/* Inner Screen viewport */}
        <div className="flex-1 w-full bg-slate-100 rounded-[38px] overflow-y-auto overflow-x-hidden relative">
          {children}
        </div>

        {/* Home Indicator bar */}
        <div className="w-full flex justify-center pt-2 pb-1 bg-slate-950">
          <div className="w-32 h-1 bg-white/40 rounded-full" />
        </div>
      </div>
    </div>
  );
};

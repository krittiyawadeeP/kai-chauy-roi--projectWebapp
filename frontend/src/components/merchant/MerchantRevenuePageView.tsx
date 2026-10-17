import React from 'react';
import { useApp } from '../../context/AppContext';
import { RevenueBreakdownCard } from './RevenueBreakdownCard';
import { Icon } from '../common/Icon';

interface MerchantRevenuePageViewProps {
  onBack?: () => void;
}

export const MerchantRevenuePageView: React.FC<MerchantRevenuePageViewProps> = ({
  onBack
}) => {
  const { currentMerchant } = useApp();

  return (
    <div className="pb-28 animate-in fade-in duration-200">
      {/* Page Top Header - เขียวหัวเป็ด Theme */}
      <header className="relative overflow-hidden bg-gradient-to-br from-[#042f2e] via-[#115e59] to-[#0d9488] px-5 pb-8 pt-5 text-white shadow-md">
        <div className="absolute -right-10 -top-14 size-44 rounded-full border-[24px] border-white/10 pointer-events-none" />

        {/* Top Back Action Bar */}
        <div className="relative flex items-center justify-between mb-4">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-bold text-white transition-colors cursor-pointer backdrop-blur-xs"
          >
            <span>←</span>
            <span>กลับหน้าหลัก</span>
          </button>

          <div className="flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[11px] font-semibold backdrop-blur text-teal-100 border border-white/20">
            <span className="size-2 rounded-full bg-emerald-300 animate-pulse" />
            <span>สิทธิ์ 60/40 ชุมชน</span>
          </div>
        </div>

        {/* Title and Store Info */}
        <div className="relative flex items-center gap-3">
          <div className="grid size-12 place-items-center rounded-2xl bg-white text-xl font-extrabold text-[#115e59] shadow-lg shrink-0">
            ฿
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium tracking-[.16em] text-teal-100 uppercase">
              REVENUE & SALES REPORT
            </p>
            <h1 className="text-xl font-bold tracking-tight truncate">
              สรุปยอดขายและรายได้ร้านค้า
            </h1>
            <p className="text-xs text-teal-100 mt-0.5 truncate">
              {currentMerchant?.shopName || 'ร้านค้าชุมชน'} ({currentMerchant?.ownerName})
            </p>
          </div>
        </div>
      </header>

      {/* Main Revenue Content */}
      <main className="px-4 pt-4">
        <RevenueBreakdownCard initialPeriod="month" />
      </main>
    </div>
  );
};

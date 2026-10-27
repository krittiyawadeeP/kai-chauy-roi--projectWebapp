import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Icon } from '../../components/common/Icon';
import { Reward } from '../../types';
import { StampRedeemModal } from '../../components/citizen/StampRedeemModal';

interface CitizenRewardsPageProps {
  onBack?: () => void;
  onOpenPassport?: () => void;
  onOpenVouchers?: () => void;
}

export const CitizenRewardsPage: React.FC<CitizenRewardsPageProps> = ({
  onBack,
  onOpenPassport,
  onOpenVouchers,
}) => {
  const { userStamps, rewards, redemptions } = useApp();
  const [filter, setFilter] = useState<'all' | 'otop' | 'discount' | 'can_redeem'>('all');
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [redeemModalOpen, setRedeemModalOpen] = useState(false);

  const totalUserStamps = userStamps.reduce((acc, curr) => acc + curr.count, 0);
  const readyVouchersCount = redemptions.filter(r => r.status !== 'completed').length;

  const filteredRewards = rewards.filter(reward => {
    const canRedeem = totalUserStamps >= reward.requiredStampCount;
    if (filter === 'can_redeem') return canRedeem;
    if (filter === 'otop') return reward.rewardType === 'otop_product' || reward.rewardType === 'souvenir';
    if (filter === 'discount') return reward.rewardType === 'discount_voucher';
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f3f7fd] via-[#f7f9fd] to-[#f0f4fa] text-[#0f172a] pb-28 animate-fade-in flex flex-col antialiased">
      {/* 1. Header Bar */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/85 border-b border-slate-200/60 px-4 py-3.5 shadow-xs flex items-center justify-between transition-all">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="grid size-10 place-items-center rounded-2xl bg-slate-100/80 hover:bg-slate-200/80 active:scale-95 transition-all text-slate-700 cursor-pointer shadow-xs border border-slate-200/40"
              aria-label="ย้อนกลับ"
            >
              <Icon name="chevron" className="size-5 rotate-180" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black tracking-tight text-slate-900">
                ศูนย์ของรางวัล & OTOP ชุมชน
              </h1>
              <span className="text-lg">🎁</span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              แลกรับผลิตภัณฑ์ OTOP และคูปองด้วยแสตมป์ดิจิทัล
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-black flex items-center gap-1 shadow-xs">
            <span className="text-amber-500">★</span> {totalUserStamps} ดวง
          </span>
        </div>
      </header>

      {/* 2. Asset Overview Grid (Stamp Passport & My Vouchers) */}
      <div className="px-4 pt-4 grid grid-cols-2 gap-3">
        {/* Card 1: My Stamps & Passport */}
        <div className="rounded-[24px] bg-gradient-to-br from-[#0c2e68] via-[#103d8a] to-[#1769ed] p-4 text-white shadow-md relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">
                แสตมป์สะสม
              </span>
              <span className="text-base">🏅</span>
            </div>
            <p className="text-2xl font-black text-amber-300 font-mono tracking-tight leading-none">
              {totalUserStamps} <span className="text-xs text-blue-200 font-medium">ดวง</span>
            </p>
            <p className="text-[10px] text-blue-200 mt-1">ใช้แลกของรางวัล OTOP</p>
          </div>

          {onOpenPassport && (
            <button
              type="button"
              onClick={onOpenPassport}
              className="mt-3 py-1.5 px-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer border border-white/20 shadow-xs"
            >
              <span>📖 เปิดสมุดพาสปอร์ต</span>
            </button>
          )}
        </div>

        {/* Card 2: My Vouchers Ready to Use */}
        <div className="rounded-[24px] bg-white p-4 border border-amber-200/80 shadow-md relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                คูปองของฉัน
              </span>
              <span className="text-base">🎟️</span>
            </div>
            <p className="text-2xl font-black text-slate-800 font-mono tracking-tight leading-none">
              {readyVouchersCount} <span className="text-xs text-slate-400 font-medium">ใบ</span>
            </p>
            <p className="text-[10px] text-slate-500 mt-1">คูปองพร้อมแสดงหน้าร้าน</p>
          </div>

          {onOpenVouchers && (
            <button
              type="button"
              onClick={onOpenVouchers}
              className="mt-3 py-1.5 px-2 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer border border-amber-300 shadow-xs"
            >
              <span>ดูคูปองของฉัน →</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Filter Category Pills */}
      <div className="px-4 pt-4">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {[
            { id: 'all', label: 'ทั้งหมด', count: rewards.length },
            { id: 'can_redeem', label: 'แลกได้ทันที', count: rewards.filter(r => totalUserStamps >= r.requiredStampCount).length },
            { id: 'otop', label: 'สินค้า OTOP ชุมชน' },
            { id: 'discount', label: 'คูปองส่วนลด' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                filter === tab.id
                  ? 'bg-[#1769ed] text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full ${
                  filter === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Rewards Catalog Grid */}
      <div className="px-4 pt-3.5 space-y-3 flex-1">
        <div className="flex justify-between items-center text-xs text-slate-500 px-0.5">
          <span>พบ {filteredRewards.length} รายการ</span>
          <span className="text-[11px] text-blue-700 font-bold">1 แสตมป์ = 1 สิทธิ์</span>
        </div>

        {filteredRewards.length === 0 ? (
          <div className="py-14 text-center text-slate-400 bg-white rounded-3xl p-6 border border-slate-100 space-y-2">
            <span className="text-4xl block">🔍</span>
            <p className="text-xs font-bold text-slate-600">ไม่พบของรางวัลในหมวดหมู่นี้</p>
            <p className="text-[11px] text-slate-400">ลองสลับตัวกรองเพื่อดูของรางวัลอื่น ๆ ได้เลยครับ</p>
          </div>
        ) : (
          filteredRewards.map(reward => {
            const canRedeem = totalUserStamps >= reward.requiredStampCount;
            const diffStamps = reward.requiredStampCount - totalUserStamps;

            return (
              <div
                key={reward.rewardId}
                className="bg-white rounded-[24px] p-3.5 border border-slate-100 shadow-[0_4px_16px_rgba(0,0,0,0.03)] flex gap-3.5 items-center hover:shadow-md transition-all"
              >
                {/* Reward Image */}
                <div className="relative size-22 rounded-2xl overflow-hidden shrink-0 border border-slate-100">
                  <img
                    src={reward.imageUrl}
                    alt={reward.rewardName}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-1 left-1 bg-black/60 backdrop-blur text-white text-[8px] font-bold px-1.5 py-0.5 rounded-md">
                    {reward.rewardType === 'discount_voucher' ? 'คูปอง' : 'OTOP'}
                  </span>
                </div>

                {/* Details */}
                <div className="min-w-0 flex-1 flex flex-col justify-between h-full space-y-1.5">
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-bold text-blue-700 truncate">
                        {reward.provinceName}
                      </span>
                      {reward.remainingStock <= 5 && reward.remainingStock > 0 && (
                        <span className="text-[9px] font-black text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded-md">
                          เหลือ {reward.remainingStock} ชิ้น
                        </span>
                      )}
                    </div>
                    <h3 className="font-extrabold text-xs text-slate-900 line-clamp-1 leading-snug">
                      {reward.rewardName}
                    </h3>
                    <p className="text-[10px] text-slate-400 line-clamp-1">
                      {reward.description}
                    </p>
                  </div>

                  {/* Stamp Requirement & Redeem Button */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-50">
                    <div className="flex items-baseline gap-1">
                      <span className="text-xs font-black text-amber-500">★</span>
                      <span className="text-xs font-black text-slate-800">
                        {reward.requiredStampCount}
                      </span>
                      <span className="text-[10px] text-slate-400">แสตมป์</span>
                    </div>

                    <button
                      type="button"
                      disabled={!canRedeem}
                      onClick={() => {
                        setSelectedReward(reward);
                        setRedeemModalOpen(true);
                      }}
                      className={`py-1.5 px-3 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer shadow-xs ${
                        canRedeem
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-amber-500/20 active:scale-95'
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {canRedeem ? 'กดแลกรับเลย' : `ขาด ${diffStamps} ดวง`}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Redeem Modal */}
      <StampRedeemModal
        isOpen={redeemModalOpen}
        onClose={() => setRedeemModalOpen(false)}
        reward={selectedReward}
      />
    </div>
  );
};

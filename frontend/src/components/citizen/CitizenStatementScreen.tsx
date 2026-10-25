import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Icon } from '../common/Icon';
import { SalesTransaction } from '../../types';

interface CitizenStatementScreenProps {
  onBack: () => void;
}

type TimePeriod = 'week' | 'month' | 'all';
type TypeFilter = 'all' | 'user_paid' | 'gov_subsidized';

export const CitizenStatementScreen: React.FC<CitizenStatementScreenProps> = ({ onBack }) => {
  const { transactions, wallet, userGrant, currentUser, topupWallet } = useApp();

  const [timePeriod, setTimePeriod] = useState<TimePeriod>('week');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [selectedTx, setSelectedTx] = useState<SalesTransaction | null>(null);
  const [showTopupModal, setShowTopupModal] = useState<boolean>(false);
  const [topupAmount, setTopupAmount] = useState<number>(300);
  const [topupMsg, setTopupMsg] = useState<string>('');

  // 1. Filter transactions by Time Period
  const periodFilteredTxs = useMemo(() => {
    if (timePeriod === 'all') return transactions;

    const now = new Date('2026-10-19T00:00:00'); // Simulated anchor or current date
    return transactions.filter(tx => {
      const txDate = new Date(tx.txTimestamp.replace(' ', 'T'));
      if (isNaN(txDate.getTime())) return true;

      const diffDays = (now.getTime() - txDate.getTime()) / (1000 * 3600 * 24);
      if (timePeriod === 'week') {
        return diffDays >= -1 && diffDays <= 7;
      }
      if (timePeriod === 'month') {
        return diffDays >= -1 && diffDays <= 31;
      }
      return true;
    });
  }, [transactions, timePeriod]);

  // 2. Metrics for selected period
  const totalSpent = periodFilteredTxs.reduce((sum, tx) => sum + (tx.totalAmount || 0), 0);
  const totalUserPaid = periodFilteredTxs.reduce((sum, tx) => sum + (tx.userPaidAmount || 0), 0);
  const totalGovSubsidized = periodFilteredTxs.reduce((sum, tx) => sum + (tx.govSubsidizedAmount || 0), 0);

  // Overall Grant Metrics
  const usedGrant = userGrant.totalGrantAmount - userGrant.remainingAmount;
  const grantUsagePercent = Math.min(100, Math.max(0, (usedGrant / userGrant.totalGrantAmount) * 100));

  // 3. Filter by 40% / 60%
  const displayedTxs = useMemo(() => {
    return periodFilteredTxs.filter(tx => {
      if (typeFilter === 'user_paid') return (tx.userPaidAmount || 0) > 0;
      if (typeFilter === 'gov_subsidized') return (tx.govSubsidizedAmount || 0) > 0;
      return true;
    });
  }, [periodFilteredTxs, typeFilter]);

  // 4. Bar chart daily distribution (Simulated / Calculated from period)
  const chartDays = useMemo(() => {
    if (timePeriod === 'week') {
      const days = [
        { label: 'จันทร์', dayIdx: 1, user: 0, gov: 0 },
        { label: 'อังคาร', dayIdx: 2, user: 0, gov: 0 },
        { label: 'พุธ', dayIdx: 3, user: 0, gov: 0 },
        { label: 'พฤหัส', dayIdx: 4, user: 0, gov: 0 },
        { label: 'ศุกร์', dayIdx: 5, user: 0, gov: 0 },
        { label: 'เสาร์', dayIdx: 6, user: 0, gov: 0 },
        { label: 'อาทิตย์', dayIdx: 0, user: 0, gov: 0 },
      ];

      periodFilteredTxs.forEach(tx => {
        const d = new Date(tx.txTimestamp.replace(' ', 'T'));
        if (!isNaN(d.getTime())) {
          const dayIdx = d.getDay();
          const target = days.find(item => item.dayIdx === dayIdx);
          if (target) {
            target.user += tx.userPaidAmount || 0;
            target.gov += tx.govSubsidizedAmount || 0;
          }
        }
      });

      // Default mock distribution if few txs in this test
      if (periodFilteredTxs.length > 0 && days.every(d => d.user === 0)) {
        days[2].user = totalUserPaid * 0.4;
        days[2].gov = totalGovSubsidized * 0.4;
        days[5].user = totalUserPaid * 0.6;
        days[5].gov = totalGovSubsidized * 0.6;
      }
      return days;
    }

    if (timePeriod === 'month') {
      return [
        { label: 'สัปดาห์ 1', user: totalUserPaid * 0.22, gov: totalGovSubsidized * 0.22 },
        { label: 'สัปดาห์ 2', user: totalUserPaid * 0.35, gov: totalGovSubsidized * 0.35 },
        { label: 'สัปดาห์ 3', user: totalUserPaid * 0.28, gov: totalGovSubsidized * 0.28 },
        { label: 'สัปดาห์ 4', user: totalUserPaid * 0.15, gov: totalGovSubsidized * 0.15 },
      ];
    }

    return [
      { label: 'ก.ค.', user: totalUserPaid * 0.15, gov: totalGovSubsidized * 0.15 },
      { label: 'ส.ค.', user: totalUserPaid * 0.25, gov: totalGovSubsidized * 0.25 },
      { label: 'ก.ย.', user: totalUserPaid * 0.30, gov: totalGovSubsidized * 0.30 },
      { label: 'ต.ค.', user: totalUserPaid * 0.30, gov: totalGovSubsidized * 0.30 },
    ];
  }, [timePeriod, periodFilteredTxs, totalUserPaid, totalGovSubsidized]);

  const maxChartValue = Math.max(1, ...chartDays.map(d => d.user + d.gov));

  const handleTopup = async () => {
    if (topupAmount <= 0) return;
    try {
      await topupWallet(topupAmount);
      setTopupMsg(`เติมเงินสำเร็จ +฿${topupAmount.toLocaleString()} เข้ากระเป๋า`);
      setTimeout(() => {
        setShowTopupModal(false);
        setTopupMsg('');
      }, 1500);
    } catch {
      setTopupMsg('เติมเงินไม่สำเร็จ กรุณาลองใหม่');
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f6fc] text-[#14213d] pb-24 animate-fade-in flex flex-col">
      {/* 1. Header Bar with Back Button */}
      <header className="sticky top-0 z-30 bg-[#092252] text-white px-4 py-3.5 shadow-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="grid size-9 place-items-center rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-white cursor-pointer"
            aria-label="ย้อนกลับ"
          >
            <Icon name="chevron" className="size-5 rotate-180" />
          </button>
          <div>
            <h1 className="text-base font-extrabold tracking-tight">สรุปรายรับ - รายจ่าย</h1>
            <p className="text-[11px] text-blue-200">
              {currentUser?.name || (currentUser?.phone ? `คุณ (${currentUser.phone})` : 'ประชาชนผู้ใช้สิทธิ์')}
            </p>
          </div>
        </div>

        <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2.5 py-1 rounded-full">
          สิทธิ์ 60/40
        </span>
      </header>

      {/* 2. Time Period Pill Selector (สัปดาห์นี้ / เดือนนี้ / ทั้งหมด) */}
      <div className="px-4 pt-4">
        <div className="bg-[#e4ecf9] p-1 rounded-2xl flex items-center gap-1 shadow-inner">
          <button
            type="button"
            onClick={() => setTimePeriod('week')}
            className={`flex-1 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              timePeriod === 'week'
                ? 'bg-white text-[#092252] shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📅 รายสัปดาห์
          </button>
          <button
            type="button"
            onClick={() => setTimePeriod('month')}
            className={`flex-1 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              timePeriod === 'month'
                ? 'bg-white text-[#092252] shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🗓️ รายเดือน
          </button>
          <button
            type="button"
            onClick={() => setTimePeriod('all')}
            className={`flex-1 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              timePeriod === 'all'
                ? 'bg-white text-[#092252] shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🌐 ทั้งหมด
          </button>
        </div>
      </div>

      {/* 3. Luxury Executive Hero Card */}
      <div className="px-4 pt-3.5">
        <div className="rounded-[28px] bg-gradient-to-br from-[#071c47] via-[#0e3582] to-[#175ecf] p-5 text-white shadow-xl relative overflow-hidden">
          {/* Subtle Glows */}
          <div className="absolute -right-10 -bottom-10 size-40 rounded-full bg-blue-400/20 blur-2xl pointer-events-none" />
          <div className="absolute -left-10 -top-10 size-40 rounded-full bg-emerald-400/15 blur-2xl pointer-events-none" />

          <div className="flex items-center justify-between text-blue-200 text-xs mb-1">
            <span className="font-bold tracking-wider uppercase text-[10px] text-blue-300">
              {timePeriod === 'week' ? 'สัปดาห์นี้ (7 วันล่าสุด)' : timePeriod === 'month' ? 'ประจำเดือนตุลาคม 2569' : 'ประวัติทั้งหมดที่บันทึก'}
            </span>
            <span className="bg-white/15 backdrop-blur-xs px-2.5 py-0.5 rounded-full text-[10px] text-white font-mono font-bold">
              {periodFilteredTxs.length} ธุรกรรม
            </span>
          </div>

          <div className="flex items-baseline gap-1 my-2">
            <span className="text-sm font-bold text-blue-200">฿</span>
            <span className="text-3xl font-black tracking-tight font-mono">
              {totalSpent.toLocaleString()}
            </span>
            <span className="text-xs text-blue-200 font-medium ml-1.5">ยอดหมุนเวียนรวม</span>
          </div>

          {/* Savings Badge */}
          <div className="inline-flex items-center gap-1.5 bg-emerald-500/25 border border-emerald-400/30 px-3 py-1 rounded-xl text-emerald-300 text-xs font-bold mb-3">
            <span>🎉</span>
            <span>รัฐช่วยคุณประหยัดไปแล้ว ฿{totalGovSubsidized.toLocaleString()} (60%)</span>
          </div>

          {/* 60 / 40 Split Comparison Bar */}
          <div className="pt-3 border-t border-white/15 space-y-2">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-rose-200 flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-rose-400" />
                คุณจ่าย 40%: <strong>฿{totalUserPaid.toLocaleString()}</strong>
              </span>
              <span className="text-emerald-300 flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-emerald-400" />
                รัฐช่วย 60%: <strong>฿{totalGovSubsidized.toLocaleString()}</strong>
              </span>
            </div>

            <div className="w-full h-3 bg-black/30 rounded-full overflow-hidden flex p-0.5 shadow-inner">
              <div
                className="bg-gradient-to-r from-rose-500 to-rose-400 h-full rounded-l-full transition-all duration-700"
                style={{ width: `${totalSpent > 0 ? (totalUserPaid / totalSpent) * 100 : 40}%` }}
              />
              <div
                className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-full rounded-r-full transition-all duration-700"
                style={{ width: `${totalSpent > 0 ? (totalGovSubsidized / totalSpent) * 100 : 60}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4. Interactive Trend Bar Chart Section */}
      <div className="px-4 pt-3.5">
        <div className="bg-white rounded-[26px] p-4 border border-blue-50 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-slate-100">
            <div>
              <h3 className="text-xs font-extrabold text-slate-800">
                {timePeriod === 'week' ? '📊 สถิติการใช้จ่ายรายวัน' : timePeriod === 'month' ? '📊 สถิติการใช้จ่ายรายสัปดาห์' : '📊 สถิติการใช้จ่ายรายเดือน'}
              </h3>
              <p className="text-[10px] text-slate-400">เปรียบเทียบสัดส่วน 40% (ชมพู) / 60% (เขียว)</p>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-semibold">
              <span className="flex items-center gap-1 text-rose-600">
                <span className="size-2 bg-rose-500 rounded-sm" /> 40%
              </span>
              <span className="flex items-center gap-1 text-emerald-600">
                <span className="size-2 bg-emerald-500 rounded-sm" /> 60%
              </span>
            </div>
          </div>

          {/* Bars */}
          <div className="grid grid-cols-7 gap-1.5 h-32 items-end pt-2 pb-1 px-1">
            {chartDays.map((item, idx) => {
              const dayTotal = item.user + item.gov;
              const barHeightPercent = maxChartValue > 0 ? Math.max(12, (dayTotal / maxChartValue) * 100) : 12;
              const userShareHeight = dayTotal > 0 ? (item.user / dayTotal) * 100 : 40;

              return (
                <div key={idx} className="flex flex-col items-center h-full justify-end group">
                  <span className="text-[9px] font-mono text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity mb-1 font-bold">
                    ฿{Math.round(dayTotal)}
                  </span>
                  <div
                    className="w-full max-w-[28px] bg-slate-100 rounded-xl overflow-hidden flex flex-col-reverse shadow-xs transition-all duration-500 hover:scale-105"
                    style={{ height: `${barHeightPercent}%` }}
                  >
                    <div
                      className="bg-gradient-to-t from-rose-500 to-rose-400 w-full"
                      style={{ height: `${userShareHeight}%` }}
                    />
                    <div
                      className="bg-gradient-to-t from-emerald-500 to-emerald-400 w-full flex-1"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium mt-1.5 truncate">
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 5. 2x2 Financial Metric Grid */}
      <div className="px-4 pt-3.5 grid grid-cols-2 gap-3">
        {/* Card 1: User Paid (40%) */}
        <div className="rounded-[22px] bg-gradient-to-br from-rose-50 to-[#fff5f5] p-3.5 border border-rose-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-rose-800 bg-rose-100/70 px-2 py-0.5 rounded-lg">
              รายจ่ายของคุณ (40%)
            </span>
            <span className="text-base">💸</span>
          </div>
          <p className="text-xl font-black text-rose-600 font-mono">
            ฿ {totalUserPaid.toLocaleString()}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">เงินที่จ่ายจริงจากกระเป๋า</p>
        </div>

        {/* Card 2: Government Subsidized (60%) */}
        <div className="rounded-[22px] bg-gradient-to-br from-emerald-50 to-[#f0fdf4] p-3.5 border border-emerald-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-lg">
              รัฐช่วยจ่าย (60%)
            </span>
            <span className="text-base">🎁</span>
          </div>
          <p className="text-xl font-black text-emerald-600 font-mono">
            ฿ {totalGovSubsidized.toLocaleString()}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">เงินอุดหนุนที่ประหยัดได้</p>
        </div>

        {/* Card 3: Wallet Balance */}
        <div className="rounded-[22px] bg-white p-3.5 border border-blue-100 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-[#123b84] bg-blue-50 px-2 py-0.5 rounded-lg">
                เงินในกระเป๋าคงเหลือ
              </span>
              <span className="text-base">👛</span>
            </div>
            <p className="text-xl font-black text-[#123b84] font-mono">
              ฿ {wallet.balance.toLocaleString()}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowTopupModal(true)}
            className="mt-2 py-1 bg-[#1769ed] hover:bg-blue-700 text-white text-[11px] font-bold rounded-xl transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1"
          >
            <span>+ เติมเงิน</span>
          </button>
        </div>

        {/* Card 4: Grant Remaining */}
        <div className="rounded-[22px] bg-white p-3.5 border border-emerald-100 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-lg">
                สิทธิ์รัฐ 60% คงเหลือ
              </span>
              <span className="text-base">🏛️</span>
            </div>
            <p className="text-xl font-black text-emerald-600 font-mono">
              ฿ {userGrant.remainingAmount.toLocaleString()}
            </p>
          </div>
          <div className="mt-2">
            <div className="flex justify-between text-[9px] text-slate-400 mb-0.5">
              <span>ใช้ไป ฿{usedGrant.toLocaleString()}</span>
              <span>เต็ม ฿{userGrant.totalGrantAmount.toLocaleString()}</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-500 to-[#1769ed] h-full rounded-full"
                style={{ width: `${grantUsagePercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 6. Filter Pills for Transaction Table */}
      <div className="px-4 pt-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTypeFilter('all')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              typeFilter === 'all'
                ? 'bg-[#092252] text-white shadow-xs'
                : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/70'
            }`}
          >
            ทั้งหมด ({periodFilteredTxs.length})
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('user_paid')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              typeFilter === 'user_paid'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/70'
            }`}
          >
            รายจ่าย 40%
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('gov_subsidized')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              typeFilter === 'gov_subsidized'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/70'
            }`}
          >
            รัฐช่วย 60%
          </button>
        </div>
      </div>

      {/* 7. Detailed Transaction Ledger (Clickable to view e-Receipt) */}
      <div className="px-4 pt-3 flex-1 space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
            รายการบันทึกบัญชี ({displayedTxs.length} รายการ)
          </h2>
          <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-full">
            แตะรายการเพื่อดูใบเสร็จ
          </span>
        </div>

        {displayedTxs.length === 0 ? (
          <div className="py-14 text-center bg-white rounded-[26px] border border-dashed border-slate-200 p-6 space-y-2">
            <span className="text-4xl block">🧾</span>
            <p className="text-sm font-bold text-slate-700">ไม่มีรายการในช่วงเวลานี้</p>
            <p className="text-xs text-slate-400">
              เมื่อคุณใช้สิทธิ์ 60/40 ชำระเงิน รายการจะแสดงที่นี่แบบ Real-time
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {displayedTxs.map((tx) => (
              <div
                key={tx.txId}
                onClick={() => setSelectedTx(tx)}
                className="rounded-[22px] bg-white p-3.5 border border-slate-100 hover:border-blue-300 hover:shadow-md shadow-xs flex items-center justify-between gap-3 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-blue-50 text-[#1769ed] group-hover:bg-[#1769ed] group-hover:text-white transition-colors">
                    <Icon name="shop" className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold text-xs text-slate-800 truncate group-hover:text-[#1769ed] transition-colors">
                      {tx.merchantName}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                      {tx.txTimestamp}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-black text-sm text-slate-800 block font-mono">
                    ฿ {tx.totalAmount.toLocaleString()}
                  </span>
                  <div className="flex items-center gap-1 mt-1 justify-end">
                    <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                      จ่าย ฿{tx.userPaidAmount}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                      รัฐช่วย ฿{tx.govSubsidizedAmount}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 8. Electronic Receipt Modal (ใบเสร็จอิเล็กทรอนิกส์ 60/40) */}
      {selectedTx && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-[#07162d]/75 p-4 backdrop-blur-sm animate-fade-in"
          onClick={() => setSelectedTx(null)}
        >
          <div
            className="w-full max-w-[370px] rounded-[28px] bg-white p-6 shadow-2xl text-center space-y-4 relative overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Stamp / Watermark */}
            <div className="absolute -right-6 -bottom-6 size-32 rounded-full border-4 border-emerald-500/10 flex items-center justify-center rotate-12 pointer-events-none">
              <span className="text-[10px] font-black text-emerald-500/20 uppercase tracking-widest">
                VERIFIED 60/40
              </span>
            </div>

            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-left">
                <span className="grid size-8 place-items-center rounded-xl bg-[#1769ed] text-white font-extrabold text-xs">
                  ไทย
                </span>
                <div>
                  <h4 className="font-bold text-xs text-slate-800">ใบเสร็จรับเงินอิเล็กทรอนิกส์</h4>
                  <p className="text-[10px] text-slate-400">โครงการไทยช่วยไทยพลีส</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTx(null)}
                className="grid size-7 place-items-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 cursor-pointer"
              >
                <Icon name="x" className="size-3.5" />
              </button>
            </div>

            <div className="text-left space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">
                TX ID: #{selectedTx.txId} • {selectedTx.txTimestamp}
              </span>
              <p className="text-base font-extrabold text-slate-800">
                {selectedTx.merchantName}
              </p>
            </div>

            {/* Receipt Table */}
            <div className="bg-[#f8faff] rounded-2xl p-4 border border-blue-50 text-xs space-y-2.5 text-left">
              <div className="flex justify-between text-slate-600">
                <span>ยอดรวมค่าสินค้า</span>
                <strong className="text-slate-800 font-mono text-sm">฿ {selectedTx.totalAmount.toLocaleString()}</strong>
              </div>
              <div className="flex justify-between text-rose-600 pb-2 border-b border-slate-200/60">
                <span>หักเงินที่คุณจ่าย (40%)</span>
                <strong className="font-mono text-sm">- ฿ {selectedTx.userPaidAmount.toLocaleString()}</strong>
              </div>
              <div className="flex justify-between text-emerald-600 pt-1">
                <span>ภาครัฐร่วมจ่ายสมทบ (60%)</span>
                <strong className="font-mono text-sm">+ ฿ {selectedTx.govSubsidizedAmount.toLocaleString()}</strong>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold flex items-center justify-center gap-1.5 border border-emerald-100">
              <Icon name="check" className="size-4" />
              <span>ชำระเงินและรับแสตมป์ชุมชนสำเร็จแล้ว</span>
            </div>

            <button
              type="button"
              onClick={() => setSelectedTx(null)}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              ปิดใบเสร็จ
            </button>
          </div>
        </div>
      )}

      {/* 9. Top-up Modal */}
      {showTopupModal && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-[#07162d]/75 p-4 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowTopupModal(false)}
        >
          <div
            className="w-full max-w-[340px] rounded-[24px] bg-white p-5 shadow-2xl space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-800">เติมเงินเข้ากระเป๋า</h3>
              <button
                onClick={() => setShowTopupModal(false)}
                className="grid size-7 place-items-center rounded-full bg-slate-100 text-slate-500 cursor-pointer"
              >
                <Icon name="x" className="size-3.5" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2">
                {[100, 300, 500, 1000].map(amt => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setTopupAmount(amt)}
                    className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      topupAmount === amt
                        ? 'bg-[#1769ed] text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    ฿{amt}
                  </button>
                ))}
              </div>

              <input
                type="number"
                min="10"
                step="10"
                value={topupAmount}
                onChange={e => setTopupAmount(Math.max(1, Number(e.target.value)))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1769ed]"
                placeholder="ระบุจำนวนเงิน"
              />
            </div>

            {topupMsg && (
              <p className="text-xs text-center text-emerald-600 bg-emerald-50 p-2 rounded-xl border border-emerald-100">
                {topupMsg}
              </p>
            )}

            <button
              type="button"
              onClick={handleTopup}
              className="w-full py-2.5 bg-[#1769ed] hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              ยืนยันเติมเงิน ฿{topupAmount.toLocaleString()}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

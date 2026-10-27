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
  const [isTopupLoading, setIsTopupLoading] = useState<boolean>(false);
  const [copiedTxId, setCopiedTxId] = useState<boolean>(false);

  // 1. Filter transactions by Time Period
  const periodFilteredTxs = useMemo(() => {
    if (timePeriod === 'all') return transactions;

    const now = new Date('2026-10-27T00:00:00');
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
  const grantUsagePercent = Math.min(100, Math.max(0, (usedGrant / (userGrant.totalGrantAmount || 1)) * 100));

  // 3. Filter by 40% / 60%
  const displayedTxs = useMemo(() => {
    return periodFilteredTxs.filter(tx => {
      if (typeFilter === 'user_paid') return (tx.userPaidAmount || 0) > 0;
      if (typeFilter === 'gov_subsidized') return (tx.govSubsidizedAmount || 0) > 0;
      return true;
    });
  }, [periodFilteredTxs, typeFilter]);

  // 4. Bar chart distribution calculated 100% from actual transaction records
  const chartDays = useMemo(() => {
    if (timePeriod === 'week') {
      const days = [
        { label: 'จ.', fullLabel: 'วันจันทร์', dayIdx: 1, user: 0, gov: 0 },
        { label: 'อ.', fullLabel: 'วันอังคาร', dayIdx: 2, user: 0, gov: 0 },
        { label: 'พ.', fullLabel: 'วันพุธ', dayIdx: 3, user: 0, gov: 0 },
        { label: 'พฤ.', fullLabel: 'วันพฤหัสบดี', dayIdx: 4, user: 0, gov: 0 },
        { label: 'ศ.', fullLabel: 'วันศุกร์', dayIdx: 5, user: 0, gov: 0 },
        { label: 'ส.', fullLabel: 'วันเสาร์', dayIdx: 6, user: 0, gov: 0 },
        { label: 'อา.', fullLabel: 'วันอาทิตย์', dayIdx: 0, user: 0, gov: 0 },
      ];

      periodFilteredTxs.forEach(tx => {
        const d = new Date(tx.txTimestamp.replace(' ', 'T'));
        if (!isNaN(d.getTime())) {
          const dayIdx = d.getDay();
          const target = days.find(item => item.dayIdx === dayIdx);
          if (target) {
            target.user += Number(tx.userPaidAmount) || 0;
            target.gov += Number(tx.govSubsidizedAmount) || 0;
          }
        }
      });

      return days;
    }

    if (timePeriod === 'month') {
      const weeks = [
        { label: 'สัปดาห์ 1', fullLabel: 'วันที่ 1 - 7', user: 0, gov: 0 },
        { label: 'สัปดาห์ 2', fullLabel: 'วันที่ 8 - 14', user: 0, gov: 0 },
        { label: 'สัปดาห์ 3', fullLabel: 'วันที่ 15 - 21', user: 0, gov: 0 },
        { label: 'สัปดาห์ 4', fullLabel: 'วันที่ 22 - สิ้นเดือน', user: 0, gov: 0 },
      ];

      periodFilteredTxs.forEach(tx => {
        const d = new Date(tx.txTimestamp.replace(' ', 'T'));
        if (!isNaN(d.getTime())) {
          const dayOfMonth = d.getDate();
          const uPaid = Number(tx.userPaidAmount) || 0;
          const gPaid = Number(tx.govSubsidizedAmount) || 0;

          if (dayOfMonth <= 7) {
            weeks[0].user += uPaid;
            weeks[0].gov += gPaid;
          } else if (dayOfMonth <= 14) {
            weeks[1].user += uPaid;
            weeks[1].gov += gPaid;
          } else if (dayOfMonth <= 21) {
            weeks[2].user += uPaid;
            weeks[2].gov += gPaid;
          } else {
            weeks[3].user += uPaid;
            weeks[3].gov += gPaid;
          }
        }
      });

      return weeks;
    }

    // timePeriod === 'year'
    const months = [
      { label: 'ม.ค.', fullLabel: 'มกราคม', monthIdx: 0, user: 0, gov: 0 },
      { label: 'ก.พ.', fullLabel: 'กุมภาพันธ์', monthIdx: 1, user: 0, gov: 0 },
      { label: 'มี.ค.', fullLabel: 'มีนาคม', monthIdx: 2, user: 0, gov: 0 },
      { label: 'เม.ย.', fullLabel: 'เมษายน', monthIdx: 3, user: 0, gov: 0 },
      { label: 'พ.ค.', fullLabel: 'พฤษภาคม', monthIdx: 4, user: 0, gov: 0 },
      { label: 'มิ.ย.', fullLabel: 'มิถุนายน', monthIdx: 5, user: 0, gov: 0 },
      { label: 'ก.ค.', fullLabel: 'กรกฎาคม', monthIdx: 6, user: 0, gov: 0 },
      { label: 'ส.ค.', fullLabel: 'สิงหาคม', monthIdx: 7, user: 0, gov: 0 },
      { label: 'ก.ย.', fullLabel: 'กันยายน', monthIdx: 8, user: 0, gov: 0 },
      { label: 'ต.ค.', fullLabel: 'ตุลาคม', monthIdx: 9, user: 0, gov: 0 },
      { label: 'พ.ย.', fullLabel: 'พฤศจิกายน', monthIdx: 10, user: 0, gov: 0 },
      { label: 'ธ.ค.', fullLabel: 'ธันวาคม', monthIdx: 11, user: 0, gov: 0 },
    ];

    periodFilteredTxs.forEach(tx => {
      const d = new Date(tx.txTimestamp.replace(' ', 'T'));
      if (!isNaN(d.getTime())) {
        const mIdx = d.getMonth();
        if (months[mIdx]) {
          months[mIdx].user += Number(tx.userPaidAmount) || 0;
          months[mIdx].gov += Number(tx.govSubsidizedAmount) || 0;
        }
      }
    });

    // Only return relevant months (or last 4-6 months with data)
    const nowMonth = new Date().getMonth();
    return months.slice(Math.max(0, nowMonth - 3), nowMonth + 1);
  }, [timePeriod, periodFilteredTxs]);

  const maxChartValue = Math.max(1, ...chartDays.map(d => d.user + d.gov));

  const handleTopup = async () => {
    if (topupAmount <= 0) return;
    setIsTopupLoading(true);
    try {
      await topupWallet(topupAmount);
      setTopupMsg(`เติมเงินสำเร็จ +฿${topupAmount.toLocaleString()} เข้ากระเป๋า`);
      setTimeout(() => {
        setShowTopupModal(false);
        setTopupMsg('');
        setIsTopupLoading(false);
      }, 1400);
    } catch {
      setTopupMsg('เติมเงินไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
      setIsTopupLoading(false);
    }
  };

  const copyReceiptRef = (id: string | number) => {
    navigator.clipboard?.writeText(String(id));
    setCopiedTxId(true);
    setTimeout(() => setCopiedTxId(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f3f7fd] via-[#f7f9fd] to-[#f0f4fa] text-[#0f172a] pb-28 animate-fade-in flex flex-col antialiased">
      {/* 1. Glassmorphism Top Header Bar */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/80 border-b border-slate-200/60 px-4 py-3.5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex items-center justify-between transition-all">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="grid size-10 place-items-center rounded-2xl bg-slate-100/80 hover:bg-slate-200/80 active:scale-95 transition-all text-slate-700 cursor-pointer shadow-xs border border-slate-200/40"
            aria-label="ย้อนกลับหน้าหลัก"
          >
            <Icon name="chevron" className="size-5 rotate-180" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black tracking-tight text-slate-900">
                สรุปรายรับ - รายจ่าย
              </h1>
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              {currentUser?.name ? `คุณ ${currentUser.name}` : (currentUser?.phone ? `เบอร์ ${currentUser.phone}` : 'ประชาชนผู้ใช้สิทธิ์')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="px-3 py-1 rounded-full bg-gradient-to-r from-blue-600/10 to-indigo-600/10 border border-blue-500/20 text-blue-700 text-[11px] font-extrabold flex items-center gap-1.5 shadow-xs">
            <span className="size-1.5 rounded-full bg-blue-600" />
            <span>สิทธิ์ 60/40</span>
          </div>
        </div>
      </header>

      {/* 2. Sleek Segmented Period Selector */}
      <div className="px-4 pt-3.5">
        <div className="bg-slate-200/60 backdrop-blur-sm p-1 rounded-2xl flex items-center gap-1 border border-slate-300/40 shadow-inner">
          <button
            type="button"
            onClick={() => setTimePeriod('week')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
              timePeriod === 'week'
                ? 'bg-white text-blue-700 shadow-sm font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>📅</span>
            <span>รายสัปดาห์</span>
          </button>
          <button
            type="button"
            onClick={() => setTimePeriod('month')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
              timePeriod === 'month'
                ? 'bg-white text-blue-700 shadow-sm font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🗓️</span>
            <span>รายเดือน</span>
          </button>
          <button
            type="button"
            onClick={() => setTimePeriod('all')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
              timePeriod === 'all'
                ? 'bg-white text-blue-700 shadow-sm font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🌐</span>
            <span>ทั้งหมด</span>
          </button>
        </div>
      </div>

      {/* 3. Luxury Royal Executive Hero Card */}
      <div className="px-4 pt-3.5">
        <div className="rounded-[30px] bg-gradient-to-br from-[#061b40] via-[#092c6b] to-[#1453bf] p-5 text-white shadow-[0_16px_36px_rgba(7,28,71,0.28)] relative overflow-hidden border border-white/10">
          {/* Ambient Lighting Accents */}
          <div className="absolute -right-8 -bottom-8 size-44 rounded-full bg-cyan-400/20 blur-3xl pointer-events-none" />
          <div className="absolute -left-10 -top-10 size-44 rounded-full bg-emerald-400/20 blur-3xl pointer-events-none" />
          <div className="absolute right-1/3 top-0 size-32 rounded-full bg-blue-300/10 blur-2xl pointer-events-none" />

          {/* Card Top Pill & Header */}
          <div className="relative z-10 flex items-center justify-between text-blue-100 text-xs mb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              <span className="font-bold tracking-wide uppercase text-[10px] text-blue-200">
                {timePeriod === 'week' ? 'สัปดาห์นี้ (7 วันล่าสุด)' : timePeriod === 'month' ? 'ประจำเดือนตุลาคม 2569' : 'ประวัติทั้งหมดที่บันทึก'}
              </span>
            </div>
            <span className="bg-white/15 backdrop-blur-md px-3 py-1 rounded-full text-[10px] text-white font-mono font-bold border border-white/10 shadow-xs">
              {periodFilteredTxs.length} ธุรกรรม
            </span>
          </div>

          {/* Main Total Volume */}
          <div className="relative z-10 my-3">
            <span className="text-[11px] font-medium text-blue-200 block mb-0.5">ยอดหมุนเวียนรวมค่าสินค้า</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-cyan-300">฿</span>
              <span className="text-3xl sm:text-4xl font-black tracking-tight font-mono text-white drop-shadow-sm">
                {totalSpent.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Savings Celebration Badge */}
          <div className="relative z-10 inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500/25 to-teal-500/20 border border-emerald-400/40 px-3.5 py-1.5 rounded-2xl text-emerald-300 text-xs font-bold mb-4 shadow-sm backdrop-blur-md">
            <span className="text-sm">🎉</span>
            <span>รัฐช่วยคุณประหยัดไปแล้ว <strong>฿{totalGovSubsidized.toLocaleString()}</strong> (60%)</span>
          </div>

          {/* 60 / 40 Split Comparison Visualization Bar */}
          <div className="relative z-10 pt-3.5 border-t border-white/15 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-1.5 text-rose-200">
                <span className="size-2.5 rounded-full bg-rose-400 shadow-[0_0_6px_rgba(251,113,133,0.8)]" />
                <span className="font-medium text-[11px]">คุณจ่าย 40%:</span>
                <strong className="font-mono text-white text-xs">฿{totalUserPaid.toLocaleString()}</strong>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-300">
                <span className="size-2.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                <span className="font-medium text-[11px]">รัฐช่วย 60%:</span>
                <strong className="font-mono text-white text-xs">฿{totalGovSubsidized.toLocaleString()}</strong>
              </div>
            </div>

            <div className="w-full h-3.5 bg-black/35 rounded-full overflow-hidden flex p-0.5 shadow-inner border border-white/10">
              <div
                className="bg-gradient-to-r from-rose-500 to-rose-400 h-full rounded-l-full transition-all duration-700 shadow-sm"
                style={{ width: `${totalSpent > 0 ? Math.max(10, (totalUserPaid / totalSpent) * 100) : 40}%` }}
                title={`คุณจ่าย ฿${totalUserPaid.toLocaleString()}`}
              />
              <div
                className="bg-gradient-to-r from-emerald-400 to-teal-400 h-full rounded-r-full transition-all duration-700 shadow-sm"
                style={{ width: `${totalSpent > 0 ? Math.max(10, (totalGovSubsidized / totalSpent) * 100) : 60}%` }}
                title={`รัฐจ่าย ฿${totalGovSubsidized.toLocaleString()}`}
              />
            </div>

            <div className="flex justify-between text-[10px] text-blue-200/80 font-mono px-0.5">
              <span>สัดส่วน 40%</span>
              <span>สัดส่วน 60%</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Interactive Trend Bar Chart Section */}
      <div className="px-4 pt-3.5">
        <div className="bg-white rounded-[28px] p-4.5 border border-slate-100 shadow-[0_6px_24px_rgba(0,0,0,0.04)] space-y-3.5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base">📊</span>
                <h3 className="text-xs font-black text-slate-800">
                  {timePeriod === 'week' ? 'สถิติการใช้จ่ายรายวัน' : timePeriod === 'month' ? 'สถิติการใช้จ่ายรายสัปดาห์' : 'สถิติการใช้จ่ายรายเดือน'}
                </h3>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                เปรียบเทียบสัดส่วน 40% (เงินคุณ) / 60% (รัฐช่วย)
              </p>
            </div>
            <div className="flex items-center gap-2.5 text-[10px] font-bold">
              <span className="flex items-center gap-1 text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-100">
                <span className="size-2 bg-rose-500 rounded-full" /> 40%
              </span>
              <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                <span className="size-2 bg-emerald-500 rounded-full" /> 60%
              </span>
            </div>
          </div>

          {/* Interactive Chart Bars */}
          <div
            className="grid gap-2 h-40 items-end pt-5 pb-1 px-1"
            style={{ gridTemplateColumns: `repeat(${chartDays.length}, minmax(0, 1fr))` }}
          >
            {chartDays.map((item, idx) => {
              const dayTotal = item.user + item.gov;
              const hasData = dayTotal > 0;
              const barHeightPercent = maxChartValue > 0 && hasData
                ? Math.max(24, Math.round((dayTotal / maxChartValue) * 100))
                : 10;
              const userShareHeight = hasData ? (item.user / dayTotal) * 100 : 40;

              return (
                <div key={idx} className="flex flex-col items-center h-full justify-end group cursor-pointer relative">
                  {/* Floating Detailed Tooltip */}
                  <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none mb-2 text-center z-30 absolute bottom-full">
                    <div className="bg-slate-950/95 text-white p-2 rounded-xl shadow-xl border border-white/10 text-left whitespace-nowrap backdrop-blur-sm space-y-0.5">
                      <p className="text-[10px] font-bold text-amber-300 pb-0.5 border-b border-white/15">
                        {item.fullLabel || item.label}
                      </p>
                      <p className="text-xs font-black font-mono text-white">
                        ยอดรวม: ฿{Math.round(dayTotal).toLocaleString()}
                      </p>
                      {hasData && (
                        <div className="text-[9px] space-y-0.5 pt-0.5 font-medium">
                          <p className="text-rose-400">
                            • คุณจ่าย 40%: ฿{Math.round(item.user).toLocaleString()}
                          </p>
                          <p className="text-emerald-400">
                            • รัฐช่วย 60%: ฿{Math.round(item.gov).toLocaleString()}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Rounded Stacked Capsule */}
                  <div
                    className={`w-full max-w-[34px] rounded-2xl overflow-hidden flex flex-col-reverse shadow-xs transition-all duration-300 group-hover:scale-105 group-hover:shadow-md border ${
                      hasData
                        ? 'border-slate-200/80 bg-slate-100'
                        : 'border-slate-200/40 bg-slate-100/50'
                    }`}
                    style={{ height: `${barHeightPercent}%` }}
                  >
                    {hasData ? (
                      <>
                        <div
                          className="bg-gradient-to-t from-rose-500 to-rose-400 w-full transition-all duration-500"
                          style={{ height: `${userShareHeight}%` }}
                          title={`คุณจ่าย: ฿${item.user}`}
                        />
                        <div
                          className="bg-gradient-to-t from-emerald-500 to-emerald-400 w-full flex-1 transition-all duration-500"
                          title={`รัฐช่วย: ฿${item.gov}`}
                        />
                      </>
                    ) : (
                      <div className="w-full h-full bg-slate-200/60" />
                    )}
                  </div>

                  {/* Label */}
                  <span className={`text-[10px] font-bold mt-2 truncate transition-colors ${
                    hasData ? 'text-slate-700 group-hover:text-blue-600' : 'text-slate-400'
                  }`}>
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 5. 2x2 Financial Metric Cards Grid */}
      <div className="px-4 pt-3.5 grid grid-cols-2 gap-3">
        {/* Card 1: User Paid (40%) */}
        <div className="rounded-[24px] bg-gradient-to-br from-rose-50/90 via-[#fff8f8] to-[#fff1f2] p-4 border border-rose-200/70 shadow-[0_4px_16px_rgba(244,63,94,0.06)] relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black text-rose-800 bg-rose-100/80 px-2 py-0.5 rounded-xl border border-rose-200/50">
              รายจ่ายของคุณ (40%)
            </span>
            <span className="text-lg">💸</span>
          </div>
          <p className="text-xl font-black text-rose-600 font-mono tracking-tight">
            ฿ {totalUserPaid.toLocaleString()}
          </p>
          <p className="text-[10px] text-slate-500 mt-1 font-medium">เงินที่จ่ายจริงจากกระเป๋า</p>
        </div>

        {/* Card 2: Government Subsidized (60%) */}
        <div className="rounded-[24px] bg-gradient-to-br from-emerald-50/90 via-[#f7fef9] to-[#f0fdf4] p-4 border border-emerald-200/70 shadow-[0_4px_16px_rgba(16,185,129,0.06)] relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-xl border border-emerald-200/50">
              รัฐช่วยจ่าย (60%)
            </span>
            <span className="text-lg">🎁</span>
          </div>
          <p className="text-xl font-black text-emerald-600 font-mono tracking-tight">
            ฿ {totalGovSubsidized.toLocaleString()}
          </p>
          <p className="text-[10px] text-slate-500 mt-1 font-medium">สูงสุด ฿200/วัน (เงินอุดหนุนรัฐ)</p>
        </div>

        {/* Card 3: Wallet Balance with Quick Topup */}
        <div className="rounded-[24px] bg-white p-4 border border-blue-100/90 shadow-[0_4px_16px_rgba(37,99,235,0.05)] flex flex-col justify-between hover:shadow-md transition-all">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black text-blue-900 bg-blue-50 px-2 py-0.5 rounded-xl border border-blue-100">
                กระเป๋าเงินคงเหลือ
              </span>
              <span className="text-lg">👛</span>
            </div>
            <p className="text-xl font-black text-blue-950 font-mono tracking-tight">
              ฿ {Number(wallet?.balance || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowTopupModal(true)}
            className="mt-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-[11px] font-bold rounded-xl transition-all cursor-pointer shadow-xs active:scale-95 flex items-center justify-center gap-1.5"
          >
            <Icon name="plus" className="size-3.5" />
            <span>เติมเงินเข้ากระเป๋า</span>
          </button>
        </div>

        {/* Card 4: Grant Remaining */}
        <div className="rounded-[24px] bg-white p-4 border border-emerald-100/90 shadow-[0_4px_16px_rgba(16,185,129,0.05)] flex flex-col justify-between hover:shadow-md transition-all">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded-xl border border-emerald-100">
                สิทธิ์รัฐ 60% คงเหลือ
              </span>
              <span className="text-lg">🏛️</span>
            </div>
            <p className="text-xl font-black text-emerald-700 font-mono tracking-tight">
              ฿ {Number(userGrant?.remainingAmount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="mt-2.5">
            <div className="flex justify-between text-[9px] text-slate-500 font-bold mb-1">
              <span>สิทธิ์ 60% (สูงสุด ฿200/วัน)</span>
              <span>เต็ม ฿{(userGrant?.totalGrantAmount || 1000).toLocaleString()}</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden p-0.5">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${grantUsagePercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 6. Filter Pills for Transaction Table */}
      <div className="px-4 pt-4">
        <div className="flex items-center gap-1.5 bg-slate-200/50 p-1 rounded-2xl border border-slate-300/30">
          <button
            type="button"
            onClick={() => setTypeFilter('all')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              typeFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ทั้งหมด ({periodFilteredTxs.length})
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('user_paid')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              typeFilter === 'user_paid'
                ? 'bg-rose-600 text-white shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            รายจ่าย 40%
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('gov_subsidized')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              typeFilter === 'gov_subsidized'
                ? 'bg-emerald-600 text-white shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            รัฐช่วย 60%
          </button>
        </div>
      </div>

      {/* 7. Detailed Transaction Ledger */}
      <div className="px-4 pt-3 flex-1 space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <span>🧾</span>
            <span>บันทึกธุรกรรม ({displayedTxs.length} รายการ)</span>
          </h2>
          <span className="text-[10px] text-blue-700 font-bold bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-full">
            แตะเพื่อดูสลิปใบเสร็จ
          </span>
        </div>

        {displayedTxs.length === 0 ? (
          <div className="py-14 text-center bg-white rounded-[28px] border border-dashed border-slate-200 p-6 space-y-2.5 shadow-xs">
            <span className="text-4xl block animate-bounce">🧾</span>
            <p className="text-sm font-bold text-slate-800">ไม่มีรายการในช่วงเวลานี้</p>
            <p className="text-xs text-slate-400 max-w-[260px] mx-auto">
              เมื่อคุณใช้สิทธิ์ 60/40 ชำระเงิน รายการจะบันทึกและแสดงที่นี่แบบ Real-time ทันที
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {displayedTxs.map((tx) => (
              <div
                key={tx.txId}
                onClick={() => setSelectedTx(tx)}
                className="rounded-[24px] bg-white p-3.5 sm:p-4 border border-slate-100 hover:border-blue-300 hover:shadow-lg shadow-[0_4px_16px_rgba(0,0,0,0.03)] flex items-center justify-between gap-3 transition-all cursor-pointer group active:scale-[0.99]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600 group-hover:from-blue-600 group-hover:to-indigo-600 group-hover:text-white transition-all shadow-xs border border-blue-100/60">
                    <Icon name="shop" className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-extrabold text-xs text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                      {tx.merchantName}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400 font-mono">
                      <span>{tx.txTimestamp}</span>
                      <span>•</span>
                      <span>#{tx.txId}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-black text-sm text-slate-900 block font-mono">
                    ฿ {tx.totalAmount.toLocaleString()}
                  </span>
                  <div className="flex items-center gap-1 mt-1 justify-end">
                    <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-100">
                      จ่าย ฿{tx.userPaidAmount}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                      รัฐช่วย ฿{tx.govSubsidizedAmount}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 8. Electronic Slip Modal (ใบเสร็จรับเงินอิเล็กทรอนิกส์ 60/40) */}
      {selectedTx && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-[#051124]/80 p-4 backdrop-blur-md animate-fade-in"
          onClick={() => setSelectedTx(null)}
        >
          <div
            className="w-full max-w-[360px] rounded-[32px] bg-white p-6 shadow-2xl text-center space-y-4 relative overflow-hidden border border-slate-100"
            onClick={e => e.stopPropagation()}
          >
            {/* Stamp / Official Watermark */}
            <div className="absolute -right-8 -bottom-8 size-36 rounded-full border-4 border-emerald-500/10 flex items-center justify-center rotate-12 pointer-events-none">
              <span className="text-[10px] font-black text-emerald-500/20 uppercase tracking-widest">
                VERIFIED 60/40
              </span>
            </div>

            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-left">
                <span className="grid size-9 place-items-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-xs shadow-md shadow-blue-500/30">
                  ไทย
                </span>
                <div>
                  <h4 className="font-black text-xs text-slate-900">ใบเสร็จรับเงินอิเล็กทรอนิกส์</h4>
                  <p className="text-[10px] text-slate-400 font-medium">โครงการไทยช่วยไทยพลีส</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTx(null)}
                className="grid size-8 place-items-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 cursor-pointer transition-colors"
              >
                <Icon name="x" className="size-4" />
              </button>
            </div>

            {/* Store and Timestamp */}
            <div className="text-left space-y-1 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">
                  REF: #{selectedTx.txId}
                </span>
                <button
                  type="button"
                  onClick={() => copyReceiptRef(selectedTx.txId)}
                  className="text-[10px] text-blue-600 font-bold hover:underline cursor-pointer"
                >
                  {copiedTxId ? 'คัดลอกแล้ว ✓' : 'คัดลอกเลข'}
                </button>
              </div>
              <p className="text-base font-black text-slate-900">
                {selectedTx.merchantName}
              </p>
              <p className="text-[11px] text-slate-500 font-mono">
                📅 {selectedTx.txTimestamp}
              </p>
            </div>

            {/* Receipt Table Breakdown */}
            <div className="bg-[#f8faff] rounded-2xl p-4 border border-blue-100/70 text-xs space-y-2.5 text-left">
              <div className="flex justify-between text-slate-600">
                <span className="font-medium">ยอดรวมค่าสินค้า</span>
                <strong className="text-slate-900 font-mono text-sm font-black">
                  ฿ {selectedTx.totalAmount.toLocaleString()}
                </strong>
              </div>
              <div className="flex justify-between text-rose-600 pb-2 border-b border-slate-200/60">
                <span className="font-medium">หักเงินที่คุณจ่าย (40%)</span>
                <strong className="font-mono text-sm font-black">
                  - ฿ {selectedTx.userPaidAmount.toLocaleString()}
                </strong>
              </div>
              <div className="flex justify-between text-emerald-700 pt-0.5">
                <span className="font-bold flex items-center gap-1">
                  <span>🏛️</span>
                  <span>ภาครัฐร่วมจ่ายสมทบ (60%)</span>
                </span>
                <strong className="font-mono text-sm font-black text-emerald-600">
                  + ฿ {selectedTx.govSubsidizedAmount.toLocaleString()}
                </strong>
              </div>
            </div>

            {/* Success Stamp Pill */}
            <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 text-xs font-bold flex items-center justify-center gap-2 border border-emerald-200/60">
              <Icon name="check" className="size-4" />
              <span>ชำระเงินและรับแสตมป์ชุมชนสำเร็จแล้ว</span>
            </div>

            <button
              type="button"
              onClick={() => setSelectedTx(null)}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-md"
            >
              ปิดใบเสร็จ
            </button>
          </div>
        </div>
      )}

      {/* 9. Top-up Modal */}
      {showTopupModal && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-[#051124]/80 p-4 backdrop-blur-md animate-fade-in"
          onClick={() => setShowTopupModal(false)}
        >
          <div
            className="w-full max-w-[340px] rounded-[30px] bg-white p-5 shadow-2xl space-y-4 border border-slate-100"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="grid size-8 place-items-center rounded-xl bg-blue-50 text-blue-600">
                  <Icon name="wallet" className="size-4" />
                </span>
                <h3 className="font-black text-sm text-slate-900">เติมเงินเข้ากระเป๋า</h3>
              </div>
              <button
                onClick={() => setShowTopupModal(false)}
                className="grid size-7 place-items-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 cursor-pointer transition-colors"
              >
                <Icon name="x" className="size-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              <span className="text-[11px] text-slate-500 font-bold block">เลือกจำนวนเงินด่วน:</span>
              <div className="grid grid-cols-3 gap-2">
                {[100, 300, 500, 1000, 2000].map(amt => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setTopupAmount(amt)}
                    className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      topupAmount === amt
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 font-black'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    ฿{amt}
                  </button>
                ))}
              </div>

              <div>
                <label className="text-[11px] text-slate-500 font-bold block mb-1">
                  หรือระบุจำนวนเงินเอง:
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">฿</span>
                  <input
                    type="number"
                    min="10"
                    step="10"
                    value={topupAmount}
                    onChange={e => setTopupAmount(Math.max(1, Number(e.target.value)))}
                    className="w-full pl-8 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono"
                    placeholder="ระบุจำนวนเงิน"
                  />
                </div>
              </div>
            </div>

            {topupMsg && (
              <p className="text-xs text-center text-emerald-700 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 font-bold">
                {topupMsg}
              </p>
            )}

            <button
              type="button"
              disabled={isTopupLoading}
              onClick={handleTopup}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl text-xs font-bold shadow-lg shadow-blue-500/25 transition-all cursor-pointer disabled:opacity-50"
            >
              {isTopupLoading ? 'กำลังทำรายการ…' : `ยืนยันเติมเงิน ฿${topupAmount.toLocaleString()}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

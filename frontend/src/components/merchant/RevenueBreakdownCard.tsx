import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Icon } from '../common/Icon';
import { SalesTransaction } from '../../types';

interface RevenueBreakdownCardProps {
  className?: string;
  initialPeriod?: 'today' | '7days' | 'month' | 'all';
}

type PeriodType = 'today' | '7days' | 'month' | 'all';

export const RevenueBreakdownCard: React.FC<RevenueBreakdownCardProps> = ({
  className = '',
  initialPeriod = 'today'
}) => {
  const { currentMerchant, transactions } = useApp();
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>(initialPeriod);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => new Date().toISOString().slice(0, 7));
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTxForReceipt, setSelectedTxForReceipt] = useState<SalesTransaction | null>(null);

  // Filter transactions for current merchant
  const merchantTransactions = useMemo(() => {
    return transactions.filter(t => t.merchantId === currentMerchant?.mchId);
  }, [transactions, currentMerchant?.mchId]);

  const referenceDate = new Date();

  // Available unique months from transaction history
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    merchantTransactions.forEach(t => {
      const mKey = t.txTimestamp.substring(0, 7); // e.g. "2026-10"
      if (mKey) monthsSet.add(mKey);
    });

    if (monthsSet.size === 0) monthsSet.add(new Date().toISOString().slice(0, 7));

    const thaiMonths = [
      '',
      'มกราคม',
      'กุมภาพันธ์',
      'มีนาคม',
      'เมษายน',
      'พฤษภาคม',
      'มิถุนายน',
      'กรกฎาคม',
      'สิงหาคม',
      'กันยายน',
      'ตุลาคม',
      'พฤศจิกายน',
      'ธันวาคม'
    ];

    return Array.from(monthsSet)
      .sort((a, b) => b.localeCompare(a))
      .map(mKey => {
        const [year, month] = mKey.split('-');
        const thaiYear = parseInt(year, 10) + 543;
        const thaiMonthName = `${thaiMonths[parseInt(month, 10)] || month} ${thaiYear}`;
        return {
          key: mKey,
          label: thaiMonthName
        };
      });
  }, [merchantTransactions]);

  // Filter transactions based on selected period or month
  const filteredTransactions = useMemo(() => {
    return merchantTransactions.filter(t => {
      const txDate = new Date(t.txTimestamp.replace(' ', 'T'));
      const diffMs = referenceDate.getTime() - txDate.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      if (selectedPeriod === 'today') {
        return txDate.toDateString() === referenceDate.toDateString();
      }
      if (selectedPeriod === '7days') {
        return diffDays >= 0 && diffDays <= 7;
      }
      if (selectedPeriod === 'month') {
        if (selectedMonth === 'all') return true;
        return t.txTimestamp.startsWith(selectedMonth);
      }
      return true; // 'all'
    });
  }, [merchantTransactions, selectedPeriod, selectedMonth]);

  // Calculate KPIs for the active filtered period
  const kpiData = useMemo(() => {
    const totalRev = filteredTransactions.reduce((acc, t) => acc + t.totalAmount, 0);
    const qrPaid = filteredTransactions.reduce((acc, t) => acc + t.userPaidAmount, 0);
    const govSub = filteredTransactions.reduce((acc, t) => acc + t.govSubsidizedAmount, 0);
    const totalBills = filteredTransactions.length;
    const avgPerBill = totalBills > 0 ? Math.round(totalRev / totalBills) : 0;

    return {
      totalRevenue: totalRev,
      customerPaid40: qrPaid,
      governmentSubsidy60: govSub,
      totalBills,
      avgPerBill
    };
  }, [filteredTransactions]);

  // Text label for active period
  const currentMonthLabel = availableMonths.find(m => m.key === selectedMonth)?.label || 'ประจำเดือน';
  const periodLabelMap: Record<PeriodType, string> = {
    today: 'วันนี้',
    '7days': '7 วันย้อนหลัง',
    month: selectedMonth === 'all' ? 'ทุกเดือน' : `ประจำเดือน ${currentMonthLabel}`,
    all: 'ยอดรวมสะสมทุกช่วงเวลา'
  };

  // Search filtered bills
  const searchedTransactions = useMemo(() => {
    if (!searchQuery.trim()) return filteredTransactions;
    const q = searchQuery.toLowerCase();
    return filteredTransactions.filter(
      t =>
        t.userName.toLowerCase().includes(q) ||
        t.txId.toString().includes(q) ||
        (t.note && t.note.toLowerCase().includes(q))
    );
  }, [filteredTransactions, searchQuery]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* ======================================================== */}
      {/* 🌟 MAIN CARD: REVENUE BREAKDOWN KPIS ตามช่วงเวลา           */}
      {/* ======================================================== */}
      <div className="rounded-[24px] bg-white p-4.5 shadow-[0_12px_36px_rgba(17,94,89,.12)] border border-teal-100/90 relative overflow-hidden">
        {/* Decorative background aura */}
        <div className="absolute -top-12 -right-12 size-40 rounded-full bg-teal-500/5 blur-2xl pointer-events-none" />

        {/* Top Header of the KPI Card */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-[#115e59] text-white shadow-xs">
              <Icon name="wallet" className="size-4.5" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <span>สรุปยอดรายได้ตามช่วงเวลา</span>
                <span className="text-[10px] bg-teal-50 text-[#115e59] border border-teal-200/80 px-2 py-0.2 rounded-full font-bold">
                  สิทธิ์ 60/40
                </span>
              </h2>
              <p className="text-[10px] text-slate-400">
                ระบบคำนวณสัดส่วน 60/40 และเงินสมทบพร้อมเพย์แบบเรียลไทม์
              </p>
            </div>
          </div>

          {/* Quick print summary button */}
          <button
            onClick={() => {
              window.print();
            }}
            className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 border border-slate-200 text-[11px] font-medium transition-colors flex items-center gap-1"
            title="พิมพ์ / ส่งออกสรุปรายงาน"
          >
            <span>🖨️</span>
            <span className="hidden sm:inline">พิมพ์รายงาน</span>
          </button>
        </div>

        {/* ---------------------------------------------------- */}
        {/* 🗓️ TIME PERIOD SELECTOR & MONTHLY FILTER (ตัวกรองรายเดือน) */}
        {/* ---------------------------------------------------- */}
        <div className="pt-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
              <span>📅</span>
              <span>เลือกช่วงเวลา / ตัวกรอง:</span>
            </span>
            <span className="text-[10px] text-teal-800 font-semibold bg-[#e6fffa] px-2 py-0.5 rounded-md truncate max-w-[190px]">
              {periodLabelMap[selectedPeriod]}
            </span>
          </div>

          {/* Horizontal Scrolling Pill Buttons */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            <button
              onClick={() => setSelectedPeriod('today')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                selectedPeriod === 'today'
                  ? 'bg-[#115e59] text-white shadow-sm shadow-teal-900/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              วันนี้
            </button>
            <button
              onClick={() => setSelectedPeriod('7days')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                selectedPeriod === '7days'
                  ? 'bg-[#115e59] text-white shadow-sm shadow-teal-900/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              7 วันล่าสุด
            </button>
            <button
              onClick={() => setSelectedPeriod('month')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1 ${
                selectedPeriod === 'month'
                  ? 'bg-[#115e59] text-white shadow-sm shadow-teal-900/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>🗓️ รายเดือน</span>
            </button>
            <button
              onClick={() => setSelectedPeriod('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                selectedPeriod === 'all'
                  ? 'bg-[#115e59] text-white shadow-sm shadow-teal-900/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              ทั้งหมด
            </button>
          </div>

          {/* DEDICATED MONTHLY FILTER BAR (ตัวกรองรายเดือน) */}
          {selectedPeriod === 'month' && (
            <div className="p-2.5 rounded-xl bg-teal-50/80 border border-teal-200/80 animate-in fade-in space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[11px] font-bold text-[#115e59] flex items-center gap-1">
                  <span>🔎</span>
                  <span>เลือกเดือนที่ต้องการสรุปยอด:</span>
                </span>
                <span className="text-[10px] text-teal-700 font-semibold">
                  {kpiData.totalBills} บิลในเดือนนี้
                </span>
              </div>

              {/* Month selector pills */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
                {availableMonths.map(m => (
                  <button
                    key={m.key}
                    onClick={() => setSelectedMonth(m.key)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition-all cursor-pointer ${
                      selectedMonth === m.key
                        ? 'bg-[#115e59] text-white shadow-xs'
                        : 'bg-white text-slate-700 hover:bg-teal-100 border border-teal-200/60'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
                <button
                  onClick={() => setSelectedMonth('all')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition-all cursor-pointer ${
                    selectedMonth === 'all'
                      ? 'bg-[#115e59] text-white shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-teal-100 border border-teal-200/60'
                  }`}
                >
                  ทุกเดือนรวมกัน
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ---------------------------------------------------- */}
        {/* 🎯 THE 4 CORE REVENUE BREAKDOWN KPIS                 */}
        {/* ---------------------------------------------------- */}
        <div className="mt-3.5 space-y-2.5">
          {/* KPI 1: ยอดรวมทั้งสิ้น (Total Revenue) */}
          <div className="rounded-2xl bg-gradient-to-r from-[#042f2e] to-[#115e59] p-4 text-white shadow-sm relative overflow-hidden">
            <div className="absolute right-2 -bottom-2 opacity-10 text-6xl font-black">฿</div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-medium text-teal-100 flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                  ยอดรวมทั้งสิ้น (Total Revenue)
                </span>
                <p className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight font-mono text-white">
                  ฿ {kpiData.totalRevenue.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="text-right">
                <span className="bg-white/20 text-teal-50 px-2.5 py-1 rounded-lg text-[10px] font-bold backdrop-blur-xs border border-white/20 block mb-1">
                  สิทธิ์โครงการ 60/40
                </span>
                <span className="text-[10px] text-teal-200">
                  เฉลี่ย ฿{kpiData.avgPerBill.toLocaleString()} / บิล
                </span>
              </div>
            </div>
          </div>

          {/* 60% vs 40% Split Breakdown Row */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* KPI 2: ส่วนที่ลูกค้าชำระผ่าน QR  */}
            <div className="rounded-2xl bg-gradient-to-b from-blue-50/90 to-sky-50/50 p-3.5 border border-blue-200/80 shadow-xs relative">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="grid size-6 place-items-center rounded-lg bg-blue-600 text-white shadow-xs">
                    <Icon name="qr" className="size-3.5" />
                  </span>
                  <span className="text-[11px] font-bold text-blue-950">
                    ลูกค้าชำระ QR
                  </span>
                </div>
                <span className="text-[9px] font-extrabold bg-blue-600 text-white px-1.5 py-0.5 rounded-md">
                  ยอดจริง
                </span>
              </div>

              <p className="text-lg font-extrabold text-blue-900 font-mono mt-1.5">
                  ฿ {kpiData.customerPaid40.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
              </p>
              <div className="mt-1.5 pt-1.5 border-t border-blue-200/60 flex items-center justify-between text-[10px] text-blue-700">
                <span>Thai QR ชุมชน</span>
                <span className="font-semibold text-emerald-700 flex items-center gap-0.5">
                  <span>✓</span> รับเงินทันที
                </span>
              </div>
            </div>

            {/* KPI 3: เงินสมทบจากภาครัฐโอนเข้าพร้อมเพย์  */}
            <div className="rounded-2xl bg-gradient-to-b from-emerald-50/90 to-teal-50/50 p-3.5 border border-emerald-200/80 shadow-xs relative">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="grid size-6 place-items-center rounded-lg bg-emerald-600 text-white shadow-xs">
                    <Icon name="shield" className="size-3.5" />
                  </span>
                  <span className="text-[11px] font-bold text-emerald-950">
                    รัฐโอนสมทบ
                  </span>
                </div>
                <span className="text-[9px] font-extrabold bg-emerald-600 text-white px-1.5 py-0.5 rounded-md">
                  ยอดจริง
                </span>
              </div>

              <p className="text-lg font-extrabold text-emerald-900 font-mono mt-1.5">
                  ฿ {kpiData.governmentSubsidy60.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
              </p>
              <div className="mt-1.5 pt-1.5 border-t border-emerald-200/60 flex items-center justify-between text-[10px] text-emerald-800">
                <span>เข้าพร้อมเพย์</span>
                <span className="font-semibold text-emerald-700 flex items-center gap-0.5">
                  <span>✓</span> สำเร็จ 100%
                </span>
              </div>
            </div>
          </div>

          {/* KPI 4: จำนวนบิลทั้งหมด (Total Bills) */}
          <div className="rounded-2xl bg-slate-50 p-3 border border-slate-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-xl bg-slate-800 text-white shadow-xs">
                <Icon name="history" className="size-4" />
              </span>
              <div>
                <p className="text-[11px] font-bold text-slate-800">
                  จำนวนบิลทั้งหมดในช่วงเวลา
                </p>
                <p className="text-[10px] text-slate-500">
                  ยอดเฉลี่ย ฿{kpiData.avgPerBill.toLocaleString()} บาท/รายการ
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xl font-black text-slate-900 font-mono">
                {kpiData.totalBills}
              </span>
              <span className="text-xs font-bold text-slate-500 ml-1">บิล</span>
            </div>
          </div>

          {/* PromptPay Destination Info Banner */}
          <div className="rounded-xl bg-[#f0fdfa] p-2.5 border border-teal-200 flex items-center justify-between text-[11px] text-teal-900">
            <div className="flex items-center gap-1.5">
              <span>💳</span>
              <span>
                บัญชีพร้อมเพย์ร้านค้า:&nbsp;
                <strong className="font-mono text-[#115e59]">
                  {currentMerchant?.promptpayId || '0892234455'}
                </strong>
              </span>
            </div>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
              ✓ ผูกระบบภาครัฐแล้ว
            </span>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 🧾 รายการบิลในช่วงเวลาที่เลือก (TRANSACTION BILLS LOG)     */}
      {/* ======================================================== */}
      <div className="rounded-[24px] bg-white p-4.5 shadow-sm border border-teal-100/80 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <span>🧾</span>
              <span>รายการบิลทั้งหมดในช่วงเวลา ({filteredTransactions.length} บิล)</span>
            </h3>
            <p className="text-[10px] text-slate-400">
              แตะที่รายการเพื่อดูใบเสร็จรับเงินดิจิทัล & สลิปพร้อมเพย์ 60/40
            </p>
          </div>
        </div>

        {/* Search input */}
        <div className="relative">
          <input
            type="text"
            placeholder="ค้นหาชื่อลูกค้า, เลขบิล หรือรายการ..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#115e59]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* List of bills */}
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {searchedTransactions.length > 0 ? (
            searchedTransactions.map(tx => (
              <div
                key={tx.txId}
                onClick={() => setSelectedTxForReceipt(tx)}
                className="rounded-2xl p-3 bg-slate-50 hover:bg-teal-50/50 border border-slate-200/80 hover:border-teal-300 transition-all cursor-pointer flex items-center justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-800 truncate">
                      {tx.userName}
                    </span>
                    <span className="text-[9px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-mono">
                      #{tx.txId}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">{tx.txTimestamp}</p>
                  <div className="flex items-center gap-2 mt-1 text-[10px]">
                    <span className="text-blue-700 font-medium">
                      ลูกค้า QR: ฿{tx.userPaidAmount}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-emerald-700 font-medium">
                      รัฐสมทบ: ฿{tx.govSubsidizedAmount}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0 pl-2">
                  <span className="font-extrabold text-sm text-[#115e59] font-mono block">
                    +฿{tx.totalAmount.toLocaleString()}
                  </span>
                  <span className="text-[9px] text-teal-700 font-bold bg-teal-50 px-2 py-0.5 rounded-full inline-block mt-0.5">
                    ดูใบเสร็จ 🔍
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="py-6 text-center text-xs text-slate-400">
              ไม่พบบิลการขายในช่วงเวลานี้
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 📄 DIGITAL RECEIPT MODAL (ใบเสร็จรับเงิน & สลิปพร้อมเพย์) */}
      {/* ======================================================== */}
      {selectedTxForReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-[28px] bg-white p-5 shadow-2xl border border-slate-200 space-y-4">
            {/* Slip Header */}
            <div className="text-center pb-3 border-b border-dashed border-slate-300">
              <span className="inline-block size-10 place-items-center rounded-2xl bg-[#115e59] text-white p-2 mb-1 shadow-sm">
                <Icon name="shield" className="size-6 text-white mx-auto" />
              </span>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                ใบเสร็จรับเงินดิจิทัล & บันทึกสิทธิ์ 60/40
              </h4>
              <p className="text-[10px] text-slate-400">โครงการไทยช่วยไทยพลีส • aipass.go.th</p>
            </div>

            {/* Slip Information */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>รหัสรายการ (TxID):</span>
                <strong className="font-mono text-slate-800">#{selectedTxForReceipt.txId}</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>ร้านค้า:</span>
                <strong className="text-[#115e59]">{currentMerchant?.shopName}</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>ผู้ชำระเงิน (ประชาชน):</span>
                <strong className="text-slate-800">{selectedTxForReceipt.userName}</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>วันเวลาที่ชำระ:</span>
                <span className="font-mono text-slate-700">{selectedTxForReceipt.txTimestamp}</span>
              </div>
              {selectedTxForReceipt.note && (
                <div className="flex justify-between text-slate-600">
                  <span>บันทึกช่วยจำ:</span>
                  <span className="text-slate-800 italic">{selectedTxForReceipt.note}</span>
                </div>
              )}
            </div>

            {/* Financial Details Box */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-600">
                <span>ยอดรวมทั้งสิ้น (100%):</span>
                <strong className="text-base text-slate-900 font-mono">
                  ฿ {selectedTxForReceipt.totalAmount.toFixed(2)}
                </strong>
              </div>
              <div className="flex justify-between text-blue-700 pt-1 border-t border-slate-200">
                <span>ลูกค้าชำระผ่าน QR :</span>
                <strong className="font-mono">฿ {selectedTxForReceipt.userPaidAmount.toFixed(2)}</strong>
              </div>
              <div className="flex justify-between text-emerald-700">
                <span>รัฐบาลโอนสมทบพร้อมเพย์ :</span>
                <strong className="font-mono">
                  ฿ {selectedTxForReceipt.govSubsidizedAmount.toFixed(2)}
                </strong>
              </div>
              <div className="pt-2 border-t border-slate-200 text-[10px] text-emerald-800 flex justify-between items-center">
                <span>สถานะโอนเงินเข้าบัญชีพร้อมเพย์:</span>
                <span className="font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                  ✓ สำเร็จแล้ว
                </span>
              </div>
            </div>

            {/* PromptPay Reference */}
            <div className="text-[10px] text-slate-400 text-center font-mono">
              PromptPay Ref: PROMPT-{selectedTxForReceipt.txId}-THAI-GOV
            </div>

            {/* Close Button */}
            <button
              onClick={() => setSelectedTxForReceipt(null)}
              className="w-full py-2.5 bg-[#115e59] hover:bg-[#0f766e] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-sm"
            >
              ปิดหน้าต่างใบเสร็จ
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Icon } from '../common/Icon';
import { QRGeneratorModal } from './QRGeneratorModal';
import { merchantService, ApiMerchantWallet } from '../../services/merchantService';
import { authStorage } from '../../services/api';
import { SalesTransaction } from '../../types';

interface MerchantWalletViewProps {
  onBack?: () => void;
  onOpenRevenue?: () => void;
}

export const MerchantWalletView: React.FC<MerchantWalletViewProps> = ({
  onBack,
  onOpenRevenue
}) => {
  const {
    currentMerchant,
    transactions,
    refreshMerchantData,
    withdrawMerchantWallet
  } = useApp();

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawDestination, setWithdrawDestination] = useState(currentMerchant?.phone || '');
  const [withdrawSubmitting, setWithdrawSubmitting] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState<string | null>(null);
  const [selectedTxForDetail, setSelectedTxForDetail] = useState<SalesTransaction | null>(null);

  // Tab filter for ledger: 'all' | 'inflow' | 'outflow'
  const [ledgerFilter, setLedgerFilter] = useState<'all' | 'inflow' | 'outflow'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Real wallet details from API
  const [apiWallet, setApiWallet] = useState<ApiMerchantWallet | null>(null);
  const [apiSummary, setApiSummary] = useState<{
    totalRevenue: number;
    totalBills: number;
    userPaidTotal: number;
    govSubsidizedTotal: number;
  } | null>(null);

  const fetchWalletData = async () => {
    if (!authStorage.getToken()) return;
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await merchantService.getWallet();
      setApiWallet(res.wallet);
      setApiSummary(res.summary);
    } catch (err) {
      console.error('Failed to fetch merchant wallet:', err);
      setErrorMsg(err instanceof Error ? err.message : 'ไม่สามารถดึงข้อมูลกระเป๋าเงินได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWalletData();
  }, [currentMerchant?.mchId]);

  const handleManualRefresh = async () => {
    try {
      setRefreshing(true);
      await Promise.all([
        refreshMerchantData(),
        fetchWalletData()
      ]);
      setSuccessMsg('อัปเดตข้อมูลกระเป๋าเงินเรียบร้อยแล้ว');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'รีเฟรชข้อมูลไม่สำเร็จ');
    } finally {
      setRefreshing(false);
    }
  };

  // Compute live wallet values: prefer API wallet, fall back to currentMerchant
  const currentBalance = apiWallet ? Number(apiWallet.Balance) : (currentMerchant?.walletBalance ?? 0);
  const walletId = apiWallet?.Wallet_ID || currentMerchant?.wallet?.walletId || (currentMerchant?.mchId ? 1000 + currentMerchant.mchId : 101);
  const walletStatus = apiWallet?.Status || currentMerchant?.wallet?.status || 'ACTIVE';
  const lastUpdated = apiWallet?.Updated_At
    ? new Date(apiWallet.Updated_At).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })
    : new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';

  // Merchant transactions
  const merchantSales = useMemo(() => {
    return transactions.filter(t => t.merchantId === currentMerchant?.mchId);
  }, [transactions, currentMerchant?.mchId]);

  const totalRevenue = apiSummary?.totalRevenue ?? merchantSales.reduce((acc, t) => acc + t.totalAmount, 0);
  const userPaidTotal = apiSummary?.userPaidTotal ?? merchantSales.reduce((acc, t) => acc + t.userPaidAmount, 0);
  const govSubsidizedTotal = apiSummary?.govSubsidizedTotal ?? merchantSales.reduce((acc, t) => acc + t.govSubsidizedAmount, 0);
  const totalBills = apiSummary?.totalBills ?? merchantSales.length;

  // Filtered transactions for the ledger
  const filteredLedger = useMemo(() => {
    let list = [...merchantSales];
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(t =>
        t.userName.toLowerCase().includes(q) ||
        String(t.txId).includes(q) ||
        (t.note && t.note.toLowerCase().includes(q))
      );
    }
    return list;
  }, [merchantSales, searchTerm]);

  // Handle Withdrawal Submit
  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(withdrawAmount);
    if (!amountNum || amountNum <= 0) {
      alert('กรุณากรอกจำนวนเงินที่ต้องการถอนให้ถูกต้อง');
      return;
    }
    if (amountNum > currentBalance) {
      alert(`ยอดเงินในกระเป๋าไม่เพียงพอ (มีอยู่ ฿${currentBalance.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท)`);
      return;
    }

    try {
      setWithdrawSubmitting(true);
      const res = await withdrawMerchantWallet(amountNum, withdrawDestination);
      if (res.success) {
        setWithdrawSuccess(res.message);
        setWithdrawAmount('');
        await fetchWalletData();
        setTimeout(() => {
          setWithdrawSuccess(null);
          setWithdrawModalOpen(false);
        }, 2000);
      } else {
        alert(res.message);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการถอนเงิน');
    } finally {
      setWithdrawSubmitting(false);
    }
  };

  return (
    <div className="pb-28 animate-in fade-in duration-200">
      {/* Top Header - Theme เขียวหัวเป็ด (Pine Teal / Thai Tung Ngern Green) */}
      <header className="relative overflow-hidden bg-gradient-to-br from-[#042f2e] via-[#115e59] to-[#0d9488] px-5 pb-10 pt-5 text-white shadow-md">
        <div className="absolute -right-10 -top-14 size-44 rounded-full border-[24px] border-white/10 pointer-events-none" />

        {/* Top Back Action Bar */}
        <div className="relative flex items-center justify-between mb-4">
          {onBack ? (
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-bold text-white transition-colors cursor-pointer backdrop-blur-xs"
            >
              <span>←</span>
              <span>กลับหน้าหลัก</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-lg bg-white/20 text-teal-100">
                <Icon name="wallet" className="size-4" />
              </span>
              <span className="text-xs font-bold text-teal-100">ถุงเงินร้านค้าดิจิทัล</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[11px] font-semibold backdrop-blur text-teal-100 border border-white/20">
            <span className="size-2 rounded-full bg-emerald-300 animate-pulse" />
            <span>กระเป๋าเงินพร้อมใช้งาน</span>
          </div>
        </div>

        {/* Title and Store Info */}
        <div className="relative flex items-center gap-3">
          <div className="grid size-12 place-items-center rounded-2xl bg-white text-xl font-extrabold text-[#115e59] shadow-lg shrink-0">
            👛
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-medium tracking-[.16em] text-teal-100 uppercase">
                MERCHANT WALLET
              </p>
              <span className="text-[9px] bg-teal-800/60 px-1.5 py-0.5 rounded text-teal-200 font-mono">
                #{walletId}
              </span>
            </div>
            <h1 className="text-xl font-bold tracking-tight truncate">
              ถุงเงินร้านค้าไทยช่วยไทย
            </h1>
            <p className="text-xs text-teal-100 mt-0.5 truncate">
              {currentMerchant?.shopName || 'ร้านค้าชุมชน'} ({currentMerchant?.ownerName})
            </p>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="-mt-6 px-4 space-y-4">
        {/* Notice banners */}
        {errorMsg && (
          <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-rose-600 font-bold">⚠️</span>
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg('')} className="text-rose-500 hover:text-rose-700 text-sm font-bold">✕</button>
          </div>
        )}
        {successMsg && (
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 flex items-center gap-2 shadow-sm animate-in fade-in">
            <span>✅</span>
            <span>{successMsg}</span>
          </div>
        )}

        {/* HERO WALLET CARD */}
        <div className="relative rounded-[24px] bg-white p-5 shadow-[0_12px_36px_rgba(17,94,89,.14)] border border-teal-100/90 overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute -top-12 -right-12 size-36 rounded-full bg-teal-500/10 blur-2xl pointer-events-none" />

          {/* Top of Card: Wallet ID & Status */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
              <span className="text-xs font-bold text-slate-700">
                สถานะ: <span className="text-emerald-700">{walletStatus === 'ACTIVE' ? 'เปิดใช้งาน (ACTIVE)' : walletStatus}</span>
              </span>
            </div>
            <button
              onClick={handleManualRefresh}
              disabled={refreshing || loading}
              className="flex items-center gap-1 text-[11px] font-bold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              title="ดึงยอดเงินล่าสุดจากฐานข้อมูล"
            >
              <Icon name="refresh" className={`size-3 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'กำลังซิงก์…' : 'รีเฟรชยอด'}</span>
            </button>
          </div>

          {/* Balance Display */}
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <span>ยอดเงินในกระเป๋าถุงเงิน (คงเหลือสุทธิ)</span>
                {authStorage.getToken() && (
                  <span className="text-[10px] bg-teal-100 text-teal-800 px-1.5 py-0.2 rounded font-medium">
                    จากฐานข้อมูล MySQL
                  </span>
                )}
              </p>
              <span className="text-[10px] text-slate-400">อัปเดต: {lastUpdated}</span>
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-sm font-bold text-teal-700">฿</span>
              <p className="text-[34px] font-extrabold tracking-tight text-[#042f2e] font-mono leading-none">
                {currentBalance.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <p className="mt-1.5 text-[11px] text-slate-500">
              เลขที่กระเป๋า: <strong className="font-mono text-slate-700">WAL-{String(walletId).padStart(6, '0')}</strong> • รหัสร้านค้า: <strong className="font-mono text-slate-700">MCH-{currentMerchant?.mchId}</strong>
            </p>
          </div>

          {/* Quick Action Buttons inside Card */}
          <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-3 gap-2">
            <button
              onClick={() => setWithdrawModalOpen(true)}
              className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-gradient-to-b from-[#115e59] to-[#0f766e] text-white shadow-sm hover:brightness-105 active:scale-95 transition-all cursor-pointer"
            >
              <span className="text-base mb-0.5">💸</span>
              <span className="text-xs font-bold">ถอนเงิน</span>
              <span className="text-[9px] text-teal-200">เข้าพร้อมเพย์/บัญชี</span>
            </button>

            <button
              onClick={() => setQrModalOpen(true)}
              className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-[#115e59] border border-teal-200/80 active:scale-95 transition-all cursor-pointer"
            >
              <Icon name="qr" className="size-5 mb-0.5 text-[#115e59]" />
              <span className="text-xs font-bold">สร้าง QR</span>
              <span className="text-[9px] text-teal-700">รับเงินสิทธิ์ 60/40</span>
            </button>

            <button
              onClick={() => {
                if (onOpenRevenue) onOpenRevenue();
              }}
              className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 active:scale-95 transition-all cursor-pointer"
            >
              <span className="text-base mb-0.5">📊</span>
              <span className="text-xs font-bold">ยอดขาย</span>
              <span className="text-[9px] text-slate-500">ดูสถิติรายได้</span>
            </button>
          </div>
        </div>

        {/* 4-CARD REVENUE BREAKDOWN TILES */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-2xl bg-white p-3.5 border border-teal-100 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-medium">ยอดเงินเข้ารวม</span>
              <span className="text-xs">💰</span>
            </div>
            <p className="text-base font-bold text-teal-900 font-mono">
              ฿ {totalRevenue.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </p>
            <span className="text-[10px] text-slate-400 mt-0.5 block">ยอดขายสะสมทั้งหมด</span>
          </div>

          <div className="rounded-2xl bg-white p-3.5 border border-teal-100 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-medium">รัฐร่วมจ่าย 40%</span>
              <span className="text-xs">🏛️</span>
            </div>
            <p className="text-base font-bold text-emerald-700 font-mono">
              ฿ {govSubsidizedTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </p>
            <span className="text-[10px] text-slate-400 mt-0.5 block">เงินอุดหนุนจากภาครัฐ</span>
          </div>

          <div className="rounded-2xl bg-white p-3.5 border border-teal-100 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-medium">ลูกค้าสแกนจ่าย 60%</span>
              <span className="text-xs">👤</span>
            </div>
            <p className="text-base font-bold text-teal-700 font-mono">
              ฿ {userPaidTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </p>
            <span className="text-[10px] text-slate-400 mt-0.5 block">เงินจากกระเป๋าประชาชน</span>
          </div>

          <div className="rounded-2xl bg-white p-3.5 border border-teal-100 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-medium">รายการขายสำเร็จ</span>
              <span className="text-xs">🧾</span>
            </div>
            <p className="text-base font-bold text-slate-800 font-mono">
              {totalBills} <span className="text-xs font-normal text-slate-500">บิล</span>
            </p>
            <span className="text-[10px] text-slate-400 mt-0.5 block">เฉลี่ย ฿{totalBills > 0 ? Math.round(totalRevenue / totalBills).toLocaleString() : 0} / บิล</span>
          </div>
        </div>

        {/* PAYOUT DESTINATION INFO BOX */}
        <div className="rounded-2xl bg-gradient-to-r from-teal-50/80 to-emerald-50/80 p-4 border border-teal-200/70 text-xs shadow-xs">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-xl bg-[#115e59] text-white">
                🏦
              </span>
              <div>
                <h4 className="font-bold text-slate-800">บัญชีรับโอนเงิน / พร้อมเพย์</h4>
                <p className="text-[11px] text-slate-600">
                  พร้อมเพย์: <strong className="font-mono text-teal-800">{currentMerchant?.phone || 'ยังไม่ได้ระบุ'}</strong>
                </p>
              </div>
            </div>
            <span className="text-[10px] bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full font-bold">
              ผูกระบบแล้ว
            </span>
          </div>
          <p className="mt-2 text-[10px] text-slate-500 leading-snug">
            เงินค่าสินค้าจากสิทธิ์ร่วมจ่าย 60/40 จะเข้ากระเป๋าถุงเงินทันที และร้านค้าสามารถกดถอนโอนเข้าบัญชีธนาคารได้ตลอด 24 ชม.
          </p>
        </div>

        {/* WALLET TRANSACTION LEDGER */}
        <div className="rounded-[24px] bg-white p-4.5 shadow-sm border border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                ประวัติความเคลื่อนไหวในกระเป๋า ({filteredLedger.length})
              </h3>
              <p className="text-[10px] text-slate-400">รายการรับเงินจากการขายและเงินเข้ากระเป๋า</p>
            </div>
            <span className="text-[11px] font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-lg">
              ล่าสุด
            </span>
          </div>

          {/* Search bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="ค้นหาชื่อลูกค้า หรือเลขที่บิล…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-teal-500 bg-slate-50/50"
            />
            <span className="absolute left-2.5 top-2 text-slate-400 text-xs">🔍</span>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1.5 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Transaction items */}
          <div className="space-y-2 pt-1">
            {filteredLedger.length > 0 ? (
              filteredLedger.map(tx => (
                <div
                  key={tx.txId}
                  onClick={() => setSelectedTxForDetail(tx)}
                  className="p-3 rounded-2xl border border-slate-100 hover:border-teal-200 hover:bg-teal-50/20 transition-all cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 place-items-center rounded-xl bg-teal-50 text-teal-700 text-sm shrink-0">
                      💰
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-800">{tx.userName}</span>
                        <span className="text-[9px] bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded font-mono font-bold">
                          สำเร็จ
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {tx.txTimestamp} • บิล #{tx.txId}
                      </p>
                      <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span>ลูกค้า: ฿{tx.userPaidAmount.toLocaleString()}</span>
                        <span>•</span>
                        <span className="text-emerald-700 font-medium">รัฐ: ฿{tx.govSubsidizedAmount.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-extrabold text-[#115e59] font-mono block">
                      +฿ {tx.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] text-teal-700">ดูสลิป ➔</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 rounded-2xl bg-slate-50/50 border border-dashed border-slate-200">
                <span className="text-2xl block mb-1">📭</span>
                <p className="text-xs text-slate-500">ไม่พบรายการธุรกรรมตามที่ค้นหา</p>
                <p className="text-[10px] text-slate-400 mt-0.5">เมื่อลูกค้าสแกนจ่ายเงินจะเข้ากระเป๋าถุงเงินทันที</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* WITHDRAWAL MODAL */}
      {withdrawModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-[420px] bg-white rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="grid size-8 place-items-center rounded-xl bg-teal-100 text-teal-800 text-base">
                  💸
                </span>
                <h3 className="text-base font-bold text-slate-800">ถอนเงินจากถุงเงินร้านค้า</h3>
              </div>
              <button
                onClick={() => setWithdrawModalOpen(false)}
                className="grid size-8 place-items-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {withdrawSuccess ? (
              <div className="py-8 text-center space-y-2">
                <span className="text-4xl block">🎉</span>
                <h4 className="text-base font-bold text-emerald-700">ถอนเงินสำเร็จ!</h4>
                <p className="text-xs text-slate-600">{withdrawSuccess}</p>
                <p className="text-[11px] text-slate-400">ระบบได้อัปเดตยอดคงเหลือในกระเป๋าเรียบร้อยแล้ว</p>
              </div>
            ) : (
              <form onSubmit={handleWithdrawSubmit} className="mt-4 space-y-4">
                {/* Balance display */}
                <div className="p-3.5 rounded-2xl bg-teal-50/70 border border-teal-100 flex items-center justify-between text-xs">
                  <span className="text-slate-600">ยอดเงินในกระเป๋าที่ถอนได้:</span>
                  <strong className="text-sm font-bold text-[#115e59] font-mono">
                    ฿ {currentBalance.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </strong>
                </div>

                {/* Amount input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ระบุจำนวนเงินที่ต้องการถอน (บาท)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-base font-bold text-teal-800">฿</span>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      max={currentBalance}
                      placeholder="0.00"
                      value={withdrawAmount}
                      onChange={e => setWithdrawAmount(e.target.value)}
                      required
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 font-mono text-lg font-bold text-slate-800 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                    />
                  </div>

                  {/* Preset quick buttons */}
                  <div className="grid grid-cols-4 gap-1.5 mt-2">
                    {[100, 500, 1000].map(amt => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setWithdrawAmount(String(amt))}
                        disabled={amt > currentBalance}
                        className="py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-teal-50 hover:text-teal-800 border border-slate-200 disabled:opacity-40"
                      >
                        ฿{amt}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setWithdrawAmount(String(currentBalance))}
                      disabled={currentBalance <= 0}
                      className="py-1 rounded-lg text-xs font-bold bg-teal-100 hover:bg-teal-200 text-teal-800 border border-teal-200 disabled:opacity-40"
                    >
                      ทั้งหมด
                    </button>
                  </div>
                </div>

                {/* Transfer destination */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    บัญชีปลายทาง / หมายเลขพร้อมเพย์
                  </label>
                  <input
                    type="text"
                    value={withdrawDestination}
                    onChange={e => setWithdrawDestination(e.target.value)}
                    placeholder="เบอร์โทรศัพท์ หรือ เลขบัญชีธนาคาร"
                    required
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-teal-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    ค่าเริ่มต้น: เบอร์โทรศัพท์ที่ลงทะเบียนไว้กับร้านค้า
                  </span>
                </div>

                {/* Summary calculation */}
                {parseFloat(withdrawAmount) > 0 && (
                  <div className="p-3 rounded-xl bg-slate-50 text-[11px] space-y-1 border border-slate-200">
                    <div className="flex justify-between text-slate-600">
                      <span>ยอดเงินถอน:</span>
                      <strong className="text-slate-800 font-mono">฿ {parseFloat(withdrawAmount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</strong>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>ยอดคงเหลือหลังถอน:</span>
                      <strong className="text-teal-800 font-mono">
                        ฿ {Math.max(0, currentBalance - parseFloat(withdrawAmount)).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </strong>
                    </div>
                  </div>
                )}

                {/* Submit button */}
                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setWithdrawModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={withdrawSubmitting || !withdrawAmount || parseFloat(withdrawAmount) <= 0 || parseFloat(withdrawAmount) > currentBalance}
                    className="flex-1 py-2.5 rounded-xl bg-[#115e59] hover:bg-[#0f766e] text-white text-xs font-bold shadow-md disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {withdrawSubmitting ? 'กำลังโอนเงิน…' : 'ยืนยันการถอนเงิน'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* TRANSACTION RECEIPT DETAIL MODAL */}
      {selectedTxForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-[360px] bg-white rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-[#115e59] flex items-center gap-1.5">
                <span>🧾</span>
                <span>สลิปรายการรับเงิน</span>
              </span>
              <button
                onClick={() => setSelectedTxForDetail(null)}
                className="grid size-7 place-items-center rounded-full hover:bg-slate-100 text-slate-400"
              >
                ✕
              </button>
            </div>

            <div className="text-center py-2 bg-teal-50/50 rounded-2xl border border-teal-100/60">
              <span className="text-[10px] text-slate-500 block">ยอดเงินรับเข้ากระเป๋า</span>
              <span className="text-2xl font-extrabold text-[#115e59] font-mono">
                +฿ {selectedTxForDetail.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
              </span>
              <span className="inline-block mt-1 text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                ชำระเงินสำเร็จ
              </span>
            </div>

            <div className="space-y-2 text-xs border-y border-dashed border-slate-200 py-3">
              <div className="flex justify-between text-slate-500">
                <span>เลขที่บิล:</span>
                <strong className="text-slate-800 font-mono">#{selectedTxForDetail.txId}</strong>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>วัน-เวลา:</span>
                <span className="text-slate-700 font-mono">{selectedTxForDetail.txTimestamp}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>ลูกค้าผู้ชำระ:</span>
                <strong className="text-slate-800">{selectedTxForDetail.userName}</strong>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>ลูกค้าจ่าย (60%):</span>
                <strong className="text-teal-700 font-mono">฿ {selectedTxForDetail.userPaidAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</strong>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>รัฐช่วยจ่าย (40%):</span>
                <strong className="text-emerald-700 font-mono">฿ {selectedTxForDetail.govSubsidizedAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</strong>
              </div>
              {selectedTxForDetail.note && (
                <div className="flex justify-between text-slate-500">
                  <span>หมายเหตุ:</span>
                  <span className="text-slate-700 text-right">{selectedTxForDetail.note}</span>
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedTxForDetail(null)}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}

      {/* QR GENERATOR MODAL */}
      <QRGeneratorModal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
      />
    </div>
  );
};


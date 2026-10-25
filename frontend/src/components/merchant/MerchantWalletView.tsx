import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Icon } from '../common/Icon';
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
    refreshMerchantData
  } = useApp();

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [selectedTxForDetail, setSelectedTxForDetail] = useState<SalesTransaction | null>(null);

  // Search filter for ledger
  const [searchTerm, setSearchTerm] = useState('');

  // Real wallet details from API
  const [apiWallet, setApiWallet] = useState<ApiMerchantWallet | null>(null);

  const fetchWalletData = async () => {
    if (!authStorage.getToken()) return;
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await merchantService.getWallet();
      setApiWallet(res.wallet);
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
                {/* {authStorage.getToken() && (
                  <span className="text-[10px] bg-teal-100 text-teal-800 px-1.5 py-0.2 rounded font-medium">
                    จากฐานข้อมูล MySQL
                  </span>
                )} */}
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

          {/* Quick Action Button - View Sales Breakdown */}
          {/* {onOpenRevenue && (
            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">ตรวจสอบรายละเอียดรายได้สะสม</span>
              <button
                type="button"
                onClick={onOpenRevenue}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-[#115e59] border border-teal-200 text-xs font-bold transition-all cursor-pointer shadow-2xs"
              >
                <span>📊 ดูสถิติยอดขาย</span>
                <span>➔</span>
              </button>
            </div>
          )} */}
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
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-slate-800">{tx.userName}</span>
                        {tx.userPhone && tx.userPhone !== tx.userName && (
                          <span className="text-[9px] text-slate-400 font-mono">({tx.userPhone})</span>
                        )}
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
                <div className="text-right">
                  <strong className="text-slate-800 block">{selectedTxForDetail.userName}</strong>
                  {selectedTxForDetail.userPhone && selectedTxForDetail.userPhone !== selectedTxForDetail.userName && (
                    <span className="text-slate-400 font-mono text-[10px] block">เบอร์โทร: {selectedTxForDetail.userPhone}</span>
                  )}
                </div>
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
    </div>
  );
};



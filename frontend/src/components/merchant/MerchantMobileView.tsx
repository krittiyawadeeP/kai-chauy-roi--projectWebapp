import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Icon, IconName } from '../common/Icon';
import { QRGeneratorModal } from './QRGeneratorModal';
import { MerchantRegistrationModal } from './MerchantRegistrationModal';
import { MerchantProfileSettingsModal } from './MerchantProfileSettingsModal';
import { StoreMapPickerModal } from './StoreMapPickerModal';
import { AuthModal } from '../auth/AuthModal';
import { RevenueBreakdownCard } from './RevenueBreakdownCard';
import { MerchantWalletView } from './MerchantWalletView';
import { authStorage } from '../../services/api';
import { ApiError } from '../../services/api';

export const isToday = (dateStr?: string | Date | null): boolean => {
  if (!dateStr) return false;
  const now = new Date();

  if (typeof dateStr === 'string') {
    const ymdMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (ymdMatch) {
      const year = parseInt(ymdMatch[1], 10);
      const month = parseInt(ymdMatch[2], 10) - 1;
      const day = parseInt(ymdMatch[3], 10);

      if (dateStr.includes('Z') || (dateStr.includes('T') && dateStr.length > 19)) {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          return (
            d.getFullYear() === now.getFullYear() &&
            d.getMonth() === now.getMonth() &&
            d.getDate() === now.getDate()
          );
        }
      }

      return (
        year === now.getFullYear() &&
        month === now.getMonth() &&
        day === now.getDate()
      );
    }
  }

  const d = new Date(dateStr);
  return (
    !isNaN(d.getTime()) &&
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
};


interface MerchantMobileViewProps {
  initialTab?: 'sales' | 'wallet' | 'info';
  onOpenRevenuePage?: () => void;
  onOpenWalletPage?: () => void;
}

export const MerchantMobileView: React.FC<MerchantMobileViewProps> = ({
  initialTab = 'sales',
  onOpenRevenuePage,
  onOpenWalletPage
}) => {
  const {
    merchants,
    currentMerchant,
    setCurrentMerchant,
    transactions,
    refreshMerchantData
  } = useApp();

  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [profileSettingsOpen, setProfileSettingsOpen] = useState(false);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'sales' | 'wallet' | 'info'>(initialTab);
  const [loadingMerchantData, setLoadingMerchantData] = useState(false);
  const [merchantDataError, setMerchantDataError] = useState('');

  useEffect(() => {
    if (!authStorage.getToken()) return;
    setLoadingMerchantData(true);
    setMerchantDataError('');
    refreshMerchantData()
      .catch(error => setMerchantDataError(error instanceof ApiError && error.status === 401 ? 'Session หมดอายุ กรุณาเข้าสู่ระบบใหม่' : error instanceof Error ? error.message : 'โหลดข้อมูลร้านค้าไม่สำเร็จ'))
      .finally(() => setLoadingMerchantData(false));
  }, [refreshMerchantData]);

  const [salesViewMode, setSalesViewMode] = useState<'today' | 'all'>('today');

  const merchantTransactions = React.useMemo(() => {
    return transactions.filter(t => t.merchantId === currentMerchant?.mchId);
  }, [transactions, currentMerchant?.mchId]);

  // Filter ONLY transactions for TODAY
  const todayTransactions = React.useMemo(() => {
    return merchantTransactions.filter(t => isToday(t.txTimestamp));
  }, [merchantTransactions]);

  const totalSalesToday = React.useMemo(() => {
    return todayTransactions.reduce((acc, t) => acc + t.totalAmount, 0);
  }, [todayTransactions]);

  const userPaidToday = React.useMemo(() => {
    return todayTransactions.reduce((acc, t) => acc + t.userPaidAmount, 0);
  }, [todayTransactions]);

  const govSubsidyToday = React.useMemo(() => {
    return todayTransactions.reduce((acc, t) => acc + t.govSubsidizedAmount, 0);
  }, [todayTransactions]);

  const actions = [
    {
      icon: 'qr' as IconName,
      label: 'สร้าง QR รับเงิน',
      detail: 'สิทธิ์ร่วมจ่ายชุมชน',
      color: 'green',
      onClick: () => setQrModalOpen(true)
    },
    {
      icon: 'wallet' as IconName,
      label: 'ถุงเงินร้านค้า',
      // detail: 'ยอดเงิน & ถอนเงิน',
      detail: 'ยอดเงินคงเหลือ',
      color: 'green',
      onClick: () => {
        if (onOpenWalletPage) onOpenWalletPage();
        else setActiveTab('wallet');
      }
    },
    {
      icon: 'shop' as IconName,
      label: 'ปักหมุด GPS',
      detail: 'แผนที่พิกัดร้าน',
      color: 'blue',
      onClick: () => setMapPickerOpen(true)
    },
    {
      icon: 'user' as IconName,
      label: 'ตั้งค่าร้านค้า',
      detail: 'แก้ไขข้อมูลร้าน',
      color: 'violet',
      onClick: () => setProfileSettingsOpen(true)
    }
  ];

  return (
    <div className="pb-28">
      {/* Top Header - เขียวหัวเป็ด (Deep Teal / Pine Duck Green Gradient) */}
      <header className="relative overflow-hidden bg-gradient-to-br from-[#042f2e] via-[#115e59] to-[#0d9488] px-5 pb-12 pt-5 text-white">
        <div className="absolute -right-12 -top-16 size-48 rounded-full border-[28px] border-white/10 pointer-events-none" />

        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="grid size-10 place-items-center rounded-xl bg-white text-lg font-extrabold text-[#115e59] shadow-lg">
              ร้าน
            </div>
            <div>
              <p className="text-[11px] font-medium tracking-[.18em] text-teal-100 uppercase">
                THAI CHUAY THAI MERCHANT
              </p>
              <p className="text-lg font-bold leading-tight">ร้านค้าถุงเงินไทย</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setAuthModalOpen(true)}
              className="px-2.5 py-1 rounded-full bg-white/20 hover:bg-white/30 text-[11px] font-bold text-white flex items-center gap-1 backdrop-blur-xs transition-colors"
            >
              <Icon name="user" className="size-3" />
              <span>เข้าสู่ระบบ</span>
            </button>
            <button
              onClick={() => setProfileSettingsOpen(true)}
              className="relative grid size-8 place-items-center rounded-full bg-white/15 hover:bg-white/25 transition-colors"
              title="ตั้งค่าร้านค้า"
            >
              <Icon name="shop" className="size-4" />
            </button>
          </div>
        </div>

        <div className="relative mt-7 flex items-end justify-between">
          <div>
            <p className="text-sm text-teal-100">{currentMerchant?.ownerName || 'เจ้าของร้านค้า'}</p>
            <h1 className="mt-1 text-[22px] font-bold tracking-tight">
              {currentMerchant?.shopName || 'ร้านค้าชุมชน'}
            </h1>
          </div>
          <div className="mb-1 rounded-full bg-white/20 px-3 py-1.5 text-xs font-semibold backdrop-blur text-white flex items-center gap-1 border border-white/20">
            <span className="size-2 rounded-full bg-teal-200" />
            ผ่านการรับรองจากรัฐ
          </div>
        </div>

        {/* Quick Merchant Switcher dropdown */}
        {/* <div className="relative mt-4 flex items-center justify-between bg-black/25 p-2 rounded-xl text-xs">
          <span className="text-teal-100 text-[11px]">สลับร้านค้าทดสอบ:</span>
          <select
            value={currentMerchant?.mchId}
            onChange={e => {
              const m = merchants.find(item => item.mchId === Number(e.target.value));
              if (m) setCurrentMerchant(m);
            }}
            className="bg-[#042f2e] text-white text-xs px-2.5 py-1 rounded-lg border border-teal-500/40 focus:outline-none"
          >
            {merchants.map(m => (
              <option key={m.mchId} value={m.mchId}>
                {m.shopName}
              </option>
            ))}
          </select>
        </div> */}
      </header>

      {/* Overlapping Sales Balance Card */}
      <section className="-mt-7 px-4">
        {loadingMerchantData && <p className="mb-2 text-center text-xs text-teal-800">กำลังโหลดข้อมูลจาก API…</p>}
        {merchantDataError && <p role="alert" className="mb-2 rounded-xl bg-rose-50 p-2 text-center text-xs text-rose-700">{merchantDataError}</p>}
        {authStorage.getToken() && <p className="mb-2 text-center text-[10px] text-slate-500">ข้อมูลร้านค้านี้มาจาก API</p>}
        <div className="relative rounded-[22px] bg-white p-5 shadow-[0_12px_35px_rgba(17,94,89,.14)] border border-teal-100/80">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-xs font-medium text-slate-500">ยอดขายรวมวันนี้</p>
                <span className="text-[10px] bg-teal-50 text-teal-800 px-1.5 py-0.2 rounded font-mono font-medium">
                  {new Date().toLocaleDateString('th-TH', { dateStyle: 'short' })}
                </span>
              </div>
              <p className="mt-1 text-[30px] font-bold tracking-tight text-[#134e4a] font-mono">
                ฿ {totalSalesToday.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <span className="rounded-full bg-teal-50 px-3 py-1.5 text-xs font-bold text-[#115e59] border border-teal-200">
              รับเงินเรียบร้อย
            </span>
          </div>

          {/* {(currentMerchant?.walletBalance !== undefined || currentMerchant?.wallet) && (
            <div className="mt-3 border-t border-teal-100 pt-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 block">ยอดเงินในกระเป๋าถุงเงินร้านค้า:</span>
                <span className="text-sm font-bold text-[#115e59] font-mono">
                  ฿ {(currentMerchant?.walletBalance ?? Number(currentMerchant?.wallet?.balance ?? 0)).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <button
                onClick={() => {
                  if (onOpenWalletPage) onOpenWalletPage();
                  else setActiveTab('wallet');
                }}
                className="text-[11px] font-bold text-[#115e59] hover:text-teal-700 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 border border-teal-200/60"
              >
                <span>👛 ถุงเงินร้านค้า</span>
                <span>➔</span>
              </button>
            </div>
          )} */}

          <div className="mt-3 grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-xs">
            <div className="bg-[#f0fdfa] p-3 rounded-xl border border-teal-100">
              <span className="text-[10px] text-teal-800 block">ลูกค้าจ่ายผ่าน QR วันนี้</span>
              <span className="text-sm font-bold text-[#0f766e] font-mono">
                ฿ {userPaidToday.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="bg-[#f0fdf4] p-3 rounded-xl border border-emerald-100">
              <span className="text-[10px] text-emerald-800 block">รัฐช่วยจ่ายวันนี้</span>
              <span className="text-sm font-bold text-emerald-700 font-mono">
                ฿ {govSubsidyToday.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Quick link to detailed Revenue Breakdown KPIs */}
          <div className="mt-3 pt-2 border-t border-dashed border-teal-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500 font-medium">
              บิลขายวันนี้:&nbsp;
              <strong className="text-slate-800 font-mono">
                {todayTransactions.length} บิล
              </strong>
            </span>
            <button
              onClick={() => {
                if (onOpenRevenuePage) {
                  onOpenRevenuePage();
                } else {
                  setActiveTab('sales');
                }
              }}
              className="font-bold text-[#115e59] hover:text-teal-700 flex items-center gap-1 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
            >
              <span>📊 ดูสรุปรายได้ตามช่วงเวลา</span>
              <span>➔</span>
            </button>
          </div>
        </div>
      </section>

      {/* Action Buttons */}
      <section className="mt-4 px-4">
        <div className="grid grid-cols-4 gap-1.5">
          {actions.map(action => (
            <button
              key={action.label}
              onClick={action.onClick}
              className="flex flex-col items-center justify-center rounded-[20px] bg-white p-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md border border-slate-100 cursor-pointer"
            >
              <span
                className={`grid size-11 place-items-center rounded-2xl ${
                  action.color === 'green'
                    ? 'action-green'
                    : action.color === 'violet'
                    ? 'action-violet'
                    : 'action-blue'
                } shadow-xs mb-2`}
              >
                <Icon name={action.icon} className="size-5" />
              </span>
              <span className="text-xs font-bold text-slate-800">{action.label}</span>
              <span className="mt-0.5 text-[10px] text-slate-400">{action.detail}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Tab Switcher */}
      <div className="px-4 pt-5">
        <div className="flex bg-[#e6fffa] p-1 rounded-2xl text-xs font-bold text-teal-950 gap-1">
          <button
            onClick={() => setActiveTab('sales')}
            className={`flex-1 py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'sales' ? 'bg-white text-[#115e59] shadow-xs' : 'hover:text-teal-900'
            }`}
          >
            ยอดขาย
          </button>
          <button
            onClick={() => setActiveTab('wallet')}
            className={`flex-1 py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'wallet' ? 'bg-white text-[#115e59] shadow-xs' : 'hover:text-teal-900'
            }`}
          >
            ถุงเงินร้านค้า
          </button>
        </div>
      </div>

      {/* TAB 1: SALES LIST FOR TODAY + REVENUE BREAKDOWN KPIS AT THE BOTTOM */}
      {activeTab === 'sales' && (
        <section className="px-4 pt-4 space-y-3.5">
          {/* Sub-filter: วันนี้ vs ทั้งหมด */}
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700">
              {salesViewMode === 'today'
                ? `รายการขายวันนี้ (${todayTransactions.length} บิล)`
                : `ประวัติการขายทั้งหมด (${merchantTransactions.length} บิล)`}
            </span>
            <div className="flex bg-slate-100 p-0.5 rounded-lg text-[11px]">
              <button
                onClick={() => setSalesViewMode('today')}
                className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                  salesViewMode === 'today' ? 'bg-white text-teal-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                เฉพาะวันนี้
              </button>
              <button
                onClick={() => setSalesViewMode('all')}
                className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                  salesViewMode === 'all' ? 'bg-white text-teal-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                ทั้งหมด
              </button>
            </div>
          </div>

          {/* Transaction List */}
          <div className="space-y-2.5">
            {(salesViewMode === 'today' ? todayTransactions : merchantTransactions).length > 0 ? (
              (salesViewMode === 'today' ? todayTransactions : merchantTransactions).map(tx => (
                <div
                  key={tx.txId}
                  className="rounded-[20px] bg-white p-3.5 border border-teal-50 shadow-sm flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-xs text-slate-800">{tx.userName}</p>
                      {tx.userPhone && tx.userPhone !== tx.userName && (
                        <span className="text-[9px] text-slate-400 font-mono">({tx.userPhone})</span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 font-mono">{tx.txTimestamp}</p>
                    <span className="text-[10px] text-teal-700 font-medium">
                      รัฐช่วยจ่าย: ฿{tx.govSubsidizedAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-extrabold text-sm text-[#134e4a] font-mono block">
                      +฿ {tx.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] text-[#0f766e]">
                      ลูกค้าจ่าย ฿{tx.userPaidAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[22px] bg-white p-8 text-center border border-teal-50 shadow-sm">
                <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-teal-50 text-[#115e59] mb-2">
                  <Icon name="qr" className="size-6" />
                </span>
                <p className="text-xs font-bold text-slate-700">ยังไม่มีรายการชำระในวันนี้</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  เมื่อลูกค้าสแกน QR จ่ายเงิน ยอดขายของวันนี้จะปรากฏที่นี่ทันที
                </p>
                <div className="mt-3 flex justify-center gap-2">
                  <button
                    onClick={() => setQrModalOpen(true)}
                    className="px-4 py-2 bg-[#115e59] hover:bg-[#0f766e] text-white rounded-xl text-xs font-bold transition-colors shadow-sm cursor-pointer"
                  >
                    สร้าง QR Code รับเงิน
                  </button>
                  {merchantTransactions.length > 0 && (
                    <button
                      onClick={() => setSalesViewMode('all')}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      ดูรายการย้อนหลัง ({merchantTransactions.length})
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

            {/* TAB: MERCHANT WALLET MODULE */}
      {activeTab === 'wallet' && (
        <section className="pt-2">
          <MerchantWalletView
            onOpenRevenue={onOpenRevenuePage}
          />
        </section>
      )}

      {/* TAB 3: DEDICATED STORE PROFILE & PIN LOCATION PAGE */}
      {activeTab === 'info' && (
        <section className="px-4 pt-4 space-y-3.5">
          {/* Card 1: Main Store Profile */}
          <div className="rounded-[22px] bg-white p-4 border border-teal-100 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Icon name="shop" className="size-4 text-[#115e59]" />
                ข้อมูลโปรไฟล์ร้านค้า
              </span>
              <button
                onClick={() => setProfileSettingsOpen(true)}
                className="text-[11px] font-bold text-[#115e59] bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
              >
                <span>⚙️ แก้ไขข้อมูล</span>
              </button>
            </div>

            <div className="flex items-start gap-3">
              {currentMerchant.imageUrl ? (
                <img
                  src={currentMerchant.imageUrl}
                  alt={currentMerchant.shopName}
                  className="size-20 rounded-2xl object-cover border border-slate-200 shrink-0 shadow-xs"
                />
              ) : (
                <div className="size-20 rounded-2xl bg-teal-50 border border-teal-200 shrink-0 shadow-xs flex items-center justify-center text-teal-700 text-2xl">
                  🏪
                </div>
              )}
              <div className="min-w-0 flex-1 space-y-1">
                <h3 className="font-bold text-sm text-slate-800">{currentMerchant.shopName}</h3>
                <p className="text-[11px] font-semibold text-teal-700 bg-teal-50 inline-block px-2 py-0.5 rounded-md">
                  {currentMerchant.category}
                </p>
                <p className="text-[11px] text-slate-600">
                  เจ้าของ: <strong className="text-slate-800">{currentMerchant.ownerName}</strong>
                </p>
                <p className="text-[10px] text-slate-400">
                  เวลาทำการ: {currentMerchant.openingHours || '08:00 - 18:00 น.'}
                </p>
              </div>
            </div>

            <div className="p-3 bg-[#f0fdfa] rounded-xl text-xs space-y-1.5 border border-teal-100">
              <div className="flex justify-between text-slate-600">
                <span>เบอร์โทรศัพท์ติดต่อ:</span>
                <strong className="text-slate-800">{currentMerchant.phone}</strong>
              </div>
              <div className="pt-1 text-[11px] text-slate-600 border-t border-teal-100/70">
                <span className="text-slate-400 block text-[10px]">ที่อยู่ร้านค้า:</span>
                <span>{currentMerchant.address}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Store GPS Coordinates & Interactive Map Pinning */}
          <div className="rounded-[22px] bg-white p-4 border border-teal-100 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div>
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span>📍</span>
                  <span>พิกัดแผนที่ร้านค้า (GPS Map Pin)</span>
                </h4>
                <p className="text-[10px] text-slate-400">
                  ตำแหน่งสำหรับผู้ใช้ค้นหาและนำทางทำภารกิจ
                </p>
              </div>
              <button
                onClick={() => setMapPickerOpen(true)}
                className="px-3 py-1.5 bg-[#115e59] hover:bg-[#0f766e] text-white rounded-xl text-[11px] font-bold shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>📍 ปักหมุดบนแผนที่</span>
              </button>
            </div>

            {/* Coordinates Summary */}
            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/70 text-[11px]">
              <div>
                <span className="text-slate-400 block text-[10px]">ละติจูด (Lat)</span>
                <strong className="text-[#115e59] font-mono">{currentMerchant.lat?.toFixed(6) ?? 'ยังไม่ระบุ'}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">ลองจิจูด (Lng)</span>
                <strong className="text-[#115e59] font-mono">{currentMerchant.lng?.toFixed(6) ?? 'ยังไม่ระบุ'}</strong>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setMapPickerOpen(true)}
              className="w-full rounded-xl border border-teal-200 bg-teal-50 p-4 text-xs font-semibold text-teal-800 hover:bg-teal-100"
            >
              เปิดแผนที่เพื่อตรวจสอบหรือแก้ไขที่ตั้งร้าน
            </button>
          </div>

          {/* Card 3: Government Verification & Co-payment participation status */}
          <div className="rounded-[22px] bg-gradient-to-r from-teal-50 to-emerald-50 p-4 border border-teal-200 shadow-sm space-y-2">
            <div className="flex items-center gap-2">
              <span className="grid size-6 place-items-center rounded-lg bg-[#115e59] text-white">
                <Icon name="shield" className="size-3.5" />
              </span>
              <span className="text-xs font-bold text-teal-950">
                สถานะการเข้าร่วมโครงการ: ผ่านการอนุมัติ (Active)
              </span>
            </div>
            <p className="text-[11px] text-teal-800 leading-relaxed">
              ร้านค้าของท่านลงทะเบียนในระบบเรียบร้อย สามารถสร้าง Thai QR Code และรับเงินสมทบตามอัตรานโยบายกลางได้
            </p>
            <div className="pt-2 flex gap-2">
              <button
                onClick={() => setRegisterModalOpen(true)}
                className="flex-1 py-2 bg-white text-teal-800 border border-teal-200 rounded-xl text-[11px] font-bold hover:bg-teal-50 transition-colors text-center"
              >
                ลงทะเบียนร้านค้าใหม่
              </button>
              <button
                onClick={() => setAuthModalOpen(true)}
                className="flex-1 py-2 bg-[#115e59] text-white rounded-xl text-[11px] font-bold hover:bg-[#0f766e] transition-colors text-center"
              >
                สลับบัญชีร้านค้า (Auth)
              </button>
            </div>
          </div>
        </section>
      )}

      {/* MODALS */}
      <QRGeneratorModal isOpen={qrModalOpen} onClose={() => setQrModalOpen(false)} />
      <MerchantRegistrationModal isOpen={registerModalOpen} onClose={() => setRegisterModalOpen(false)} />
      <MerchantProfileSettingsModal isOpen={profileSettingsOpen} onClose={() => setProfileSettingsOpen(false)} />
      <StoreMapPickerModal isOpen={mapPickerOpen} onClose={() => setMapPickerOpen(false)} mchId={currentMerchant.mchId} />
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} defaultRole="merchant" />
    </div>
  );
};

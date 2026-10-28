import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Icon, IconName } from '../common/Icon';
import { QRScannerModal } from './QRScannerModal';
import { CitizenQrModal } from './CitizenQrModal';
import { CitizenStatementScreen } from './CitizenStatementScreen';
import { CitizenRegistrationModal } from './CitizenRegistrationModal';
import { StampRedeemModal } from './StampRedeemModal';
import { AuthModal } from '../auth/AuthModal';
import { StoreMapPickerModal } from '../merchant/StoreMapPickerModal';
import { Reward, DistrictStamp } from '../../types';

export interface CitizenMobileViewProps {
  activeTab?: 'home' | 'missions' | 'wallet';
  onTabChange?: (tab: 'home' | 'missions' | 'wallet') => void;
  onOpenPassport?: () => void;
}

export const CitizenMobileView: React.FC<CitizenMobileViewProps> = ({
  activeTab: controlledTab,
  onTabChange,
  onOpenPassport,
}) => {
  const {
    currentUser,
    wallet,
    userGrant,
    merchants,
    missions,
    aiTargetShops,
    districtStamps,
    userStamps,
    rewards,
    transactions,
    topupWallet,
    logout
  } = useApp();

  const localAiShops = aiTargetShops.filter(shop => shop.provinceId === undefined || shop.provinceId === currentUser.provId);
  const featuredAiShop = localAiShops.length > 0 ? localAiShops[0] : null;
  const generalMissions = missions.filter(mission => !mission.isAiMission);

  const [currentScreen, setCurrentScreen] = useState<'home' | 'statement'>('home');
  const [internalTab, setInternalTab] = useState<'home' | 'missions' | 'wallet'>(controlledTab || 'home');
  const activeTab = controlledTab ?? internalTab;
  const setActiveTab = (tab: 'home' | 'missions' | 'wallet') => {
    setInternalTab(tab);
    onTabChange?.(tab);
  };
  const [scannerOpen, setScannerOpen] = useState(false);
  const [selectedMerchantIdForScan, setSelectedMerchantIdForScan] = useState<number | undefined>();
  const [showMyQr, setShowMyQr] = useState(false);
  const [registrationModalOpen, setRegistrationModalOpen] = useState(false);
  const [redeemModalOpen, setRedeemModalOpen] = useState(false);
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [mapModalShopId, setMapModalShopId] = useState<number | null>(null);

  const totalUserStamps = userStamps.reduce((acc, curr) => acc + curr.count, 0);

  const actions = [
    {
      icon: 'scan' as IconName,
      label: 'สแกน QR',
      detail: 'จ่ายสิทธิ์ 60/40',
      color: 'blue',
      onClick: () => {
        setSelectedMerchantIdForScan(undefined);
        setScannerOpen(true);
      }
    },
    {
      icon: 'qr' as IconName,
      label: 'QR ของฉัน',
      detail: 'รับสิทธิ์โครงการ',
      color: 'violet',
      onClick: () => setShowMyQr(true)
    },
    {
      icon: 'history' as IconName,
      label: 'สรุปรายรับ-รายจ่าย',
      detail: 'ประวัติ & สิทธิคงเหลือ',
      color: 'green',
      onClick: () => setCurrentScreen('statement')
    }
  ];

  if (currentScreen === 'statement') {
    return <CitizenStatementScreen onBack={() => setCurrentScreen('home')} />;
  }

  const DAILY_SUBSIDY_LIMIT = 200;
  const todayStr = new Date().toISOString().split('T')[0];
  const todayGovSpent = transactions
    .filter(t => t.userId === currentUser.userId && t.status === 'completed' && String(t.txTimestamp).startsWith(todayStr))
    .reduce((sum, t) => sum + (Number(t.govSubsidizedAmount) || 0), 0);
  const remainingDaily = Math.max(0, DAILY_SUBSIDY_LIMIT - todayGovSpent);

  return (
    <div className="pb-28">
      {/* Top Gradient Header */}
      <header className="relative overflow-hidden bg-gradient-to-br from-[#074cd5] via-[#1262ed] to-[#5088f3] px-5 pb-12 pt-5 text-white">
        <div className="absolute -right-12 -top-16 size-48 rounded-full border-[28px] border-white/10 pointer-events-none" />

        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="grid size-10 place-items-center rounded-xl bg-white text-lg font-extrabold text-[#0954df] shadow-lg">
              ไทย
            </div>
            <div>
              <p className="text-[11px] font-medium tracking-[.18em] text-blue-100 uppercase">
                THAI CHUAY THAI PLEASE
              </p>
              <p className="text-lg font-bold leading-tight">ไทยช่วยไทยพลีส</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => logout()}
              className="px-2.5 py-1 rounded-full bg-white/20 hover:bg-white/30 text-[11px] font-bold text-white flex items-center gap-1 backdrop-blur-xs transition-colors cursor-pointer"
            >
              <Icon name="logout" className="size-3" />
              <span>ออกจากระบบ</span>
            </button>
            <button
              onClick={() => setRegistrationModalOpen(true)}
              className="relative grid size-8 place-items-center rounded-full bg-white/15 hover:bg-white/25 transition-colors"
              aria-label="การแจ้งเตือน"
            >
              <Icon name="bell" />
              <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-[#ffd44d] ring-2 ring-[#1763e8]" />
            </button>
          </div>
        </div>

        <div className="relative mt-7 flex items-end justify-between">
          <div>
            <p className="text-sm text-blue-100">สวัสดี{currentUser?.name || 'คุณผู้ใช้งาน'}</p>
            <h1 className="mt-1 text-[24px] font-bold tracking-tight">สิทธิ์ 60/40 พร้อมใช้แล้ว</h1>
          </div>
          <div
            className="mb-1 rounded-full bg-white/20 px-3 py-1.5 text-xs font-semibold backdrop-blur text-white flex items-center gap-1 border border-white/20"
          >
            <span className="size-2 rounded-full bg-emerald-300 animate-pulse" />
            <span>ยืนยันตัวตนแล้ว</span>
          </div>
        </div>
      </header>

      {/* Overlapping Balance Card */}
      <section className="-mt-7 px-4">
        <div className="relative rounded-[22px] bg-white p-5 shadow-[0_12px_35px_rgba(22,68,150,.13)]">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-xs font-medium text-slate-500">วงเงินสิทธิรัฐช่วยจ่ายคงเหลือ</p>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                  รัฐช่วยสูงสุด ฿200/วัน
                </span>
              </div>
              <p className="mt-1 text-[28px] font-bold tracking-tight text-[#123b84]">
                ฿ {Number(userGrant?.remainingAmount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-600 inline-block">
                ใช้งานได้
              </span>
              <span className="block text-[10px] text-slate-400 mt-1 font-medium">
                วันนี้เหลือช่วย: <strong className="text-emerald-700 font-mono font-bold">฿{remainingDaily}</strong>
              </span>
            </div>
          </div>

          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#1769ed] to-[#5b93f6] transition-all duration-500"
              style={{
                width: `${Math.min(100, (Number(userGrant?.remainingAmount || 0) / (Number(userGrant?.totalGrantAmount) || 1000)) * 100)}%`
              }}
            />
          </div>

          <div className="mt-2.5 flex justify-between text-[11px] text-slate-400">
            <span>ใช้ไปแล้ว ฿{(Number(userGrant?.totalGrantAmount || 0) - Number(userGrant?.remainingAmount || 0)).toLocaleString()}</span>
            <span>รัฐออกให้ 60% (สูงสุด ฿200/วัน)</span>
          </div>

          {/* Wallet Balance Box */}
          <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-xl bg-blue-50 text-[#1769ed]">
                <Icon name="wallet" className="size-4" />
              </span>
              <div>
                <span className="text-[10px] text-slate-400 block">กระเป๋าเงิน</span>
                <span className="text-sm font-bold text-slate-800">
                  ฿ {Number(wallet?.balance || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
            <button
              onClick={() => topupWallet(500)}
              className="rounded-xl bg-[#eaf2ff] px-3 py-1.5 text-xs font-bold text-[#1769ed] hover:bg-blue-100 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Icon name="plus" className="size-3.5" />
              <span>เติมเงิน</span>
            </button>
          </div>
        </div>
      </section>

      {/* Action Tiles */}
      <section className="px-4 pt-5">
        <div className="grid grid-cols-3 gap-3">
          {actions.map(item => (
            <button
              key={item.label}
              onClick={item.onClick}
              className="group rounded-[22px] bg-white px-2 py-4 text-center shadow-[0_6px_22px_rgba(20,50,110,0.07)] hover:shadow-[0_10px_28px_rgba(20,50,110,0.12)] transition-all duration-200 active:scale-95 border border-slate-100/80 cursor-pointer flex flex-col items-center justify-between"
            >
              <span
                className={`mx-auto grid size-12 place-items-center rounded-2xl action-${item.color} shadow-xs group-hover:scale-105 transition-transform duration-200`}
              >
                <Icon name={item.icon} className="size-6" />
              </span>
              <span className="mt-2.5 block text-xs font-black text-slate-800 leading-snug group-hover:text-blue-600 transition-colors">
                {item.label}
              </span>
              <span className="mt-0.5 block text-[10px] text-slate-400 font-medium">
                {item.detail}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Main Tab Switcher */}
      <div className="px-4 pt-6">
        <div className="flex bg-[#e8effa] p-1 rounded-2xl text-xs font-bold text-slate-600">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex-1 py-2 rounded-xl transition-all ${
              activeTab === 'home' ? 'bg-white text-[#123b84] shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            ภาพรวม
          </button>
          <button
            onClick={() => setActiveTab('missions')}
            className={`flex-1 py-2 rounded-xl transition-all ${
              activeTab === 'missions' ? 'bg-white text-[#123b84] shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            ภารกิจ ({generalMissions.length + localAiShops.length})
          </button>
          <button
            onClick={() => setActiveTab('wallet')}
            className={`flex-1 py-2 rounded-xl transition-all ${
              activeTab === 'wallet' ? 'bg-white text-[#123b84] shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            แสตมป์ & OTOP ({totalUserStamps})
          </button>
        </div>
      </div>

      {/* TAB 1: HOME */}
      {activeTab === 'home' && (
        <div className="space-y-6">
          {/* Status Tracker Card (from snippet) */}
          <section className="px-4 pt-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">สถานะการเข้าร่วมโครงการ</h2>
              <button
                onClick={() => setRegistrationModalOpen(true)}
                className="text-xs font-semibold text-[#1769ed] hover:underline"
              >
                ดูรายละเอียด
              </button>
            </div>
            <button
              onClick={() => setRegistrationModalOpen(true)}
              className="w-full rounded-[22px] border border-blue-100 bg-white p-4 text-left shadow-sm hover:border-blue-300 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-blue-50 text-[#1769ed]">
                  <Icon name="shield" className="size-6" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-slate-800 text-sm">โครงการไทยช่วยไทยพลีส</p>
                    <Icon name="chevron" className="size-4 text-slate-400" />
                  </div>
                  <p className="mt-1 text-xs text-slate-500 font-mono">เลขคำขอ TH-2569-092841</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3">
                {['ลงทะเบียน', 'ตรวจสอบข้อมูล', 'อนุมัติแล้ว'].map((label, i) => (
                  <div key={label} className="relative text-center">
                    <span
                      className={`relative z-10 mx-auto grid size-6 place-items-center rounded-full text-[10px] font-bold ${
                        i < 3 ? 'bg-[#1769ed] text-white' : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      ✓
                    </span>
                    {i < 2 && <span className="absolute left-1/2 top-3 h-0.5 w-full bg-[#1769ed]" />}
                    <span className="mt-2 block text-[10px] font-medium text-slate-500">{label}</span>
                  </div>
                ))}
              </div>
            </button>
          </section>

          {/* AI Sales Boost Recommendation Card */}
          <section className="px-4">
            <div className="rounded-[22px] bg-gradient-to-br from-[#fff7e6] via-[#fffbf2] to-[#fff3d4] p-4 border border-amber-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="inline-flex items-center gap-1 bg-amber-500 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
                  <Icon name="sparkle" className="size-3" />
                  AI TARGET SHOP
                </span>
                <span className="text-[11px] font-bold text-amber-900">
                  {featuredAiShop ? 'ภารกิจชี้เป้าพิเศษจาก AI' : 'ภารกิจพิเศษชุมชน'}
                </span>
              </div>

              <div className="flex items-center gap-3 bg-white/90 p-3 rounded-2xl border border-amber-200/60 mt-2">
                <img
                  src={featuredAiShop?.imageUrl || "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=200&auto=format&fit=crop&q=80"}
                  alt={featuredAiShop?.merchantName || "ร้านค้าแนะนำ"}
                  className="size-14 rounded-xl object-cover shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-xs text-slate-800 line-clamp-1">
                    {featuredAiShop ? `${featuredAiShop.merchantName} (${featuredAiShop.districtName})` : 'ร้านกาแฟโบราณลุงเปี๊ยก (ท่าน้ำนนท์)'}
                  </h4>
                  <p className="text-[11px] text-amber-800 font-medium mt-0.5 line-clamp-1">
                    {featuredAiShop ? featuredAiShop.missionTitle : 'ซื้อครบตามเกณฑ์พื้นที่ รับแสตมป์ประจำอำเภอ'}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {featuredAiShop ? `${featuredAiShop.criticalHours} • AI วิเคราะห์ฟื้นฟูร้านค้า` : 'ช่วงบ่าย 13:00 - 16:00 น. • จำกัด 10 สิทธิ์แรก'}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => setMapModalShopId(featuredAiShop?.merchantId || 1)}
                  className="px-3 py-2.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1 shrink-0"
                >
                  <span>📍 ดูพิกัดร้าน</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMerchantIdForScan(featuredAiShop?.merchantId || 1);
                    setScannerOpen(true);
                  }}
                  className="flex-1 py-2.5 bg-[#d97706] hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-sm transition-colors flex items-center justify-center gap-1.5"
                >
                  <Icon name="scan" className="size-4" />
                  <span>สแกนจ่าย 60/40</span>
                </button>
              </div>
            </div>
          </section>

          {/* Recent 60/40 Transactions */}
          <section className="px-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">ประวัติการใช้สิทธิ์ล่าสุด</h2>
              <span className="text-xs text-slate-400">{transactions.length} รายการ</span>
            </div>

            <div className="space-y-2.5">
              {transactions.slice(0, 3).map(tx => (
                <div
                  key={tx.txId}
                  className="rounded-[20px] bg-white p-3.5 border border-slate-100 shadow-sm flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-[#1769ed]">
                      <Icon name="shop" className="size-5" />
                    </span>
                    <div>
                      <p className="font-bold text-xs text-slate-800">{tx.merchantName}</p>
                      <p className="text-[10px] text-slate-400">{tx.txTimestamp}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-extrabold text-sm text-slate-800 block">
                      ฿ {tx.totalAmount.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-medium">
                      คุณจ่าย ฿{tx.userPaidAmount} / รัฐช่วย ฿{tx.govSubsidizedAmount}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* TAB 2: MISSIONS */}
      {activeTab === 'missions' && (
        <section className="px-4 pt-5 space-y-4">
          {/* Section 1: AI Target Missions */}
          {localAiShops.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-gradient-to-r from-amber-500 to-amber-600 text-white p-3.5 rounded-[22px] shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-white/20 rounded-xl">
                    <Icon name="sparkle" className="size-4 text-white" />
                  </span>
                  <div>
                    <h3 className="font-extrabold text-sm">ภารกิจชี้เป้าฟื้นฟูร้านค้าจาก AI</h3>
                    <p className="text-[11px] text-amber-100">ซื้อในช่วงเวลาที่กำหนด รับแสตมป์ของอำเภอที่ร้านตั้งอยู่</p>
                  </div>
                </div>
                <span className="text-xs font-bold bg-white text-amber-700 px-2.5 py-1 rounded-full shadow-xs">
                  {localAiShops.length} ร้าน
                </span>
              </div>

              <div className="space-y-3">
                {localAiShops.map((shop) => (
                  <div
                    key={shop.analysisId}
                    className="rounded-[22px] bg-white p-4 border border-amber-200/70 shadow-sm space-y-3"
                  >
                    <div className="flex items-start gap-3">
                      <img
                        src={shop.imageUrl}
                        alt={shop.merchantName}
                        className="size-16 rounded-2xl object-cover border border-amber-200 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-extrabold text-white bg-amber-500 px-2 py-0.5 rounded-md">
                            AI TARGET
                          </span>
                          <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                            {shop.category}
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-slate-800 mt-1">{shop.merchantName}</h4>
                        <p className="text-xs text-amber-800 font-medium mt-0.5">{shop.missionTitle}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          📍 {shop.districtName} จังหวัด{shop.provinceName}
                        </p>
                        {shop.campaignStart && shop.campaignEnd && <p className="text-[11px] text-slate-500">{new Date(shop.campaignStart).toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok' })}–{new Date(new Date(shop.campaignEnd).getTime() - 1).toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok' })}</p>}
                      </div>
                    </div>

                    <div className="bg-amber-50/60 p-3 rounded-xl text-xs space-y-1.5 border border-amber-100">
                      <div className="flex justify-between text-slate-600">
                        <span>สถานะจาก AI:</span>
                        <strong className="text-amber-800 font-bold">ยอดขายชะลอตัว (ต้องการแรงหนุน)</strong>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>เงื่อนไขรับแสตมป์:</span>
                        <strong className="text-[#1769ed]">ซื้อในช่วงภารกิจ ไม่มียอดขั้นต่ำ</strong>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>ช่วงเวลาเร่งด่วน:</span>
                        <strong className="text-emerald-700">{shop.criticalHours}</strong>
                      </div>
                      <p className="text-[11px] text-slate-500">รับแสตมป์ AI ได้สูงสุด {shop.dailyStampLimit ?? 1} ดวงต่อคนต่อวัน รวมทุกร้านที่มีภารกิจ · ช่วงเวลาจากข้อมูลบิล ไม่ใช่เวลาทำการที่ร้านยืนยัน</p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setMapModalShopId(shop.merchantId)}
                        className="px-3 py-2.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1 shrink-0"
                      >
                        <span>📍 ดูพิกัดร้าน</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMerchantIdForScan(shop.merchantId);
                          setScannerOpen(true);
                        }}
                        className="flex-1 py-2.5 bg-[#d97706] hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Icon name="scan" className="size-4" />
                        <span>สแกนจ่ายที่ร้านนี้</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 2: General Missions */}
          <div className="flex items-center justify-between bg-white p-4 rounded-[22px] border border-blue-50 shadow-xs">
            <div>
              <h3 className="font-bold text-sm text-[#123b84]">ภารกิจกระตุ้นเศรษฐกิจชุมชน (General Missions)</h3>
              <p className="text-[11px] text-slate-500">ซื้อสินค้าตามเงื่อนไขเพื่อรับสิทธิและแสตมป์ดิจิทัล</p>
            </div>
            <span className="text-xs font-bold text-[#1769ed] bg-blue-50 px-2.5 py-1 rounded-full">
              {generalMissions.length} ภารกิจ
            </span>
          </div>

          <div className="space-y-3">
            {generalMissions.map(ms => {
              const merchant = merchants.find(shop => shop.mchId === ms.targetMerchantId);
              const stamp = districtStamps.find(s => s.distId === (merchant?.distId ?? ms.targetDistId));
              const progress = ms.maxRecipients ? Math.min(100, (ms.currentRecipients / ms.maxRecipients) * 100) : 0;
              return (
                <div
                  key={ms.missionId}
                  className="rounded-[22px] bg-white p-4 border border-slate-100 shadow-sm space-y-3"
                >
                  <div className="flex items-start gap-3">
                    {stamp && (
                      <img
                        src={stamp.imageUrl}
                        alt={stamp.stampName}
                        className="size-16 rounded-2xl object-cover border border-amber-200 shrink-0"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold text-[#1769ed] bg-blue-50 px-2 py-0.5 rounded-md">
                        {ms.category}
                      </span>
                      <h4 className="font-bold text-sm text-slate-800 mt-1">{ms.missionName}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">{ms.description}</p>
                    </div>
                  </div>

                  <div className="bg-[#f8faff] p-3 rounded-xl text-xs space-y-1.5 border border-blue-50">
                    <div className="flex justify-between text-slate-600">
                      <span>ร้านค้าเป้าหมาย:</span>
                      <strong className="text-slate-800">{ms.targetMerchantName || 'ร้านค้าชุมชน'}</strong>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>ยอดซื้อขั้นต่ำ:</span>
                      <strong className="text-[#1769ed]">{ms.minSpend == null ? 'ไม่มียอดขั้นต่ำ' : `฿ ${ms.minSpend} บาท (ใช้สิทธิ์ 60/40 ได้)`}</strong>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>สิทธิ์คงเหลือ:</span>
                      <strong className="text-emerald-600">
                        {ms.maxRecipients == null ? 'ไม่จำกัด' : `${Math.max(0, ms.maxRecipients - ms.currentRecipients)} / ${ms.maxRecipients} คน`}
                      </strong>
                    </div>
                    {ms.maxRecipients != null && <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden mt-1">
                      <div
                        className="bg-gradient-to-r from-[#1769ed] to-amber-500 h-1.5 rounded-full"
                        style={{ width: `${progress}%` }}
                      />
                    </div>}
                  </div>

                  <button
                    onClick={() => {
                      if (ms.targetMerchantId) {
                        setSelectedMerchantIdForScan(ms.targetMerchantId);
                      }
                      setScannerOpen(true);
                    }}
                    className="w-full py-2.5 bg-[#1769ed] hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Icon name="scan" className="size-4" />
                    <span>สแกนจ่ายทำภารกิจที่ร้านนี้</span>
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* TAB 3: STAMPS & OTOP REWARDS */}
      {activeTab === 'wallet' && (
        <section className="px-4 pt-5 space-y-5">
          {/* Stamp Passport Card */}
          <div className="rounded-[22px] bg-gradient-to-br from-[#0c2e68] via-[#103d8a] to-[#1769ed] p-5 text-white shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[10px] tracking-wider uppercase text-blue-200 font-bold">
                  DIGITAL DISTRICT STAMP
                </p>
                <h3 className="font-extrabold text-base">สมุดสะสมแสตมป์ชุมชน</h3>
              </div>
              <div className="flex items-center gap-2">
                {onOpenPassport && (
                  <button
                    type="button"
                    onClick={onOpenPassport}
                    className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-[11px] shadow-sm transition-all flex items-center gap-1 cursor-pointer border border-amber-300/60"
                  >
                    <span>📖 เปิดดูสมุดฉบับเต็ม</span>
                  </button>
                )}
                <div className="text-right">
                  <span className="text-[10px] text-blue-200 block leading-tight">สะสมแล้ว</span>
                  <p className="text-base font-black text-amber-300 leading-tight">{totalUserStamps} ดวง</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {districtStamps.map(stamp => {
                const count = userStamps.find(s => s.stampId === stamp.stampId)?.count || 0;
                const has = count > 0;
                return (
                  <div
                    key={stamp.stampId}
                    className={`p-3 rounded-2xl border transition-all flex flex-col items-center text-center ${
                      has
                        ? 'bg-white/15 backdrop-blur border-amber-300/40 shadow-sm'
                        : 'bg-white/5 border-white/10 opacity-50 grayscale'
                    }`}
                  >
                    <img
                      src={stamp.imageUrl}
                      alt={stamp.stampName}
                      className="size-14 rounded-xl object-cover mb-1.5 border border-white/20"
                    />
                    <p className="text-xs font-bold text-white line-clamp-1">{stamp.stampName}</p>
                    <span className="text-[10px] text-blue-200">{stamp.distName}</span>
                    {has && (
                      <div className="mt-2 w-full">
                        <span className="block w-full py-0.5 text-[10px] font-bold bg-amber-400 text-slate-900 rounded-md shadow-xs">
                          มี {count} ดวง
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* OTOP Rewards Redemption */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">แลกรับสินค้า OTOP & คูปองส่วนลด</h2>
              <span className="text-xs text-slate-400">ใช้แสตมป์แลก</span>
            </div>

            <div className="space-y-3">
              {rewards.map(reward => {
                const canRedeem = totalUserStamps >= reward.requiredStampCount;
                return (
                  <div
                    key={reward.rewardId}
                    className="rounded-[22px] bg-white p-3.5 border border-slate-100 shadow-sm flex items-center gap-3.5"
                  >
                    <img
                      src={reward.imageUrl}
                      alt={reward.rewardName}
                      className="size-20 rounded-2xl object-cover border border-slate-100 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md">
                        {reward.provinceName}
                      </span>
                      <h4 className="font-bold text-xs text-slate-800 mt-1 line-clamp-1">
                        {reward.rewardName}
                      </h4>
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{reward.description}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-700">
                          ⭐ ใช้ {reward.requiredStampCount} แสตมป์
                        </span>
                        <button
                          onClick={() => {
                            setSelectedReward(reward);
                            setRedeemModalOpen(true);
                          }}
                          disabled={!canRedeem}
                          className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors ${
                            canRedeem
                              ? 'bg-[#1769ed] hover:bg-blue-700 text-white cursor-pointer shadow-sm'
                              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          แลกรางวัล
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* MODALS */}
      <QRScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        presetMerchantId={selectedMerchantIdForScan}
      />

      <CitizenRegistrationModal
        isOpen={registrationModalOpen}
        onClose={() => setRegistrationModalOpen(false)}
      />

      <StampRedeemModal
        isOpen={redeemModalOpen}
        onClose={() => setRedeemModalOpen(false)}
        reward={selectedReward}
      />

      <StoreMapPickerModal
        isOpen={mapModalShopId !== null}
        onClose={() => setMapModalShopId(null)}
        mchId={mapModalShopId ?? undefined}
      />

      {/* POPUP "QR ของฉัน" (Real Dynamic QR Code & Token) */}
      <CitizenQrModal
        isOpen={showMyQr}
        onClose={() => setShowMyQr(false)}
      />
    </div>
  );
};

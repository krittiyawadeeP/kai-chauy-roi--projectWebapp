import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Icon, IconName } from '../common/Icon';
import { QRScannerModal } from './QRScannerModal';
import { CitizenRegistrationModal } from './CitizenRegistrationModal';
import { StampRedeemModal } from './StampRedeemModal';
import { StampTradeModal } from './StampTradeModal';
import { AuthModal } from '../auth/AuthModal';
import { StoreMapPickerModal } from '../merchant/StoreMapPickerModal';
import { Reward, DistrictStamp } from '../../types';

export const CitizenMobileView: React.FC = () => {
  const {
    currentUser,
    wallet,
    userGrant,
    missions,
    districtStamps,
    userStamps,
    rewards,
    transactions,
    topupWallet
  } = useApp();

  const [activeTab, setActiveTab] = useState<'home' | 'wallet' | 'missions' | 'status' | 'profile'>('home');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [selectedMerchantIdForScan, setSelectedMerchantIdForScan] = useState<number | undefined>();
  const [showMyQr, setShowMyQr] = useState(false);
  const [registrationModalOpen, setRegistrationModalOpen] = useState(false);
  const [redeemModalOpen, setRedeemModalOpen] = useState(false);
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [tradeModalOpen, setTradeModalOpen] = useState(false);
  const [selectedStampForTrade, setSelectedStampForTrade] = useState<DistrictStamp | null>(null);
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
      icon: 'status' as IconName,
      label: 'ติดตามสถานะ',
      detail: 'ตรวจสอบคำขอ 13 หลัก',
      color: 'green',
      onClick: () => setRegistrationModalOpen(true)
    }
  ];

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
              onClick={() => setAuthModalOpen(true)}
              className="px-2.5 py-1 rounded-full bg-white/20 hover:bg-white/30 text-[11px] font-bold text-white flex items-center gap-1 backdrop-blur-xs transition-colors"
            >
              <Icon name="user" className="size-3" />
              <span>เข้าสู่ระบบ</span>
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
          <button
            onClick={() => setAuthModalOpen(true)}
            className="mb-1 rounded-full bg-white/20 hover:bg-white/30 px-3 py-1.5 text-xs font-semibold backdrop-blur text-white flex items-center gap-1 cursor-pointer transition-colors border border-white/20"
            title="คลิกเพื่อสลับบัญชีหรือดูข้อมูลการยืนยันตัวตน"
          >
            <span className="size-2 rounded-full bg-emerald-300 animate-pulse" />
            <span>ยืนยันตัวตนแล้ว</span>
          </button>
        </div>
      </header>

      {/* Overlapping Balance Card */}
      <section className="-mt-7 px-4">
        <div className="relative rounded-[22px] bg-white p-5 shadow-[0_12px_35px_rgba(22,68,150,.13)]">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">วงเงินสิทธิรัฐช่วยจ่ายคงเหลือ (40%)</p>
              <p className="mt-1 text-[28px] font-bold tracking-tight text-[#123b84]">
                ฿ {userGrant.remainingAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-600">
              ใช้งานได้
            </div>
          </div>

          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#1769ed] to-[#5b93f6] transition-all duration-500"
              style={{
                width: `${Math.min(100, (userGrant.remainingAmount / userGrant.totalGrantAmount) * 100)}%`
              }}
            />
          </div>

          <div className="mt-2.5 flex justify-between text-[11px] text-slate-400">
            <span>ใช้ไปแล้ว ฿{(userGrant.totalGrantAmount - userGrant.remainingAmount).toLocaleString()}</span>
            <span>วงเงินรวม ฿{userGrant.totalGrantAmount.toLocaleString()}</span>
          </div>

          {/* Wallet Balance Box */}
          <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-xl bg-blue-50 text-[#1769ed]">
                <Icon name="wallet" className="size-4" />
              </span>
              <div>
                <span className="text-[10px] text-slate-400 block">กระเป๋าเงิน (คุณจ่าย 60%)</span>
                <span className="text-sm font-bold text-slate-800">
                  ฿ {wallet.balance.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
            <button
              onClick={() => topupWallet(500)}
              className="rounded-xl bg-[#eaf2ff] px-3 py-1.5 text-xs font-bold text-[#1769ed] hover:bg-blue-100 transition-colors flex items-center gap-1"
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
              className="rounded-2xl bg-white px-2 py-4 text-center shadow-[0_5px_20px_rgba(31,65,120,.07)] transition active:scale-95 border border-slate-100/60"
            >
              <span
                className={`mx-auto grid size-12 place-items-center rounded-2xl action-${item.color}`}
              >
                <Icon name={item.icon} className="size-6" />
              </span>
              <span className="mt-3 block text-sm font-bold text-slate-800">{item.label}</span>
              <span className="mt-0.5 block text-[10px] text-slate-400">{item.detail}</span>
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
            ภารกิจ AI ({missions.length})
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
                <span className="text-[11px] font-bold text-amber-900">ภารกิจพิเศษชุมชน</span>
              </div>

              <div className="flex items-center gap-3 bg-white/90 p-3 rounded-2xl border border-amber-200/60 mt-2">
                <img
                  src="https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=200&auto=format&fit=crop&q=80"
                  alt="ร้านกาแฟโบราณลุงเปี๊ยก"
                  className="size-14 rounded-xl object-cover shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-xs text-slate-800 line-clamp-1">
                    ร้านกาแฟโบราณลุงเปี๊ยก (ท่าน้ำนนท์)
                  </h4>
                  <p className="text-[11px] text-amber-800 font-medium mt-0.5">
                    ซื้อครบ 150 บาท รับแสตมป์ของดีเมืองนนท์ทันที
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">ช่วงบ่าย 13:00 - 16:00 น. • จำกัด 10 สิทธิ์แรก</p>
                </div>
              </div>

              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => setMapModalShopId(1)}
                  className="px-3 py-2.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1 shrink-0"
                >
                  <span>📍 ดูพิกัดร้าน</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMerchantIdForScan(1);
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
        <section className="px-4 pt-5 space-y-3">
          <div className="flex items-center justify-between bg-white p-4 rounded-[22px] border border-blue-50 shadow-xs">
            <div>
              <h3 className="font-bold text-sm text-[#123b84]">ภารกิจกระตุ้นเศรษฐกิจชุมชน (General Missions)</h3>
              <p className="text-[11px] text-slate-500">ซื้อสินค้าตามเงื่อนไขเพื่อรับสิทธิและแสตมป์ดิจิทัล</p>
            </div>
            <span className="text-xs font-bold text-[#1769ed] bg-blue-50 px-2.5 py-1 rounded-full">
              {missions.length} ภารกิจ
            </span>
          </div>

          <div className="space-y-3">
            {missions.map(ms => {
              const stamp = districtStamps.find(s => s.stampId === ms.rewardStampId);
              const progress = Math.min(100, (ms.currentRecipients / ms.maxRecipients) * 100);
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
                      <strong className="text-[#1769ed]">฿ {ms.minSpend} บาท (ใช้สิทธิ์ 60/40 ได้)</strong>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>สิทธิ์คงเหลือ:</span>
                      <strong className="text-emerald-600">
                        {ms.maxRecipients - ms.currentRecipients} / {ms.maxRecipients} คน
                      </strong>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden mt-1">
                      <div
                        className="bg-gradient-to-r from-[#1769ed] to-amber-500 h-1.5 rounded-full"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
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
              <div className="text-right">
                <span className="text-[11px] text-blue-200">สะสมแล้ว</span>
                <p className="text-xl font-black text-amber-300">{totalUserStamps} ดวง</p>
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
                      <div className="mt-2 flex items-center gap-1 w-full">
                        <span className="flex-1 py-0.5 text-[10px] font-bold bg-amber-400 text-slate-900 rounded-md">
                          มี {count} ดวง
                        </span>
                        <button
                          onClick={() => {
                            setSelectedStampForTrade(stamp);
                            setTradeModalOpen(true);
                          }}
                          className="p-1 rounded-md bg-white/20 hover:bg-white/30 text-white"
                          title="แลกเปลี่ยนแสตมป์"
                        >
                          <Icon name="repeat" className="size-3" />
                        </button>
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

      <StampTradeModal
        isOpen={tradeModalOpen}
        onClose={() => setTradeModalOpen(false)}
        stamp={selectedStampForTrade}
      />

      {/* POPUP "QR ของฉัน" (Matching User Snippet with .qr pattern) */}
      {showMyQr && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-[#07162d]/70 p-5 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowMyQr(false)}
        >
          <div
            className="w-full max-w-[360px] rounded-[28px] bg-white p-6 text-center shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <p className="text-xl font-bold text-slate-800">QR รับสิทธิ์ของฉัน</p>
            <p className="mt-1 text-xs text-slate-500">แสดง QR นี้ให้ร้านค้าเพื่อชำระเงินสิทธิ์ 60/40</p>
            <div className="qr mx-auto my-5 grid size-52 place-items-center rounded-2xl border-8 border-white shadow-lg">
              <div className="grid size-12 place-items-center rounded-xl bg-[#1769ed] text-sm font-extrabold text-white shadow-md">
                ไทย
              </div>
            </div>
            <p className="font-bold text-slate-800 text-base">{currentUser?.name || 'นายกิตติคุณ ศรีสวัสดิ์'}</p>
            <p className="mt-1 text-xs text-slate-400 font-mono">
              รหัสประชาชน {currentUser?.citizenId || '1-1037-02948-11-2'}
            </p>
            <p className="mt-1 text-xs text-blue-600 font-medium">QR จะรีเฟรชอัตโนมัติใน 02:45 นาที</p>
            <button
              onClick={() => setShowMyQr(false)}
              className="mt-5 w-full rounded-xl bg-[#1769ed] hover:bg-blue-700 py-3 text-sm font-bold text-white transition-colors shadow-md shadow-blue-500/20"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Icon, IconName } from '../common/Icon';
import { AISalesAnalysis } from '../../types';

export const AdminPortalView: React.FC = () => {
  const {
    merchants,
    approveMerchant,
    rejectMerchant,
    aiAnalysis,
    missions,
    createMission,
    districtStamps,
    rewards,
    getMetrics,
    triggerAIReanalysis
  } = useApp();

  const [activeTab, setActiveTab] = useState<'ai' | 'missions' | 'merchants' | 'impact'>('ai');
  const [newMissionModalOpen, setNewMissionModalOpen] = useState(false);
  const [missionName, setMissionName] = useState('');
  const [description, setDescription] = useState('');
  const [targetMchId, setTargetMchId] = useState<number>(merchants[0]?.mchId || 1);
  const [minSpend, setMinSpend] = useState<number>(150);
  const [maxRecipients, setMaxRecipients] = useState<number>(10);
  const [rewardStampId, setRewardStampId] = useState<number>(1);
  const [missionCategory, setMissionCategory] = useState<string>('กระตุ้นยอดขายช่วงบ่าย (AI)');

  const metrics = getMetrics();

  const handleCreateMissionFromAI = (item: AISalesAnalysis) => {
    const target = merchants.find(m => m.mchId === item.merchantId);
    setMissionName(`อิ่มอร่อย ช่วยร้าน ${target?.shopName || 'ชุมชน'}`);
    setDescription(`ซื้อสินค้าที่ร้าน ${target?.shopName} ครบ ${item.salesRatio < 0.5 ? 150 : 200} บาท ในช่วงเวลา ${item.criticalHours} รับฟรีแสตมป์ดิจิทัลทันที!`);
    setTargetMchId(item.merchantId);
    setMinSpend(150);
    setMaxRecipients(10);
    setRewardStampId(districtStamps.find(s => s.distId === target?.distId)?.stampId || 1);
    setMissionCategory(`กระตุ้นยอดขายช่วงวิกฤต (${item.criticalHours})`);
    setNewMissionModalOpen(true);
  };

  const handleSaveMission = (e: React.FormEvent) => {
    e.preventDefault();
    const targetShop = merchants.find(m => m.mchId === targetMchId);
    createMission({
      missionName,
      description,
      targetMerchantId: targetMchId,
      targetMerchantName: targetShop?.shopName,
      targetDistId: targetShop?.distId,
      minSpend,
      maxRecipients,
      rewardStampId,
      category: missionCategory,
      startDateTime: new Date().toISOString().replace('T', ' ').substring(0, 19),
      endDateTime: new Date(Date.now() + 7 * 86400000).toISOString().replace('T', ' ').substring(0, 19),
      status: 'active'
    });
    setNewMissionModalOpen(false);
  };

  return (
    <div className="pb-28">
      {/* Top Header - เหลืองนวล (Warm Golden Yellow / Amber Cream Gradient) */}
      <header className="relative overflow-hidden bg-gradient-to-br from-[#78350f] via-[#b45309] to-[#f59e0b] px-5 pb-12 pt-5 text-white">
        <div className="absolute -right-12 -top-16 size-48 rounded-full border-[28px] border-white/10 pointer-events-none" />

        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="grid size-10 place-items-center rounded-xl bg-[#fffbeb] text-lg font-extrabold text-[#b45309] shadow-lg">
              รัฐ
            </div>
            <div>
              <p className="text-[11px] font-medium tracking-[.18em] text-amber-100 uppercase">
                GOVERNMENT ADMIN PORTAL
              </p>
              <p className="text-lg font-bold leading-tight">ระบบพอร์ทัลภาครัฐ (เหลืองนวล)</p>
            </div>
          </div>
          <button
            onClick={triggerAIReanalysis}
            className="rounded-full bg-white/20 px-3 py-1.5 text-xs font-semibold backdrop-blur hover:bg-white/30 transition-colors flex items-center gap-1.5 border border-white/20"
          >
            <Icon name="refresh" className="size-3.5" />
            <span>รัน AI</span>
          </button>
        </div>

        <div className="relative mt-7 flex items-end justify-between">
          <div>
            <p className="text-sm text-amber-100">เจ้าหน้าที่กระทรวงการคลัง/พาณิชย์</p>
            <h1 className="mt-1 text-[22px] font-bold tracking-tight">
              กำกับดูแลและกระตุ้นเศรษฐกิจ
            </h1>
          </div>
          <div className="mb-1 rounded-full bg-[#fef3c7] text-[#92400e] px-3 py-1.5 text-xs font-bold shadow-xs flex items-center gap-1 border border-[#fde68a]">
            <span className="size-2 rounded-full bg-amber-500" />
            aipass.go.th
          </div>
        </div>
      </header>

      {/* Summary KPI Card */}
      <section className="-mt-7 px-4">
        <div className="relative rounded-[22px] bg-white p-5 shadow-[0_12px_35px_rgba(180,83,9,.14)] border border-amber-100/80">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">ยอดเงินหมุนเวียน 60/40 ในระบบ</p>
              <p className="mt-1 text-[28px] font-bold tracking-tight text-[#78350f]">
                ฿ {metrics.totalTransactionVolume.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-[#b45309] border border-amber-200">
              ฟื้นตัว 84.5%
            </span>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-center">
            <div className="bg-[#fffdf5] p-2 rounded-xl border border-amber-100/60">
              <span className="text-[10px] text-slate-400 block">ร้านค้าเข้าร่วม</span>
              <span className="text-xs font-bold text-[#b45309]">{metrics.participatingShops} ร้าน</span>
            </div>
            <div className="bg-[#fffdf5] p-2 rounded-xl border border-amber-100/60">
              <span className="text-[10px] text-slate-400 block">ภารกิจที่เปิด</span>
              <span className="text-xs font-bold text-[#d97706]">{metrics.activeMissions} ภารกิจ</span>
            </div>
            <div className="bg-[#fffdf5] p-2 rounded-xl border border-amber-100/60">
              <span className="text-[10px] text-slate-400 block">แสตมป์ที่แจก</span>
              <span className="text-xs font-bold text-amber-700">{metrics.stampsIssued} ดวง</span>
            </div>
          </div>
        </div>
      </section>

      {/* Action / Quick trigger buttons */}
      <section className="px-4 pt-4">
        <button
          onClick={() => setNewMissionModalOpen(true)}
          className="w-full py-3 bg-[#d97706] hover:bg-[#b45309] text-white rounded-2xl font-bold text-xs shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
        >
          <Icon name="plus" className="size-4" />
          <span>+ สร้างภารกิจกระตุ้นเศรษฐกิจใหม่ (General Mission)</span>
        </button>
      </section>

      {/* Tab Switcher */}
      <div className="px-4 pt-5">
        <div className="flex bg-[#fef3c7]/60 p-1 rounded-2xl text-xs font-bold text-amber-950">
          <button
            onClick={() => setActiveTab('ai')}
            className={`flex-1 py-2 rounded-xl transition-all ${
              activeTab === 'ai' ? 'bg-white text-[#92400e] shadow-xs' : 'hover:text-amber-900'
            }`}
          >
            AI วิเคราะห์ยอด
          </button>
          <button
            onClick={() => setActiveTab('missions')}
            className={`flex-1 py-2 rounded-xl transition-all ${
              activeTab === 'missions' ? 'bg-white text-[#92400e] shadow-xs' : 'hover:text-amber-900'
            }`}
          >
            ภารกิจ ({missions.length})
          </button>
          <button
            onClick={() => setActiveTab('merchants')}
            className={`flex-1 py-2 rounded-xl transition-all ${
              activeTab === 'merchants' ? 'bg-white text-[#92400e] shadow-xs' : 'hover:text-amber-900'
            }`}
          >
            ร้านค้า ({merchants.length})
          </button>
          <button
            onClick={() => setActiveTab('impact')}
            className={`flex-1 py-2 rounded-xl transition-all ${
              activeTab === 'impact' ? 'bg-white text-[#92400e] shadow-xs' : 'hover:text-amber-900'
            }`}
          >
            ผลกระทบ
          </button>
        </div>
      </div>

      {/* TAB 1: AI SALES ANALYSIS */}
      {activeTab === 'ai' && (
        <section className="px-4 pt-4 space-y-3">
          <div className="text-xs text-slate-500 px-1 flex justify-between items-center">
            <span>ตรวจจับร้านค้าที่ยอดตกช่วงบ่าย 13:00 - 16:00 น.</span>
            <span className="font-bold text-rose-600">
              {aiAnalysis.filter(a => a.boostRecommended).length} ร้านต้องการแรงกระตุ้น
            </span>
          </div>

          <div className="space-y-3">
            {aiAnalysis.map(item => {
              const target = merchants.find(m => m.mchId === item.merchantId);
              return (
                <div
                  key={item.analysisId}
                  className="rounded-[22px] bg-white p-4 border border-amber-100 shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-slate-800">{item.merchantName}</h4>
                      <p className="text-xs text-slate-400">{target?.category} • {target?.address}</p>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        item.salesStatus === 'critical_low'
                          ? 'bg-rose-50 text-rose-700'
                          : item.salesStatus === 'low'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {item.salesStatus === 'critical_low' ? 'วิกฤต: ยอดตก > 50%' : 'ยอดขายปกติ'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-[#fffdf5] p-2.5 rounded-xl text-center text-xs border border-amber-100">
                    <div>
                      <span className="text-[10px] text-slate-400 block">ยอดขายจริง</span>
                      <strong className="text-rose-600">฿ {item.salesAmount.toLocaleString()}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">ยอดเฉลี่ยปกติ</span>
                      <strong className="text-slate-700">฿ {item.averageSales.toLocaleString()}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">ช่วงวิกฤต</span>
                      <strong className="text-amber-800">{item.criticalHours}</strong>
                    </div>
                  </div>

                  <div className="text-xs text-slate-600 bg-amber-50/70 p-2.5 rounded-xl border border-amber-100">
                    <p className="font-medium">{item.aiInsight}</p>
                  </div>

                  {item.boostRecommended && (
                    <button
                      onClick={() => handleCreateMissionFromAI(item)}
                      className="w-full py-2 bg-[#d97706] hover:bg-[#b45309] text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Icon name="sparkle" className="size-3.5" />
                      <span>สร้าง General Mission ช่วยร้านนี้ทันที (1-Click)</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* TAB 2: MISSIONS */}
      {activeTab === 'missions' && (
        <section className="px-4 pt-4 space-y-3">
          {missions.map(ms => (
            <div
              key={ms.missionId}
              className="rounded-[22px] bg-white p-4 border border-amber-100 shadow-sm space-y-2"
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold text-[#b45309] bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    {ms.category}
                  </span>
                  <h4 className="font-bold text-sm text-slate-800 mt-1">{ms.missionName}</h4>
                </div>
                <span className="text-[10px] font-bold bg-amber-50 text-[#b45309] px-2.5 py-0.5 rounded-full border border-amber-200">
                  เปิดรับสิทธิ์
                </span>
              </div>
              <p className="text-xs text-slate-500">{ms.description}</p>
              <div className="pt-2 flex justify-between text-xs text-slate-500 border-t border-slate-50">
                <span>ยอดขั้นต่ำ ฿{ms.minSpend}</span>
                <span className="font-bold text-[#b45309]">
                  รับแล้ว {ms.currentRecipients}/{ms.maxRecipients} คน
                </span>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* TAB 3: MERCHANTS */}
      {activeTab === 'merchants' && (
        <section className="px-4 pt-4 space-y-3">
          {merchants.map(m => {
            const isPending = m.status === 'pending';
            return (
              <div
                key={m.mchId}
                className="rounded-[22px] bg-white p-4 border border-amber-100 shadow-sm flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={m.imageUrl}
                    alt={m.shopName}
                    className="size-12 rounded-xl object-cover border border-slate-100"
                  />
                  <div>
                    <h4 className="font-bold text-xs text-slate-800">{m.shopName}</h4>
                    <p className="text-[10px] text-slate-400">{m.category} • {m.ownerName}</p>
                    <span
                      className={`text-[9px] font-bold px-2 py-0.2 rounded-full inline-block mt-0.5 ${
                        m.status === 'approved'
                          ? 'bg-amber-50 text-[#92400e] border border-amber-200'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {m.status === 'approved' ? 'อนุมัติแล้ว' : 'รอตรวจสอบ'}
                    </span>
                  </div>
                </div>

                {isPending && (
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => approveMerchant(m.mchId)}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold"
                    >
                      อนุมัติ
                    </button>
                    <button
                      onClick={() => rejectMerchant(m.mchId)}
                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold"
                    >
                      ปฏิเสธ
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}

      {/* TAB 4: SOCIAL IMPACT METRICS */}
      {activeTab === 'impact' && (
        <section className="px-4 pt-4 space-y-3">
          {/* Revenue Breakdown KPIs for Whole System */}
          <div className="rounded-[22px] bg-white p-4 border border-amber-200/80 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="grid size-7 place-items-center rounded-lg bg-[#b45309] text-white">
                  <Icon name="wallet" className="size-3.5" />
                </span>
                <span className="text-xs font-bold text-slate-800">
                  สรุปยอดเงินหมุนเวียน 60/40 (Macro Revenue KPIs)
                </span>
              </div>
              <span className="text-[10px] bg-amber-50 text-amber-800 font-bold px-2 py-0.5 rounded-full border border-amber-200">
                aipass.go.th
              </span>
            </div>

            {/* Total System Revenue */}
            <div className="p-3 bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl text-white">
              <span className="text-[10px] text-amber-100 block">ยอดรวมทั้งสิ้นในระบบ (Total Revenue)</span>
              <p className="text-2xl font-extrabold font-mono mt-0.5">
                ฿ {metrics.totalTransactionVolume.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
              </p>
            </div>

            {/* 60% vs 40% Split */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-blue-50 rounded-xl border border-blue-200">
                <span className="text-[10px] text-blue-700 block font-bold">ประชาชนจ่าย QR (40%)</span>
                <span className="text-sm font-extrabold text-blue-900 font-mono">
                  ฿ {metrics.userSpentTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200">
                <span className="text-[10px] text-emerald-700 block font-bold">รัฐโอนสมทบพร้อมเพย์ (60%)</span>
                <span className="text-sm font-extrabold text-emerald-900 font-mono">
                  ฿ {metrics.govSubsidizedTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* PromptPay status */}
            <div className="p-2 bg-emerald-50/80 rounded-xl border border-emerald-200 flex items-center justify-between text-[10px] text-emerald-900">
              <span className="flex items-center gap-1">
                <span>✓</span>
                <span>โอนเงินสมทบ 60% เข้าบัญชีพร้อมเพย์ร้านค้าครบ 100%</span>
              </span>
              <span className="font-bold text-emerald-700 font-mono">ธปท. Verified</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-[20px] bg-white p-3.5 border border-amber-100 shadow-xs">
              <span className="text-[10px] text-slate-400 block">ร้านค้าที่ได้รับประโยชน์</span>
              <p className="text-xl font-bold text-slate-800 mt-0.5">{metrics.participatingShops} ร้านค้า</p>
            </div>
            <div className="rounded-[20px] bg-white p-3.5 border border-amber-100 shadow-xs">
              <span className="text-[10px] text-slate-400 block">Low-Sales Recovery Rate</span>
              <p className="text-xl font-bold text-emerald-600 mt-0.5">{metrics.lowSalesRecoveryRate}%</p>
            </div>
            <div className="rounded-[20px] bg-white p-3.5 border border-amber-100 shadow-xs">
              <span className="text-[10px] text-slate-400 block">แสตมป์ดิจิทัลที่แจก</span>
              <p className="text-xl font-bold text-[#b45309] mt-0.5">{metrics.stampsIssued} ดวง</p>
            </div>
            <div className="rounded-[20px] bg-white p-3.5 border border-amber-100 shadow-xs">
              <span className="text-[10px] text-slate-400 block">มูลค่าแลกสินค้า OTOP</span>
              <p className="text-xl font-bold text-rose-600 mt-0.5">฿{metrics.otopRedemptionVolume.toLocaleString()}</p>
            </div>
          </div>
        </section>
      )}

      {/* CREATE MISSION MODAL */}
      {newMissionModalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#07162d]/70 p-5 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-[380px] rounded-[28px] bg-white p-6 shadow-2xl border border-amber-200">
            <h3 className="font-bold text-base text-[#78350f] mb-1">สร้าง General Mission ใหม่</h3>
            <p className="text-xs text-slate-400 mb-3">กระตุ้นยอดขายให้แก่ร้านค้ารายย่อยเป้าหมาย</p>

            <form onSubmit={handleSaveMission} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">ชื่อภารกิจ</label>
                <input
                  type="text"
                  required
                  value={missionName}
                  onChange={e => setMissionName(e.target.value)}
                  placeholder="เช่น อิ่มอร่อย ช่วยร้านชุมชน"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#d97706]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">ร้านค้าเป้าหมาย</label>
                <select
                  value={targetMchId}
                  onChange={e => setTargetMchId(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none bg-white"
                >
                  {merchants.map(m => (
                    <option key={m.mchId} value={m.mchId}>
                      {m.shopName} {m.isAiTarget ? '⭐ [AI แนะนำ]' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">ยอดซื้อขั้นต่ำ</label>
                  <input
                    type="number"
                    value={minSpend}
                    onChange={e => setMinSpend(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">จำกัดสิทธิ์แรก</label>
                  <input
                    type="number"
                    value={maxRecipients}
                    onChange={e => setMaxRecipients(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">คำอธิบาย</label>
                <textarea
                  rows={2}
                  required
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNewMissionModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#d97706] hover:bg-[#b45309] text-white rounded-xl font-bold shadow-md shadow-amber-500/20"
                >
                  บันทึกภารกิจ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Icon } from '../common/Icon';
import { AISalesAnalysis } from '../../types';

export const AdminPortalView: React.FC<{ activeSection?: 'ai' | 'missions' | 'merchants' }> = ({ activeSection = 'missions' }) => {
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

  const activeTab = activeSection;
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
    <div className="legacy-admin space-y-5 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><p className="admin-eyebrow">การดำเนินงานโครงการ</p><h1 className="mt-1 text-2xl font-semibold text-slate-900">{activeTab === 'missions' ? 'จัดการภารกิจโครงการ' : activeTab === 'ai' ? 'วิเคราะห์สถานการณ์ร้านค้า' : 'ทะเบียนร้านค้า'}</h1></div>
        {activeTab !== 'merchants' && <button className="admin-primary" onClick={() => setNewMissionModalOpen(true)}><Icon name="plus" className="size-4" />สร้าง General Mission</button>}
        {activeTab === 'ai' && <button className="admin-secondary" onClick={triggerAIReanalysis}>ประมวลผลการวิเคราะห์</button>}
      </div>
      {/* TAB: AI SALES ANALYSIS */}
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

      {/* TAB: MISSIONS */}
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

      {/* TAB: MERCHANTS */}
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

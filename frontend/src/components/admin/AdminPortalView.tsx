import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { Icon, IconName } from '../common/Icon';
import { AISalesAnalysis } from '../../types';
import { adminService, DashboardData, GrantRecord, PolicyRecord } from '../../services/adminService';

// ─────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────
const thb = (n: number) => `฿\u00A0${n.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;

// ─────────────────────────────────────────────
// Dashboard Tab
// ─────────────────────────────────────────────
const DashboardTab: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const d = await adminService.getDashboard();
      setData(d);
    } catch {
      setError('โหลดข้อมูล Dashboard ไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="px-4 pt-8 text-center text-xs text-slate-400 animate-pulse">กำลังโหลด...</div>;
  if (error) return (
    <div className="px-4 pt-4">
      <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-700 text-center">
        {error}
        <button onClick={load} className="block mx-auto mt-2 font-bold underline">ลองใหม่</button>
      </div>
    </div>
  );
  if (!data) return null;

  const { transactions: tx, grants: g } = data;
  const budgetUsedPct = g.totalAllocated > 0 ? Math.min(100, (g.totalSpent / g.totalAllocated) * 100) : 0;

  return (
    <section className="px-4 pt-4 space-y-4">
      {/* ── รายรับ (Revenue) ── */}
      <div className="rounded-[22px] bg-white p-4 border border-amber-100 shadow-sm space-y-3">
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">รายรับรวมในระบบ (Revenue)</p>

        <div className="p-3 bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl text-white">
          <span className="text-[10px] text-amber-100 block">ยอดรวมธุรกรรมทั้งหมด</span>
          <p className="text-2xl font-extrabold font-mono mt-0.5">{thb(tx.totalRevenue)}</p>
          <span className="text-[10px] text-amber-200">{tx.count.toLocaleString()} รายการ</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 bg-blue-50 rounded-xl border border-blue-200">
            <span className="text-[10px] text-blue-700 block font-bold">ประชาชนจ่าย (60%)</span>
            <span className="text-sm font-extrabold text-blue-900 font-mono">{thb(tx.userPaid)}</span>
          </div>
          <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200">
            <span className="text-[10px] text-emerald-700 block font-bold">รัฐอุดหนุน (40%)</span>
            <span className="text-sm font-extrabold text-emerald-900 font-mono">{thb(tx.govSubsidized)}</span>
          </div>
        </div>
      </div>

      {/* ── รายจ่าย (Budget/Grants) ── */}
      <div className="rounded-[22px] bg-white p-4 border border-amber-100 shadow-sm space-y-3">
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">รายจ่ายงบประมาณ (Budget)</p>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200">
            <span className="text-[10px] text-amber-700 block font-bold">งบจัดสรรรวม</span>
            <span className="text-sm font-extrabold text-amber-900 font-mono">{thb(g.totalAllocated)}</span>
          </div>
          <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-200">
            <span className="text-[10px] text-rose-700 block font-bold">ใช้ไปแล้ว</span>
            <span className="text-sm font-extrabold text-rose-900 font-mono">{thb(g.totalSpent)}</span>
          </div>
          <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200">
            <span className="text-[10px] text-emerald-700 block font-bold">คงเหลือ</span>
            <span className="text-sm font-extrabold text-emerald-900 font-mono">{thb(g.totalRemaining)}</span>
          </div>
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-500 block font-bold">สิทธิ์ที่เปิดใช้</span>
            <span className="text-sm font-extrabold text-slate-800">{g.activeGrants} / {g.count} ราย</span>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-[10px] text-slate-400 mb-1">
            <span>งบที่ใช้ไป</span>
            <span className="font-bold text-rose-600">{budgetUsedPct.toFixed(1)}%</span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-rose-500 rounded-full transition-all duration-700"
              style={{ width: `${budgetUsedPct}%` }}
            />
          </div>
        </div>
      </div>

      <button
        onClick={load}
        className="w-full py-2.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors"
      >
        รีเฟรชข้อมูล
      </button>
    </section>
  );
};

// ─────────────────────────────────────────────
// Budget Allocation Tab
// ─────────────────────────────────────────────
const BudgetTab: React.FC = () => {
  const [grants, setGrants] = useState<GrantRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Policy state
  const [policy, setPolicy] = useState<PolicyRecord | null>(null);
  const [policyHistory, setPolicyHistory] = useState<PolicyRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [newGovRatio, setNewGovRatio] = useState<number>(40);
  const [newGrantAmount, setNewGrantAmount] = useState<number>(1000);
  const [policyNote, setPolicyNote] = useState('');
  const [policySubmitting, setPolicySubmitting] = useState(false);
  const [policyMsg, setPolicyMsg] = useState('');

  // Grant form state
  const [citizenId, setCitizenId] = useState('');
  const [grantName, setGrantName] = useState('โครงการไทยช่วยไทย');
  const [amount, setAmount] = useState<number>(1000);
  const [govRatio, setGovRatio] = useState<number>(40);

  const loadGrants = useCallback(async () => {
    setLoading(true);
    try {
      const list = await adminService.getGrants();
      setGrants(list);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, []);

  const loadPolicy = useCallback(async () => {
    try {
      const p = await adminService.getPolicy();
      setPolicy(p);
      setNewGovRatio(Math.round(parseFloat(p.Gov_Pay_Ratio) * 100));
      setNewGrantAmount(parseFloat(p.Grant_Amount));
      // Also pre-fill grant form
      setGovRatio(Math.round(parseFloat(p.Gov_Pay_Ratio) * 100));
      setAmount(parseFloat(p.Grant_Amount));
    } catch { /* silent */ }
  }, []);

  useEffect(() => { loadGrants(); loadPolicy(); }, [loadGrants, loadPolicy]);

  const handleSetPolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    setPolicySubmitting(true);
    setPolicyMsg('');
    try {
      const p = await adminService.setPolicy({
        Gov_Pay_Ratio: newGovRatio / 100,
        Grant_Amount: newGrantAmount,
        Note: policyNote || undefined,
      });
      setPolicy(p);
      setGovRatio(newGovRatio);
      setAmount(newGrantAmount);
      setPolicyMsg(`✓ อัปเดตอัตราเป็น รัฐ ${newGovRatio}% / ประชาชน ${100 - newGovRatio}% แล้ว`);
      setPolicyNote('');
      // Refresh history
      adminService.getPolicyHistory().then(setPolicyHistory);
    } catch (err: unknown) {
      setPolicyMsg(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    } finally {
      setPolicySubmitting(false);
    }
  };

  const loadHistory = async () => {
    const h = await adminService.getPolicyHistory();
    setPolicyHistory(h);
    setShowHistory(true);
  };

  const handleAllocate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!citizenId.trim() || amount <= 0) return;
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await adminService.allocateGrant({
        Citizen_ID: citizenId.trim(),
        Grant_Name: grantName || 'โครงการไทยช่วยไทย',
        Total_Grant_Amount: amount,
      });
      setSuccess(`จัดสรรงบสำเร็จ ฿${amount.toLocaleString()} ให้ ${citizenId}`);
      setCitizenId('');
      loadGrants();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาด';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="px-4 pt-4 space-y-4">

      {/* ── Policy: Current Rate ── */}
      <div className="rounded-[22px] bg-white p-4 border border-amber-200 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-[#78350f]">อัตราสมทบโครงการ (นโยบายปัจจุบัน)</p>
          <button
            onClick={showHistory ? () => setShowHistory(false) : loadHistory}
            className="text-[10px] text-amber-700 hover:text-amber-900 font-bold underline"
          >
            {showHistory ? 'ซ่อนประวัติ' : 'ดูประวัติ'}
          </button>
        </div>

        {policy && (
          <div className="grid grid-cols-3 gap-2 text-center text-xs mb-3">
            <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200">
              <span className="text-[10px] text-emerald-700 block font-bold">รัฐจ่าย</span>
              <span className="text-lg font-black text-emerald-800">{Math.round(parseFloat(policy.Gov_Pay_Ratio) * 100)}%</span>
            </div>
            <div className="p-2.5 bg-blue-50 rounded-xl border border-blue-200">
              <span className="text-[10px] text-blue-700 block font-bold">ประชาชนจ่าย</span>
              <span className="text-lg font-black text-blue-800">{Math.round(parseFloat(policy.User_Pay_Ratio) * 100)}%</span>
            </div>
            <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200">
              <span className="text-[10px] text-amber-700 block font-bold">วงเงิน/สิทธิ์</span>
              <span className="text-base font-black text-amber-800">฿{parseFloat(policy.Grant_Amount).toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* History */}
        {showHistory && policyHistory.length > 0 && (
          <div className="mb-3 space-y-1.5 border-t border-slate-100 pt-3">
            <p className="text-[10px] font-bold text-slate-400 mb-1.5">ประวัติการเปลี่ยนแปลง</p>
            {policyHistory.map((p, i) => (
              <div key={p.Policy_ID ?? i} className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-xl text-[10px] border border-slate-100">
                <span className="font-mono font-bold text-slate-700">
                  รัฐ {Math.round(parseFloat(p.Gov_Pay_Ratio) * 100)}% / ฿{parseFloat(p.Grant_Amount).toLocaleString()}
                </span>
                <span className="text-slate-400">
                  {p.Effective_From ? new Date(p.Effective_From).toLocaleDateString('th-TH') : '-'}
                  {p.users ? ` · ${p.users.Citizen_ID}` : ''}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Change rate form */}
        <form onSubmit={handleSetPolicy} className="space-y-3 text-xs border-t border-slate-100 pt-3">
          <p className="text-[11px] font-bold text-slate-600">เปลี่ยนอัตราสมทบใหม่</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">รัฐจ่าย (%)</label>
              <input
                id="policy-gov-ratio"
                type="number" min={1} max={99}
                value={newGovRatio}
                onChange={e => setNewGovRatio(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">วงเงิน/สิทธิ์ (฿)</label>
              <input
                id="policy-grant-amount"
                type="number" min={1}
                value={newGrantAmount}
                onChange={e => setNewGrantAmount(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>
          </div>
          <div className="flex gap-2 text-[10px]">
            <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200 font-bold">รัฐ {newGovRatio}%</span>
            <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-lg border border-blue-200 font-bold">ประชาชน {100 - newGovRatio}%</span>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">หมายเหตุ (ไม่บังคับ)</label>
            <input
              type="text"
              value={policyNote}
              onChange={e => setPolicyNote(e.target.value)}
              placeholder="เช่น ปรับตามมติ ครม. 17 ต.ค. 69"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none"
            />
          </div>
          {policyMsg && (
            <p className={`text-[10px] px-3 py-2 rounded-xl border ${
              policyMsg.startsWith('✓')
                ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                : 'text-rose-600 bg-rose-50 border-rose-200'
            }`}>{policyMsg}</p>
          )}
          <button
            id="policy-save-btn"
            type="submit"
            disabled={policySubmitting}
            className="w-full py-2.5 bg-[#92400e] hover:bg-[#78350f] disabled:opacity-50 text-white rounded-xl font-bold text-xs transition-all"
          >
            {policySubmitting ? 'กำลังบันทึก...' : '✓ บันทึกนโยบายใหม่'}
          </button>
        </form>
      </div>
      {/* Allocation Form */}
      <div className="rounded-[22px] bg-white p-4 border border-amber-100 shadow-sm">
        <p className="text-xs font-bold text-[#78350f] mb-3">จัดสรรงบประมาณให้ประชาชน</p>
        <form onSubmit={handleAllocate} className="space-y-3 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">เลขบัตรประชาชน (13 หลัก)</label>
            <input
              id="admin-citizen-id"
              type="text"
              required
              maxLength={13}
              value={citizenId}
              onChange={e => setCitizenId(e.target.value)}
              placeholder="1234567890123"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 font-mono"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">ชื่อโครงการ</label>
            <input
              id="admin-grant-name"
              type="text"
              value={grantName}
              onChange={e => setGrantName(e.target.value)}
              placeholder="โครงการไทยช่วยไทย"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <label className="block text-[11px] font-bold text-slate-600 mb-1">วงเงินสิทธิ์ (บาท)</label>
              <input
                id="admin-grant-amount"
                type="number"
                min={1}
                value={amount}
                onChange={e => setAmount(Number(e.target.value))}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>
          </div>

          {/* Current policy note */}
          <div className="flex items-center justify-between p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-[10px] text-amber-800 font-medium">
            <span>อัตราการร่วมจ่าย (อิงตามนโยบายกลาง):</span>
            <span className="font-bold text-emerald-800">
              รัฐ {policy ? Math.round(parseFloat(policy.Gov_Pay_Ratio) * 100) : 40}% / ประชาชน {policy ? 100 - Math.round(parseFloat(policy.Gov_Pay_Ratio) * 100) : 60}%
            </span>
          </div>

          {error && <p className="text-[10px] text-rose-600 bg-rose-50 px-3 py-2 rounded-xl border border-rose-200">{error}</p>}
          {success && <p className="text-[10px] text-emerald-700 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200">{success}</p>}

          <button
            id="admin-allocate-btn"
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-[#d97706] hover:bg-[#b45309] disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-md shadow-amber-500/20 transition-all"
          >
            {submitting ? 'กำลังจัดสรร...' : '✓ จัดสรรงบประมาณ'}
          </button>
        </form>
      </div>

      {/* Grant list */}
      <div>
        <p className="text-[11px] font-bold text-slate-500 mb-2 px-1">ประวัติการจัดสรรล่าสุด</p>
        {loading ? (
          <div className="text-center text-xs text-slate-400 py-4 animate-pulse">กำลังโหลด...</div>
        ) : grants.length === 0 ? (
          <div className="text-center text-xs text-slate-400 py-4">ยังไม่มีการจัดสรรงบ</div>
        ) : (
          <div className="space-y-2">
            {grants.slice(0, 20).map(gr => {
              const allocated = Number(gr.Total_Grant_Amount);
              const remaining = Number(gr.Remaining_Amount);
              const spent = allocated - remaining;
              const pct = allocated > 0 ? Math.min(100, (spent / allocated) * 100) : 0;
              return (
                <div key={gr.Grant_ID} className="rounded-[18px] bg-white p-3.5 border border-amber-100 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-bold text-slate-800">{gr.users.Citizen_ID}</p>
                      <p className="text-[10px] text-slate-400">{gr.Grant_Name || 'โครงการไทยช่วยไทย'}</p>
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                      gr.Status === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}>
                      {gr.Status === 'ACTIVE' ? 'ใช้งาน' : gr.Status}
                    </span>
                  </div>
                  <div className="mt-2 flex justify-between text-[10px] text-slate-500">
                    <span>วงเงิน: <strong className="text-amber-800">฿{allocated.toLocaleString()}</strong></span>
                    <span>คงเหลือ: <strong className="text-emerald-700">฿{remaining.toLocaleString()}</strong></span>
                  </div>
                  <div className="mt-1.5 w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-400 to-rose-400 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

// ─────────────────────────────────────────────
// Main Admin Portal View
// ─────────────────────────────────────────────
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

  const [activeTab, setActiveTab] = useState<'dashboard' | 'budget' | 'ai' | 'missions' | 'merchants'>('dashboard');
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

  const tabs: { key: typeof activeTab; label: string }[] = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'budget', label: 'งบประมาณ' },
    { key: 'ai', label: 'AI ยอดขาย' },
    { key: 'missions', label: `ภารกิจ (${missions.length})` },
    { key: 'merchants', label: `ร้านค้า (${merchants.length})` },
  ];

  return (
    <div className="pb-28">
      {/* Top Header */}
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

      {/* Quick action */}
      <section className="px-4 pt-4">
        <button
          onClick={() => setNewMissionModalOpen(true)}
          className="w-full py-3 bg-[#d97706] hover:bg-[#b45309] text-white rounded-2xl font-bold text-xs shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
        >
          <Icon name="plus" className="size-4" />
          <span>+ สร้างภารกิจกระตุ้นเศรษฐกิจใหม่ (General Mission)</span>
        </button>
      </section>

      {/* Tab Switcher – horizontal scroll for 5 tabs */}
      <div className="px-4 pt-5">
        <div className="flex bg-[#fef3c7]/60 p-1 rounded-2xl text-[10px] font-bold text-amber-950 overflow-x-auto gap-0.5 no-scrollbar">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex-shrink-0 flex-1 py-2 px-2 rounded-xl transition-all whitespace-nowrap ${
                activeTab === t.key ? 'bg-white text-[#92400e] shadow-xs' : 'hover:text-amber-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'dashboard' && <DashboardTab />}
      {activeTab === 'budget' && <BudgetTab />}

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

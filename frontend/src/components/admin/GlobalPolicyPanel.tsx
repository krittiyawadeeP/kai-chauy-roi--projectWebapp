import React, { useEffect, useState } from 'react';
import { FileCheck2, History, Info, Save, ShieldCheck } from 'lucide-react';
import { adminService, PolicyRecord } from '../../services/adminService';

export const GlobalPolicyPanel: React.FC = () => {
  const [policy, setPolicy] = useState<PolicyRecord | null>(null);
  const [history, setHistory] = useState<PolicyRecord[]>([]);
  const [ratio, setRatio] = useState(40);
  const [grant, setGrant] = useState(1000);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true; setLoading(true); setError('');
    Promise.all([adminService.getPolicy(), adminService.getPolicyHistory()]).then(([current, records]) => {
      if (!active) return;
      setPolicy(current); setHistory(records); setRatio(Number(current.Gov_Pay_Ratio) * 100); setGrant(Number(current.Grant_Amount));
    }).catch(value => { if (active) setError(value instanceof Error ? value.message : 'โหลดนโยบายไม่สำเร็จ'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reload]);
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); if (saving || !policy) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      const saved = await adminService.setPolicy({ Gov_Pay_Ratio: Math.round(ratio * 100) / 10000, Grant_Amount: grant, Note: note.trim() });
      setPolicy(saved); setHistory(previous => [saved, ...previous]); setNote('');
      setSuccess('บันทึกนโยบายกลางสำเร็จ อัตราใหม่มีผลกับรายการชำระเงินถัดไปทั่วทั้งระบบ');
      window.dispatchEvent(new Event('grant-policy-updated'));
    } catch (value) { setError(value instanceof Error ? value.message : 'บันทึกนโยบายไม่สำเร็จ'); }
    finally { setSaving(false); }
  };
  const format = (value: number) => value.toLocaleString('th-TH', { maximumFractionDigits: 2 });
  return <div className="space-y-6">
    <div><p className="admin-eyebrow">การบริหารนโยบายโครงการ</p><h1 className="mt-1 text-2xl font-semibold text-slate-900">กำหนดอัตราร่วมจ่ายส่วนกลาง</h1><p className="mt-2 text-sm text-slate-500">นโยบายเดียวสำหรับประชาชนและร้านค้าทุกพื้นที่ในระบบ</p></div>
    {loading && <p role="status" className="admin-card p-5 text-sm text-slate-500">กำลังตรวจสอบนโยบายปัจจุบัน…</p>}
    {error && <p role="alert" className="border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error} <button type="button" className="underline" onClick={() => setReload(value => value + 1)}>โหลดอีกครั้ง</button></p>}
    {success && <p role="status" className="border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{success}</p>}
    <section className="admin-card overflow-hidden"><div className="flex items-center gap-2 border-b border-slate-200 px-6 py-4 text-sm font-semibold"><ShieldCheck size={18} className="text-[#9c7b36]" />นโยบายที่มีผลใช้งานปัจจุบัน<span className="ml-auto border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-700">ใช้ร่วมกันทั้งระบบ</span></div><div className="grid gap-6 p-6 sm:grid-cols-3"><div><p className="text-sm text-slate-500">สัดส่วนภาครัฐช่วยจ่าย</p><p className="mt-2 text-3xl font-semibold text-[#183f59]">{policy ? format(Number(policy.Gov_Pay_Ratio) * 100) : '—'}<span className="text-base"> %</span></p></div><div><p className="text-sm text-slate-500">สัดส่วนประชาชนร่วมจ่าย</p><p className="mt-2 text-3xl font-semibold text-[#92702f]">{policy ? format(Number(policy.User_Pay_Ratio) * 100) : '—'}<span className="text-base"> %</span></p></div><div><p className="text-sm text-slate-500">วงเงินตั้งต้นของสิทธิ์ใหม่</p><p className="mt-2 text-3xl font-semibold text-slate-800">{policy ? format(Number(policy.Grant_Amount)) : '—'}<span className="text-sm font-normal"> บาท</span></p></div></div><p className="border-t border-slate-100 bg-slate-50 px-6 py-3 text-xs text-slate-500">วันที่มีผล: {policy?.Effective_From ? new Date(policy.Effective_From).toLocaleString('th-TH') : 'ค่าเริ่มต้นของระบบ'} {policy?.Policy_ID ? `· นโยบายเลขที่ ${policy.Policy_ID}` : ''}</p></section>
    <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
      <form onSubmit={save} className="admin-card overflow-hidden"><div className="flex items-center gap-2 border-b border-slate-200 px-6 py-4 text-sm font-semibold"><FileCheck2 size={18} className="text-[#9c7b36]" />ปรับปรุงนโยบายกลาง</div><fieldset disabled={loading || saving || !policy} className="space-y-5 p-6">
        <div className="grid gap-5 sm:grid-cols-2"><label className="text-sm font-medium">ภาครัฐช่วยจ่าย (%)<input className="admin-input mt-2" type="number" required min="0.01" max="99.99" step="0.01" value={ratio} onChange={e => setRatio(Number(e.target.value))} /></label><label className="text-sm font-medium">ประชาชนร่วมจ่าย (%)<output className="admin-input mt-2 block !bg-slate-50">{format(Math.round((100 - ratio) * 100) / 100)}</output></label></div>
        <div className="flex h-4 overflow-hidden bg-slate-100" aria-label={`รัฐ ${ratio}% ประชาชน ${100 - ratio}%`}><div className="bg-[#204c64] transition-all" style={{ width: `${Math.max(0, Math.min(100, ratio))}%` }} /><div className="flex-1 bg-[#b69a59]" /></div>
        <label className="block text-sm font-medium">วงเงินตั้งต้นสำหรับสิทธิ์ใหม่ (บาท)<input className="admin-input mt-2" type="number" required min="0.01" max="9999999999.99" step="0.01" value={grant} onChange={e => setGrant(Number(e.target.value))} /><span className="mt-2 block text-xs font-normal text-slate-500">ใช้กับการออกสิทธิ์ใหม่หลังบันทึกนโยบาย</span></label>
        <label className="block text-sm font-medium">เหตุผล / เลขที่เอกสารอ้างอิง<textarea className="admin-input mt-2" required maxLength={255} rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="ระบุเหตุผลการปรับอัตราหรือเอกสารที่เกี่ยวข้อง" /></label>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4"><p className="text-xs text-slate-500">มีผลทันทีเมื่อบันทึกสำเร็จ</p><button className="admin-primary" type="submit" disabled={!note.trim() || ratio <= 0 || ratio >= 100 || grant <= 0}><Save size={15} />{saving ? 'กำลังบันทึก…' : 'บันทึกนโยบายกลาง'}</button></div>
      </fieldset></form>
      <aside className="space-y-5"><section className="admin-card p-6"><h2 className="text-sm font-semibold text-slate-800">ตัวอย่างการคำนวณตามอัตราที่กำหนด</h2><p className="mt-2 text-xs text-slate-500">ยอดซื้อสินค้า 1,000 บาท กรณีมีวงเงินสิทธิ์เพียงพอ</p><div className="mt-5 space-y-4 text-sm"><p className="flex justify-between"><span>ภาครัฐช่วยจ่าย</span><strong className="text-[#204c64]">{format(ratio * 10)} บาท</strong></p><p className="flex justify-between"><span>ประชาชนร่วมจ่าย</span><strong className="text-[#92702f]">{format(1000 - ratio * 10)} บาท</strong></p><p className="flex justify-between border-t border-slate-200 pt-4"><span>ยอดรวม</span><strong>1,000 บาท</strong></p></div></section><section className="border border-[#dcd4bd] bg-[#faf8f2] p-5"><h2 className="flex items-center gap-2 text-sm font-semibold text-[#79632e]"><Info size={17} />ขอบเขตการใช้นโยบาย</h2><ul className="mt-3 list-disc space-y-3 pl-5 text-xs leading-6 text-slate-600"><li>อัตราร่วมจ่ายใช้กับรายการชำระเงินใหม่ของผู้ใช้ทุกรายและทุกร้านค้า</li><li>รายการที่ผ่านมาเก็บยอดเงินจริงตามอัตราในวันที่ทำรายการ</li><li>การปรับวงเงินตั้งต้นไม่เปลี่ยนยอดคงเหลือของสิทธิ์เดิม</li><li>ทุกการเปลี่ยนแปลงบันทึกวันเวลา ผู้ดำเนินการ และเหตุผล</li></ul></section></aside>
    </div>
    <section className="admin-card overflow-hidden"><div className="flex items-center gap-2 border-b border-slate-200 p-5 text-sm font-semibold"><History size={17} className="text-[#9c7b36]" />ประวัติการเปลี่ยนแปลงนโยบาย</div><div className="overflow-x-auto"><table className="admin-table"><thead><tr><th>เลขที่</th><th>วันเวลาที่มีผล</th><th>รัฐ / ประชาชน</th><th>วงเงินตั้งต้น</th><th>เอกสารอ้างอิง / เหตุผล</th><th>ผู้ดำเนินการ</th></tr></thead><tbody>{history.map(item => <tr key={item.Policy_ID}><td>#{item.Policy_ID}</td><td>{item.Effective_From ? new Date(item.Effective_From).toLocaleString('th-TH') : '—'}</td><td>{format(Number(item.Gov_Pay_Ratio) * 100)}% / {format(Number(item.User_Pay_Ratio) * 100)}%</td><td>{format(Number(item.Grant_Amount))} บาท</td><td className="max-w-72 whitespace-normal">{item.Note || '—'}</td><td>{item.users ? `เจ้าหน้าที่ ···${item.users.Citizen_ID.slice(-4)}` : '—'}</td></tr>)}</tbody></table>{!loading && !history.length && <p className="p-6 text-center text-sm text-slate-500">ยังไม่มีประวัติการเปลี่ยนแปลงนโยบาย</p>}</div></section>
  </div>;
};

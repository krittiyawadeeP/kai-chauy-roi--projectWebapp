import { useEffect, useState, type FormEvent } from 'react';
import { adminService, type AdminMissionRecord } from '../../services/adminService';

type MerchantOption = { Mch_ID: number; Shop_Name: string; Category: string | null };

export function AdminMissionsPanel() {
  const [missions, setMissions] = useState<AdminMissionRecord[]>([]);
  const [merchants, setMerchants] = useState<MerchantOption[]>([]);
  const [merchantId, setMerchantId] = useState(0);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [quota, setQuota] = useState(10);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([adminService.getMissions(), adminService.getMerchants()]).then(([rows, shops]) => {
      setMissions(rows); setMerchants(shops); setMerchantId(shops[0]?.Mch_ID ?? 0);
    }).catch(err => setError(err instanceof Error ? err.message : 'โหลดภารกิจไม่สำเร็จ'));
  }, []);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (new Date(end) <= new Date(start) || new Date(start) <= new Date()) { setError('กรุณาเลือกช่วงเวลาในอนาคต โดยเวลาสิ้นสุดต้องหลังเวลาเริ่ม'); return; }
    setSaving(true); setError('');
    try {
      await adminService.createMission({
        Target_Merchant_ID: merchantId, Mission_Name: name.trim(), Description: description.trim(),
        Max_Recipients: quota, Start_DateTime: new Date(start).toISOString(), End_DateTime: new Date(end).toISOString(), Status: 'ACTIVE',
      });
      setMissions(await adminService.getMissions());
      setCreating(false); setName(''); setDescription('');
    } catch (err) { setError(err instanceof Error ? err.message : 'บันทึกภารกิจไม่สำเร็จ'); }
    finally { setSaving(false); }
  };

  return <section className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-slate-500">ภารกิจจากฐานข้อมูล {missions.length} รายการ</p><button className="admin-primary" onClick={() => setCreating(value => !value)}>{creating ? 'ปิดฟอร์ม' : 'สร้าง General Mission'}</button></div>
    {error && <p role="alert" className="rounded bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    {creating && <form onSubmit={save} className="grid gap-3 rounded border border-slate-200 bg-white p-4 text-xs md:grid-cols-2">
      <label>ร้านค้า<select className="admin-input mt-1 w-full" value={merchantId} onChange={event => setMerchantId(Number(event.target.value))} required>{merchants.map(merchant => <option key={merchant.Mch_ID} value={merchant.Mch_ID}>{merchant.Shop_Name}</option>)}</select></label>
      <label>ชื่อภารกิจ<input className="admin-input mt-1 w-full" value={name} onChange={event => setName(event.target.value)} required maxLength={200} /></label>
      <label className="md:col-span-2">รายละเอียด<textarea className="admin-input mt-1 w-full" value={description} onChange={event => setDescription(event.target.value)} required /></label>
      <label>เริ่ม<input className="admin-input mt-1 w-full" type="datetime-local" value={start} onChange={event => setStart(event.target.value)} required /></label>
      <label>สิ้นสุด<input className="admin-input mt-1 w-full" type="datetime-local" value={end} onChange={event => setEnd(event.target.value)} required /></label>
      <label>จำนวนสิทธิ์<input className="admin-input mt-1 w-full" type="number" min="1" value={quota} onChange={event => setQuota(Number(event.target.value))} required /></label>
      <div className="flex items-end"><button className="admin-primary" disabled={!merchantId || saving}>{saving ? 'กำลังบันทึก…' : 'บันทึกภารกิจ'}</button></div>
    </form>}
    {missions.map(mission => <article key={mission.Mission_ID} className="rounded border border-slate-200 bg-white p-4 text-sm">
      <div className="flex justify-between gap-3"><h3 className="font-semibold">{mission.Mission_Name}</h3><span className="text-xs text-amber-700">{mission.Status}</span></div>
      <p className="mt-1 text-xs text-slate-500">{mission.merchants.Shop_Name} · {new Date(mission.Start_DateTime).toLocaleString('th-TH')}–{new Date(mission.End_DateTime).toLocaleString('th-TH')}</p>
      <p className="mt-2">{mission.Description}</p>
      <p className="mt-2 text-xs text-slate-500">รับแล้ว {mission.user_stamps.length}/{mission.Max_Recipients} สิทธิ์</p>
    </article>)}
  </section>;
}

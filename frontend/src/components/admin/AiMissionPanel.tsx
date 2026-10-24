import { useEffect, useState, type FormEvent } from 'react';
import { REGIONS, findProvince, type Region } from '../../../../shared/regions';
import { adminService, type DailyMissionReport, type DailyMissionRow } from '../../services/adminService';

const statusText: Record<DailyMissionRow['status'], string> = {
  PENDING: 'กำลังวิเคราะห์', READY: 'มีคำแนะนำ', NO_MERCHANT: 'ยังไม่มีร้าน',
  INSUFFICIENT_DATA: 'บิลไม่พอ', ERROR: 'ดำเนินการไม่สำเร็จ',
};
const time = (hour: number) => `${String(hour).padStart(2, '0')}:00`;

function localInput(iso: string) {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function AnalysisDetails({ row, onClose, onSaved }: { row: DailyMissionRow; onClose: () => void; onSaved: () => Promise<void> }) {
  const mission = row.mission;
  const [name, setName] = useState(mission?.name ?? '');
  const [description, setDescription] = useState(mission?.description ?? '');
  const [start, setStart] = useState(mission ? localInput(mission.start) : '');
  const [end, setEnd] = useState(mission ? localInput(mission.end) : '');
  const [quota, setQuota] = useState(mission?.quota ?? 50);
  const [status, setStatus] = useState(mission?.status ?? 'ACTIVE');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const slot = row.summary?.slots.find(item => item.dayType === row.suggestion?.dayType && item.startHour === row.suggestion?.startHour);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!mission) return;
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (!Number.isFinite(startDate.getTime()) || !Number.isFinite(endDate.getTime()) || endDate <= startDate || !Number.isInteger(quota) || quota < 1) {
      setError('กรุณาตรวจช่วงเวลาและจำนวนสิทธิ์');
      return;
    }
    setSaving(true); setSaved(false); setError('');
    try {
      await adminService.updateMission(mission.id, {
        Mission_Name: name.trim(), Description: description.trim(), Max_Recipients: quota,
        Start_DateTime: startDate.toISOString(), End_DateTime: endDate.toISOString(), Status: status,
      });
      await onSaved();
      setSaved(true);
    } catch (value) { setError(value instanceof Error ? value.message : 'บันทึกภารกิจไม่สำเร็จ'); }
    finally { setSaving(false); }
  };

  return <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose}>
    <div role="dialog" aria-modal="true" aria-label={`รายละเอียดผลวิเคราะห์ ${row.provinceName}`} className="max-h-[90vh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-lg bg-white p-6 text-sm shadow-xl" onClick={event => event.stopPropagation()} onKeyDown={event => { if (event.key === 'Escape') onClose(); }}>
      <div className="flex items-start justify-between gap-3"><h3 className="font-semibold">{row.provinceName} · {row.shopName ?? statusText[row.status]}</h3><button type="button" className="text-xs text-blue-700 underline" onClick={onClose}>ปิด</button></div>
      {row.status === 'READY' && row.suggestion && row.summary && mission ? <>
        <p className="font-medium">AI แนะนำ: {row.suggestion.dayType === 'weekend' ? 'วันเสาร์–อาทิตย์' : 'วันจันทร์–ศุกร์'} {time(row.suggestion.startHour)}–{time(row.suggestion.endHour)} น.</p>
        <p>{row.suggestion.description}</p>
        <p className="text-xs text-slate-600">หลักฐาน: ทั้งวัน {row.summary.transactionCount} บิล · ช่วงที่เลือก {slot?.transactionCount ?? 0} บิล ยอดรวม ฿{slot?.totalRevenue.toLocaleString('th-TH') ?? 0}</p>
        <p className="text-xs text-slate-600">เวลาจากบิล {row.summary.observedOpeningTime}–{row.summary.observedClosingTime} น. เป็นเพียงช่วงที่พบบิล ไม่ใช่เวลาทำการจริง และช่วงที่ไม่มีบิลไม่ถูกนับเป็นยอดขาย 0</p>
        <form onSubmit={save} className="grid gap-3 border-t border-slate-200 pt-4 text-xs sm:grid-cols-2">
          <p className="sm:col-span-2 font-semibold">แก้ไขภารกิจ #{mission.id}</p>
          <label className="sm:col-span-2">ชื่อภารกิจ<input autoFocus className="admin-input mt-1" required maxLength={200} value={name} onChange={event => setName(event.target.value)} /></label>
          <label className="sm:col-span-2">รายละเอียด<textarea className="admin-input mt-1" required value={description} onChange={event => setDescription(event.target.value)} /></label>
          <label>เริ่ม<input className="admin-input mt-1" type="datetime-local" required value={start} onChange={event => setStart(event.target.value)} /></label>
          <label>สิ้นสุด<input className="admin-input mt-1" type="datetime-local" required value={end} onChange={event => setEnd(event.target.value)} /></label>
          <label>จำนวนสิทธิ์<input className="admin-input mt-1" type="number" min="1" step="1" required value={quota} onChange={event => setQuota(Number(event.target.value))} /></label>
          <label>สถานะ<select className="admin-input mt-1" value={status} onChange={event => setStatus(event.target.value)}><option value="ACTIVE">ACTIVE</option><option value="COMPLETED">COMPLETED</option><option value="EXPIRED">EXPIRED</option></select></label>
          {error && <p role="alert" className="sm:col-span-2 text-rose-700">{error}</p>}
          {saved && <p role="status" className="sm:col-span-2 text-emerald-700">บันทึกการแก้ไขแล้ว</p>}
          <div className="sm:col-span-2"><button type="submit" className="admin-primary" disabled={saving}>{saving ? 'กำลังบันทึก…' : 'บันทึกการแก้ไข'}</button></div>
        </form>
      </> : <p>{row.message ?? statusText[row.status]}</p>}
    </div>
  </div>;
}

export function AiMissionPanel() {
  const [report, setReport] = useState<DailyMissionReport | null>(null);
  const [region, setRegion] = useState<Region | ''>('');
  const [provinceQuery, setProvinceQuery] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const data = await adminService.getDailyMissionAnalyses();
        if (active) { setReport(data); setError(''); }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'โหลดผลวิเคราะห์ไม่สำเร็จ');
      } finally { if (active) setLoading(false); }
    };
    void load();
    const interval = window.setInterval(() => { void load(); }, 30_000);
    return () => { active = false; window.clearInterval(interval); };
  }, []);

  const rows = (report?.rows ?? []).filter(row =>
    (!region || findProvince(row.provinceName)?.region === region) && row.provinceName.includes(provinceQuery.trim()))
    .sort((a, b) => Number(b.status === 'READY') - Number(a.status === 'READY') || a.provinceName.localeCompare(b.provinceName, 'th'));
  const selected = rows.find(row => row.provinceId === selectedId);

  return <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
    <div>
      <h2 className="text-base font-semibold">ผลวิเคราะห์และภารกิจรายจังหวัด</h2>
      <p className="mt-1 text-xs text-slate-500">ประมวลผลทุกวันเวลา 00:00 น. ตามเวลาไทย จากบิลของวันก่อนหน้า ร้านที่มีข้อมูลพอจะได้รับภารกิจอัตโนมัติ 50 สิทธิ์</p>
      <p className="mt-1 text-xs text-slate-500">ประมวลผลล่าสุดสำหรับบิลวันที่ {report?.analysisDate ?? '—'} · {report?.rows.length ?? 0}/77 จังหวัด · มีภารกิจ {report?.rows.filter(row => row.mission).length ?? 0} จังหวัด (ถ้าวันล่าสุดไม่มีผลใหม่ จะแสดงผลที่มีภารกิจล่าสุดของจังหวัดนั้น)</p>
    </div>
    <div className="flex flex-wrap gap-3">
      <label className="block w-full max-w-xs text-xs font-medium">เลือกภาค
        <select className="admin-input mt-1 w-full" value={region} onChange={event => { setRegion(event.target.value as Region | ''); setSelectedId(null); }}>
          <option value="">ทุกภาค</option>
          {(Object.keys(REGIONS) as Region[]).filter(key => key !== 'Unmapped').map(key => <option key={key} value={key}>{REGIONS[key]}</option>)}
        </select>
      </label>
      <label className="block w-full max-w-xs text-xs font-medium">ค้นหาจังหวัด
        <input className="admin-input mt-1 w-full" type="search" placeholder="พิมพ์ชื่อจังหวัด" value={provinceQuery} onChange={event => { setProvinceQuery(event.target.value); setSelectedId(null); }} />
      </label>
    </div>
    {loading && <p className="text-sm text-slate-500">กำลังโหลดผลวิเคราะห์…</p>}
    {error && <p role="alert" className="rounded bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    {!loading && !rows.length && <p className="text-sm text-slate-500">{report?.rows.length ? 'ไม่พบจังหวัดที่ตรงกับคำค้นหาหรือตัวกรองภาค' : 'ยังไม่มีผลของวันที่เพิ่งจบ ระบบจะเริ่มสร้างเมื่อ backend ทำงาน'}</p>}
    <div className="max-h-[38rem] overflow-auto rounded-lg border border-slate-200">
      <table className="min-w-[800px] w-full border-collapse text-left text-sm">
        <thead className="sticky top-0 bg-slate-100 text-slate-700"><tr>
          <th className="w-12 p-3">#</th><th className="min-w-36 p-3">จังหวัด</th><th className="min-w-48 p-3">ร้านที่เลือก</th><th className="min-w-64 p-3">ผลวิเคราะห์</th><th className="w-32 p-3">รายละเอียด</th>
        </tr></thead>
        <tbody>{rows.map((row, index) => <tr key={row.provinceId} className={`border-t border-slate-200 align-top ${selectedId === row.provinceId ? 'bg-blue-50' : ''}`}>
          <td className="p-3 text-slate-400">{index + 1}</td>
          <td className="p-3 font-semibold">{row.provinceName}</td>
          <td className="p-3">{row.shopName ?? '—'}</td>
          <td className="p-3">{row.status === 'READY' && row.suggestion && row.mission
            ? <><span className="font-medium text-emerald-800">สร้างภารกิจแล้ว</span><span className="block text-xs text-slate-600">บิลวันที่ {row.analyzedDate} · {row.suggestion.dayType === 'weekend' ? 'เสาร์–อาทิตย์' : 'จันทร์–ศุกร์'} {time(row.suggestion.startHour)}–{time(row.suggestion.endHour)} น. · {row.mission.quota} สิทธิ์</span></>
            : <span className="text-slate-500">{statusText[row.status]}{row.message ? ` — ${row.message}` : ''}</span>}</td>
          <td className="p-3"><button type="button" className="text-xs font-medium text-blue-700 underline" onClick={() => setSelectedId(selectedId === row.provinceId ? null : row.provinceId)} aria-expanded={selectedId === row.provinceId}>ดูรายละเอียด</button></td>
        </tr>)}</tbody>
      </table>
    </div>
    {selected && <AnalysisDetails key={selected.provinceId} row={selected} onClose={() => setSelectedId(null)} onSaved={async () => setReport(await adminService.getDailyMissionAnalyses())} />}
  </section>;
}

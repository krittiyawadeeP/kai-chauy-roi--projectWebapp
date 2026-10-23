import { useEffect, useState } from 'react';
import { REGIONS, findProvince, type Region } from '../../../../shared/regions';
import { adminService, type DailyMissionReport, type DailyMissionRow } from '../../services/adminService';

const statusText: Record<DailyMissionRow['status'], string> = {
  PENDING: 'กำลังวิเคราะห์', READY: 'มีคำแนะนำ', NO_MERCHANT: 'ยังไม่มีร้าน',
  INSUFFICIENT_DATA: 'บิลไม่พอ', ERROR: 'ดำเนินการไม่สำเร็จ',
};
const time = (hour: number) => `${String(hour).padStart(2, '0')}:00`;

export function AiMissionPanel() {
  const [report, setReport] = useState<DailyMissionReport | null>(null);
  const [region, setRegion] = useState<Region | ''>('');
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

  const rows = (report?.rows ?? []).filter(row => !region || findProvince(row.provinceName)?.region === region)
    .sort((a, b) => Number(b.status === 'READY') - Number(a.status === 'READY') || a.provinceName.localeCompare(b.provinceName, 'th'));
  const selected = rows.find(row => row.provinceId === selectedId);
  const selectedSlot = selected?.summary?.slots.find(slot => slot.dayType === selected.suggestion?.dayType && slot.startHour === selected.suggestion?.startHour);

  return <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
    <div>
      <h2 className="text-base font-semibold">ผลวิเคราะห์และภารกิจรายจังหวัด</h2>
      <p className="mt-1 text-xs text-slate-500">ประมวลผลทุกวันเวลา 00:00 น. ตามเวลาไทย จากบิลของวันก่อนหน้า ร้านที่มีข้อมูลพอจะได้รับภารกิจอัตโนมัติ 50 สิทธิ์</p>
      <p className="mt-1 text-xs text-slate-500">บิลวันที่ {report?.analysisDate ?? '—'} · {report?.rows.length ?? 0}/77 จังหวัด · สร้างภารกิจแล้ว {report?.rows.filter(row => row.mission).length ?? 0} จังหวัด</p>
    </div>
    <label className="block max-w-xs text-xs font-medium">เลือกภาค
      <select className="admin-input mt-1 w-full" value={region} onChange={event => { setRegion(event.target.value as Region | ''); setSelectedId(null); }}>
        <option value="">ทุกภาค</option>
        {(Object.keys(REGIONS) as Region[]).filter(key => key !== 'Unmapped').map(key => <option key={key} value={key}>{REGIONS[key]}</option>)}
      </select>
    </label>
    {loading && <p className="text-sm text-slate-500">กำลังโหลดผลวิเคราะห์…</p>}
    {error && <p role="alert" className="rounded bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    {!loading && !rows.length && <p className="text-sm text-slate-500">ยังไม่มีผลของวันที่เพิ่งจบ ระบบจะเริ่มสร้างเมื่อ backend ทำงาน</p>}
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
            ? <><span className="font-medium text-emerald-800">สร้างภารกิจแล้ว</span><span className="block text-xs text-slate-600">{row.suggestion.dayType === 'weekend' ? 'เสาร์–อาทิตย์' : 'จันทร์–ศุกร์'} {time(row.suggestion.startHour)}–{time(row.suggestion.endHour)} น. · 50 สิทธิ์</span></>
            : <span className="text-slate-500">{statusText[row.status]}{row.message ? ` — ${row.message}` : ''}</span>}</td>
          <td className="p-3"><button type="button" className="text-xs font-medium text-blue-700 underline" onClick={() => setSelectedId(selectedId === row.provinceId ? null : row.provinceId)} aria-expanded={selectedId === row.provinceId}>ดูรายละเอียด</button></td>
        </tr>)}</tbody>
      </table>
    </div>
    {selected && <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setSelectedId(null)}>
      <div role="dialog" aria-modal="true" aria-label={`รายละเอียดผลวิเคราะห์ ${selected.provinceName}`} className="max-h-[90vh] w-full max-w-2xl space-y-2 overflow-y-auto rounded-lg bg-white p-6 text-sm shadow-xl" onClick={event => event.stopPropagation()}>
      <div className="flex items-start justify-between gap-3"><h3 className="font-semibold">{selected.provinceName} · {selected.shopName ?? statusText[selected.status]}</h3><button type="button" className="text-xs text-blue-700 underline" onClick={() => setSelectedId(null)}>ปิด</button></div>
      {selected.status === 'READY' && selected.suggestion && selected.summary && selected.mission ? <>
        <p className="font-medium">ช่วงที่แนะนำ: {selected.suggestion.dayType === 'weekend' ? 'วันเสาร์–อาทิตย์' : 'วันจันทร์–ศุกร์'} {time(selected.suggestion.startHour)}–{time(selected.suggestion.endHour)} น.</p>
        <p>{selected.suggestion.description}</p>
        <p className="text-xs text-slate-600">หลักฐาน: ทั้งวัน {selected.summary.transactionCount} บิล · ช่วงที่เลือก {selectedSlot?.transactionCount ?? 0} บิล ยอดรวม ฿{selectedSlot?.totalRevenue.toLocaleString('th-TH') ?? 0}</p>
        <p className="text-xs text-slate-600">เวลาจากบิล {selected.summary.observedOpeningTime}–{selected.summary.observedClosingTime} น. เป็นเพียงช่วงที่พบบิล ไม่ใช่เวลาทำการจริง และช่วงที่ไม่มีบิลไม่ถูกนับเป็นยอดขาย 0</p>
        <p className="text-xs font-medium">ภารกิจ #{selected.mission.id}: {new Date(selected.mission.start).toLocaleString('th-TH')}–{new Date(selected.mission.end).toLocaleString('th-TH')} · {selected.mission.quota} สิทธิ์ · {selected.mission.status}</p>
      </> : <p>{selected.message ?? statusText[selected.status]}</p>}
      </div>
    </div>}
  </section>;
}

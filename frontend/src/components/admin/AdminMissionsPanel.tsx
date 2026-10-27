import { Fragment, useEffect, useState } from 'react';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, History, RefreshCw, TrendingUp } from 'lucide-react';
import { REGIONS, type Region } from '../../../../shared/regions';
import type { MissionHistoryEntry, MissionHistoryReport, MissionPhase } from '../../../../shared/mission-history';
import { adminService } from '../../services/adminService';

const format = (value: number | null | undefined) => value == null ? '—' : value.toLocaleString('th-TH', { maximumFractionDigits: 2 });
const change = (value: number | null | undefined) => value == null ? 'ยังเทียบไม่ได้' : `${value > 0 ? '+' : ''}${format(value)}%`;
const dateTime = (value: string) => new Date(value).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const phaseText: Record<MissionPhase, string> = { UPCOMING: 'รอเริ่ม', RUNNING: 'กำลังจัด', FINISHED: 'สิ้นสุดแล้ว', CANCELLED: 'ยกเลิก / ปิดไว้' };
const phaseColor: Record<MissionPhase, string> = { UPCOMING: 'bg-blue-50 text-blue-700', RUNNING: 'bg-amber-50 text-amber-800', FINISHED: 'bg-emerald-50 text-emerald-700', CANCELLED: 'bg-slate-100 text-slate-500' };

function MissionDetails({ mission }: { mission: MissionHistoryEntry }) {
  const result = mission.performance;
  const reason = mission.phase === 'CANCELLED' ? 'ภารกิจถูกยกเลิกหรือปิดไว้ จึงไม่นำมาสรุปผล'
    : result.reason === 'NOT_FINISHED' ? 'รอภารกิจสิ้นสุดก่อนสรุปผลยอดขาย'
    : result.reason === 'OVERLAPPING_MISSIONS' ? 'มีภารกิจอื่นของร้านทับช่วงเวลา จึงยังแยกผลเปรียบเทียบไม่ได้'
    : result.reason === 'INSUFFICIENT_REFERENCE' ? `ข้อมูลอ้างอิงไม่พอ: พบ ${result.referenceDates.length}/4 ช่วง ต้องมีอย่างน้อย 2 ช่วงที่มีบิลและไม่มีภารกิจอื่น` : null;
  return <article className="rounded-lg border border-slate-200 bg-white p-4 text-xs">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold text-slate-900">#{mission.id} · {mission.name}</h3><p className="mt-1 text-slate-600">{mission.shopName}</p></div><span className={`rounded-full px-2.5 py-1 ${phaseColor[mission.phase]}`}>{phaseText[mission.phase]}</span></div>
    <p className="mt-3 whitespace-pre-line leading-6 text-slate-600">{mission.description}</p>
    <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2 text-slate-500"><span>ช่วงจัด: {dateTime(mission.start)} – {dateTime(mission.end)} น.</span><span>ใช้ผลวิเคราะห์บิลวันที่ {mission.analysisDate}</span><span>รับสิทธิ์แล้ว {format(mission.recipients)} / {format(mission.quota)} คน</span></div>
    <dl className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded bg-slate-50 p-3"><dt className="text-slate-500">ยอดขายช่วงภารกิจ</dt><dd className="mt-1 text-base font-semibold text-[#193f5a]">{format(result.actualRevenue)} บาท</dd><dd className="mt-1 text-slate-500">{format(result.actualTransactions)} บิล</dd></div><div className="rounded bg-slate-50 p-3"><dt className="text-slate-500">เฉลี่ยช่วงอ้างอิง</dt><dd className="mt-1 text-base font-semibold text-slate-700">{format(result.baselineRevenue)} บาท</dd><dd className="mt-1 text-slate-500">{format(result.baselineTransactions)} บิล / ช่วง</dd></div><div className="rounded bg-slate-50 p-3"><dt className="text-slate-500">การเปลี่ยนแปลงยอดขาย</dt><dd className={`mt-1 text-base font-semibold ${(result.revenueDifference ?? 0) < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>{change(result.revenueChangePercent)}</dd><dd className="mt-1 text-slate-500">ต่าง {format(result.revenueDifference)} บาท</dd></div></dl>
    {reason && <p className="mt-3 rounded bg-amber-50 p-3 leading-5 text-amber-800">{reason}</p>}
    {!!result.referenceDates.length && <p className="mt-3 text-[11px] leading-5 text-slate-500">วันที่เริ่มช่วงอ้างอิง: {result.referenceDates.join(', ')} · เวลาและความยาวช่วงเท่ากับภารกิจ</p>}
  </article>;
}

function ResultsDashboard({ report }: { report: MissionHistoryReport }) {
  const summary = report.summary;
  const maximum = Math.max(summary.actualRevenue ?? 0, summary.baselineRevenue ?? 0, 1);
  return <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[
        { label: 'ภารกิจจากผลวิเคราะห์', value: format(summary.missionCount), unit: 'ภารกิจ', note: `${summary.provinceCount} จังหวัดมีภารกิจ · แสดงครบ 77 จังหวัด` },
        { label: 'ภารกิจที่สิ้นสุดแล้ว', value: format(summary.finishedCount), unit: 'ภารกิจ', note: `กำลังจัด ${summary.runningCount} · รอเริ่ม ${summary.upcomingCount}` },
        { label: 'ยอดขายช่วงภารกิจที่เทียบได้', value: format(summary.actualRevenue), unit: 'บาท', note: `${summary.comparableCount} ภารกิจที่มีข้อมูลอ้างอิงเพียงพอ` },
        { label: 'ยอดขายเปลี่ยนจากช่วงอ้างอิง', value: change(summary.revenueChangePercent), unit: '', note: `เพิ่ม ${summary.increasedCount} · ลด ${summary.decreasedCount} · เท่าเดิม ${summary.unchangedCount} ภารกิจ` },
      ].map((card, index) => <div key={card.label} className={`admin-card admin-kpi admin-kpi-${index} p-5`}><p className="text-xs text-slate-600">{card.label}</p><p className="admin-kpi-value mt-3 font-semibold tabular-nums">{card.value} <span className="text-xs font-normal text-slate-500">{card.unit}</span></p><p className="mt-2 text-[11px] text-slate-500">{card.note}</p></div>)}
    </div>
    <div className="admin-card p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900"><TrendingUp size={18} className="text-indigo-600" />ยอดขายช่วงจัดภารกิจเทียบกับช่วงอ้างอิง</h2>
      {summary.comparableCount ? <>
        <figure className="mt-5 space-y-4" aria-label="เปรียบเทียบยอดขายช่วงภารกิจกับค่าเฉลี่ยของช่วงอ้างอิง">
          {[{ label: 'เฉลี่ยช่วงอ้างอิงของร้านเดิม', value: summary.baselineRevenue, color: 'bg-slate-400' }, { label: 'ช่วงจัดภารกิจ', value: summary.actualRevenue, color: 'bg-indigo-600' }].map(bar => <div key={bar.label}><div className="mb-2 flex justify-between gap-3 text-xs"><span className="text-slate-600">{bar.label}</span><strong className="tabular-nums">{format(bar.value)} บาท</strong></div><div className="h-5 overflow-hidden rounded bg-slate-100"><div className={`h-full rounded ${bar.color}`} style={{ width: `${(bar.value ?? 0) / maximum * 100}%` }} /></div></div>)}
          <figcaption className="text-xs leading-6 text-slate-500">เปรียบเทียบเฉพาะ {summary.comparableCount} ภารกิจเดียวกันทั้งสองฝั่ง · บิลช่วงภารกิจ {format(summary.actualTransactions)} บิล เทียบค่าเฉลี่ยช่วงอ้างอิง {format(summary.baselineTransactions)} บิล</figcaption>
        </figure>
      </> : <p className="mt-4 rounded bg-slate-50 p-5 text-center text-sm text-slate-500">ยังไม่มีภารกิจที่สิ้นสุดและมีข้อมูลอ้างอิงเพียงพอสำหรับเปรียบเทียบ</p>}
      <details className="mt-4 border-t border-slate-200 pt-3 text-xs text-slate-500"><summary className="cursor-pointer font-medium text-slate-700">วิธีคำนวณและขอบเขตการอ่านผล</summary><p className="mt-2 leading-6">ใช้ยอดขายจากบิลที่สำเร็จในช่วงภารกิจทั้งช่วง เทียบกับค่าเฉลี่ยของร้านเดิม วันในสัปดาห์เดียวกัน เวลาเดียวกันย้อนหลัง 4 สัปดาห์ ใช้เฉพาะช่วงอ้างอิงที่มีบิลและไม่มีภารกิจอื่น โดยต้องเหลืออย่างน้อย 2 ช่วง วันที่ไม่มีบิลยังบอกไม่ได้ว่าร้านเปิดหรือปิด ภารกิจที่ทับกันหรือยังไม่สิ้นสุดไม่รวมในผลเปรียบเทียบ ตัวเลขเป็นการเปลี่ยนแปลงที่พบในข้อมูล ไม่สามารถยืนยันว่าเกิดจากภารกิจเพียงอย่างเดียว</p></details>
    </div>
  </div>;
}

export function AdminMissionsPanel() {
  const [date, setDate] = useState(() => new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10));
  const [report, setReport] = useState<MissionHistoryReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [region, setRegion] = useState<Region | ''>('');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setReport(null); setExpanded(null);
    adminService.getMissionHistory(date, controller.signal)
      .then(data => { if (!controller.signal.aborted) setReport(data); })
      .catch(value => { if (!controller.signal.aborted) setError(value instanceof Error ? value.message : 'โหลดประวัติภารกิจไม่สำเร็จ'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [date, reload]);
  const moveDay = (days: number) => setDate(new Date(new Date(`${date}T12:00:00+07:00`).getTime() + days * 86_400_000).toISOString().slice(0, 10));
  const rows = (report?.provinces ?? []).filter(province => (!region || province.region === region) && `${province.name} ${province.missions.map(mission => `${mission.name} ${mission.shopName}`).join(' ')}`.toLocaleLowerCase('th').includes(search.trim().toLocaleLowerCase('th')));
  return <section className="space-y-5">
    <div className="admin-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="flex items-center gap-2 text-sm font-semibold"><History size={18} className="text-[#9c7b36]" />ประวัติภารกิจจากการวิเคราะห์รายวัน</h2><p className="mt-2 text-xs leading-6 text-slate-500">เลือกวันที่จัดภารกิจตามเวลาไทย เพื่อดูครบทั้ง 77 จังหวัด รวมจังหวัดที่ไม่มีภารกิจในวันนั้น</p></div><button type="button" className="admin-secondary" disabled={loading} onClick={() => setReload(value => value + 1)}><RefreshCw size={14} />รีเฟรชข้อมูล</button></div>
      <div className="mt-4 flex flex-wrap items-end gap-3"><label className="text-xs font-medium"><span className="flex items-center gap-1.5"><CalendarDays size={14} />วันที่จัดภารกิจ (เวลาไทย)</span><input className="admin-input mt-1" type="date" required value={date} onChange={event => { if (event.target.value) setDate(event.target.value); }} /></label><button type="button" className="admin-secondary" aria-label="วันก่อนหน้า" onClick={() => moveDay(-1)}><ChevronLeft size={16} />วันก่อน</button><button type="button" className="admin-secondary" aria-label="วันถัดไป" onClick={() => moveDay(1)}>วันถัดไป<ChevronRight size={16} /></button></div>
      <p className="mt-3 text-[11px] leading-5 text-slate-500">แสดงภารกิจที่มีช่วงเวลาทับวันที่เลือก ผลยอดขายคำนวณจากช่วงภารกิจทั้งช่วง · ภาพรวมด้านล่างรวมทุกจังหวัด</p>
    </div>
    {loading && <p role="status" className="admin-card p-6 text-sm text-slate-500">กำลังโหลดประวัติและเปรียบเทียบยอดขาย…</p>}
    {error && <p role="alert" className="rounded border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
    {report && <>
      <ResultsDashboard report={report} />
      <div className="admin-card overflow-hidden">
        <div className="grid gap-3 border-b border-slate-200 p-5 text-xs sm:grid-cols-2"><label>ภาค<select className="admin-input mt-1" value={region} onChange={event => { setRegion(event.target.value as Region | ''); setExpanded(null); }}><option value="">ทุกภาค</option>{(Object.keys(REGIONS) as Region[]).filter(key => key !== 'Unmapped').map(key => <option key={key} value={key}>{REGIONS[key]}</option>)}</select></label><label>ค้นหาจังหวัด ร้านค้า หรือภารกิจ<input className="admin-input mt-1" type="search" placeholder="พิมพ์ชื่อที่ต้องการค้นหา" value={search} onChange={event => { setSearch(event.target.value); setExpanded(null); }} /></label></div>
        <div className="flex flex-wrap justify-between gap-2 px-5 py-3 text-xs text-slate-500"><span>ทะเบียนภารกิจรายจังหวัด · แสดง {rows.length}/77 จังหวัด</span><span>อัปเดต {dateTime(report.generatedAt)} น.</span></div>
        <div className="max-h-[640px] overflow-auto"><table className="admin-table"><thead><tr><th>จังหวัด</th><th>ภารกิจ / ร้านค้า</th><th>ช่วงจัด (เวลาไทย)</th><th>สถานะ</th><th>ผลเทียบยอดขาย</th><th>ประวัติ</th></tr></thead><tbody>
          {rows.map(province => {
            const first = province.missions[0];
            return <Fragment key={province.code}><tr><td className="font-semibold">{province.name}</td><td className="max-w-72 whitespace-normal">{first ? <><p className="font-medium text-slate-900">{first.name}</p><p className="mt-1 text-[11px] text-slate-500">{first.shopName}{province.missions.length > 1 ? ` · และอีก ${province.missions.length - 1} ภารกิจ` : ''}</p></> : <span className="text-slate-400">ไม่มีภารกิจจากผลวิเคราะห์ในวันที่เลือก</span>}</td><td>{first ? <><p>{dateTime(first.start)}</p><p className="mt-1 text-[11px] text-slate-500">ถึง {dateTime(first.end)}</p></> : '—'}</td><td>{first ? province.missions.length > 1 ? `${province.missions.length} ภารกิจ` : <span className={`rounded-full px-2.5 py-1 text-[11px] ${phaseColor[first.phase]}`}>{phaseText[first.phase]}</span> : '—'}</td><td>{first ? province.missions.length > 1 ? 'ดูแยกแต่ละภารกิจ' : <span className={(first.performance.revenueDifference ?? 0) < 0 ? 'text-rose-700' : 'text-slate-600'}>{change(first.performance.revenueChangePercent)}</span> : '—'}</td><td>{first && <button type="button" className="inline-flex items-center gap-1 text-blue-700 hover:underline" aria-expanded={expanded === province.code} aria-label={`ดูประวัติภารกิจ ${province.name}`} onClick={() => setExpanded(expanded === province.code ? null : province.code)}>ดูรายละเอียด<ChevronDown size={13} /></button>}</td></tr>
            {expanded === province.code && <tr><td colSpan={6} className="whitespace-normal bg-slate-50"><div className="space-y-3">{province.missions.map(mission => <MissionDetails key={mission.id} mission={mission} />)}</div></td></tr>}</Fragment>;
          })}
        </tbody></table></div>
        {!rows.length && <p className="p-6 text-center text-sm text-slate-500">ไม่พบจังหวัดหรือภารกิจที่ตรงกับตัวกรอง</p>}
      </div>
    </>}
  </section>;
}

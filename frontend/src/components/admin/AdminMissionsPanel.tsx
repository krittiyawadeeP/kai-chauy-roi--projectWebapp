import { Fragment, useEffect, useState } from 'react';
import { BarChart3, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, History, RefreshCw } from 'lucide-react';
import { REGIONS, type Region } from '../../../../shared/regions';
import type { MissionHistoryEntry, MissionHistoryReport, MissionHistoryScope, MissionPhase } from '../../../../shared/mission-history';
import { adminService } from '../../services/adminService';
import { HourlySalesChart } from './HourlySalesChart';

const format = (value: number | null | undefined) => value == null ? '—' : value.toLocaleString('th-TH', { maximumFractionDigits: 2 });
const change = (value: number | null | undefined) => value == null ? 'ยังเทียบไม่ได้' : `${value > 0 ? '+' : ''}${format(value)}%`;
const dateTime = (value: string) => new Date(value).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const time = (minute: number) => `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
const phaseText: Record<MissionPhase, string> = { UPCOMING: 'รอเริ่ม', RUNNING: 'กำลังดำเนินการ', FINISHED: 'สิ้นสุดช่วงที่เลือกแล้ว', CANCELLED: 'ยกเลิก / ปิดไว้' };
const phaseColor: Record<MissionPhase, string> = { UPCOMING: 'bg-blue-50 text-blue-700', RUNNING: 'bg-amber-50 text-amber-800', FINISHED: 'bg-emerald-50 text-emerald-700', CANCELLED: 'bg-slate-100 text-slate-500' };

function MissionDetails({ mission, scope }: { mission: MissionHistoryEntry; scope: MissionHistoryScope }) {
  const result = mission.performance;
  const reason = mission.phase === 'CANCELLED' ? 'ภารกิจปิดไว้แล้ว แสดงบิลตามช่วงเวลาที่เคยกำหนดและแสตมป์ที่แจกจริง โดยไม่สรุปผลเปรียบเทียบ'
    : result.reason === 'NOT_FINISHED' ? 'ยอดขายแสดงเท่าที่เกิดขึ้นแล้ว รอสิ้นสุดช่วงที่เลือกก่อนเปรียบเทียบผล'
    : result.reason === 'OVERLAPPING_MISSIONS' ? 'มีภารกิจอื่นของร้านทับช่วงเวลา จึงยังแยกผลเปรียบเทียบไม่ได้'
    : result.reason === 'INSUFFICIENT_REFERENCE' ? `ข้อมูลอ้างอิงไม่พอ: พบ ${result.referenceDates.length}/4 ช่วง ต้องมีอย่างน้อย 2 ช่วงที่มีบิลและไม่มีภารกิจอื่น` : null;
  return <article className="min-w-0 rounded-lg border border-slate-200 bg-white p-5 text-xs">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold text-slate-900">#{mission.id} · {mission.name}</h3><p className="mt-1 text-slate-600">{mission.shopName}</p></div><span className={`rounded-full px-2.5 py-1 ${phaseColor[mission.phase]}`}>{phaseText[mission.phase]}</span></div>
    <p className="mt-3 whitespace-pre-line leading-6 text-slate-600">{mission.description}</p>
    <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2 text-slate-500"><span>แผนภารกิจ: {dateTime(mission.start)} – {dateTime(mission.end)} น.</span>{mission.dailyStartMinute != null && <span>ทุกวัน {time(mission.dailyStartMinute)}–{time(mission.dailyEndMinute ?? 0)} น.</span>}</div>
    <dl className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div className="rounded bg-amber-50 p-3"><dt className="text-amber-800">แจกแสตมป์แล้ว{scope === 'day' ? 'ในวันที่เลือก' : 'ในแผนนี้'}</dt><dd className="mt-1 text-lg font-semibold text-amber-900">{format(mission.recipients)} ดวง</dd><dd className="mt-1 text-amber-800">{mission.quota == null ? 'ไม่จำกัดจำนวนผู้เข้าร่วม' : `โควต้า ${format(mission.quota)} สิทธิ์`}</dd></div>
      <div className="rounded bg-slate-50 p-3"><dt className="text-slate-500">ยอดขายในชั่วโมงภารกิจ</dt><dd className="mt-1 text-lg font-semibold text-[#193f5a]">{format(result.actualRevenue)} บาท</dd><dd className="mt-1 text-slate-500">{format(result.actualTransactions)} บิล</dd></div>
      <div className="rounded bg-slate-50 p-3"><dt className="text-slate-500">เฉลี่ยช่วงอ้างอิง</dt><dd className="mt-1 text-lg font-semibold text-slate-700">{format(result.baselineRevenue)} บาท</dd><dd className="mt-1 text-slate-500">{format(result.baselineTransactions)} บิล / ช่วง</dd></div>
      <div className="rounded bg-slate-50 p-3"><dt className="text-slate-500">การเปลี่ยนแปลงยอดขาย</dt><dd className={`mt-1 text-lg font-semibold ${(result.revenueDifference ?? 0) < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>{change(result.revenueChangePercent)}</dd><dd className="mt-1 text-slate-500">ต่าง {format(result.revenueDifference)} บาท</dd></div>
    </dl>
    <div className="mt-5"><h4 className="mb-3 text-sm font-semibold text-slate-800">ยอดขายร้านค้ารายชั่วโมง</h4><HourlySalesChart points={mission.hourlySales} label={`ยอดขายรายชั่วโมงของ${mission.shopName}`} caption={`${scope === 'day' ? 'รวมเฉพาะบิลของวันที่เลือก' : 'รวมบิลตั้งแต่วันที่เริ่มแผนถึงเวลาปัจจุบัน'} · แต่ละแท่งแทน 1 ชั่วโมงตามเวลาไทย · สีทองคือชั่วโมงภารกิจ`} /></div>
    {reason && <p className="mt-3 rounded bg-amber-50 p-3 leading-5 text-amber-800">{reason}</p>}
    {!!result.referenceDates.length && <p className="mt-3 text-[11px] leading-5 text-slate-500">วันที่เริ่มช่วงอ้างอิง: {result.referenceDates.join(', ')} · เปรียบเทียบร้านเดิม วันและเวลาเดียวกัน</p>}
  </article>;
}

function ResultsDashboard({ report }: { report: MissionHistoryReport }) {
  const summary = report.summary;
  return <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[
        { label: report.scope === 'plan' ? 'ภารกิจในแผนที่ดำเนินอยู่' : 'ภารกิจในวันที่เลือก', value: format(summary.missionCount), unit: 'ภารกิจ', note: `${summary.provinceCount} จังหวัด · กำลังดำเนินการ ${summary.runningCount} ภารกิจ` },
        { label: 'แจกแสตมป์แล้ว', value: format(summary.stampsIssued), unit: 'ดวง', note: report.scope === 'day' ? 'เฉพาะแสตมป์ภารกิจที่แจกในวันที่เลือก' : 'แสตมป์ที่แจกสะสมของแผนที่ดำเนินอยู่' },
        { label: 'ยอดขายในชั่วโมงภารกิจ', value: format(summary.recordedRevenue), unit: 'บาท', note: `${format(summary.recordedTransactions)} บิลสำเร็จ · นับบิลซ้ำเพียงครั้งเดียว` },
        { label: 'ยอดขายเปลี่ยนจากช่วงอ้างอิง', value: change(summary.revenueChangePercent), unit: '', note: `${summary.comparableCount} ภารกิจที่สิ้นสุดช่วงและมีข้อมูลเทียบเพียงพอ` },
      ].map((card, index) => <div key={card.label} className={`admin-card admin-kpi admin-kpi-${index} p-5`}><p className="text-xs text-slate-600">{card.label}</p><p className="admin-kpi-value mt-3 font-semibold tabular-nums">{card.value} <span className="text-xs font-normal text-slate-500">{card.unit}</span></p><p className="mt-2 text-[11px] text-slate-500">{card.note}</p></div>)}
    </div>
    <section className="admin-card min-w-0 p-5">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900"><BarChart3 size={18} className="text-[#9c7b36]" />ยอดขายรายชั่วโมงของร้านในแผนภารกิจ</h2>
      <HourlySalesChart points={report.hourlySales} label="ภาพรวมยอดขายรายชั่วโมงของร้านที่มีภารกิจ" caption={`${report.scope === 'day' ? 'แสดงเฉพาะข้อมูลวันที่เลือก' : 'รวมตั้งแต่วันที่เริ่มแผนที่ดำเนินอยู่จนถึงตอนนี้'} · รวมยอดขายทุกชั่วโมงของร้านในแผน · สีทองคือชั่วโมงที่มีภารกิจอย่างน้อยหนึ่งร้าน ดูช่วงเวลาของแต่ละร้านได้ในรายละเอียด`} />
      <details className="mt-4 border-t border-slate-200 pt-3 text-xs text-slate-500"><summary className="cursor-pointer font-medium text-slate-700">วิธีคำนวณ</summary><p className="mt-2 leading-6">ยอดขายและจำนวนบิลนับเฉพาะรายการสำเร็จ ส่วนแสตมป์นับจากดวงที่แจกจริงในช่วงที่เลือก ยอดขายช่วงภารกิจจะนับเฉพาะเวลาที่กำหนด กราฟแสดงทุกชั่วโมงเพื่อให้เห็นช่วงอื่นประกอบ เมื่อสิ้นสุดช่วงที่เลือกจึงเปรียบเทียบกับร้านเดิม วันและเวลาเดียวกันย้อนหลัง 4 สัปดาห์ ต้องมีอย่างน้อย 2 ช่วงอ้างอิงที่มีบิลและไม่ทับภารกิจอื่น ตัวเลขเปลี่ยนแปลงไม่ได้ยืนยันว่าเกิดจากภารกิจเพียงอย่างเดียว</p></details>
    </section>
  </div>;
}

export function AdminMissionsPanel() {
  const [scope, setScope] = useState<MissionHistoryScope>('plan');
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
    adminService.getMissionHistory(scope === 'day' ? date : undefined, controller.signal)
      .then(data => { if (!controller.signal.aborted) setReport(data); })
      .catch(value => { if (!controller.signal.aborted) setError(value instanceof Error ? value.message : 'โหลดผลภารกิจไม่สำเร็จ'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [date, scope, reload]);
  const moveDay = (days: number) => { setScope('day'); setDate(new Date(new Date(`${date}T12:00:00+07:00`).getTime() + days * 86_400_000).toISOString().slice(0, 10)); };
  const rows = (report?.provinces ?? []).filter(province => (!region || province.region === region) && `${province.name} ${province.missions.map(mission => `${mission.name} ${mission.shopName}`).join(' ')}`.toLocaleLowerCase('th').includes(search.trim().toLocaleLowerCase('th')));
  return <section className="space-y-5">
    <div className="admin-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="flex items-center gap-2 text-sm font-semibold"><History size={18} className="text-[#9c7b36]" />ภาพรวมแผนภารกิจและผลลัพธ์รายวัน</h2><p className="mt-2 text-xs leading-6 text-slate-500">ติดตามแผนที่กำลังดำเนินอยู่ หรือเลือกวันเพื่อดูยอดขายและจำนวนแสตมป์ของวันนั้น</p></div><button type="button" className="admin-secondary" disabled={loading} onClick={() => setReload(value => value + 1)}><RefreshCw size={14} />รีเฟรชข้อมูล</button></div>
      <div className="mt-4 flex flex-wrap items-center gap-2" role="group" aria-label="เลือกมุมมองผลภารกิจ"><button type="button" aria-pressed={scope === 'plan'} className={scope === 'plan' ? 'admin-primary' : 'admin-secondary'} onClick={() => setScope('plan')}>ภาพรวมแผนที่ดำเนินอยู่</button><button type="button" aria-pressed={scope === 'day'} className={scope === 'day' ? 'admin-primary' : 'admin-secondary'} onClick={() => setScope('day')}>ดูข้อมูลรายวัน</button></div>
      <div className="mt-4 flex flex-wrap items-end gap-3"><label className="text-xs font-medium"><span className="flex items-center gap-1.5"><CalendarDays size={14} />วันที่ต้องการดู (เวลาไทย)</span><input className="admin-input mt-1" type="date" required value={date} onChange={event => { if (event.target.value) { setDate(event.target.value); setScope('day'); } }} /></label><button type="button" className="admin-secondary" aria-label="วันก่อนหน้า" onClick={() => moveDay(-1)}><ChevronLeft size={16} />วันก่อน</button><button type="button" className="admin-secondary" aria-label="วันถัดไป" onClick={() => moveDay(1)}>วันถัดไป<ChevronRight size={16} /></button></div>
      <p className="mt-3 text-xs font-medium text-slate-600">{scope === 'plan' ? 'กำลังแสดงยอดสะสมของแผนที่เปิดใช้งานและอยู่ระหว่างดำเนินการ' : `กำลังแสดงข้อมูลเฉพาะวันที่ ${new Date(`${date}T00:00:00+07:00`).toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'long' })}`} · ภาพรวมรวมทุกจังหวัด</p>
    </div>
    {loading && <p role="status" className="admin-card p-6 text-sm text-slate-500">กำลังโหลดแผนภารกิจ ยอดขาย และแสตมป์ที่แจก…</p>}
    {error && <p role="alert" className="rounded border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
    {report && <>
      <ResultsDashboard report={report} />
      <div className="admin-card overflow-hidden">
        <div className="grid gap-3 border-b border-slate-200 p-5 text-xs sm:grid-cols-2"><label>ภาค<select className="admin-input mt-1" value={region} onChange={event => { setRegion(event.target.value as Region | ''); setExpanded(null); }}><option value="">ทุกภาค</option>{(Object.keys(REGIONS) as Region[]).filter(key => key !== 'Unmapped').map(key => <option key={key} value={key}>{REGIONS[key]}</option>)}</select></label><label>ค้นหาจังหวัด ร้านค้า หรือภารกิจ<input className="admin-input mt-1" type="search" placeholder="พิมพ์ชื่อที่ต้องการค้นหา" value={search} onChange={event => { setSearch(event.target.value); setExpanded(null); }} /></label></div>
        <div className="flex flex-wrap justify-between gap-2 px-5 py-3 text-xs text-slate-500"><span>แผนภารกิจรายจังหวัด · แสดง {rows.length}/77 จังหวัด</span><span>อัปเดต {dateTime(report.generatedAt)} น.</span></div>
        <div className="max-h-[640px] overflow-auto"><table className="admin-table"><thead><tr><th>จังหวัด</th><th>ภารกิจ / ร้านค้า</th><th>ช่วงแผน (เวลาไทย)</th><th>สถานะ</th><th className="text-right">แจกแสตมป์แล้ว</th><th>ผลเทียบยอดขาย</th><th>รายละเอียด</th></tr></thead><tbody>
          {rows.map(province => {
            const first = province.missions[0];
            return <Fragment key={province.code}><tr><td className="font-semibold">{province.name}</td><td className="max-w-72 whitespace-normal">{first ? <><p className="font-medium text-slate-900">{first.name}</p><p className="mt-1 text-[11px] text-slate-500">{first.shopName}{province.missions.length > 1 ? ` · และอีก ${province.missions.length - 1} ภารกิจ` : ''}</p></> : <span className="text-slate-400">{scope === 'plan' ? 'ไม่มีแผนที่ดำเนินอยู่' : 'ไม่มีภารกิจในวันที่เลือก'}</span>}</td><td>{first ? <><p>{dateTime(first.start)}</p><p className="mt-1 text-[11px] text-slate-500">ถึง {dateTime(first.end)}</p></> : '—'}</td><td>{first ? province.missions.length > 1 ? `${province.missions.length} ภารกิจ` : <span className={`rounded-full px-2.5 py-1 text-[11px] ${phaseColor[first.phase]}`}>{phaseText[first.phase]}</span> : '—'}</td><td className="text-right font-semibold tabular-nums text-amber-800">{format(province.missions.reduce((total, mission) => total + mission.recipients, 0))} ดวง</td><td>{first ? province.missions.length > 1 ? 'ดูรายภารกิจ' : change(first.performance.revenueChangePercent) : '—'}</td><td>{first && <button type="button" className="inline-flex items-center gap-1 text-blue-700 hover:underline" aria-expanded={expanded === province.code} aria-label={`ดูรายละเอียดภารกิจ ${province.name}`} onClick={() => setExpanded(expanded === province.code ? null : province.code)}>ดูรายละเอียด<ChevronDown size={13} /></button>}</td></tr>
            {expanded === province.code && <tr><td colSpan={7} className="whitespace-normal bg-slate-50"><div className="space-y-3">{province.missions.map(mission => <MissionDetails key={mission.id} mission={mission} scope={report.scope} />)}</div></td></tr>}</Fragment>;
          })}
        </tbody></table></div>
        {!rows.length && <p className="p-6 text-center text-sm text-slate-500">ไม่พบจังหวัดหรือภารกิจที่ตรงกับตัวกรอง</p>}
      </div>
    </>}
  </section>;
}

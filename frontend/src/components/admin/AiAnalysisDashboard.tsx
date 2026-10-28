import { Fragment, useEffect, useRef, useState, type FormEvent } from 'react';
import { BarChart3, CalendarDays, RefreshCw, Search, Settings2, Stamp, Store, TrendingDown } from 'lucide-react';
import { REGIONS, findProvince, type Region } from '../../../../shared/regions';
import { adminService, type WeeklyAiMission, type WeeklyAiMissionReport } from '../../services/adminService';
import { HourlySalesChart } from './HourlySalesChart';
import { summarizeAnalysisHours } from './analysis-hours';

const time = (minute: number) => `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
const money = (value: number) => value.toLocaleString('th-TH', { maximumFractionDigits: 2 });
const metric = (value: number | undefined) => typeof value === 'number' && Number.isFinite(value) ? `฿${money(value)}` : '—';
const decline = (mission: WeeklyAiMission) => typeof mission.evidence?.ratio === 'number' ? Math.round((1 - mission.evidence.ratio) * 100) : null;
const weekLabel = (week: string) => {
  const start = new Date(`${week}T00:00:00.000Z`);
  const end = new Date(start.getTime() + 6 * 86_400_000);
  return `${start.toLocaleDateString('th-TH', { timeZone: 'UTC', day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('th-TH', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' })}`;
};
const phase = (mission: WeeklyAiMission) => {
  if (mission.status.toUpperCase() !== 'ACTIVE') return 'ปิดไว้';
  const now = Date.now();
  if (now < new Date(mission.start).getTime()) return 'รอเริ่ม';
  if (now >= new Date(mission.end).getTime()) return 'สิ้นสุด';
  return 'กำลังจัด';
};

function AnalysisHourlyChart({ mission }: { mission: WeeklyAiMission }) {
  const { points } = summarizeAnalysisHours([mission]);
  return <HourlySalesChart points={points} label={`ยอดขายเฉลี่ยรายชั่วโมงของ${mission.shopName}`} caption="บิล 14 วันก่อนวิเคราะห์ · แต่ละแท่งแทน 1 ชั่วโมง เฉลี่ยเฉพาะวันที่มีบิลในชั่วโมงนั้น · ชั่วโมงที่ไม่มีบิลไม่ถือเป็นยอดขายศูนย์หรือเวลาปิดร้าน" />;
}

export function AiAnalysisDashboard() {
  const [report, setReport] = useState<WeeklyAiMissionReport | null>(null);
  const [limit, setLimit] = useState(1);
  const [savedLimit, setSavedLimit] = useState(1);
  const [chartId, setChartId] = useState<number | null>(null);
  const [region, setRegion] = useState<Region | ''>('');
  const [province, setProvince] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | 'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [editing, setEditing] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startMinute, setStartMinute] = useState(0);
  const [endMinute, setEndMinute] = useState(0);
  const [missionStatus, setMissionStatus] = useState('ACTIVE');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const requestId = useRef(0);

  const load = async (week?: string) => {
    const currentRequest = ++requestId.current;
    setLoading(true); setError('');
    try {
      const [campaigns, policy] = await Promise.all([adminService.getWeeklyAiMissions(week), adminService.getAiMissionPolicy()]);
      if (currentRequest !== requestId.current) return;
      setReport(campaigns); setLimit(policy.dailyStampLimit); setSavedLimit(policy.dailyStampLimit);
    } catch (value) {
      if (currentRequest === requestId.current) setError(value instanceof Error ? value.message : 'โหลดข้อมูลวิเคราะห์ไม่สำเร็จ');
    } finally { if (currentRequest === requestId.current) setLoading(false); }
  };
  useEffect(() => { void load(); return () => { requestId.current++; }; }, []);

  const missions = report?.missions ?? [];
  const activeMissions = missions.filter(mission => mission.status.toUpperCase() === 'ACTIVE');
  const provinces = [...new Set(missions.map(mission => mission.provinceName))].sort((a, b) => a.localeCompare(b, 'th'));
  const filtered = missions.filter(mission =>
    (!region || findProvince(mission.provinceName)?.region === region) &&
    (!province || mission.provinceName === province) &&
    (status === 'all' || (status === 'ACTIVE' ? mission.status.toUpperCase() === 'ACTIVE' : mission.status.toUpperCase() !== 'ACTIVE')) &&
    (!query.trim() || `${mission.shopName} ${mission.districtName} ${mission.provinceName}`.toLocaleLowerCase('th').includes(query.trim().toLocaleLowerCase('th'))),
  ).sort((a, b) => (a.evidence?.ratio ?? 1) - (b.evidence?.ratio ?? 1) || a.provinceName.localeCompare(b.provinceName, 'th'));
  const ratios = activeMissions.map(mission => mission.evidence?.ratio).filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  const averageDecline = ratios.length ? Math.round((1 - ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length) * 100) : null;
  const stamps = activeMissions.reduce((sum, mission) => sum + mission.recipients, 0);
  const chartMission = filtered.find(mission => mission.id === chartId);
  const overview = summarizeAnalysisHours(filtered);

  const edit = (mission: WeeklyAiMission) => {
    setEditing(mission.id); setName(mission.name); setDescription(mission.description ?? '');
    setStartMinute(mission.dailyStartMinute); setEndMinute(mission.dailyEndMinute); setMissionStatus(mission.status);
    setError(''); setMessage('');
  };
  const saveMission = async (event: FormEvent) => {
    event.preventDefault(); if (editing === null) return;
    if (endMinute <= startMinute) { setError('เวลาสิ้นสุดต้องช้ากว่าเวลาเริ่ม'); return; }
    setSaving(true); setError(''); setMessage('');
    try {
      await adminService.updateMission(editing, { Mission_Name: name.trim(), Description: description.trim(), Daily_Start_Minute: startMinute, Daily_End_Minute: endMinute, Status: missionStatus });
      await load(report?.selectedWeek ?? undefined); setEditing(null); setMessage('บันทึกการแก้ไขภารกิจแล้ว');
    } catch (value) { setError(value instanceof Error ? value.message : 'บันทึกภารกิจไม่สำเร็จ'); }
    finally { setSaving(false); }
  };
  const saveLimit = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setError(''); setMessage('');
    try { const policy = await adminService.setAiMissionPolicy(limit); await load(report?.selectedWeek ?? undefined); setMessage(`บันทึกเพดาน ${policy.dailyStampLimit.toLocaleString('th-TH')} ดวงต่อคนต่อวันให้ภารกิจที่เปิดใช้งานทั้งหมดแล้ว`); }
    catch (value) { setError(value instanceof Error ? value.message : 'บันทึกเพดานแสตมป์ไม่สำเร็จ'); }
    finally { setSaving(false); }
  };
  const refreshAnalysis = async () => {
    setRefreshing(true); setError(''); setMessage('');
    try {
      const result = await adminService.refreshWeeklyAiMissions();
      setEditing(null); setStatus('ACTIVE'); await load();
      setMessage(`วิเคราะห์ใหม่สำเร็จ เปิดภารกิจ ${result.created.toLocaleString('th-TH')} ร้านจนถึงสิ้นวันอาทิตย์ และปิดภารกิจชุดก่อนแล้ว`);
    } catch (value) { setError(value instanceof Error ? value.message : 'วิเคราะห์ใหม่ไม่สำเร็จ'); }
    finally { setRefreshing(false); }
  };

  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="admin-eyebrow">การวิเคราะห์และชี้เป้าร้านค้าชุมชน</p><h1 className="mt-1 text-2xl font-semibold text-slate-900">วิเคราะห์สถานการณ์ร้านค้า</h1><p className="mt-2 text-sm text-slate-500">ติดตามร้านที่ยอดขายลดลงจากข้อมูลบิล และภารกิจ AI ของแต่ละสัปดาห์</p></div>
      <div className="flex flex-wrap gap-2"><button className="admin-primary" type="button" disabled={loading || refreshing || saving} onClick={() => void refreshAnalysis()}><RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />{refreshing ? 'กำลังวิเคราะห์ร้านค้า…' : 'วิเคราะห์สถานการณ์ร้านค้าใหม่'}</button><button className="admin-secondary" type="button" disabled={loading || refreshing} onClick={() => void load(report?.selectedWeek ?? undefined)}>รีเฟรชข้อมูล</button></div>
    </div>
    {error && <p role="alert" className="border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {message && <p role="status" className="border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{message}</p>}
    <section className="admin-card flex flex-wrap items-center gap-4 p-4" aria-label="เลือกรอบวิเคราะห์">
      <CalendarDays size={19} className="text-[#9c7b36]" /><div className="min-w-0 flex-1"><p className="text-xs font-semibold text-slate-800">รอบภารกิจรายสัปดาห์</p><p className="text-[11px] text-slate-500">คัดสูงสุด 2 ร้านต่อจังหวัด · ประมวลผลวันอาทิตย์ 12:00 น. ตามเวลาไทย</p></div>
      <select className="admin-input !w-auto min-w-48" aria-label="เลือกรอบสัปดาห์" disabled={loading || !report?.weeks.length} value={report?.selectedWeek ?? ''} onChange={event => { setEditing(null); setRegion(''); setProvince(''); setQuery(''); setStatus('ACTIVE'); void load(event.target.value); }}>
        {!report?.weeks.length && <option value="">ยังไม่มีรอบภารกิจ</option>}
        {report?.weeks.map(week => <option key={week} value={week}>{weekLabel(week)}</option>)}
      </select>
    </section>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="สรุปผลวิเคราะห์">
      {([
        { label: 'ร้านที่ระบบคัด', value: activeMissions.length.toLocaleString('th-TH'), unit: 'ร้าน', note: 'ไม่เกิน 2 ร้านต่อจังหวัด', icon: Store },
        { label: 'จังหวัดที่มีภารกิจ', value: new Set(activeMissions.map(mission => mission.provinceName)).size.toLocaleString('th-TH'), unit: '/ 77 จังหวัด', note: 'เฉพาะจังหวัดที่มีร้านผ่านเกณฑ์', icon: BarChart3 },
        { label: 'ยอดขายเฉลี่ยลดลง', value: averageDecline === null ? '—' : averageDecline.toLocaleString('th-TH'), unit: averageDecline === null ? '' : '%', note: 'เฉลี่ยเฉพาะร้านที่คัดจากข้อมูลย้อนหลัง', icon: TrendingDown },
        { label: 'แสตมป์ AI ที่ออก', value: stamps.toLocaleString('th-TH'), unit: 'ดวง', note: 'นับจากรายการซื้อในช่วงภารกิจ', icon: Stamp },
      ] as const).map(({ label, value, unit, note, icon: Icon }, index) => <article key={label} className={`admin-card admin-kpi admin-kpi-${index} p-5`}><div className="flex items-center justify-between"><p className="text-xs font-medium text-slate-600">{label}</p><span className="admin-kpi-icon"><Icon size={18} /></span></div><p className="admin-kpi-value mt-3 font-semibold tabular-nums">{loading && !report ? '—' : value} <span className="text-xs font-normal text-slate-500">{unit}</span></p><p className="mt-2 text-[11px] text-slate-500">{note}</p></article>)}
    </div>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,1fr)]">
      <section className="admin-card min-w-0 overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4"><h2 className="flex items-center gap-2 text-sm font-semibold"><BarChart3 size={17} className="text-[#9c7b36]" />ยอดขายเฉลี่ยรายชั่วโมงและช่วงภารกิจ</h2><p className="mt-1 text-xs text-slate-500">ดูภาพรวมตามตัวกรองหรือเลือกรายร้าน · ไฮไลต์เข้มขึ้นเมื่อหลายร้านมีภารกิจในชั่วโมงเดียวกัน</p></div>
        {filtered.length ? <div className="space-y-4 p-5">
          <label className="block text-xs font-medium">มุมมองกราฟ<select className="admin-input mt-2" value={chartMission?.id ?? ''} onChange={event => setChartId(event.target.value ? Number(event.target.value) : null)}><option value="">ภาพรวมทุกร้านตามตัวกรอง ({overview.shopCount.toLocaleString('th-TH')} ร้าน)</option>{filtered.map(mission => <option key={mission.id} value={mission.id}>{mission.shopName} · {mission.provinceName}</option>)}</select></label>
          {chartMission ? <AnalysisHourlyChart mission={chartMission} /> : <HourlySalesChart points={overview.points} showOverlap label="ภาพรวมยอดขายเฉลี่ยรายชั่วโมงและจำนวนร้านที่มีภารกิจซ้อนกัน" caption={`รวม ${overview.shopCount.toLocaleString('th-TH')} ร้านไม่ซ้ำตามตัวกรอง · ความสูงแท่งคือผลรวมยอดขายเฉลี่ยรายชั่วโมงของแต่ละร้าน จากบิล 14 วันก่อนวิเคราะห์ · ความเข้มไฮไลต์แสดงจำนวนร้านที่มีภารกิจในชั่วโมงนั้น ชี้กราฟเพื่อดูจำนวนร้าน`} />}
        </div> : <p className="p-6 text-sm text-slate-500">{loading ? 'กำลังโหลดข้อมูล…' : 'ไม่มีภารกิจในตัวกรองนี้'}</p>}
      </section>
      <aside className="space-y-5"><form onSubmit={saveLimit} className="admin-card overflow-hidden"><div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4 text-sm font-semibold"><Settings2 size={17} className="text-[#9c7b36]" />นโยบายแสตมป์ AI</div><div className="space-y-3 p-5"><label className="block text-xs font-medium">แสตมป์สูงสุดต่อคนต่อวัน<input className="admin-input mt-2" type="number" min="1" max="2147483647" step="1" required value={limit} onChange={event => setLimit(Number(event.target.value))} /></label><button className="admin-primary" type="submit" disabled={saving || loading}>บันทึกจำนวนแสตมป์</button><p className="text-[11px] leading-5 text-slate-500">ซื้อในช่วงภารกิจ 1 รายการได้ 1 ดวง จากอำเภอที่ร้านตั้งอยู่ ไม่มีขั้นต่ำหรือโควต้าผู้เข้าร่วม แสตมป์ซื้อครบเกณฑ์รายอำเภอแยกต่างหาก</p></div></form>
        <div className="admin-card p-5 text-xs leading-5 text-slate-500"><h2 className="mb-2 text-sm font-semibold text-slate-800">วิธีอ่านผลวิเคราะห์</h2><p>ยอดขายเปรียบเทียบเฉลี่ยเฉพาะวันที่มีบิลในแต่ละช่วง วันที่ไม่มีบิลไม่ถูกตีความว่าเปิดร้านแล้วขายได้ศูนย์ ช่วงเวลา 2 ชั่วโมงเป็นเวลาที่พบจากบิล ไม่ใช่เวลาทำการที่ร้านยืนยัน</p></div>
      </aside>
    </div>
    <section className="admin-card overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4"><div><h2 className="text-sm font-semibold text-slate-800">ร้านที่ได้รับภารกิจ</h2><p className="mt-1 text-xs text-slate-500">แสดง {filtered.length.toLocaleString('th-TH')} จาก {missions.length.toLocaleString('th-TH')} ภารกิจ · เลือกสถานะทั้งหมดเพื่อดูชุดที่ปิดไว้</p></div></div>
      <div className="grid gap-3 border-b border-slate-200 p-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="text-xs font-medium">ภาค<select className="admin-input mt-1" value={region} onChange={event => { setRegion(event.target.value as Region | ''); setProvince(''); }}><option value="">ทุกภาค</option>{(Object.keys(REGIONS) as Region[]).filter(item => item !== 'Unmapped').map(item => <option key={item} value={item}>{REGIONS[item]}</option>)}</select></label>
        <label className="text-xs font-medium">จังหวัด<select className="admin-input mt-1" value={province} onChange={event => setProvince(event.target.value)}><option value="">ทุกจังหวัด</option>{provinces.filter(item => !region || findProvince(item)?.region === region).map(item => <option key={item} value={item}>{item}</option>)}</select></label>
        <label className="text-xs font-medium">สถานะ<select className="admin-input mt-1" value={status} onChange={event => setStatus(event.target.value as typeof status)}><option value="all">ทั้งหมด</option><option value="ACTIVE">เปิดใช้งาน</option><option value="INACTIVE">ปิดไว้</option></select></label>
        <label className="text-xs font-medium">ค้นหาร้านหรือพื้นที่<div className="relative"><Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input className="admin-input mt-1 !pl-9" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="ชื่อร้าน / อำเภอ" /></div></label>
      </div>
      <div className="max-h-[660px] overflow-auto"><table className="admin-table"><thead><tr><th>ร้านค้า / พื้นที่</th><th className="text-right">ยอดเฉลี่ยช่วงอ้างอิง</th><th className="text-right">ยอดเฉลี่ยล่าสุด</th><th className="text-right">ลดลง</th><th>เวลาภารกิจทุกวัน</th><th className="text-right">เพดาน / คน / วัน</th><th className="text-right">แจกแล้ว</th><th>สถานะ</th><th>จัดการ</th></tr></thead><tbody>
        {filtered.map(mission => <Fragment key={mission.id}><tr><td><p className="font-semibold text-slate-800">{mission.shopName}</p><p className="mt-1 text-[11px] text-slate-500">{mission.districtName} · {mission.provinceName}</p></td><td className="text-right tabular-nums">{metric(mission.evidence?.referenceDaily)}</td><td className="text-right tabular-nums">{metric(mission.evidence?.recentDaily)}</td><td className="text-right font-semibold tabular-nums text-amber-800">{decline(mission) === null ? '—' : `−${decline(mission)}%`}</td><td className="tabular-nums">{time(mission.dailyStartMinute)}–{time(mission.dailyEndMinute)} น.</td><td className="text-right tabular-nums font-semibold text-slate-800">{(mission.dailyStampLimit ?? savedLimit).toLocaleString('th-TH')} ดวง</td><td className="text-right tabular-nums">{mission.recipients.toLocaleString('th-TH')} ดวง</td><td><span className={`rounded-full px-2 py-1 text-[10px] font-medium ${phase(mission) === 'กำลังจัด' ? 'bg-emerald-50 text-emerald-700' : phase(mission) === 'ปิดไว้' ? 'bg-slate-100 text-slate-600' : 'bg-blue-50 text-blue-700'}`}>{phase(mission)}</span></td><td><button className="text-xs font-medium text-blue-700 hover:underline" type="button" aria-expanded={editing === mission.id} onClick={() => editing === mission.id ? setEditing(null) : edit(mission)}>{editing === mission.id ? 'ปิด' : 'ดู / แก้ไข'}</button></td></tr>
          {editing === mission.id && <tr><td colSpan={9} className="!bg-slate-50"><div className="max-w-3xl space-y-4 py-2"><p className="text-xs text-slate-600">{mission.description || 'ไม่มีรายละเอียดภารกิจ'}</p><p className="text-[11px] text-slate-500">ช่วงแคมเปญ {new Date(mission.start).toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok' })}–{new Date(new Date(mission.end).getTime() - 1).toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok' })} · เพดาน {mission.dailyStampLimit ?? savedLimit} ดวงต่อคนต่อวัน</p><section className="min-w-0 rounded-lg border border-slate-200 bg-white p-4" aria-label="กราฟยอดขายตามช่วงเวลาของร้าน"><h3 className="mb-4 text-sm font-semibold text-slate-800">ยอดขายเฉลี่ยรายชั่วโมง</h3><AnalysisHourlyChart mission={mission} /></section><form onSubmit={saveMission} className="grid gap-3 text-xs sm:grid-cols-2"><label className="sm:col-span-2">ชื่อภารกิจ<input className="admin-input mt-1" value={name} maxLength={200} required onChange={event => setName(event.target.value)} /></label><label className="sm:col-span-2">รายละเอียด<textarea className="admin-input mt-1" value={description} onChange={event => setDescription(event.target.value)} /></label><label>เริ่มเวลา<input className="admin-input mt-1" type="time" required value={time(startMinute)} onChange={event => { const [hour, minute] = event.target.value.split(':').map(Number); setStartMinute(hour * 60 + minute); }} /></label><label>สิ้นสุดเวลา<input className="admin-input mt-1" type="time" required value={time(endMinute)} onChange={event => { const [hour, minute] = event.target.value.split(':').map(Number); setEndMinute(hour * 60 + minute); }} /></label><label>สถานะ<select className="admin-input mt-1" value={missionStatus} onChange={event => setMissionStatus(event.target.value)}><option value="ACTIVE">เปิด</option><option value="INACTIVE">ปิด</option></select></label><div className="sm:col-span-2 flex gap-3"><button className="admin-primary" type="submit" disabled={saving}>บันทึกภารกิจ</button><button type="button" onClick={() => setEditing(null)}>ยกเลิก</button></div></form></div></td></tr>}
        </Fragment>)}
      </tbody></table>{!loading && !filtered.length && <p className="p-8 text-center text-sm text-slate-500">{missions.length ? 'ไม่พบร้านที่ตรงกับตัวกรอง' : 'ยังไม่มีภารกิจ AI ในรอบนี้ ระบบจะสร้างเมื่อมีร้านที่ผ่านเกณฑ์ข้อมูล'}</p>}{loading && !report && <p className="p-8 text-center text-sm text-slate-500">กำลังโหลดผลวิเคราะห์…</p>}</div>
    </section>
  </div>;
}

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { FeatureCollection } from 'geojson';
import { Download, MapPinned, RefreshCw, ArrowUpRight } from 'lucide-react';
import { adminService, GeographicDashboardData, ProvinceMetrics } from '../../services/adminService';
import { REGIONS, type Region } from '../../../../shared/regions';

const amount = (value: number) => value.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const regionKeys = Object.keys(REGIONS).filter(key => key !== 'Unmapped') as Region[];
type Metric = 'totalRevenue' | 'govSubsidized' | 'userPaid' | 'transactionCount';
const metricLabels: Record<Metric, string> = { totalRevenue: 'เงินหมุนเวียนรวม', govSubsidized: 'เงินรัฐสมทบ', userPaid: 'เงินประชาชนร่วมจ่าย', transactionCount: 'จำนวนธุรกรรม' };
const zero = { totalRevenue: 0, govSubsidized: 0, userPaid: 0, transactionCount: 0, merchantCount: 0, totalAllocated: 0, totalRemaining: 0 };

function ProvinceMap({ geometry, data, region, selected, metric, onSelect }: { geometry: FeatureCollection; data: ProvinceMetrics[]; region: string; selected: string; metric: Metric; onSelect: (province: ProvinceMetrics) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const [hovered, setHovered] = useState<ProvinceMetrics | null>(null);
  const max = Math.max(1, ...data.filter(p => !region || p.region === region).map(p => p[metric]));
  useEffect(() => {
    if (!container.current) return;
    const instance = L.map(container.current, { zoomControl: true, scrollWheelZoom: false, attributionControl: false, minZoom: 4, maxZoom: 12 });
    map.current = instance;
    const observer = new ResizeObserver(() => instance.invalidateSize());
    observer.observe(container.current);
    return () => { observer.disconnect(); instance.remove(); map.current = null; };
  }, []);
  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    const lookup = new Map(data.map(p => [p.code, p]));
    const color = (value: number) => value <= 0 ? '#e3e9ef' : value / max < 0.2 ? '#bfdbdb' : value / max < 0.5 ? '#70aaa9' : value / max < 0.8 ? '#327a80' : '#114e60';
    const layer = L.geoJSON(geometry, {
      style: feature => {
        const code = String(feature?.properties?.ADM1_PCODE).replace('TH', '');
        const p = lookup.get(code);
        const outside = region && p?.region !== region;
        return { fillColor: outside ? '#f2f4f6' : color(p?.[metric] ?? 0), fillOpacity: 1, color: selected === code ? '#b28835' : '#ffffff', weight: selected === code ? 3 : 1, opacity: 1 };
      },
      onEachFeature: (feature, item) => {
        const code = String(feature.properties.ADM1_PCODE).replace('TH', '');
        const province = lookup.get(code);
        const tooltip = document.createElement('span');
        tooltip.textContent = `${province?.name ?? feature.properties.ADM1_TH} · ${province ? amount(province[metric]) : 'ยังไม่มีข้อมูล'}${metric === 'transactionCount' ? ' รายการ' : ' บาท'}`;
        item.bindTooltip(tooltip, { sticky: true });
        if (province) item.on({ click: () => onSelect(province), mouseover: () => setHovered(province), mouseout: () => setHovered(null) });
      },
    }).addTo(instance);
    layer.eachLayer(item => {
      const path = item as L.Path & { feature?: { properties: { ADM1_PCODE: string; ADM1_TH: string } } };
      const code = path.feature?.properties.ADM1_PCODE.replace('TH', '');
      const p = lookup.get(code ?? '');
      const element = path.getElement();
      if (element && p) {
        element.setAttribute('tabindex', '0'); element.setAttribute('role', 'button'); element.setAttribute('aria-label', `เลือกจังหวัด${p.name}`);
        element.addEventListener('keydown', event => { if ((event as KeyboardEvent).key === 'Enter' || (event as KeyboardEvent).key === ' ') { event.preventDefault(); onSelect(p); } });
      }
    });
    const visible = layer.getLayers().filter(item => {
      const code = (item as L.Layer & { feature: { properties: { ADM1_PCODE: string } } }).feature.properties.ADM1_PCODE.replace('TH', '');
      return selected ? code === selected : !region || lookup.get(code)?.region === region;
    });
    const bounds = L.featureGroup(visible.length ? visible : layer.getLayers()).getBounds();
    instance.fitBounds(bounds, { padding: [25, 25], maxZoom: selected ? 9 : 7, animate: false });
    return () => { layer.remove(); };
  }, [geometry, data, region, selected, metric, max, onSelect]);
  return <div className="relative">
    <div ref={container} className="admin-province-map h-[480px] w-full lg:h-[560px]" aria-label="แผนที่เงินหมุนเวียนรายจังหวัด" />
    <div className="pointer-events-none absolute left-4 top-4 z-[500] max-w-[240px] border border-slate-200 bg-white/95 px-4 py-3 shadow-sm">
      <p className="text-xs text-slate-500">{hovered ? REGIONS[hovered.region] : 'แผนที่ประเทศไทย'}</p>
      <p className="mt-1 text-sm font-semibold text-slate-800">{hovered?.name ?? 'เลือกจังหวัดเพื่อดูรายละเอียด'}</p>
      {hovered && <p className="mt-2 text-lg font-semibold text-[#134c60]">{amount(hovered[metric])} <span className="text-xs">{metric === 'transactionCount' ? 'รายการ' : 'บาท'}</span></p>}
    </div>
    <div className="absolute bottom-5 left-4 z-[500] border border-slate-200 bg-white/95 p-3 text-[11px] text-slate-600">
      <p className="mb-2 font-medium">{metricLabels[metric]} · {metric === 'transactionCount' ? 'รายการ' : 'บาท'}</p>
      <div className="flex"><span className="h-2 w-10 bg-[#e3e9ef]" /><span className="h-2 w-10 bg-[#bfdbdb]" /><span className="h-2 w-10 bg-[#70aaa9]" /><span className="h-2 w-10 bg-[#327a80]" /><span className="h-2 w-10 bg-[#114e60]" /></div>
      <div className="mt-1 flex justify-between"><span>0</span><span>{amount(max)}</span></div>
    </div>
  </div>;
}

export const GeographicDashboard: React.FC = () => {
  const [data, setData] = useState<GeographicDashboardData | null>(null);
  const [geometry, setGeometry] = useState<FeatureCollection | null>(null);
  const [error, setError] = useState('');
  const [mapError, setMapError] = useState('');
  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState('');
  const [province, setProvince] = useState('');
  const [metric, setMetric] = useState<Metric>('totalRevenue');
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError('');
    adminService.getGeographicDashboard(controller.signal).then(setData).catch(value => { if (!controller.signal.aborted) { setData(null); setError(value instanceof Error ? value.message : 'โหลดข้อมูลไม่สำเร็จ'); } }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [version]);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/maps/thailand-provinces.geojson', { signal: controller.signal }).then(response => { if (!response.ok) throw new Error('โหลดขอบเขตจังหวัดไม่สำเร็จ'); return response.json(); }).then(setGeometry).catch(() => { if (!controller.signal.aborted) setMapError('ไม่สามารถโหลดแผนที่ได้ กรุณาเลือกพื้นที่จากตัวกรองด้านบน'); });
    return () => controller.abort();
  }, []);
  const provinces = data?.provinces ?? [];
  const filtered = provinces.filter(p => (!region || p.region === region) && (!province || p.code === province));
  const totals = filtered.reduce((sum, p) => Object.fromEntries(Object.keys(zero).map(key => [key, sum[key as keyof typeof zero] + p[key as keyof typeof zero]])) as typeof zero, { ...zero });
  const selectedName = provinces.find(p => p.code === province)?.name;
  const selectProvince = React.useCallback((p: ProvinceMetrics) => { setRegion(p.region); setProvince(p.code); }, []);
  const exportCsv = () => {
    const rows = [['จังหวัด', 'ภาค', 'เงินหมุนเวียน', 'รัฐสมทบ', 'ประชาชนจ่าย', 'จำนวนธุรกรรม', 'ร้านค้า'], ...filtered.map(p => [p.name, REGIONS[p.region], p.totalRevenue, p.govSubsidized, p.userPaid, p.transactionCount, p.merchantCount])];
    const blob = new Blob(['\uFEFF', rows.map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'รายงานเงินหมุนเวียนรายพื้นที่.csv'; anchor.click(); URL.revokeObjectURL(url);
  };
  return <div className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="admin-eyebrow">ภาพรวมการดำเนินโครงการ</p><h1 className="mt-1 text-2xl font-semibold text-slate-900">แดชบอร์ดเศรษฐกิจรายพื้นที่</h1><p className="mt-2 text-sm text-slate-500">ติดตามเงินหมุนเวียนและการร่วมจ่ายจากธุรกรรมที่สำเร็จ · สะสมตั้งแต่เริ่มโครงการ</p></div><button className="admin-secondary" disabled={loading || !data} onClick={exportCsv}><Download size={15} />ส่งออกรายงาน</button></div>
    <section className="admin-card flex flex-wrap items-end gap-4 p-4" aria-label="ตัวกรองพื้นที่">
      <label className="min-w-48 flex-1 text-sm font-medium">ภูมิภาค<select className="admin-input mt-2" value={region} onChange={e => { setRegion(e.target.value); setProvince(''); }}><option value="">ทุกภูมิภาค</option>{regionKeys.map(key => <option key={key} value={key}>{REGIONS[key]}</option>)}{provinces.some(p => p.region === 'Unmapped') && <option value="Unmapped">ไม่ระบุภาค</option>}</select></label>
      <label className="min-w-48 flex-1 text-sm font-medium">จังหวัด<select className="admin-input mt-2" value={province} onChange={e => setProvince(e.target.value)}><option value="">ทุกจังหวัดในพื้นที่</option>{provinces.filter(p => !region || p.region === region).sort((a, b) => a.name.localeCompare(b.name, 'th')).map(p => <option key={p.code} value={p.code}>{p.name}</option>)}</select></label>
      <button className="admin-secondary" onClick={() => { setRegion(''); setProvince(''); }}>ล้างตัวกรอง</button><button className="admin-secondary" disabled={loading} onClick={() => setVersion(value => value + 1)} aria-label="รีเฟรชข้อมูล"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /></button>
    </section>
    {error && <p role="alert" className="border border-red-200 bg-red-50 p-4 text-sm text-red-800">ไม่สามารถโหลดข้อมูลได้: {error} <button className="underline" onClick={() => setVersion(value => value + 1)}>ลองใหม่</button></p>}
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm"><p className="font-medium text-slate-700">ขอบเขตข้อมูล: {selectedName ?? (region ? REGIONS[region as Region] : 'ทั่วประเทศ')}</p><p className="text-xs text-slate-500" role="status">{loading ? 'กำลังประมวลผลข้อมูล…' : data ? `ข้อมูล ณ ${new Date(data.generatedAt).toLocaleString('th-TH')}` : 'ยังไม่มีข้อมูลจากเซิร์ฟเวอร์'}</p></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{([
      ['เงินหมุนเวียนรวม', totals.totalRevenue, 'มูลค่าซื้อขายที่สำเร็จ', 'บาท'], ['เงินรัฐสมทบ', totals.govSubsidized, 'ยอดรัฐช่วยจ่ายจริง', 'บาท'], ['เงินประชาชนร่วมจ่าย', totals.userPaid, 'ยอดประชาชนชำระจริง', 'บาท'], ['ธุรกรรมที่สำเร็จ', totals.transactionCount, `ร้านค้าในพื้นที่ ${totals.merchantCount.toLocaleString()} ร้าน`, 'รายการ'],
    ] as const).map(([title, value, note, unit], index) => <article key={title} className={`admin-card border-t-[3px] p-5 ${index === 0 ? 'border-t-[#163c58]' : 'border-t-[#b69a59]'}`}><p className="text-sm text-slate-500">{title}</p><p className="mt-3 text-2xl font-semibold tabular-nums text-[#173c58]">{data ? unit === 'บาท' ? amount(value) : value.toLocaleString('th-TH') : '—'} <span className="text-xs font-normal text-slate-500">{unit}</span></p><p className="mt-2 text-xs text-slate-400">{note}</p></article>)}</div>
    <div className="grid gap-5 xl:grid-cols-[1.45fr_1fr]">
      <section className="admin-card min-w-0 overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4"><h2 className="flex items-center gap-2 text-sm font-semibold"><MapPinned size={17} className="text-[#9c7b36]" />แผนที่การใช้จ่ายรายจังหวัด</h2><select aria-label="ตัวชี้วัดบนแผนที่" className="admin-input !w-auto !py-1.5 !text-xs" value={metric} onChange={e => setMetric(e.target.value as Metric)}>{Object.entries(metricLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div>
        {geometry ? <ProvinceMap geometry={geometry} data={provinces} region={region} selected={province} metric={metric} onSelect={selectProvince} /> : <div className="flex h-[480px] items-center justify-center bg-slate-50 p-6 text-sm text-slate-500">{mapError || 'กำลังโหลดแผนที่…'}</div>}
        <p className="border-t border-slate-200 px-5 py-3 text-[10px] leading-5 text-slate-400">การแบ่งพื้นที่ 6 ภาค · พื้นที่สีเทาไม่มีธุรกรรมที่สำเร็จ · แผนที่เพื่อการแสดงผล<br />ขอบเขตจังหวัด: OCHA CODs / mapthai ผ่าน <a className="underline" href="https://github.com/DevelopedbyWill/thailand-canonical-admin-names" target="_blank" rel="noreferrer">Thailand Canonical Administrative-Names Reference</a></p>
      </section>
      <section className="admin-card flex flex-col"><div className="border-b border-slate-200 px-5 py-4"><h2 className="text-sm font-semibold">สรุปเงินหมุนเวียนรายภาค</h2><p className="mt-1 text-xs text-slate-500">ยอดสะสมทั่วประเทศ · เลือกภาคเพื่อเจาะลึก</p></div><div className="flex-1 space-y-5 p-5">{regionKeys.map(key => {
        const total = provinces.filter(p => p.region === key).reduce((sum, p) => sum + p.totalRevenue, 0);
        const countryTotal = provinces.reduce((sum, p) => sum + p.totalRevenue, 0);
        const share = countryTotal ? total / countryTotal * 100 : 0;
        return <button key={key} className={`block w-full text-left ${region === key ? 'font-semibold text-[#164e63]' : 'text-slate-600'}`} aria-pressed={region === key} onClick={() => { setRegion(key); setProvince(''); }}><div className="flex justify-between gap-3 text-sm"><span>{REGIONS[key]}</span><span className="tabular-nums">{data ? amount(total) : '—'} <ArrowUpRight size={13} className="inline text-slate-400" /></span></div><div className="mt-2 h-1.5 bg-slate-100"><div className={`h-full ${region === key ? 'bg-[#a78a4a]' : 'bg-[#315e74]'}`} style={{ width: `${share}%` }} /></div><p className="mt-1 text-right text-[10px] text-slate-400">{share.toFixed(1)}% ของยอดทั่วประเทศ</p></button>;
      })}</div><div className="grid grid-cols-2 gap-4 border-t border-slate-200 bg-slate-50 p-5 text-xs text-slate-500"><div>วงเงินจัดสรรในพื้นที่<strong className="mt-1 block text-base text-slate-800">{data ? amount(totals.totalAllocated) : '—'} บาท</strong></div><div>วงเงินสิทธิ์คงเหลือ<strong className="mt-1 block text-base text-slate-800">{data ? amount(totals.totalRemaining) : '—'} บาท</strong></div><p className="col-span-2 text-[10px]">วงเงินอิงจังหวัดที่อยู่ของผู้รับสิทธิ์ ส่วนเงินหมุนเวียนอิงจังหวัดของธุรกรรม</p></div></section>
    </div>
    <section className="admin-card overflow-hidden"><div className="flex items-center justify-between border-b border-slate-200 p-5"><h2 className="text-sm font-semibold">รายละเอียดจังหวัดในพื้นที่</h2><span className="text-xs text-slate-500">{filtered.length} จังหวัด / พื้นที่</span></div><div className="max-h-[420px] overflow-auto"><table className="admin-table"><thead><tr><th>จังหวัด</th><th>ภาค</th><th className="text-right">เงินหมุนเวียน (บาท)</th><th className="text-right">รัฐสมทบ (บาท)</th><th className="text-right">ประชาชนจ่าย (บาท)</th><th className="text-right">ธุรกรรม</th></tr></thead><tbody>{[...filtered].sort((a, b) => b.totalRevenue - a.totalRevenue).map(p => <tr key={p.code} className={p.code === province ? 'bg-amber-50' : ''}><td><button className="font-medium text-[#24586d] hover:underline" onClick={() => selectProvince(p)}>{p.name}</button>{!p.registered && <span className="ml-2 text-[10px] text-slate-400">ยังไม่มีข้อมูล</span>}</td><td>{REGIONS[p.region]}</td><td className="text-right tabular-nums">{amount(p.totalRevenue)}</td><td className="text-right tabular-nums">{amount(p.govSubsidized)}</td><td className="text-right tabular-nums">{amount(p.userPaid)}</td><td className="text-right tabular-nums">{p.transactionCount.toLocaleString()}</td></tr>)}</tbody></table>{data && !totals.transactionCount && <p className="p-5 text-center text-sm text-slate-500">ยังไม่มีธุรกรรมที่สำเร็จในพื้นที่ที่เลือก</p>}</div></section>
  </div>;
};

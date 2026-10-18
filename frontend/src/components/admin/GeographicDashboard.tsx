import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { FeatureCollection } from 'geojson';
import { Download, MapPinned, RefreshCw, ArrowUpRight, ChevronRight, Store, Wallet, Landmark, Users, ReceiptText } from 'lucide-react';
import { adminService, GeographicDashboardData, ProvinceMetrics, DistrictMetrics, MerchantLocation } from '../../services/adminService';
import { REGIONS, type Region } from '../../../../shared/regions';
import { merchantBounds } from './map-bounds';

const amount = (value: number) => value.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const regionKeys = Object.keys(REGIONS).filter(key => key !== 'Unmapped') as Region[];
type Metric = 'totalRevenue' | 'govSubsidized' | 'userPaid' | 'merchantCount';
type MapArea = ProvinceMetrics | DistrictMetrics;
const metricLabels: Record<Metric, string> = { totalRevenue: 'เงินหมุนเวียนรวม', govSubsidized: 'เงินรัฐสมทบ', userPaid: 'เงินประชาชนร่วมจ่าย', merchantCount: 'จำนวนร้านค้า' };
const metricUnit = (metric: Metric) => metric === 'merchantCount' ? 'ร้าน' : 'บาท';
const metricValue = (value: number, metric: Metric) => metric === 'merchantCount' ? value.toLocaleString('th-TH') : amount(value);
const regionColors: Record<Region, string> = { North: '#7c3aed', Northeast: '#e97720', Central: '#2563eb', East: '#0891b2', West: '#db2777', South: '#059669', Unmapped: '#64748b' };
const kpiIcons = [Wallet, Landmark, Users, ReceiptText, Store];
const zero = { totalRevenue: 0, govSubsidized: 0, userPaid: 0, transactionCount: 0, merchantCount: 0 };

function AreaMap({ geometry, data, merchants, region, selected, districtLevel, metric, onSelect }: { geometry: FeatureCollection; data: MapArea[]; merchants: MerchantLocation[]; region: string; selected: string; districtLevel: boolean; metric: Metric; onSelect: (area: MapArea) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const [hovered, setHovered] = useState<MapArea | null>(null);
  const [outsideMerchantCount, setOutsideMerchantCount] = useState(0);
  const max = Math.max(1, ...data.filter(p => !region || p.region === region).map(p => p[metric]));
  useEffect(() => {
    if (!container.current) return;
    const instance = L.map(container.current, { zoomControl: true, scrollWheelZoom: false, attributionControl: false, minZoom: 1, maxZoom: 16 });
    map.current = instance;
    const observer = new ResizeObserver(() => instance.invalidateSize());
    observer.observe(container.current);
    return () => { observer.disconnect(); instance.remove(); map.current = null; };
  }, []);
  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    setHovered(null);
    const lookup = new Map(data.map(p => [p.code, p]));
    const codeProperty = districtLevel ? 'ADM2_PCODE' : 'ADM1_PCODE';
    const nameProperty = districtLevel ? 'ADM2_TH' : 'ADM1_TH';
    const color = (value: number) => value <= 0 ? '#f5dba5' : value / max < 0.2 ? '#93c5fd' : value / max < 0.5 ? '#38bdf8' : value / max < 0.8 ? '#6366f1' : '#4338ca';
    const layer = L.geoJSON(geometry, {
      style: feature => {
        const code = String(feature?.properties?.[codeProperty]).replace('TH', '');
        const p = lookup.get(code);
        const outside = region && p?.region !== region;
        return { fillColor: outside ? '#cbd5e1' : color(p?.[metric] ?? 0), fillOpacity: 1, color: selected === code ? '#854d0e' : '#8a98a6', weight: selected === code ? 3 : 1, opacity: 1 };
      },
      onEachFeature: (feature, item) => {
        const code = String(feature.properties[codeProperty]).replace('TH', '');
        const province = lookup.get(code);
        const tooltip = document.createElement('span');
        tooltip.textContent = `${province?.name ?? feature.properties[nameProperty]} · ${province ? metricValue(province[metric], metric) : 'ยังไม่มีข้อมูล'} ${metricUnit(metric)} · ${province?.merchantCount ?? 0} ร้าน`;
        item.bindTooltip(tooltip, { sticky: true });
        if (province) item.on({ click: () => onSelect(province), mouseover: () => setHovered(province), mouseout: () => setHovered(null) });
      },
    }).addTo(instance);
    layer.eachLayer(item => {
      const path = item as L.Path & { feature?: { properties: Record<string, string> } };
      const code = path.feature?.properties[codeProperty].replace('TH', '');
      const p = lookup.get(code ?? '');
      const element = path.getElement();
      if (element && p) {
        element.setAttribute('tabindex', '0'); element.setAttribute('role', 'button'); element.setAttribute('aria-label', `เลือก${districtLevel ? 'อำเภอ/เขต' : 'จังหวัด'}${p.name}`);
        element.addEventListener('keydown', event => { if ((event as KeyboardEvent).key === 'Enter' || (event as KeyboardEvent).key === ' ') { event.preventDefault(); onSelect(p); } });
      }
    });
    const visible = layer.getLayers().filter(item => {
      const code = (item as L.Layer & { feature: { properties: Record<string, string> } }).feature.properties[codeProperty].replace('TH', '');
      return selected ? code === selected : !region || lookup.get(code)?.region === region;
    });
    const bounds = L.featureGroup(visible.length ? visible : layer.getLayers()).getBounds();
    setOutsideMerchantCount(merchants.filter(merchant => !bounds.contains([merchant.lat, merchant.lng])).length);
    const shopBounds = merchantBounds(merchants);
    if (shopBounds) bounds.extend(shopBounds);
    instance.fitBounds(bounds, { padding: [25, 25], maxZoom: selected ? districtLevel ? 12 : 9 : districtLevel ? 9 : 7, animate: false });
    return () => { layer.remove(); };
  }, [geometry, data, merchants, region, selected, districtLevel, metric, max, onSelect]);
  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    const markers = L.layerGroup().addTo(instance);
    const icon = L.divIcon({
      className: 'admin-shop-marker', iconSize: [28, 34], iconAnchor: [14, 34], popupAnchor: [0, -30],
      html: '<span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M3 10h18L19 4H5l-2 6Zm1 0v10h16V10M9 20v-6h6v6M3 10c0 3 4 3 4 0 0 3 5 3 5 0 0 3 5 3 5 0 0 3 4 3 4 0"/></svg></span>',
    });
    for (const merchant of merchants) {
      const popup = document.createElement('div');
      popup.className = 'admin-shop-popup';
      const name = document.createElement('strong'); name.textContent = merchant.shopName;
      const category = document.createElement('p'); category.textContent = merchant.category || 'ร้านค้าในโครงการ';
      const address = document.createElement('p'); address.textContent = `${merchant.districtName} · ${merchant.provinceName}`;
      const coordinates = document.createElement('small'); coordinates.textContent = `${merchant.lat.toFixed(6)}, ${merchant.lng.toFixed(6)}`;
      popup.append(name, category, address, coordinates);
      L.marker([merchant.lat, merchant.lng], { icon, title: merchant.shopName, alt: `ที่ตั้งร้าน ${merchant.shopName}`, keyboard: true }).bindPopup(popup).addTo(markers);
    }
    return () => { markers.remove(); };
  }, [merchants]);
  return <><div className="relative">
    <div ref={container} className="admin-province-map h-[480px] w-full lg:h-[560px]" aria-label={`แผนที่เงินหมุนเวียนราย${districtLevel ? 'อำเภอ/เขต' : 'จังหวัด'}`} />
    <div className="pointer-events-none absolute left-4 top-4 z-[500] max-w-[240px] border border-slate-200 bg-white/95 px-4 py-3 shadow-sm">
      <p className="text-xs text-slate-500">{hovered ? 'provinceName' in hovered ? hovered.provinceName : REGIONS[hovered.region] : districtLevel ? 'ขอบเขตอำเภอ/เขต' : 'แผนที่ประเทศไทย'}</p>
      <p className="mt-1 text-sm font-semibold text-slate-800">{hovered?.name ?? `เลือก${districtLevel ? 'อำเภอ/เขต' : 'จังหวัด'}เพื่อดูรายละเอียด`}</p>
      {hovered && <><p className="mt-2 text-lg font-semibold text-indigo-800">{metricValue(hovered[metric], metric)} <span className="text-xs">{metricUnit(metric)}</span></p><p className="mt-1 text-xs text-slate-500">ร้านค้าในพื้นที่ {hovered.merchantCount.toLocaleString('th-TH')} ร้าน</p></>}
    </div>
    <div className="absolute bottom-5 left-4 z-[500] border border-slate-200 bg-white/95 p-3 text-[11px] text-slate-600">
      <p className="mb-2 font-medium">{metricLabels[metric]} · {metricUnit(metric)}</p>
      <div className="flex"><span className="h-2 w-10 bg-[#f5dba5]" /><span className="h-2 w-10 bg-[#93c5fd]" /><span className="h-2 w-10 bg-[#38bdf8]" /><span className="h-2 w-10 bg-[#6366f1]" /><span className="h-2 w-10 bg-[#4338ca]" /></div>
      <div className="mt-1 flex justify-between"><span>0</span><span>{metricValue(max, metric)}</span></div>
      <p className="mt-2 text-[10px]">สีทราย: ตัวชี้วัดเป็นศูนย์</p>
      {merchants.length > 0 && <p className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-2"><span className="size-2.5 rounded-full bg-orange-500" />หมุดสีส้ม: ที่ตั้งร้านค้า</p>}
    </div>
    {merchants.length > 0 && <button className="absolute bottom-5 right-4 z-[500] flex items-center gap-2 rounded-lg border border-orange-200 bg-white px-3 py-2 text-xs font-semibold text-orange-800 shadow-sm hover:bg-orange-50" onClick={() => {
      const bounds = merchantBounds(merchants);
      if (bounds) map.current?.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }}><Store size={15} />ดูที่ตั้งร้าน ({merchants.length})</button>}
  </div>{outsideMerchantCount > 0 && <p role="status" className="border-t border-amber-200 bg-amber-50 px-5 py-3 text-xs leading-6 text-amber-900">พิกัด {outsideMerchantCount} ร้านอยู่นอกกรอบพื้นที่ทะเบียนที่เลือก ระบบขยายมุมมองให้เห็นหมุดแล้ว กรุณาตรวจสอบพื้นที่ทะเบียนและพิกัดร้าน</p>}</>;
}

export const GeographicDashboard: React.FC = () => {
  const [data, setData] = useState<GeographicDashboardData | null>(null);
  const [geometry, setGeometry] = useState<FeatureCollection | null>(null);
  const [districtGeometry, setDistrictGeometry] = useState<FeatureCollection | null>(null);
  const [error, setError] = useState('');
  const [mapError, setMapError] = useState('');
  const [districtMapError, setDistrictMapError] = useState('');
  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState('');
  const [province, setProvince] = useState('');
  const [district, setDistrict] = useState('');
  const [sortBy, setSortBy] = useState<'totalRevenue' | 'merchantCount'>('totalRevenue');
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
  useEffect(() => {
    if (!province || districtGeometry) return;
    const controller = new AbortController(); setDistrictMapError('');
    fetch('/maps/thailand-districts.geojson', { signal: controller.signal }).then(response => {
      if (!response.ok) throw new Error('โหลดขอบเขตอำเภอไม่สำเร็จ');
      return response.json();
    }).then(setDistrictGeometry).catch(() => { if (!controller.signal.aborted) setDistrictMapError('ไม่สามารถโหลดขอบเขตอำเภอ/เขตได้ ยังเลือกพื้นที่จากตัวกรองและตารางได้'); });
    return () => controller.abort();
  }, [province, districtGeometry, version]);
  const provinces = data?.provinces ?? [];
  const filteredProvinces = provinces.filter(p => (!region || p.region === region) && (!province || p.code === province));
  const districtRows = React.useMemo(() => (data?.districts ?? []).filter(d => d.provinceCode === province), [data, province]);
  const filtered: MapArea[] = province ? districtRows.filter(d => !district || d.code === district) : filteredProvinces;
  const visibleMerchants = React.useMemo(() => (data?.merchants ?? []).filter(merchant => (!region || merchant.region === region) && (!province || merchant.provinceCode === province) && (!district || merchant.districtCode === district)), [data, region, province, district]);
  const totals = filtered.reduce((sum, area) => Object.fromEntries(Object.keys(zero).map(key => [key, sum[key as keyof typeof zero] + area[key as keyof typeof zero]])) as typeof zero, { ...zero });
  const budget = filteredProvinces.reduce((sum, area) => ({ totalAllocated: sum.totalAllocated + area.totalAllocated, totalRemaining: sum.totalRemaining + area.totalRemaining }), { totalAllocated: 0, totalRemaining: 0 });
  const selectedProvince = provinces.find(p => p.code === province);
  const selectedDistrict = districtRows.find(d => d.code === district);
  const scope = [region ? REGIONS[region as Region] : '', selectedProvince?.name, selectedDistrict?.name].filter(Boolean).join(' › ') || 'ทั่วประเทศ';
  const scopedGeometry = React.useMemo<FeatureCollection | null>(() => districtGeometry && province ? { type: 'FeatureCollection', features: districtGeometry.features.filter(feature => String(feature.properties?.ADM1_PCODE).replace('TH', '') === province) } : null, [districtGeometry, province]);
  const districtLevel = Boolean(scopedGeometry?.features.length);
  const hasSelectedBoundary = !district || scopedGeometry?.features.some(feature => String(feature.properties?.ADM2_PCODE).replace('TH', '') === district);
  const selectArea = React.useCallback((area: MapArea) => {
    setRegion(area.region);
    if ('provinceCode' in area) { setProvince(area.provinceCode); setDistrict(area.code); }
    else { setProvince(area.code); setDistrict(''); }
  }, []);
  const resetArea = () => { setRegion(''); setProvince(''); setDistrict(''); };
  const summaryRegions: Region[] = provinces.some(p => p.region === 'Unmapped') ? [...regionKeys, 'Unmapped'] : regionKeys;
  const summaryRows = province ? districtRows.map(d => ({ code: d.code, name: d.name, totalRevenue: d.totalRevenue, merchantCount: d.merchantCount, region: d.region })).sort((a, b) => b[sortBy] - a[sortBy]) : summaryRegions.map(key => ({ code: key, name: REGIONS[key], region: key, totalRevenue: provinces.filter(p => p.region === key).reduce((sum, p) => sum + p.totalRevenue, 0), merchantCount: provinces.filter(p => p.region === key).reduce((sum, p) => sum + p.merchantCount, 0) }));
  const summaryTotal = summaryRows.reduce((sum, row) => sum + row.totalRevenue, 0);
  const exportCsv = () => {
    const rows = [
      ['รายงานผลโครงการรายพื้นที่'], ['ขอบเขตข้อมูล', scope], ['ข้อมูล ณ', data ? new Date(data.generatedAt).toLocaleString('th-TH') : ''], ['ช่วงข้อมูล', 'สะสมตั้งแต่เริ่มโครงการ'], [],
      ['จังหวัด', 'อำเภอ/เขต', 'ภาค', 'เงินหมุนเวียน', 'รัฐสมทบ', 'ประชาชนจ่าย', 'จำนวนธุรกรรม', 'จำนวนร้านค้า'],
      ...[...filtered].sort((a, b) => b[sortBy] - a[sortBy]).map(area => ['provinceName' in area ? area.provinceName : area.name, 'provinceCode' in area ? area.name : '', REGIONS[area.region], area.totalRevenue, area.govSubsidized, area.userPaid, area.transactionCount, area.merchantCount]),
    ];
    const blob = new Blob(['\uFEFF', rows.map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'รายงานเงินหมุนเวียนรายพื้นที่.csv'; anchor.click(); URL.revokeObjectURL(url);
  };
  return <div className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="admin-eyebrow">ภาพรวมการดำเนินโครงการ</p><h1 className="mt-1 text-2xl font-semibold text-slate-900">แดชบอร์ดเศรษฐกิจรายพื้นที่</h1><p className="mt-2 text-sm text-slate-500">ติดตามเงินหมุนเวียนและการร่วมจ่ายจากธุรกรรมที่สำเร็จ · สะสมตั้งแต่เริ่มโครงการ</p></div><button className="admin-secondary" disabled={loading || !data} onClick={exportCsv}><Download size={15} />ส่งออกรายงาน</button></div>
    <section className="admin-card flex flex-wrap items-end gap-4 p-4" aria-label="ตัวกรองพื้นที่">
      <label className="min-w-40 flex-1 text-sm font-medium">ภูมิภาค<select className="admin-input mt-2" value={region} onChange={e => { setRegion(e.target.value); setProvince(''); setDistrict(''); }}><option value="">ทุกภูมิภาค</option>{regionKeys.map(key => <option key={key} value={key}>{REGIONS[key]}</option>)}{provinces.some(p => p.region === 'Unmapped') && <option value="Unmapped">ไม่ระบุภาค</option>}</select></label>
      <label className="min-w-40 flex-1 text-sm font-medium">จังหวัด<select className="admin-input mt-2" value={province} onChange={e => { const selected = provinces.find(p => p.code === e.target.value); if (selected) setRegion(selected.region); setProvince(e.target.value); setDistrict(''); }}><option value="">ทุกจังหวัดในพื้นที่</option>{provinces.filter(p => !region || p.region === region).sort((a, b) => a.name.localeCompare(b.name, 'th')).map(p => <option key={p.code} value={p.code}>{p.name}</option>)}</select></label>
      <label className="min-w-40 flex-1 text-sm font-medium">อำเภอ/เขต<select aria-describedby="district-filter-help" className="admin-input mt-2 disabled:!bg-slate-50 disabled:!text-slate-400" value={district} disabled={!province || !districtRows.length} onChange={e => setDistrict(e.target.value)}><option value="">{province ? 'ทุกอำเภอ/เขตในจังหวัด' : 'เลือกจังหวัดก่อน'}</option>{[...districtRows].sort((a, b) => a.name.localeCompare(b.name, 'th')).map(d => <option key={d.code} value={d.code}>{d.name}</option>)}</select><span id="district-filter-help" className="mt-1 block text-[10px] font-normal text-slate-500">{!province ? 'เลือกจังหวัดเพื่อเปิดรายการอำเภอ/เขต' : districtRows.length ? `เลือกได้ ${districtRows.length} อำเภอ/เขต` : 'ยังไม่มีรายการอำเภอ/เขต กรุณาโหลดข้อมูลใหม่'}</span></label>
      <button className="admin-secondary" onClick={resetArea}>ล้างตัวกรอง</button><button className="admin-secondary" disabled={loading} onClick={() => setVersion(value => value + 1)} aria-label="รีเฟรชข้อมูล"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /></button>
    </section>
    {error && <p role="alert" className="border border-red-200 bg-red-50 p-4 text-sm text-red-800">ไม่สามารถโหลดข้อมูลได้: {error} <button className="underline" onClick={() => setVersion(value => value + 1)}>ลองใหม่</button></p>}
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <nav aria-label="เส้นทางพื้นที่" className="flex flex-wrap items-center gap-2 font-medium text-slate-600"><button className="hover:text-indigo-700 hover:underline" onClick={resetArea}>ทั่วประเทศ</button>{region && <><ChevronRight size={13} /><button className="hover:text-indigo-700 hover:underline" onClick={() => { setProvince(''); setDistrict(''); }}>{REGIONS[region as Region]}</button></>}{selectedProvince && <><ChevronRight size={13} /><button className="hover:text-indigo-700 hover:underline" onClick={() => setDistrict('')}>{selectedProvince.name}</button></>}{selectedDistrict && <><ChevronRight size={13} /><span aria-current="location" className="text-indigo-700">{selectedDistrict.name}</span></>}</nav>
      <p className="text-xs text-slate-500" role="status">{loading ? 'กำลังประมวลผลข้อมูล…' : data ? `ข้อมูล ณ ${new Date(data.generatedAt).toLocaleString('th-TH')}` : 'ยังไม่มีข้อมูลจากเซิร์ฟเวอร์'}</p>
    </div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">{([
      ['เงินหมุนเวียนรวม', totals.totalRevenue, 'มูลค่าซื้อขายที่สำเร็จ', 'บาท'], ['เงินรัฐสมทบ', totals.govSubsidized, 'ยอดรัฐช่วยจ่ายจริง', 'บาท'], ['เงินประชาชนร่วมจ่าย', totals.userPaid, 'ยอดประชาชนชำระจริง', 'บาท'], ['ธุรกรรมที่สำเร็จ', totals.transactionCount, 'รายการซื้อขายในพื้นที่', 'รายการ'], ['ร้านค้าในพื้นที่', totals.merchantCount, 'ร้านค้าที่มีทะเบียนในโครงการ', 'ร้าน'],
    ] as const).map(([title, value, note, unit], index) => {
      const Icon = kpiIcons[index];
      return <article key={title} className={`admin-card admin-kpi admin-kpi-${index} p-5`}><div className="flex items-center justify-between gap-2"><p className="text-xs font-medium text-slate-600">{title}</p><span className="admin-kpi-icon"><Icon size={18} /></span></div><p className="admin-kpi-value mt-3 font-semibold tabular-nums">{data ? unit === 'บาท' ? amount(value) : value.toLocaleString('th-TH') : '—'} <span className="text-xs font-normal text-slate-500">{unit}</span></p><p className="mt-2 text-[11px] text-slate-500">{note}</p></article>;
    })}</div>
    <div className="grid gap-5 xl:grid-cols-[1.45fr_1fr]">
      <section className="admin-card min-w-0 overflow-hidden"><div className="admin-section-heading flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4"><h2 className="flex items-center gap-2 text-sm font-semibold"><MapPinned size={17} className="text-indigo-600" />แผนที่ราย{province ? 'อำเภอ/เขต' : 'จังหวัด'}{district && 'และที่ตั้งร้านค้า'}</h2><select aria-label="ตัวชี้วัดบนแผนที่" className="admin-input !w-auto !py-1.5 !text-xs" value={metric} onChange={e => setMetric(e.target.value as Metric)}>{Object.entries(metricLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div>
        {province && !districtGeometry && <p role="status" className="bg-blue-50 px-5 py-2 text-xs text-blue-800">{districtMapError || 'กำลังโหลดขอบเขตอำเภอ/เขต…'}{districtMapError && <button className="ml-2 underline" onClick={() => setVersion(value => value + 1)}>ลองใหม่</button>}</p>}
        {province && districtGeometry && (!districtLevel || !hasSelectedBoundary) && <p role="status" className="bg-amber-50 px-5 py-2 text-xs text-amber-800">ยังจับคู่ขอบเขตพื้นที่นี้ไม่ได้ ดูข้อมูลจากตารางและหมุดร้านค้าที่มีพิกัดได้</p>}
        {geometry ? <AreaMap geometry={districtLevel ? scopedGeometry! : geometry} data={districtLevel ? districtRows : provinces} merchants={district ? visibleMerchants : []} region={region} selected={districtLevel ? district : province} districtLevel={districtLevel} metric={metric} onSelect={selectArea} /> : <div className="flex h-[480px] items-center justify-center bg-slate-50 p-6 text-sm text-slate-500">{mapError || 'กำลังโหลดแผนที่…'}</div>}
        <div className="flex flex-wrap items-center gap-3 border-t border-orange-100 bg-orange-50/60 px-5 py-3 text-xs"><span className="flex items-center gap-2 font-semibold text-orange-800"><Store size={15} />{data ? `ฐานข้อมูลในพื้นที่ ${totals.merchantCount.toLocaleString('th-TH')} ร้าน · ปักหมุดได้ ${visibleMerchants.length.toLocaleString('th-TH')} ร้าน` : loading ? 'กำลังโหลดที่ตั้งร้านค้าจากฐานข้อมูล' : 'ยังโหลดข้อมูลที่ตั้งร้านค้าไม่ได้'}</span>{data && <span className="text-slate-500">ไม่มีพิกัดที่ใช้งานได้ {Math.max(0, totals.merchantCount - visibleMerchants.length).toLocaleString('th-TH')} ร้าน · {district ? 'คลิกหมุดเพื่อดูรายละเอียด' : 'เลือกอำเภอ/เขตเพื่อแสดงที่ตั้งร้านค้า'}</span>}</div>
        <p className="border-t border-slate-200 px-5 py-3 text-[10px] leading-5 text-slate-500">การแบ่งพื้นที่ 6 ภาค · พื้นที่สีทรายมีค่าเป็นศูนย์ในตัวชี้วัดที่เลือก · พื้นหลังสีฟ้าอ่อน · แผนที่เพื่อการแสดงผล<br />ขอบเขตจังหวัดและอำเภอ/เขต: OCHA CODs / mapthai ผ่าน <a className="underline" href="https://github.com/DevelopedbyWill/thailand-canonical-admin-names" target="_blank" rel="noreferrer">Thailand Canonical Administrative-Names Reference</a></p>
      </section>
      <section className="admin-card flex flex-col"><div className="admin-section-heading border-b border-slate-200 px-5 py-4"><h2 className="text-sm font-semibold">สรุปผลราย{province ? 'อำเภอ/เขต' : 'ภาค'}</h2><p className="mt-1 text-xs text-slate-500">{province ? selectedProvince?.name : 'ยอดสะสมทั่วประเทศ'} · เลือกพื้นที่เพื่อเจาะลึก</p></div>
        <div className="max-h-[480px] flex-1 space-y-3 overflow-y-auto p-5">{summaryRows.map(row => {
          const share = summaryTotal ? row.totalRevenue / summaryTotal * 100 : 0;
          const active = province ? district === row.code : region === row.code;
          return <button key={row.code} className={`block w-full rounded-lg p-2 text-left ${active ? 'bg-indigo-50 font-semibold text-indigo-900' : 'text-slate-600 hover:bg-slate-50'}`} aria-pressed={active} onClick={() => { if (province) setDistrict(row.code); else { setRegion(row.region); setProvince(''); setDistrict(''); } }}>
            <div className="flex justify-between gap-3 text-sm"><span className="flex items-center gap-2"><span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: regionColors[row.region] }} />{row.name}</span><span className="tabular-nums">{data ? amount(row.totalRevenue) : '—'} <ArrowUpRight size={13} className="inline text-slate-400" /></span></div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full" style={{ width: `${share}%`, backgroundColor: regionColors[row.region] }} /></div><div className="mt-2 flex justify-between text-[10px]"><span className="font-medium" style={{ color: regionColors[row.region] }}>{data ? row.merchantCount.toLocaleString('th-TH') : '—'} ร้านค้า</span><span className="text-slate-400">{share.toFixed(1)}% ของยอด{province ? 'ทั้งจังหวัด' : 'ทั่วประเทศ'}</span></div>
          </button>;
        })}</div>
        {district ? <p className="border-t border-amber-100 bg-amber-50 p-5 text-xs leading-6 text-amber-800">วงเงินสิทธิ์ประชาชนยังไม่มีข้อมูลระดับอำเภอ/เขต เลือกชื่อจังหวัดในเส้นทางด้านบนเพื่อดูวงเงินรวมระดับจังหวัด</p> : <div className="grid grid-cols-2 gap-4 border-t border-slate-200 bg-slate-50 p-5 text-xs text-slate-500"><div>วงเงินจัดสรรในพื้นที่<strong className="mt-1 block text-base text-slate-800">{data ? amount(budget.totalAllocated) : '—'} บาท</strong></div><div>วงเงินสิทธิ์คงเหลือ<strong className="mt-1 block text-base text-slate-800">{data ? amount(budget.totalRemaining) : '—'} บาท</strong></div><p className="col-span-2 text-[10px]">วงเงินอิงจังหวัดที่อยู่ของผู้รับสิทธิ์ ส่วนเงินหมุนเวียนอิงพื้นที่ของธุรกรรม</p></div>}
      </section>
    </div>
    <section className="admin-card overflow-hidden">
      <div className="admin-section-heading flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5"><h2 className="text-sm font-semibold">รายงานผลราย{province ? 'อำเภอ/เขต' : 'จังหวัด'}</h2><div className="flex flex-wrap items-center gap-3"><label className="flex items-center gap-2 text-xs text-slate-500">เรียงตาม<select className="admin-input !w-auto !py-1.5 !text-xs" value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}><option value="totalRevenue">ยอดเงินหมุนเวียน</option><option value="merchantCount">จำนวนร้านค้า</option></select></label><span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-800">{filtered.length} พื้นที่ · {data ? totals.merchantCount.toLocaleString('th-TH') : '—'} ร้านค้า</span></div></div>
      <div className="max-h-[420px] overflow-auto"><table className="admin-table">
        <thead><tr><th>{province ? 'อำเภอ/เขต' : 'จังหวัด'}</th><th>{province ? 'จังหวัด' : 'ภาค'}</th><th className="text-right">จำนวนร้านค้า</th><th className="text-right">เงินหมุนเวียน (บาท)</th><th className="text-right">รัฐสมทบ (บาท)</th><th className="text-right">ประชาชนจ่าย (บาท)</th><th className="text-right">ธุรกรรม</th></tr></thead>
        <tbody>{[...filtered].sort((a, b) => b[sortBy] - a[sortBy]).map(p => <tr key={p.code} className={p.code === (province ? district : province) ? 'bg-indigo-50' : ''}>
          <td><button className="font-medium text-[#24586d] hover:underline" onClick={() => selectArea(p)}>{p.name}</button>{!p.registered && <span className="ml-2 text-[10px] text-slate-400">ยังไม่มีข้อมูล</span>}</td>
          <td><span className="inline-flex items-center gap-2"><span className="size-1.5 rounded-full" style={{ backgroundColor: regionColors[p.region] }} />{'provinceName' in p ? p.provinceName : REGIONS[p.region]}</span></td>
          <td className="text-right font-semibold tabular-nums text-teal-700">{p.merchantCount.toLocaleString('th-TH')}</td>
          <td className="text-right tabular-nums">{amount(p.totalRevenue)}</td><td className="text-right tabular-nums">{amount(p.govSubsidized)}</td><td className="text-right tabular-nums">{amount(p.userPaid)}</td><td className="text-right tabular-nums">{p.transactionCount.toLocaleString('th-TH')}</td>
        </tr>)}</tbody>
        {data && <tfoot className="bg-indigo-50 font-semibold text-indigo-950"><tr><td colSpan={2}>รวมพื้นที่ที่เลือก</td><td className="text-right tabular-nums">{totals.merchantCount.toLocaleString('th-TH')}</td><td className="text-right tabular-nums">{amount(totals.totalRevenue)}</td><td className="text-right tabular-nums">{amount(totals.govSubsidized)}</td><td className="text-right tabular-nums">{amount(totals.userPaid)}</td><td className="text-right tabular-nums">{totals.transactionCount.toLocaleString('th-TH')}</td></tr></tfoot>}
      </table>{data && !totals.transactionCount && <p className="p-5 text-center text-sm text-slate-500">ยังไม่มีธุรกรรมที่สำเร็จในพื้นที่ที่เลือก</p>}</div>
    </section>
  </div>;
};

import { Fragment, useEffect, useState, type FormEvent } from 'react';
import { MapPin, Pencil, Search, Stamp, TicketCheck } from 'lucide-react';
import { adminService, type DistrictStampOverview } from '../../services/adminService';

export function AdminStampsPanel() {
  const [districts, setDistricts] = useState<DistrictStampOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [provinceId, setProvinceId] = useState(0);
  const [districtId, setDistrictId] = useState(0);
  const [search, setSearch] = useState('');
  const [loadVersion, setLoadVersion] = useState(0);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [minSpend, setMinSpend] = useState('');
  const [rewardCount, setRewardCount] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    adminService.getStamps()
      .then(items => { if (active) setDistricts(items); })
      .catch(value => { if (active) setError(value instanceof Error ? value.message : 'โหลดข้อมูลแสตมป์ไม่สำเร็จ'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [loadVersion]);

  const provinces = [...new Map(districts.map(district => [district.provinceId, district.provinceName])).entries()]
    .sort((a, b) => a[1].localeCompare(b[1], 'th'));
  const areaDistricts = districts.filter(district => !provinceId || district.provinceId === provinceId);
  const query = search.trim().toLocaleLowerCase('th');
  const visible = areaDistricts.filter(district => (!districtId || district.districtId === districtId)
    && `${district.stampName} ${district.districtName} ${district.provinceName}`.toLocaleLowerCase('th').includes(query));
  const issuedCount = visible.reduce((total, district) => total + district.issuedCount, 0);
  const issuedDistricts = visible.filter(district => district.issuedCount > 0).length;
  const edit = (district: DistrictStampOverview) => {
    setEditingId(district.districtId); setMinSpend(String(district.minSpend));
    setRewardCount(String(district.rewardCount)); setSaveError(''); setMessage('');
  };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (saving || editingId === null) return;
    setSaving(true); setSaveError(''); setMessage('');
    try {
      const rule = await adminService.setStampRule(editingId, { minSpend: Number(minSpend), rewardCount: Number(rewardCount) });
      setDistricts(previous => previous.map(district => district.districtId === rule.districtId ? { ...district, ...rule } : district));
      setEditingId(null); setMessage('บันทึกเงื่อนไขแล้ว มีผลกับบิลที่ชำระหลังจากนี้');
    } catch (value) { setSaveError(value instanceof Error ? value.message : 'บันทึกเงื่อนไขไม่สำเร็จ'); }
    finally { setSaving(false); }
  };

  return <section className="space-y-5">
    <div className="admin-card flex items-start gap-4 p-5">
      <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700"><Stamp size={26} /></span>
      <div><h2 className="text-sm font-semibold text-slate-900">เงื่อนไขรับแสตมป์ประจำอำเภอ</h2>
        <p className="mt-1 text-xs leading-6 text-slate-600">แสตมป์เป็นสิทธิ์ประจำทุกอำเภอ / เขต ตามพื้นที่ของร้านค้าที่ประชาชนซื้อสินค้า</p>
        <p className="text-xs leading-6 text-slate-500">ตั้งยอดซื้อรวมขั้นต่ำต่อบิลและจำนวนดวงที่แจกได้รายอำเภอ ค่าเริ่มต้น 150 บาท รับ 1 ดวง</p>
        <p className="text-xs leading-6 text-slate-500">เมื่อบิลถึงเกณฑ์ จะได้รับจำนวนที่ตั้งไว้หนึ่งครั้งต่อบิล ยอดหลายบิลไม่นำมารวมกัน</p></div>
    </div>

    <div className="admin-card overflow-hidden">
      <div className="grid gap-3 border-b border-slate-200 p-5 text-xs md:grid-cols-3">
        <label>จังหวัด<select className="admin-input mt-1" value={provinceId} onChange={event => { setProvinceId(Number(event.target.value)); setDistrictId(0); }}><option value={0}>ทุกจังหวัด</option>{provinces.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
        <label>อำเภอ / เขต<select className="admin-input mt-1" value={districtId} onChange={event => setDistrictId(Number(event.target.value))}><option value={0}>ทุกอำเภอ / เขต</option>{areaDistricts.map(district => <option key={district.districtId} value={district.districtId}>{district.districtName}{!provinceId ? ` · ${district.provinceName}` : ''}</option>)}</select></label>
        <label>ค้นหา<div className="relative mt-1"><input className="admin-input pr-9" type="search" placeholder="ชื่อแสตมป์ อำเภอ หรือจังหวัด" value={search} onChange={event => setSearch(event.target.value)} /><Search className="pointer-events-none absolute right-3 top-3 text-slate-400" size={16} /></div></label>
      </div>
      {error && <div role="alert" className="flex items-center justify-between gap-3 border-b border-rose-100 bg-rose-50 p-4 text-xs text-rose-700"><span>{error}</span><button type="button" className="admin-secondary" disabled={loading} onClick={() => setLoadVersion(value => value + 1)}>ลองใหม่</button></div>}
      {message && <p role="status" className="border-b border-emerald-100 bg-emerald-50 px-5 py-3 text-xs text-emerald-700">{message}</p>}
      <div className="grid gap-3 p-5 sm:grid-cols-3">
        {[
          { label: 'อำเภอ / เขตในพื้นที่ที่เลือก', value: visible.length, unit: 'แห่ง', icon: MapPin },
          { label: 'พื้นที่ที่มีการออกแสตมป์แล้ว', value: issuedDistricts, unit: 'แห่ง', icon: TicketCheck },
          { label: 'แสตมป์ที่ออกทั้งหมด', value: issuedCount, unit: 'ดวง', icon: Stamp },
        ].map(({ label, value, unit, icon: Icon }) => <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-4"><p className="flex items-center gap-2 text-xs text-slate-500"><Icon size={16} />{label}</p><p className="mt-2 text-2xl font-semibold tabular-nums text-[#193f5a]">{loading || error ? '—' : value.toLocaleString('th-TH')} <span className="text-xs font-normal text-slate-500">{unit}</span></p></div>)}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 px-5 pb-4 text-xs text-slate-500"><span>จำนวนที่ออกทั้งหมดรวมแสตมป์จากการซื้อสินค้าและภารกิจ</span><button type="button" className="text-blue-700 hover:underline" disabled={loading} onClick={() => setLoadVersion(value => value + 1)}>รีเฟรชข้อมูล</button></div>
      <div className="max-h-[560px] overflow-auto"><table className="admin-table"><thead><tr><th>แสตมป์ประจำพื้นที่</th><th>อำเภอ / เขต</th><th>จังหวัด</th><th className="text-right">ยอดขั้นต่ำ / บิล</th><th className="text-right">ได้รับ / บิล</th><th className="text-right">ออกแล้ว</th><th>จัดการ</th></tr></thead>
        <tbody>{!loading && !error && visible.map(district => <Fragment key={district.districtId}>
          <tr><td><span className="inline-flex items-center gap-2 font-medium text-slate-900"><Stamp size={16} className="shrink-0 text-amber-600" />{district.stampName}</span></td><td>{district.districtName}</td><td>{district.provinceName}</td><td className="text-right tabular-nums">{district.minSpend.toLocaleString('th-TH', { maximumFractionDigits: 2 })} บาท</td><td className="text-right tabular-nums">{district.rewardCount.toLocaleString('th-TH')} ดวง</td><td className="text-right tabular-nums">{district.issuedCount.toLocaleString('th-TH')} ดวง</td><td><button type="button" className="inline-flex items-center gap-1 text-blue-700 hover:underline" disabled={saving} onClick={() => edit(district)} aria-expanded={editingId === district.districtId} aria-label={`แก้ไขเงื่อนไข ${district.districtName}`}><Pencil size={13} />แก้ไขเงื่อนไข</button></td></tr>
          {editingId === district.districtId && <tr><td colSpan={7} className="whitespace-normal bg-blue-50/50"><form onSubmit={save}>
            <fieldset disabled={saving} className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <label>ยอดซื้อขั้นต่ำต่อบิล (บาท)<input autoFocus className="admin-input mt-1" type="number" required min="0.01" max="9999999999.99" step="0.01" value={minSpend} onChange={event => setMinSpend(event.target.value)} /></label>
              <label>จำนวนแสตมป์ที่จะได้รับ (ดวง)<input className="admin-input mt-1" type="number" required min="1" max="100" step="1" value={rewardCount} onChange={event => setRewardCount(event.target.value)} /></label>
              <div className="flex gap-2"><button className="admin-primary">{saving ? 'กำลังบันทึก…' : 'บันทึก'}</button><button type="button" className="admin-secondary" onClick={() => setEditingId(null)}>ยกเลิก</button></div>
            </fieldset>
            <p className="mt-2 text-[11px] text-slate-500">บิลที่ถึงเกณฑ์รับจำนวนตามที่ตั้งไว้ ไม่คูณตามยอดซื้อ การแก้ไขไม่มีผลย้อนหลังต่อแสตมป์ที่ได้รับแล้ว</p>
            {saveError && <p role="alert" className="mt-2 text-xs text-rose-700">{saveError}</p>}
          </form></td></tr>}
        </Fragment>)}</tbody>
      </table></div>
      {loading ? <p role="status" className="p-6 text-center text-xs text-slate-500">กำลังโหลดข้อมูลรายอำเภอ…</p> : !error && !visible.length && <p className="p-6 text-center text-xs text-slate-500">ไม่พบอำเภอตามเงื่อนไขที่เลือก</p>}
    </div>
  </section>;
}

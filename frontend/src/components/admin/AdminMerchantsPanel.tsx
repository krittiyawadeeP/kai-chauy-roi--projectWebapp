import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Banknote, Pencil, Search, Store, X } from 'lucide-react';
import { adminService, type AdminMerchantRecord } from '../../services/adminService';
import { geoService, type ApiDistrict, type ApiProvince } from '../../services/geoService';

const categories = ['อาหารและเครื่องดื่ม', 'ของใช้ทั่วไป', 'หัตถกรรม/ของฝาก', 'บริการชุมชน', 'ผลไม้/เกษตรแปรรูป', 'เสื้อผ้าและเครื่องแต่งกาย', 'สุขภาพและความงาม', 'บ้านและเครื่องใช้'];
const money = (value: number) => value.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dateTime = (value: string | null) => value ? new Date(value).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'ยังไม่มีบิลสำเร็จ';
const owner = (merchant: AdminMerchantRecord) => merchant.Owner_Name || merchant.users.Name || 'ยังไม่ระบุชื่อเจ้าของ';
const emptyForm = { shopName: '', ownerName: '', category: '', provinceId: 0, districtId: 0, lat: '', lng: '' };

export function AdminMerchantsPanel() {
  const [merchants, setMerchants] = useState<AdminMerchantRecord[]>([]);
  const [provinces, setProvinces] = useState<ApiProvince[]>([]);
  const [districts, setDistricts] = useState<ApiDistrict[]>([]);
  const [query, setQuery] = useState('');
  const [filterProvince, setFilterProvince] = useState(0);
  const [editing, setEditing] = useState<AdminMerchantRecord | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [districtLoading, setDistrictLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [message, setMessage] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    let active = true;
    Promise.all([adminService.getMerchants(), geoService.getProvinces()])
      .then(([shops, areas]) => { if (active) { setMerchants(shops); setProvinces(areas); } })
      .catch(value => { if (active) setError(value instanceof Error ? value.message : 'โหลดร้านค้าไม่สำเร็จ'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!editing || !form.provinceId) { setDistricts([]); setDistrictLoading(false); return; }
    let active = true;
    setDistricts([]); setDistrictLoading(true);
    geoService.getDistricts(form.provinceId)
      .then(rows => { if (active) setDistricts(rows); })
      .catch(value => { if (active) setFormError(value instanceof Error ? value.message : 'โหลดอำเภอไม่สำเร็จ'); })
      .finally(() => { if (active) setDistrictLoading(false); });
    return () => { active = false; };
  }, [form.provinceId, editing?.Mch_ID]);

  const edit = (merchant: AdminMerchantRecord) => {
    setEditing(merchant); setForm({ shopName: merchant.Shop_Name, ownerName: merchant.Owner_Name ?? '', category: merchant.Category ?? '',
      provinceId: merchant.districts.Prov_ID, districtId: merchant.Dist_ID, lat: merchant.Lat == null ? '' : String(merchant.Lat), lng: merchant.Lng == null ? '' : String(merchant.Lng) });
    setFormError(''); setMessage(''); dialog.current?.showModal();
  };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!editing || saving || districtLoading) return;
    if (!!form.lat.trim() !== !!form.lng.trim()) { setFormError('กรุณาระบุละติจูดและลองจิจูดให้ครบทั้งคู่ หรือเว้นว่างทั้งคู่'); return; }
    setSaving(true); setFormError('');
    try {
      const saved = await adminService.updateMerchant(editing.Mch_ID, {
        Shop_Name: form.shopName.trim(), Owner_Name: form.ownerName.trim() || null, Category: form.category || null,
        Dist_ID: form.districtId, Lat: form.lat.trim() ? Number(form.lat) : null, Lng: form.lng.trim() ? Number(form.lng) : null,
      });
      setMerchants(previous => previous.map(merchant => merchant.Mch_ID === saved.Mch_ID ? { ...merchant, ...saved, income: merchant.income } : merchant));
      setMessage(`บันทึกข้อมูลร้าน ${saved.Shop_Name} แล้ว`); dialog.current?.close();
    } catch (value) { setFormError(value instanceof Error ? value.message : 'บันทึกข้อมูลร้านไม่สำเร็จ'); }
    finally { setSaving(false); }
  };
  const search = query.trim().toLocaleLowerCase('th');
  const visible = merchants.filter(merchant => (!filterProvince || merchant.districts.Prov_ID === filterProvince) &&
    `${merchant.Shop_Name} ${owner(merchant)} ${merchant.users.Name ?? ''} ${merchant.users.Phone} ${merchant.districts.Dist_Name} ${merchant.districts.provinces.Prov_Name}`.toLocaleLowerCase('th').includes(search));
  const totalRevenue = visible.reduce((total, merchant) => total + merchant.income.totalRevenue, 0);
  const monthRevenue = visible.reduce((total, merchant) => total + merchant.income.monthRevenue, 0);
  const monthLabel = new Date().toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok', month: 'long', year: 'numeric' });

  return <section className="space-y-5">
    <div className="admin-card p-5"><h2 className="flex items-center gap-2 text-base font-semibold text-slate-900"><Store size={20} className="text-[#9c7b36]" />ข้อมูลร้านค้า เจ้าของ และรายได้</h2><p className="mt-2 text-xs leading-6 text-slate-500">รายได้คือมูลค่าบิลที่ชำระสำเร็จทั้งหมดในระบบ ดูรายละเอียดเจ้าของและแก้ไขข้อมูลของแต่ละร้านได้จากตาราง</p></div>
    {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
    {message && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{message}</p>}
    <div className="grid gap-4 md:grid-cols-3">{[
      { label: 'ร้านค้าตามตัวกรอง', value: visible.length.toLocaleString('th-TH'), unit: 'ร้าน', note: `จากทะเบียนทั้งหมด ${merchants.length.toLocaleString('th-TH')} ร้าน` },
      { label: 'รายได้เดือนนี้', value: money(monthRevenue), unit: 'บาท', note: monthLabel },
      { label: 'รายได้สะสม', value: money(totalRevenue), unit: 'บาท', note: 'รวมบิลสำเร็จตั้งแต่เริ่มใช้งาน' },
    ].map((card, index) => <div key={card.label} className={`admin-card admin-kpi admin-kpi-${index} p-5`}><p className="text-xs text-slate-600">{card.label}</p><p className="admin-kpi-value mt-3 font-semibold tabular-nums">{loading || error ? '—' : card.value} <span className="text-xs font-normal text-slate-500">{card.unit}</span></p><p className="mt-2 text-[11px] text-slate-500">{card.note}</p></div>)}</div>
    <div className="admin-card overflow-hidden">
      <div className="grid gap-4 border-b border-slate-200 p-5 text-xs md:grid-cols-[minmax(0,1fr)_260px]"><label>ค้นหาร้านหรือเจ้าของ<div className="relative mt-2"><Search size={16} className="pointer-events-none absolute left-3 top-3 text-slate-400" /><input className="admin-input !pl-10" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="ชื่อร้าน เจ้าของ เบอร์โทร หรือพื้นที่" /></div></label><label>จังหวัด<select className="admin-input mt-2" value={filterProvince} onChange={event => setFilterProvince(Number(event.target.value))}><option value={0}>ทุกจังหวัด</option>{provinces.map(province => <option key={province.Prov_ID} value={province.Prov_ID}>{province.Prov_Name}</option>)}</select></label></div>
      <div className="max-h-[680px] overflow-auto"><table className="admin-table"><thead><tr><th>ร้านค้า</th><th>เจ้าของ / ติดต่อ</th><th>พื้นที่</th><th className="text-right">รายได้เดือนนี้</th><th className="text-right">รายได้สะสม</th><th className="text-right">บิลสำเร็จ</th><th>จัดการ</th></tr></thead><tbody>{!loading && !error && visible.map(merchant => <tr key={merchant.Mch_ID}>
        <td><p className="font-semibold text-slate-900">{merchant.Shop_Name}</p><p className="mt-1 text-[11px] text-slate-500">#{merchant.Mch_ID} · {merchant.Category || 'ไม่ระบุประเภท'}</p></td>
        <td><p className="font-medium text-slate-800">{owner(merchant)}</p><p className="mt-1 text-[11px] text-slate-500">{merchant.users.Phone || 'ไม่ระบุเบอร์ติดต่อ'}</p></td>
        <td><p>{merchant.districts.Dist_Name}</p><p className="mt-1 text-[11px] text-slate-500">{merchant.districts.provinces.Prov_Name}</p></td>
        <td className="text-right tabular-nums">{money(merchant.income.monthRevenue)} บาท</td><td className="text-right font-semibold tabular-nums text-[#193f5a]">{money(merchant.income.totalRevenue)} บาท</td><td className="text-right tabular-nums">{merchant.income.transactionCount.toLocaleString('th-TH')}</td>
        <td><button type="button" className="inline-flex items-center gap-1 text-blue-700 hover:underline" aria-label={`ดูและแก้ไขร้าน ${merchant.Shop_Name}`} onClick={() => edit(merchant)}><Pencil size={13} />ดู / แก้ไข</button></td>
      </tr>)}</tbody></table></div>
      {loading ? <p role="status" className="p-8 text-center text-sm text-slate-500">กำลังโหลดร้านค้าและสรุปรายได้…</p> : !error && !visible.length && <p className="p-8 text-center text-sm text-slate-500">ไม่พบร้านค้าที่ตรงกับตัวกรอง</p>}
    </div>
    <dialog ref={dialog} aria-labelledby="merchant-form-title" className="m-auto max-h-[90vh] w-[94vw] max-w-3xl overflow-y-auto rounded-2xl border-0 bg-white p-0 shadow-2xl backdrop:bg-slate-900/40" onClose={() => { setEditing(null); setFormError(''); }} onCancel={event => { if (saving) event.preventDefault(); }}>
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5"><div><h2 id="merchant-form-title" className="text-base font-semibold text-slate-900">รายละเอียดและแก้ไขร้านค้า</h2><p className="mt-1 text-xs text-slate-500">{editing?.Shop_Name}</p></div><button type="button" aria-label="ปิดรายละเอียดร้านค้า" className="rounded p-1 text-slate-500 hover:bg-slate-100" disabled={saving} onClick={() => dialog.current?.close()}><X size={20} /></button></div>
      {editing && <div className="space-y-5 p-6">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs"><p className="font-semibold text-slate-800">บัญชีเจ้าของ #{editing.User_ID}</p><div className="mt-2 flex flex-wrap gap-x-6 gap-y-2 text-slate-600"><span>ชื่อบัญชี: {editing.users.Name || 'ยังไม่ระบุ'}</span><span>เบอร์ติดต่อ: {editing.users.Phone || 'ยังไม่ระบุ'}</span></div></div>
        <div><h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800"><Banknote size={17} className="text-[#9c7b36]" />รายได้จากยอดขาย</h3><div className="grid gap-3 sm:grid-cols-3">{[
          { label: 'เดือนนี้', value: `${money(editing.income.monthRevenue)} บาท` },
          { label: 'สะสมทั้งหมด', value: `${money(editing.income.totalRevenue)} บาท` },
          { label: 'บิลสำเร็จทั้งหมด', value: `${editing.income.transactionCount.toLocaleString('th-TH')} บิล` },
        ].map(item => <div key={item.label} className="rounded-lg bg-emerald-50 p-3"><p className="text-xs text-emerald-800">{item.label}</p><p className="mt-1 text-base font-semibold tabular-nums text-emerald-900">{item.value}</p></div>)}</div><p className="mt-2 text-[11px] text-slate-500">บิลล่าสุด: {dateTime(editing.income.lastSaleAt)}</p></div>
        <form onSubmit={save}><fieldset disabled={saving} className="grid gap-4 text-xs sm:grid-cols-2">
          <label>ชื่อร้าน<input autoFocus className="admin-input mt-2" required maxLength={200} value={form.shopName} onChange={event => setForm(previous => ({ ...previous, shopName: event.target.value }))} /></label>
          <label>ชื่อเจ้าของร้าน<input className="admin-input mt-2" maxLength={200} value={form.ownerName} placeholder={editing.users.Name ?? 'ชื่อเจ้าของร้าน'} onChange={event => setForm(previous => ({ ...previous, ownerName: event.target.value }))} /></label>
          <label className="sm:col-span-2">ประเภทร้าน<select className="admin-input mt-2" value={form.category} onChange={event => setForm(previous => ({ ...previous, category: event.target.value }))}><option value="">ไม่ระบุประเภท</option>{categories.map(category => <option key={category} value={category}>{category}</option>)}</select></label>
          <label>จังหวัด<select className="admin-input mt-2" required value={form.provinceId || ''} onChange={event => { setFormError(''); setForm(previous => ({ ...previous, provinceId: Number(event.target.value), districtId: 0 })); }}><option value="">เลือกจังหวัด</option>{provinces.map(province => <option key={province.Prov_ID} value={province.Prov_ID}>{province.Prov_Name}</option>)}</select></label>
          <label>อำเภอ / เขต<select className="admin-input mt-2" required disabled={districtLoading} value={form.districtId || ''} onChange={event => setForm(previous => ({ ...previous, districtId: Number(event.target.value) }))}><option value="">{districtLoading ? 'กำลังโหลดอำเภอ…' : 'เลือกอำเภอ / เขต'}</option>{districts.map(district => <option key={district.Dist_ID} value={district.Dist_ID}>{district.Dist_Name}</option>)}</select></label>
          <label>ละติจูด<input className="admin-input mt-2" type="number" min="-90" max="90" step="any" value={form.lat} onChange={event => setForm(previous => ({ ...previous, lat: event.target.value }))} /></label>
          <label>ลองจิจูด<input className="admin-input mt-2" type="number" min="-180" max="180" step="any" value={form.lng} onChange={event => setForm(previous => ({ ...previous, lng: event.target.value }))} /></label>
          {formError && <p role="alert" className="rounded bg-rose-50 p-3 text-rose-700 sm:col-span-2">{formError}</p>}
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 sm:col-span-2"><button type="button" className="admin-secondary" onClick={() => dialog.current?.close()}>ปิด</button><button type="submit" className="admin-primary" disabled={!form.districtId || districtLoading}>{saving ? 'กำลังบันทึก…' : 'บันทึกการแก้ไข'}</button></div>
        </fieldset></form>
      </div>}
    </dialog>
  </section>;
}

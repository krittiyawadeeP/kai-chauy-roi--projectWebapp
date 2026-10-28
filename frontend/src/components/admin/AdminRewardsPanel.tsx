import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Gift, MapPin, Pencil, Plus, Stamp, X } from 'lucide-react';
import { adminService, type AdminRewardRecord, type RewardProvince } from '../../services/adminService';

export function AdminRewardsPanel() {
  const [provinces, setProvinces] = useState<RewardProvince[]>([]);
  const [rewards, setRewards] = useState<AdminRewardRecord[]>([]);
  const [filterProvince, setFilterProvince] = useState(0);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [provinceId, setProvinceId] = useState(0);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [stampCount, setStampCount] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [message, setMessage] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    let active = true;
    Promise.all([adminService.getRewardProvinces(), adminService.getRewards()])
      .then(([areas, items]) => { if (active) { setProvinces(areas); setRewards(items); } })
      .catch(value => { if (active) setError(value instanceof Error ? value.message : 'โหลดข้อมูลของรางวัลไม่สำเร็จ'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const selected = provinces.find(province => province.id === provinceId);
  const reset = () => {
    setEditingId(null); setProvinceId(0); setName(''); setDescription('');
    setImageUrl(''); setSourceUrl(''); setStatus('ACTIVE'); setStampCount(''); setFormError('');
  };
  const add = () => { reset(); setMessage(''); dialog.current?.showModal(); };
  const edit = (reward: AdminRewardRecord) => {
    setEditingId(reward.Reward_ID); setProvinceId(reward.Province_ID ?? 0);
    setName(reward.Reward_Name); setDescription(reward.Description ?? '');
    setImageUrl(reward.Image_URL ?? ''); setSourceUrl(reward.Source_URL ?? '');
    setStampCount(String(reward.Required_Stamp_Count));
    setStatus(reward.Status); setFormError(''); setMessage(''); dialog.current?.showModal();
  };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (saving || !selected) return;
    setSaving(true); setFormError(''); setMessage('');
    try {
      const data = { Reward_Name: name.trim(), Description: description.trim(), Province_ID: provinceId,
        Image_URL: imageUrl.trim(), Source_URL: sourceUrl.trim(), Reward_Type: 'OTOP_PRODUCT' as const, Status: status, Required_Stamp_Count: Number(stampCount) };
      const saved = editingId ? await adminService.updateOtopReward(editingId, data) : await adminService.createOtopReward(data);
      const item = { ...saved, provinces: { Prov_Name: selected.name } };
      setRewards(previous => editingId ? previous.map(reward => reward.Reward_ID === editingId ? item : reward) : [item, ...previous]);
      if (filterProvince && filterProvince !== provinceId) setFilterProvince(provinceId);
      setMessage(editingId ? 'บันทึกการแก้ไขสินค้าแล้ว' : 'เพิ่มสินค้า OTOP แล้ว');
      dialog.current?.close();
    } catch (value) { setFormError(value instanceof Error ? value.message : 'บันทึกสินค้าไม่สำเร็จ'); }
    finally { setSaving(false); }
  };
  const visible = rewards.filter(reward => reward.Reward_Type === 'OTOP_PRODUCT' && (!filterProvince || reward.Province_ID === filterProvince));

  return <section className="space-y-5">
    <div className="admin-card flex flex-wrap items-start justify-between gap-4 p-5">
      <div className="max-w-3xl"><h2 className="flex items-center gap-2 text-base font-semibold text-slate-900"><Gift size={20} className="text-[#9c7b36]" />รายการของรางวัล OTOP</h2><p className="mt-2 text-xs leading-6 text-slate-500">กำหนดจำนวนแสตมป์ที่ใช้แลกได้รายสินค้า โดยใช้แสตมป์จากอำเภอที่ต่างกันในจังหวัดนั้น</p></div>
      <button type="button" className="admin-primary" disabled={loading || !!error} onClick={add}><Plus size={16} />เพิ่มสินค้า</button>
    </div>
    {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
    {message && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{message}</p>}
    <div className="admin-card flex flex-wrap items-end justify-between gap-4 p-5">
      <label className="block w-full text-xs font-medium text-slate-600 sm:max-w-xs">จังหวัด<select className="admin-input mt-2" disabled={loading} value={filterProvince} onChange={event => setFilterProvince(Number(event.target.value))}><option value={0}>ทุกจังหวัด</option>{provinces.map(province => <option key={province.id} value={province.id}>{province.name}</option>)}</select></label>
      <p className="text-xs text-slate-500">{loading ? 'กำลังโหลดรายการสินค้า…' : `แสดง ${visible.length.toLocaleString('th-TH')} รายการ`}</p>
    </div>
    {loading ? <p role="status" className="admin-card p-8 text-center text-sm text-slate-500">กำลังโหลดของรางวัล OTOP…</p> : !error && <>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{visible.map(reward => {
        const provinceName = reward.provinces?.Prov_Name ?? provinces.find(province => province.id === reward.Province_ID)?.name ?? 'ไม่ระบุจังหวัด';
        return <article key={reward.Reward_ID} className="admin-card flex min-w-0 flex-col overflow-hidden">
          <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-amber-50 to-slate-100">
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-amber-700"><Gift size={40} strokeWidth={1.25} /><span className="text-sm font-semibold">OTOP · {provinceName}</span></div>
            {reward.Image_URL && <img key={reward.Image_URL} src={reward.Image_URL} alt={reward.Reward_Name} loading="lazy" className="relative h-full w-full object-cover" onError={event => { event.currentTarget.style.display = 'none'; }} />}
            <span className={`absolute right-3 top-3 rounded-full border px-3 py-1 text-[11px] font-medium shadow-sm ${reward.Status === 'ACTIVE' ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-500'}`}>{reward.Status === 'ACTIVE' ? 'เปิดให้แลก' : 'ปิดไว้'}</span>
          </div>
          <div className="flex flex-1 flex-col p-5">
            <p className="flex items-center gap-1 text-xs text-slate-500"><MapPin size={13} />{provinceName}</p>
            <h3 className="mt-2 text-base font-semibold leading-6 text-slate-900">{reward.Reward_Name}</h3>
            <p className="mt-2 line-clamp-3 whitespace-pre-line text-xs leading-6 text-slate-500">{reward.Description || 'สินค้า OTOP ประจำจังหวัด'}</p>
            <div className="mt-auto pt-4"><div className="rounded-lg border border-amber-100 bg-amber-50 p-3"><p className="flex items-center gap-1.5 text-xs font-medium text-amber-800"><Stamp size={15} />แสตมป์ที่ใช้แลก</p><p className="mt-1 text-2xl font-semibold tabular-nums text-amber-900">{reward.Required_Stamp_Count.toLocaleString('th-TH')} <span className="text-sm font-normal">ดวง</span></p><p className="mt-1 text-[11px] text-amber-800">จาก {reward.Required_Stamp_Count.toLocaleString('th-TH')} อำเภอที่ต่างกันในจังหวัด{provinceName}</p></div></div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2"><button type="button" className="admin-secondary" onClick={() => edit(reward)} aria-label={`แก้ไขสินค้า ${reward.Reward_Name}`}><Pencil size={13} />แก้ไขสินค้า</button>{reward.Source_URL && <a href={reward.Source_URL} target="_blank" rel="noopener noreferrer" className="text-[11px] text-blue-700 hover:underline">ที่มาภาพและสิทธิ์</a>}</div>
          </div>
        </article>;
      })}</div>
      {!visible.length && <div className="admin-card p-10 text-center"><Gift size={32} className="mx-auto text-slate-300" /><p className="mt-3 text-sm text-slate-500">ยังไม่มีสินค้า OTOP ในจังหวัดที่เลือก</p><button type="button" className="admin-secondary mt-4" onClick={add}><Plus size={15} />เพิ่มสินค้า</button></div>}
    </>}
    <dialog ref={dialog} aria-labelledby="otop-product-form-title" className="m-auto max-h-[90vh] w-[92vw] max-w-2xl overflow-y-auto rounded-2xl border-0 bg-white p-0 shadow-2xl backdrop:bg-slate-900/40" onClose={reset} onCancel={event => { if (saving) event.preventDefault(); }}>
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5"><h2 id="otop-product-form-title" className="text-base font-semibold text-slate-900">{editingId ? 'แก้ไขสินค้า OTOP' : 'เพิ่มสินค้า OTOP'}</h2><button type="button" aria-label="ปิดฟอร์มสินค้า" disabled={saving} onClick={() => dialog.current?.close()} className="rounded p-1 text-slate-500 hover:bg-slate-100"><X size={20} /></button></div>
      <form onSubmit={save} className="p-6"><fieldset disabled={saving} className="grid gap-4 text-xs md:grid-cols-2">
        <label>จังหวัด<select className="admin-input mt-2" required value={provinceId || ''} onChange={event => { const id = Number(event.target.value); setProvinceId(id); setStampCount(String(provinces.find(province => province.id === id)?.requiredStampCount ?? '')); }}><option value="">เลือกจังหวัด</option>{provinces.map(province => <option key={province.id} value={province.id}>{province.name}</option>)}</select></label>
        <div className="rounded-lg bg-amber-50 p-3 text-amber-900"><label className="block font-medium">จำนวนแสตมป์ที่ใช้แลก (ดวง)<input className="admin-input mt-2" type="number" min="1" max={selected?.districtCount} step="1" required disabled={!selected} value={stampCount} onChange={event => setStampCount(event.target.value)} /></label><p className="mt-2 text-[11px] leading-5">{selected ? `ตั้งได้ 1–${selected.districtCount} ดวง จากอำเภอที่ต่างกัน · ค่าเริ่มต้น ${selected.requiredStampCount} ดวง (80% ของอำเภอในจังหวัด)` : 'เลือกจังหวัดเพื่อกำหนดจำนวนแสตมป์'}</p></div>
        <label>ชื่อสินค้า<input autoFocus className="admin-input mt-2" required maxLength={200} value={name} onChange={event => setName(event.target.value)} /></label>
        <label>สถานะ<select className="admin-input mt-2" value={status} onChange={event => setStatus(event.target.value)}><option value="ACTIVE">เปิดให้แลก</option><option value="INACTIVE">ปิดไว้ก่อน</option></select></label>
        <label className="md:col-span-2">รายละเอียด<textarea className="admin-input mt-2" rows={3} value={description} onChange={event => setDescription(event.target.value)} /></label>
        <label>ลิงก์ที่มาภาพ (ถ้ามี)<input className="admin-input mt-2" type="url" maxLength={2048} placeholder="https://..." value={sourceUrl} onChange={event => setSourceUrl(event.target.value)} /></label>
        <label>ลิงก์รูปประกอบ<input className="admin-input mt-2" type="url" maxLength={2048} placeholder="https://..." value={imageUrl} onChange={event => setImageUrl(event.target.value)} /></label>
        {imageUrl && <div className="md:col-span-2"><img key={imageUrl} src={imageUrl} alt="ตัวอย่างรูปสินค้า" className="h-28 w-28 rounded-lg border border-slate-200 object-cover" onError={event => { event.currentTarget.style.display = 'none'; }} /></div>}
        {formError && <p role="alert" className="md:col-span-2 rounded bg-rose-50 p-3 text-rose-700">{formError}</p>}
        <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 md:col-span-2"><button type="button" className="admin-secondary" onClick={() => dialog.current?.close()}>ยกเลิก</button><button type="submit" className="admin-primary" disabled={!selected}>{saving ? 'กำลังบันทึก…' : editingId ? 'บันทึกการแก้ไข' : 'เพิ่มสินค้า'}</button></div>
      </fieldset></form>
    </dialog>
  </section>;
}

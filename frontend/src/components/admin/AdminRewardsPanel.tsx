import { useEffect, useState, type FormEvent } from 'react';
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    Promise.all([adminService.getRewardProvinces(), adminService.getRewards()])
      .then(([areas, items]) => { setProvinces(areas); setRewards(items); })
      .catch(value => setError(value instanceof Error ? value.message : 'โหลดข้อมูลของรางวัลไม่สำเร็จ'));
  }, []);

  const selected = provinces.find(province => province.id === provinceId);
  const reset = () => {
    setEditingId(null); setProvinceId(0); setName(''); setDescription('');
    setImageUrl(''); setSourceUrl(''); setStatus('ACTIVE');
  };
  const edit = (reward: AdminRewardRecord) => {
    setEditingId(reward.Reward_ID); setProvinceId(reward.Province_ID ?? 0);
    setName(reward.Reward_Name); setDescription(reward.Description ?? '');
    setImageUrl(reward.Image_URL ?? ''); setSourceUrl(reward.Source_URL ?? '');
    setStatus(reward.Status); setError(''); setMessage('');
  };
  const save = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setError(''); setMessage('');
    try {
      const data = { Reward_Name: name.trim(), Description: description.trim(), Province_ID: provinceId,
        Image_URL: imageUrl.trim(), Source_URL: sourceUrl.trim(), Reward_Type: 'OTOP_PRODUCT' as const, Status: status };
      if (editingId) await adminService.updateOtopReward(editingId, data);
      else await adminService.createOtopReward(data);
      setRewards(await adminService.getRewards());
      setMessage(editingId ? 'บันทึกการแก้ไขแล้ว' : 'เพิ่มของรางวัลแล้ว'); reset();
    } catch (value) { setError(value instanceof Error ? value.message : 'บันทึกของรางวัลไม่สำเร็จ'); }
    finally { setSaving(false); }
  };
  const visible = rewards.filter(reward => reward.Reward_Type === 'OTOP_PRODUCT' && (!filterProvince || reward.Province_ID === filterProvince));

  return <section className="space-y-5">
    <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
      <h2 className="font-semibold">สินค้า OTOP เป็นของรางวัล</h2>
      <p className="mt-1 text-xs text-slate-600">เกณฑ์แลก: สะสมแสตมป์จากอำเภอที่ต่างกันอย่างน้อย 80% ของจำนวนอำเภอในจังหวัดนั้น เช่น 10 อำเภอ ต้องมี 8 อำเภอ</p>
      <p className="mt-1 text-xs text-slate-500">ภาพเป็นภาพประกอบชนิดสินค้า ไม่ใช่ภาพสินค้าจริงของร้าน ตรวจสอบที่มาได้จากลิงก์ใต้สินค้า</p>
    </div>
    <form onSubmit={save} className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 text-xs md:grid-cols-2">
      <h3 className="md:col-span-2 text-sm font-semibold">{editingId ? `แก้ไขของรางวัล #${editingId}` : 'เพิ่มสินค้า OTOP'}</h3>
      <label>จังหวัด<select className="admin-input mt-1 w-full" required value={provinceId} onChange={event => setProvinceId(Number(event.target.value))}>
        <option value={0}>เลือกจังหวัด</option>{provinces.map(province => <option key={province.id} value={province.id}>{province.name}</option>)}
      </select></label>
      <div className="flex items-end text-slate-600">{selected ? `${selected.districtCount} อำเภอ · ต้องมีแสตมป์ต่างอำเภอ ${selected.requiredStampCount} ดวง` : 'เลือกจังหวัดเพื่อดูเกณฑ์แสตมป์'}</div>
      <label>ชื่อสินค้า<input className="admin-input mt-1 w-full" required maxLength={200} value={name} onChange={event => setName(event.target.value)} /></label>
      <label>สถานะ<select className="admin-input mt-1 w-full" value={status} onChange={event => setStatus(event.target.value)}><option value="ACTIVE">เปิดให้แลก</option><option value="INACTIVE">ปิดไว้ก่อน</option></select></label>
      <label className="md:col-span-2">รายละเอียด<textarea className="admin-input mt-1 w-full" value={description} onChange={event => setDescription(event.target.value)} /></label>
      <label>ลิงก์ที่มาภาพ (ถ้ามี)<input className="admin-input mt-1 w-full" type="url" maxLength={2048} placeholder="https://..." value={sourceUrl} onChange={event => setSourceUrl(event.target.value)} /></label>
      <label>ลิงก์รูปประกอบ<input className="admin-input mt-1 w-full" type="url" maxLength={2048} placeholder="https://..." value={imageUrl} onChange={event => setImageUrl(event.target.value)} /></label>
      {imageUrl && <div className="md:col-span-2"><img src={imageUrl} alt="ตัวอย่างรูปสินค้า" className="h-28 w-28 rounded border border-slate-200 object-cover" onError={event => { event.currentTarget.style.display = 'none'; }} /></div>}
      {error && <p role="alert" className="md:col-span-2 text-rose-700">{error}</p>}
      {message && <p role="status" className="md:col-span-2 text-emerald-700">{message}</p>}
      <div className="md:col-span-2 flex gap-2"><button className="admin-primary" disabled={saving || !selected}>{saving ? 'กำลังบันทึก…' : 'บันทึกของรางวัล'}</button>{editingId && <button type="button" className="text-blue-700 underline" onClick={reset}>ยกเลิกการแก้ไข</button>}</div>
    </form>
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <label className="block max-w-xs text-xs font-medium">แสดงจังหวัด<select className="admin-input mt-1 w-full" value={filterProvince} onChange={event => setFilterProvince(Number(event.target.value))}><option value={0}>ทุกจังหวัด</option>{provinces.map(province => <option key={province.id} value={province.id}>{province.name}</option>)}</select></label>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">{visible.map(reward => <article key={reward.Reward_ID} className="flex gap-3 rounded border border-slate-200 p-3 text-xs">
        {reward.Image_URL ? <img src={reward.Image_URL} alt={reward.Reward_Name} className="size-20 shrink-0 rounded object-cover" /> : <div className="grid size-20 shrink-0 place-items-center rounded bg-gradient-to-br from-amber-100 to-blue-100 text-center text-[10px] font-semibold text-blue-800">OTOP<br />{reward.provinces?.Prov_Name}</div>}
        <div className="min-w-0 flex-1"><h3 className="text-sm font-semibold">{reward.Reward_Name}</h3><p className="mt-1 text-slate-600">{reward.provinces?.Prov_Name} · {reward.Required_Stamp_Count} อำเภอ · {reward.Status === 'ACTIVE' ? 'เปิดให้แลก' : 'ปิดไว้'}</p><p className="mt-1 whitespace-pre-line text-slate-600">{reward.Description}</p><div className="mt-2 flex gap-3"><button type="button" className="text-blue-700 underline" onClick={() => edit(reward)}>แก้ไข</button>{reward.Source_URL && <a href={reward.Source_URL} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">ที่มาภาพและสิทธิ์</a>}</div></div>
      </article>)}</div>
      {!visible.length && <p className="mt-4 text-xs text-slate-500">ยังไม่มีสินค้า OTOP ในจังหวัดที่เลือก</p>}
    </div>
  </section>;
}

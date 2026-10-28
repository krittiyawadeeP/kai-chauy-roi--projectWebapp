import { useEffect, useRef, useState, type FormEvent } from 'react';
import { KeyRound, RefreshCw, Search, ShieldCheck, ShieldOff, Store, UserRound, Users, X } from 'lucide-react';
import { adminService, type AdminUserRecord } from '../../services/adminService';

const nameOf = (user: AdminUserRecord) => user.Name || user.merchants.find(merchant => merchant.Owner_Name)?.Owner_Name || 'ยังไม่ระบุชื่อ';

export function AdminUsersPanel() {
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [type, setType] = useState<AdminUserRecord['accountType']>('USER');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [reload, setReload] = useState(0);
  const [editing, setEditing] = useState<AdminUserRecord | null>(null);
  const [eligibilityUser, setEligibilityUser] = useState<AdminUserRecord | null>(null);
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [eligible, setEligible] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const eligibilityDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    adminService.getUsers()
      .then(rows => { if (active) setUsers(rows); })
      .catch(value => { if (active) setError(value instanceof Error ? value.message : 'โหลดผู้ใช้งานไม่สำเร็จ'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reload]);
  const resetCredentials = () => { setPassword(''); setPasswordConfirm(''); setPin(''); setPinConfirm(''); setFormError(''); };
  const editCredentials = (user: AdminUserRecord) => {
    resetCredentials(); setEditing(user); setMessage(''); dialog.current?.showModal();
  };
  const editEligibility = (user: AdminUserRecord) => {
    setEligibilityUser(user); setEligible(!user.Subsidy_Eligible); setFormError(''); setMessage(''); eligibilityDialog.current?.showModal();
  };
  const saveCredentials = async (event: FormEvent) => {
    event.preventDefault();
    if (!editing || saving || (!password && !pin)) return;
    if (password !== passwordConfirm) { setFormError('รหัสผ่านใหม่และการยืนยันไม่ตรงกัน'); return; }
    if (pin !== pinConfirm) { setFormError('PIN ใหม่และการยืนยันไม่ตรงกัน'); return; }
    setSaving(true); setFormError('');
    try {
      const saved = await adminService.updateUser(editing.User_ID, {
        ...(password ? { Password: password } : {}), ...(pin ? { Pin: pin } : {}),
      });
      setUsers(previous => previous.map(user => user.User_ID === saved.User_ID ? { ...user, ...saved } : user));
      setMessage(`เปลี่ยนรหัสของบัญชี #${saved.User_ID} แล้ว ผู้ใช้ต้องเข้าสู่ระบบใหม่ด้วยข้อมูลที่เปลี่ยน`);
      dialog.current?.close();
    } catch (value) { setFormError(value instanceof Error ? value.message : 'บันทึกบัญชีไม่สำเร็จ'); }
    finally { setSaving(false); }
  };
  const saveEligibility = async (event: FormEvent) => {
    event.preventDefault();
    if (!eligibilityUser || saving || eligible === eligibilityUser.Subsidy_Eligible) return;
    setSaving(true); setFormError('');
    try {
      const saved = await adminService.updateUser(eligibilityUser.User_ID, { Subsidy_Eligible: eligible });
      setUsers(previous => previous.map(user => user.User_ID === saved.User_ID ? { ...user, ...saved } : user));
      setMessage(`${saved.Subsidy_Eligible ? 'คืน' : 'ตัด'}สิทธิ์ซื้อ 60/40 ของบัญชี #${saved.User_ID} แล้ว`);
      eligibilityDialog.current?.close();
    } catch (value) { setFormError(value instanceof Error ? value.message : 'บันทึกสิทธิ์ 60/40 ไม่สำเร็จ'); }
    finally { setSaving(false); }
  };
  const citizens = users.filter(user => user.accountType === 'USER').length;
  const owners = users.length - citizens;
  const search = query.trim().toLocaleLowerCase('th');
  const visible = users.filter(user => user.accountType === type &&
    `${user.User_ID} ${nameOf(user)} ${user.Phone} ${user.merchants.map(merchant => `${merchant.Shop_Name} ${merchant.Owner_Name ?? ''}`).join(' ')}`.toLocaleLowerCase('th').includes(search));

  return <section className="space-y-5">
    <div className="admin-card flex flex-wrap items-start justify-between gap-4 p-5"><div><h2 className="flex items-center gap-2 text-base font-semibold text-slate-900"><Users size={20} className="text-[#9c7b36]" />ทะเบียนบัญชีผู้ใช้งาน</h2><p className="mt-2 text-xs leading-6 text-slate-500">{type === 'USER' ? 'จัดการบัญชีประชาชน เปลี่ยนรหัสผ่าน PIN และกำหนดสิทธิ์การซื้อสินค้า 60/40' : 'จัดการบัญชีเจ้าของร้านและเปลี่ยนรหัสผ่าน / PIN'}</p></div><button type="button" className="admin-secondary" disabled={loading || saving} onClick={() => setReload(value => value + 1)}><RefreshCw size={14} />รีเฟรชข้อมูล</button></div>
    {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
    {message && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{message}</p>}
    <div className="grid gap-4 sm:grid-cols-3">{[
      { label: 'บัญชีผู้ใช้งานทั้งหมด', count: users.length, icon: Users },
      { label: 'ประชาชน', count: citizens, icon: UserRound },
      { label: 'เจ้าของร้าน', count: owners, icon: Store },
    ].map(({ label, count, icon: Icon }, index) => <div key={label} className={`admin-card admin-kpi admin-kpi-${index} p-5`}><div className="flex items-center justify-between"><p className="text-xs text-slate-600">{label}</p><span className="admin-kpi-icon"><Icon size={17} /></span></div><p className="admin-kpi-value mt-3 font-semibold tabular-nums">{loading || error ? '—' : count.toLocaleString('th-TH')} <span className="text-xs font-normal text-slate-500">บัญชี</span></p></div>)}</div>
    <div className="admin-card overflow-hidden">
      <div className="border-b border-slate-200 p-5">
        <div className="flex flex-wrap gap-2" role="group" aria-label="ประเภทผู้ใช้งาน"><button type="button" className={type === 'USER' ? 'admin-primary' : 'admin-secondary'} aria-pressed={type === 'USER'} onClick={() => setType('USER')}><UserRound size={15} />ประชาชน ({citizens.toLocaleString('th-TH')})</button><button type="button" className={type === 'MERCHANT' ? 'admin-primary' : 'admin-secondary'} aria-pressed={type === 'MERCHANT'} onClick={() => setType('MERCHANT')}><Store size={15} />เจ้าของร้าน ({owners.toLocaleString('th-TH')})</button></div>
        <label className="mt-4 block text-xs">ค้นหาผู้ใช้งาน<div className="relative mt-2"><Search size={16} className="pointer-events-none absolute left-3 top-3 text-slate-400" /><input className="admin-input !pl-10" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="ชื่อ เบอร์โทร รหัสผู้ใช้ หรือชื่อร้าน" /></div></label>
      </div>
      <div className="flex flex-wrap justify-between gap-2 px-5 py-3 text-xs text-slate-500"><span>{type === 'USER' ? 'บัญชีประชาชน' : 'บัญชีเจ้าของร้าน'}</span><span>แสดง {visible.length.toLocaleString('th-TH')} บัญชีตามตัวกรอง</span></div>
      <div className="max-h-[680px] overflow-auto"><table className="admin-table"><thead><tr><th>ชื่อผู้ใช้งาน / รหัสบัญชี</th><th>เบอร์ติดต่อ</th><th>ประเภทผู้ใช้งาน</th>{type === 'USER' && <th>สิทธิ์ซื้อ 60/40</th>}{type === 'MERCHANT' && <th>ร้านค้าที่ผูกกับบัญชี</th>}<th>จัดการบัญชี</th></tr></thead><tbody>{!loading && !error && visible.map(user => <tr key={user.User_ID}>
        <td><p className="font-semibold text-slate-900">{nameOf(user)}</p><p className="mt-1 text-[11px] text-slate-500">รหัสผู้ใช้ #{user.User_ID}</p></td>
        <td className="tabular-nums">{user.Phone || 'ไม่ระบุเบอร์ติดต่อ'}</td>
        <td><span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${type === 'USER' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>{type === 'USER' ? 'ประชาชน' : 'เจ้าของร้าน'}</span></td>
        {type === 'USER' && <td><span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${user.Subsidy_Eligible ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{user.Subsidy_Eligible ? <ShieldCheck size={13} /> : <ShieldOff size={13} />}{user.Subsidy_Eligible ? 'มีสิทธิ์' : 'ถูกตัดสิทธิ์'}</span></td>}
        {type === 'MERCHANT' && <td className="max-w-72 whitespace-normal">{user.merchants.length ? <div className="space-y-2">{user.merchants.map(merchant => <div key={merchant.Mch_ID}><p className="font-medium text-slate-800">{merchant.Shop_Name}</p><p className="mt-1 text-[11px] text-slate-500">รหัสร้านค้า #{merchant.Mch_ID}</p></div>)}</div> : <span className="text-slate-400">ยังไม่มีร้านค้าที่ผูกกับบัญชี</span>}</td>}
        <td><div className="flex flex-col items-start gap-2"><button type="button" className="inline-flex items-center gap-1 text-xs text-blue-700 hover:underline" aria-label={`แก้รหัสผ่านและ PIN บัญชี ${user.User_ID}`} onClick={() => editCredentials(user)}><KeyRound size={13} />รหัสผ่าน / PIN</button>{type === 'USER' && <button type="button" className={`text-xs hover:underline ${user.Subsidy_Eligible ? 'text-rose-700' : 'text-emerald-700'}`} aria-label={`${user.Subsidy_Eligible ? 'ตัด' : 'คืน'}สิทธิ์ 60/40 บัญชี ${user.User_ID}`} onClick={() => editEligibility(user)}>{user.Subsidy_Eligible ? 'ตัดสิทธิ์ 60/40' : 'คืนสิทธิ์ 60/40'}</button>}</div></td>
      </tr>)}</tbody></table></div>
      {loading ? <p role="status" className="p-8 text-center text-sm text-slate-500">กำลังโหลดผู้ใช้งาน…</p> : !error && !visible.length && <p className="p-8 text-center text-sm text-slate-500">ไม่พบผู้ใช้งานที่ตรงกับประเภทและตัวกรองที่เลือก</p>}
    </div>
    <dialog ref={dialog} aria-labelledby="user-credentials-title" className="m-auto max-h-[90vh] w-[92vw] max-w-2xl overflow-y-auto rounded-2xl border-0 bg-white p-0 shadow-2xl backdrop:bg-slate-900/40" onClose={() => { setEditing(null); resetCredentials(); }} onCancel={event => { if (saving) event.preventDefault(); }}>
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-6 py-5"><h2 id="user-credentials-title" className="text-base font-semibold text-slate-900">เปลี่ยนรหัสผ่านและ PIN</h2><button type="button" aria-label="ปิดฟอร์มรหัสผ่านและ PIN" disabled={saving} onClick={() => dialog.current?.close()} className="rounded p-1 text-slate-500 hover:bg-slate-100"><X size={20} /></button></div>
      {editing && <form onSubmit={saveCredentials} className="p-6"><fieldset disabled={saving} className="space-y-5 text-xs">
        <div className="rounded-lg bg-slate-50 p-4"><p className="font-semibold text-slate-900">{nameOf(editing)}</p><p className="mt-1 text-slate-500">บัญชี #{editing.User_ID} · {editing.Phone}</p></div>
        <div><h3 className="font-semibold text-slate-800">เปลี่ยนรหัสผ่าน</h3><p className="mt-1 text-[11px] text-slate-500">เว้นว่างหากไม่เปลี่ยนรหัสผ่าน</p><div className="mt-3 grid gap-3 sm:grid-cols-2"><label>รหัสผ่านใหม่<input className="admin-input mt-2" type="password" autoComplete="new-password" minLength={6} maxLength={128} value={password} onChange={event => setPassword(event.target.value)} /></label><label>ยืนยันรหัสผ่านใหม่<input className="admin-input mt-2" type="password" autoComplete="new-password" required={!!password} minLength={6} maxLength={128} value={passwordConfirm} onChange={event => setPasswordConfirm(event.target.value)} /></label></div></div>
        <div><h3 className="font-semibold text-slate-800">เปลี่ยน PIN 6 หลัก</h3><p className="mt-1 text-[11px] text-slate-500">เว้นว่างหากไม่เปลี่ยน PIN</p><div className="mt-3 grid gap-3 sm:grid-cols-2"><label>PIN ใหม่<input className="admin-input mt-2" type="password" inputMode="numeric" autoComplete="off" pattern="[0-9]{6}" minLength={6} maxLength={6} value={pin} onChange={event => setPin(event.target.value)} /></label><label>ยืนยัน PIN ใหม่<input className="admin-input mt-2" type="password" inputMode="numeric" autoComplete="off" required={!!pin} pattern="[0-9]{6}" minLength={6} maxLength={6} value={pinConfirm} onChange={event => setPinConfirm(event.target.value)} /></label></div></div>
        <p className="text-[11px] leading-5 text-slate-500">เมื่อเปลี่ยนรหัสผ่านหรือ PIN ผู้ใช้ต้องเข้าสู่ระบบใหม่</p>
        {formError && <p role="alert" className="rounded bg-rose-50 p-3 text-rose-700">{formError}</p>}
        <div className="flex justify-end gap-2 border-t border-slate-200 pt-4"><button type="button" className="admin-secondary" onClick={() => dialog.current?.close()}>ยกเลิก</button><button type="submit" className="admin-primary" disabled={!password && !pin}>{saving ? 'กำลังบันทึก…' : 'บันทึกรหัสผ่าน / PIN'}</button></div>
      </fieldset></form>}
    </dialog>
    <dialog ref={eligibilityDialog} aria-labelledby="user-eligibility-title" className="m-auto max-h-[90vh] w-[92vw] max-w-lg overflow-y-auto rounded-2xl border-0 bg-white p-0 shadow-2xl backdrop:bg-slate-900/40" onClose={() => { setEligibilityUser(null); setFormError(''); }} onCancel={event => { if (saving) event.preventDefault(); }}>
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-6 py-5"><h2 id="user-eligibility-title" className="text-base font-semibold text-slate-900">จัดการสิทธิ์ซื้อสินค้า 60/40</h2><button type="button" aria-label="ปิดฟอร์มสิทธิ์ 60/40" disabled={saving} onClick={() => eligibilityDialog.current?.close()} className="rounded p-1 text-slate-500 hover:bg-slate-100"><X size={20} /></button></div>
      {eligibilityUser && <form onSubmit={saveEligibility} className="p-6"><fieldset disabled={saving} className="space-y-5 text-xs">
        <div className="rounded-lg bg-slate-50 p-4"><p className="font-semibold text-slate-900">{nameOf(eligibilityUser)}</p><p className="mt-1 text-slate-500">บัญชี #{eligibilityUser.User_ID} · {eligibilityUser.Phone}</p><p className="mt-2 text-slate-600">สถานะปัจจุบัน: {eligibilityUser.Subsidy_Eligible ? 'มีสิทธิ์ซื้อ 60/40' : 'ถูกตัดสิทธิ์ซื้อ 60/40'}</p></div>
        <div className={`rounded-lg border p-4 ${eligible ? 'border-emerald-100 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`}><label className="flex items-center gap-2 font-medium text-slate-800"><input type="checkbox" checked={eligible} onChange={event => setEligible(event.target.checked)} className="size-4 accent-emerald-700" />อนุญาตให้ใช้สิทธิ์ซื้อสินค้า 60/40</label><p className="mt-2 text-[11px] leading-5 text-slate-600">{eligible ? 'บันทึกแล้วบัญชีนี้จะกลับมาใช้สิทธิ์ซื้อสินค้าตามเงื่อนไขโครงการได้' : 'บันทึกแล้วบัญชีนี้จะชำระผ่านสิทธิ์ 60/40 ไม่ได้'}{eligibilityUser.accountType === 'MERCHANT' ? ' · ร้านของบัญชีนี้ยังรับชำระได้ตามเดิม' : ''}</p></div>
        {formError && <p role="alert" className="rounded bg-rose-50 p-3 text-rose-700">{formError}</p>}
        <div className="flex justify-end gap-2 border-t border-slate-200 pt-4"><button type="button" className="admin-secondary" onClick={() => eligibilityDialog.current?.close()}>ยกเลิก</button><button type="submit" className={`admin-primary ${!eligible ? '!border-rose-700 !bg-rose-700 hover:!bg-rose-800' : ''}`} disabled={eligible === eligibilityUser.Subsidy_Eligible}>{saving ? 'กำลังบันทึก…' : eligible ? 'ยืนยันคืนสิทธิ์ 60/40' : 'ยืนยันตัดสิทธิ์ 60/40'}</button></div>
      </fieldset></form>}
    </dialog>
  </section>;
}

import { useRef, useState } from 'react';
import { adminService } from '../../services/adminService';

type Props = { userId: number; name: string; suspended: boolean; onChanged: () => Promise<void> };

export function AccountSuspensionControl({ userId, name, suspended, onChanged }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const pending = useRef(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const action = suspended ? 'คืนสถานะ' : 'ระงับบัญชี';
  const save = async () => {
    if (pending.current) return;
    pending.current = true; setSaving(true); setError('');
    try {
      await adminService.updateUser(userId, { Is_Suspended: !suspended });
      await onChanged();
      dialog.current?.close();
    } catch (value) { setError(value instanceof Error ? value.message : 'บันทึกสถานะไม่สำเร็จ กรุณาโหลดข้อมูลใหม่'); }
    finally { pending.current = false; setSaving(false); }
  };
  return <div className="flex flex-col items-start gap-2">
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${suspended ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>{suspended ? 'ถูกระงับ' : 'ใช้งานได้'}</span>
    <button type="button" disabled={saving} className={`admin-secondary ${suspended ? '!border-emerald-200 !bg-emerald-50 !text-emerald-700 hover:!bg-emerald-100' : '!border-rose-200 !bg-rose-50 !text-rose-700 hover:!bg-rose-100'}`} onClick={() => { setError(''); dialog.current?.showModal(); }} aria-label={`${action} ${name}`}>{action}</button>
    <dialog ref={dialog} aria-label={`${action} ${name}`} className="m-auto w-[92vw] max-w-lg rounded-2xl border-0 bg-white p-6 text-left shadow-2xl backdrop:bg-slate-900/40" onCancel={event => { if (saving) event.preventDefault(); }}>
      <h2 className="text-base font-semibold">ยืนยัน{action}</h2>
      <p className="mt-4 text-sm">{name} · บัญชี #{userId}</p>
      <p className="mt-3 text-sm leading-6">การเปลี่ยนสถานะนี้มีผลกับบัญชีผู้ใช้และร้านทั้งหมดของเจ้าของบัญชี {suspended ? 'หลังคืนสถานะ ผู้ใช้ต้องเข้าสู่ระบบใหม่' : 'ผู้ใช้จะเข้าใช้งานไม่ได้ และร้านทั้งหมดจะรับชำระเงินไม่ได้'}</p>
      {error && <p role="alert" className="mt-3 text-sm text-rose-700">{error}</p>}
      <div className="mt-5 flex justify-end gap-2"><button type="button" className="admin-secondary" disabled={saving} onClick={() => dialog.current?.close()}>ยกเลิก</button><button type="button" className="admin-primary" disabled={saving} onClick={save}>{saving ? 'กำลังบันทึก…' : `ยืนยัน${action}`}</button></div>
    </dialog>
  </div>;
}

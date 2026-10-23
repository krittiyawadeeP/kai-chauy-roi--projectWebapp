import { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';

type MerchantRecord = { Mch_ID: number; Shop_Name: string; Category: string | null; districts?: { Dist_Name: string } };

export function AdminMerchantsPanel() {
  const [merchants, setMerchants] = useState<MerchantRecord[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    adminService.getMerchants().then(setMerchants).catch(err => setError(err instanceof Error ? err.message : 'โหลดร้านค้าไม่สำเร็จ'));
  }, []);
  return <section className="space-y-3">
    <p className="text-sm text-slate-500">ร้านค้าในฐานข้อมูล {merchants.length} ร้าน</p>
    {error && <p role="alert" className="rounded bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    {merchants.map(merchant => <article key={merchant.Mch_ID} className="rounded border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold">{merchant.Shop_Name}</h2>
      <p className="mt-1 text-xs text-slate-500">{merchant.Category || 'ไม่ระบุประเภท'}{merchant.districts?.Dist_Name ? ` · ${merchant.districts.Dist_Name}` : ''}</p>
    </article>)}
  </section>;
}

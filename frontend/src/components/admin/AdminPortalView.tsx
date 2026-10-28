import { AiAnalysisDashboard } from './AiAnalysisDashboard';
import { AdminMissionsPanel } from './AdminMissionsPanel';
import { AdminMerchantsPanel } from './AdminMerchantsPanel';
import { AdminRewardsPanel } from './AdminRewardsPanel';
import { AdminStampsPanel } from './AdminStampsPanel';
import { AdminUsersPanel } from './AdminUsersPanel';

export function AdminPortalView({ activeSection = 'missions' }: { activeSection?: 'ai' | 'missions' | 'stamps' | 'rewards' | 'merchants' | 'users' }) {
  return <div className={`${activeSection === 'stamps' ? 'legacy-admin' : ''} space-y-5 pb-8`}>
    {activeSection !== 'ai' && <div><p className="admin-eyebrow">การดำเนินงานโครงการ</p><h1 className="mt-1 text-2xl font-semibold text-slate-900">{activeSection === 'missions' ? 'ประวัติและผลลัพธ์ภารกิจ' : activeSection === 'stamps' ? 'แสตมป์รายอำเภอ' : activeSection === 'rewards' ? 'จัดการของรางวัล OTOP' : activeSection === 'users' ? 'ผู้ใช้งาน' : 'ทะเบียนร้านค้า'}</h1></div>}
    {activeSection === 'ai' && <AiAnalysisDashboard />}
    {activeSection === 'missions' && <AdminMissionsPanel />}
    {activeSection === 'stamps' && <AdminStampsPanel />}
    {activeSection === 'rewards' && <AdminRewardsPanel />}
    {activeSection === 'merchants' && <AdminMerchantsPanel />}
    {activeSection === 'users' && <AdminUsersPanel />}
  </div>;
}

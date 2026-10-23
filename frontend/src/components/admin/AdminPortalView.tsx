import { AiMissionPanel } from './AiMissionPanel';
import { AdminMissionsPanel } from './AdminMissionsPanel';
import { AdminMerchantsPanel } from './AdminMerchantsPanel';

export function AdminPortalView({ activeSection = 'missions' }: { activeSection?: 'ai' | 'missions' | 'merchants' }) {
  return <div className="legacy-admin space-y-5 pb-8">
    <div><p className="admin-eyebrow">การดำเนินงานโครงการ</p><h1 className="mt-1 text-2xl font-semibold text-slate-900">{activeSection === 'missions' ? 'จัดการภารกิจโครงการ' : activeSection === 'ai' ? 'วิเคราะห์สถานการณ์ร้านค้า' : 'ทะเบียนร้านค้า'}</h1></div>
    {activeSection === 'ai' && <AiMissionPanel />}
    {activeSection === 'missions' && <AdminMissionsPanel />}
    {activeSection === 'merchants' && <AdminMerchantsPanel />}
  </div>;
}

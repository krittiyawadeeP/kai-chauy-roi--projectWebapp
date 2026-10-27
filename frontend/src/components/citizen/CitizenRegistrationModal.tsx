import React from 'react';
import { useApp } from '../../context/AppContext';
import { Icon } from '../common/Icon';

interface CitizenRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CitizenRegistrationModal: React.FC<CitizenRegistrationModalProps> = ({
  isOpen,
  onClose
}) => {
  const { currentUser, userGrant, transactions } = useApp();

  if (!isOpen) return null;

  // Mask Citizen ID for privacy: 1-5099-•••••-42-1
  const formatMaskedCitizenId = (id?: string) => {
    if (!id) return '1-5099-•••••-42-1';
    const clean = id.replace(/\D/g, '');
    if (clean.length === 13) {
      return `${clean[0]}-${clean.slice(1, 5)}-•••••-${clean.slice(10, 12)}-${clean[12]}`;
    }
    return id;
  };

  // Daily quota calculations (฿200 per day)
  const DAILY_SUBSIDY_LIMIT = 200;
  const todayStr = new Date().toISOString().split('T')[0];
  const todayGovSpent = transactions
    .filter(t => t.userId === currentUser.userId && t.status === 'completed' && String(t.txTimestamp).startsWith(todayStr))
    .reduce((sum, t) => sum + (Number(t.govSubsidizedAmount) || 0), 0);
  const remainingDaily = Math.max(0, DAILY_SUBSIDY_LIMIT - todayGovSpent);
  const dailySpentPercent = Math.min(100, Math.round((todayGovSpent / DAILY_SUBSIDY_LIMIT) * 100));

  // Grant Usage
  const totalGrant = userGrant?.totalGrantAmount || 1000;
  const remainingGrant = userGrant?.remainingAmount ?? 1000;
  const grantUsedPercent = Math.min(100, Math.round(((totalGrant - remainingGrant) / totalGrant) * 100));

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[#07162d]/75 p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[400px] rounded-[32px] bg-white p-5 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <span className="grid size-10 place-items-center rounded-2xl bg-[#eaf2ff] text-[#1769ed] shadow-xs">
              <Icon name="shield" className="size-5" />
            </span>
            <div>
              <h3 className="font-extrabold text-sm text-slate-800">สถานะสิทธิ์และโควตา 60/40</h3>
              <p className="text-[10px] text-slate-400">โครงการไทยช่วยไทยพลีส • สิทธิของฉัน</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="grid size-8 place-items-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer"
          >
            <Icon name="x" className="size-4" />
          </button>
        </div>

        {/* Content Container */}
        <div className="overflow-y-auto pt-4 space-y-4 flex-1">
          {/* User Status Card */}
          <div className="rounded-2xl bg-gradient-to-br from-[#0c2e68] via-[#103d8a] to-[#1769ed] p-4 text-white shadow-lg relative overflow-hidden">
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-blue-200 font-bold block">
                  ผู้ได้รับสิทธิโครงการ
                </span>
                <h4 className="font-extrabold text-base text-white mt-0.5">
                  {currentUser?.name || 'ประชาชนผู้รับสิทธิ์'}
                </h4>
                <p className="font-mono text-xs text-amber-300 font-semibold tracking-wide mt-0.5">
                  {formatMaskedCitizenId(currentUser?.citizenId)}
                </p>
              </div>
              <span className="rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/40 px-2.5 py-0.5 text-[10px] font-black flex items-center gap-1 shadow-xs">
                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                สิทธิพร้อมใช้งาน
              </span>
            </div>

            {/* Grant Remaining Highlight */}
            <div className="mt-3 pt-3 border-t border-white/15 flex justify-between items-baseline">
              <div>
                <span className="text-[10px] text-blue-100">วงเงินสิทธิรัฐช่วยจ่ายคงเหลือ</span>
                <p className="text-xl font-black text-white font-mono">
                  ฿ {remainingGrant.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <span className="text-[11px] text-blue-200 font-medium">
                จากเต็ม ฿{totalGrant.toLocaleString()}
              </span>
            </div>

            {/* Total Grant Progress bar */}
            <div className="w-full h-1.5 rounded-full bg-black/25 overflow-hidden mt-1.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-300 transition-all duration-500"
                style={{ width: `${100 - grantUsedPercent}%` }}
              />
            </div>
          </div>

          {/* Daily Quota Monitor (฿200/day) */}
          <div className="rounded-2xl bg-[#f8faff] p-3.5 border border-blue-100/90 shadow-xs space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">⚡</span>
                <span className="text-xs font-black text-slate-800">โควตารัฐช่วยจ่ายวันนี้</span>
              </div>
              <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                สูงสุด ฿200 / วัน
              </span>
            </div>

            <div className="flex justify-between items-baseline pt-1">
              <span className="text-[11px] text-slate-500">คงเหลือที่รัฐช่วยจ่ายได้อีกวันนี้</span>
              <strong className="text-base font-black text-emerald-600 font-mono">
                ฿ {remainingDaily.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
              </strong>
            </div>

            <div className="w-full bg-slate-200/80 h-2 rounded-full overflow-hidden p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-500"
                style={{ width: `${dailySpentPercent}%` }}
              />
            </div>

            <div className="flex justify-between text-[10px] text-slate-400 font-medium">
              <span>วันนี้รัฐช่วยจ่ายไปแล้ว ฿{todayGovSpent.toLocaleString()}</span>
              <span>รีเซ็ตโควตาทุก 00:00 น.</span>
            </div>
          </div>

          {/* Verification Steps Indicator */}
          <div className="rounded-2xl bg-white p-3.5 border border-slate-100 shadow-xs space-y-2.5">
            <p className="text-[11px] font-bold text-slate-600">การยืนยันตัวตนในระบบรัฐ</p>
            <div className="grid grid-cols-3 text-center">
              {[
                { title: 'ลงทะเบียน', status: 'เรียบร้อย' },
                { title: 'ตรวจสอบสิทธิ์', status: 'ผ่านเกณฑ์' },
                { title: 'อนุมัติวงเงิน', status: 'เปิดใช้งานแล้ว' }
              ].map((step, i) => (
                <div key={i} className="relative">
                  <span className="relative z-10 mx-auto grid size-6 place-items-center rounded-full bg-[#1769ed] text-white text-[10px] font-black shadow-xs">
                    ✓
                  </span>
                  {i < 2 && (
                    <span className="absolute left-1/2 top-3 h-0.5 w-full bg-[#1769ed]" />
                  )}
                  <p className="mt-1.5 text-[10px] font-bold text-slate-700 leading-tight">
                    {step.title}
                  </p>
                  <span className="text-[9px] text-emerald-600 font-medium block">
                    {step.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Key Policy Rules */}
          <div className="rounded-2xl bg-slate-50 p-3 border border-slate-100 text-[11px] space-y-1.5 text-slate-600">
            <p className="font-extrabold text-slate-800 text-[11px] flex items-center gap-1">
              <span>📌</span> เงื่อนไขการใช้สิทธิ์สำคัญ
            </p>
            <ul className="space-y-1 pl-4 list-disc text-[10.5px] leading-relaxed text-slate-500">
              <li>รัฐช่วยออกค่าสินค้า <strong>60%</strong> ผู้ใช้จ่ายเอง <strong>40%</strong></li>
              <li>เงินอุดหนุนรัฐสูงสุดไม่เกิน <strong>200 บาทต่อวัน</strong> (ส่วนเกินผู้ใช้เป็นผู้ชำระ)</li>
              <li>สามารถนำแสตมป์ดิจิทัลมาใช้ลดหย่อนแทนเงินสดได้ (1 ดวง = ฿1 สูงสุด 50% ของส่วนที่คุณจ่าย)</li>
              <li>ใช้ได้กับร้านค้าชุมชนและร้านธงฟ้าที่เข้าร่วมโครงการทั่วประเทศ</li>
            </ul>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-slate-100 mt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-[#1769ed] hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            เข้าใจแล้ว
          </button>
        </div>
      </div>
    </div>
  );
};

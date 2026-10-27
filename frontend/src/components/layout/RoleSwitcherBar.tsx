import React from 'react';
import { Icon } from '../common/Icon';
import { Role, User, Merchant } from '../../types';

interface RoleSwitcherBarProps {
  role: Role;
  currentUser: User | null;
  currentMerchant: Merchant | null;
  isAuthenticated: boolean;
  onSelectRole: (selected: 'ประชาชน' | 'ร้านค้า' | 'ภาครัฐ') => void;
  onReset: () => void;
  onOpenAuth: () => void;
  onLogout?: () => void;
  onOpenWallet?: () => void;
  onOpenRevenue?: () => void;
  onOpenProfile?: () => void;
  onOpenMap?: () => void;
  onOpenStatus?: () => void;
}

export const RoleSwitcherBar: React.FC<RoleSwitcherBarProps> = ({
  role,
  currentUser,
  currentMerchant,
  isAuthenticated,
  onSelectRole,
  onReset,
  onOpenAuth,
  onLogout,
  onOpenWallet,
  onOpenRevenue,
  onOpenProfile,
  onOpenMap,
  onOpenStatus,
}) => {
  const displayRoleMap: Record<Role, 'ประชาชน' | 'ร้านค้า' | 'ภาครัฐ'> = {
    citizen: 'ประชาชน',
    merchant: 'ร้านค้า',
    admin: 'ภาครัฐ',
  };

  return (
    <div className="sticky top-0 z-40 w-full bg-[#0b2447] text-white px-3.5 py-2.5 shadow-lg border-b border-blue-400/20 backdrop-blur-md">
      {/* Header Row */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className="grid size-5 place-items-center rounded-md bg-white/20 text-blue-200">
            <Icon name="user" className="size-3" />
          </span>
          <span className="text-[11px] font-bold tracking-tight text-white">
            เปลี่ยนบทบาทการใช้งาน (สวิตช์ทดสอบ)
          </span>
        </div>

        <button
          onClick={() => {
            if (confirm('คุณต้องการรีเซ็ตข้อมูลตัวอย่างกลับเป็นค่าเริ่มต้นหรือไม่?')) {
              onReset();
            }
          }}
          className="text-[10px] text-blue-200 hover:text-white flex items-center gap-1 bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
          title="รีเซ็ตข้อมูลทดสอบ"
        >
          <Icon name="refresh" className="size-3" />
          <span>รีเซ็ต</span>
        </button>
      </div>

      {/* Role Buttons */}
      <div className="flex gap-1.5 bg-black/30 p-1 rounded-xl">
        {(['ประชาชน', 'ร้านค้า', 'ภาครัฐ'] as const).map((item) => {
          const isActive = displayRoleMap[role] === item;
          let activeStyle = 'bg-white text-[#134da8] shadow-sm font-bold';
          if (item === 'ร้านค้า' && isActive) {
            activeStyle = 'bg-[#115e59] text-white shadow-sm shadow-teal-950/40 font-bold';
          } else if (item === 'ภาครัฐ' && isActive) {
            activeStyle = 'bg-[#fef08a] text-[#78350f] shadow-sm shadow-amber-300/40 font-bold';
          }

          return (
            <button
              key={item}
              onClick={() => onSelectRole(item)}
              className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                isActive
                  ? activeStyle
                  : 'text-blue-100 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span>{item === 'ประชาชน' ? '👤' : item === 'ร้านค้า' ? '🏪' : '🏛️'}</span>
              <span>{item}</span>
            </button>
          );
        })}
      </div>

      {/* Quick Action Badges for Authentication, Merchant Profile, Map Pinning */}
      <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between gap-1.5 overflow-x-auto text-[10px]">
        {/* Quick Auth / Logout Button */}
        {isAuthenticated && onLogout ? (
          <button
            onClick={() => {
              if (confirm('คุณต้องการออกจากระบบเพื่อกลับไปหน้าแรกหรือไม่?')) {
                onLogout();
              }
            }}
            className="px-2.5 py-1 rounded-lg bg-rose-500/25 hover:bg-rose-500/40 text-rose-200 border border-rose-400/30 font-bold flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
            title="ออกจากระบบ"
          >
            <span>🚪</span>
            <span>ออกจากระบบ</span>
          </button>
        ) : (
          <button
            onClick={onOpenAuth}
            className="px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white font-bold flex items-center gap-1 shrink-0 transition-colors"
          >
            <span>🔑</span>
            <span>เข้าสู่ระบบ/ลงทะเบียน</span>
          </button>
        )}

        {/* Merchant-specific shortcuts */}
        {role === 'merchant' && (
          <>
            {onOpenWallet && (
              <button
                onClick={onOpenWallet}
                className="px-2.5 py-1 rounded-lg bg-emerald-500/30 hover:bg-emerald-500/45 text-emerald-100 border border-emerald-400/30 font-bold flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
              >
                <span>👛</span>
                <span>ถุงเงินร้านค้า</span>
              </button>
            )}
            {onOpenRevenue && (
              <button
                onClick={onOpenRevenue}
                className="px-2.5 py-1 rounded-lg bg-teal-400/25 hover:bg-teal-400/40 text-teal-100 border border-teal-300/40 font-bold flex items-center gap-1 shrink-0 transition-colors"
              >
                <span>📊</span>
                <span>สรุปยอดรายได้ (KPIs)</span>
              </button>
            )}
            {onOpenProfile && (
              <button
                onClick={onOpenProfile}
                className="px-2.5 py-1 rounded-lg bg-teal-500/30 hover:bg-teal-500/45 text-teal-200 border border-teal-400/30 font-bold flex items-center gap-1 shrink-0 transition-colors"
              >
                <span>⚙️</span>
                <span>ตั้งค่าร้านค้า</span>
              </button>
            )}
            {onOpenMap && (
              <button
                onClick={onOpenMap}
                className="px-2.5 py-1 rounded-lg bg-emerald-500/30 hover:bg-emerald-500/45 text-emerald-200 border border-emerald-400/30 font-bold flex items-center gap-1 shrink-0 transition-colors"
              >
                <span>📍</span>
                <span>ปักหมุดร้าน</span>
              </button>
            )}
          </>
        )}

        {/* Citizen-specific shortcuts */}
        {role === 'citizen' && onOpenStatus && (
          <button
            onClick={onOpenStatus}
            className="px-2.5 py-1 rounded-lg bg-blue-500/30 hover:bg-blue-500/45 text-blue-200 border border-blue-400/30 font-bold flex items-center gap-1 shrink-0 transition-colors"
          >
            <span>📋</span>
            <span>ติดตามสถานะ</span>
          </button>
        )}
      </div>

      {/* Current Identity & Role Explanation */}
      <div className="mt-1.5 flex items-center justify-between text-[10px] text-blue-200/90 leading-tight">
        <span className="truncate max-w-[240px]">
          {role === 'citizen' ? (
            <>👤 ประชาชน: <strong className="text-white">{currentUser?.name}</strong></>
          ) : role === 'merchant' ? (
            <>🏪 ร้านค้า: <strong className="text-white">{currentMerchant?.shopName}</strong></>
          ) : (
            <>🏛️ รัฐ: <strong className="text-white">ระบบกำกับดูแล aipass.go.th</strong></>
          )}
        </span>
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-blue-200 shrink-0">
          {isAuthenticated ? '✓ เข้าสู่ระบบแล้ว' : 'ทดสอบทั่วไป'}
        </span>
      </div>
    </div>
  );
};

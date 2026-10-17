import React from 'react';
import { Icon, IconName } from '../common/Icon';
import { Role } from '../../types';

interface BottomNavProps {
  role: Role;
  activeNav: string;
  onNavClick: (label: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ role, activeNav, onNavClick }) => {
  const isMerchant = role === 'merchant';
  const isAdmin = role === 'admin';

  const themePrimaryColor = isMerchant ? 'bg-[#115e59]' : isAdmin ? 'bg-[#d97706]' : 'bg-[#1769ed]';
  const themeActiveTextColor = isMerchant ? 'text-[#115e59]' : isAdmin ? 'text-[#b45309]' : 'text-[#1769ed]';
  const themeShadowColor = isMerchant ? 'shadow-teal-700/30' : isAdmin ? 'shadow-amber-400/30' : 'shadow-blue-300';

  const navItems: [string, IconName][] = isMerchant
    ? [
        ['หน้าหลัก', 'home'],
        ['ยอดขาย', 'wallet'],
        ['สร้าง QR', 'qr'],
        ['ตั้งค่าร้าน', 'shop'],
        ['เข้าสู่ระบบ', 'user'],
      ]
    : isAdmin
    ? [
        ['หน้าหลัก', 'home'],
        ['ภารกิจ', 'flame'],
        ['สร้างภารกิจ', 'plus'],
        ['อนุมัติร้าน', 'shop'],
        ['สลับบทบาท', 'user'],
      ]
    : [
        ['หน้าหลัก', 'home'],
        ['สิทธิ์ 60/40', 'wallet'],
        ['สแกนจ่าย', 'scan'],
        ['สถานะ', 'status'],
        ['เข้าสู่ระบบ', 'user'],
      ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-[430px] items-end justify-around border-t border-slate-100 bg-white/95 px-3 pb-4 pt-2 backdrop-blur shadow-lg">
      {navItems.map(([label, icon], i) => {
        const isCenter = i === 2;
        const isSelected = activeNav === label;
        return (
          <button
            key={label}
            onClick={() => onNavClick(label)}
            className={`flex min-w-14 flex-col items-center gap-1 text-[10px] font-medium cursor-pointer ${
              isCenter ? '-mt-7' : ''
            } ${isSelected ? themeActiveTextColor : 'text-slate-400'}`}
          >
            <span
              className={
                isCenter
                  ? `grid size-14 place-items-center rounded-full ${themePrimaryColor} text-white shadow-lg ${themeShadowColor} ring-4 ring-white active:scale-95 transition-transform`
                  : ''
              }
            >
              <Icon name={icon as IconName} className={isCenter ? 'size-7' : 'size-5'} />
            </span>
            <span className="font-semibold">{label}</span>
          </button>
        );
      })}
    </nav>
  );
};

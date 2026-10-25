import React from 'react';
import { Icon, IconName } from '../common/Icon';

interface BottomNavProps {
  role?: string;
  activeNav: string;
  onNavClick: (label: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeNav, onNavClick }) => {
  const themePrimaryColor = 'bg-[#1769ed]';
  const themeActiveTextColor = 'text-[#1769ed]';
  const themeShadowColor = 'shadow-blue-300';

  const navItems: [string, IconName][] = [
    ['หน้าหลัก', 'home'],
    ['บริการทั้งหมด', 'grid'],
    ['สแกนจ่าย', 'scan'],
    ['ของรางวัล', 'gift'],
    ['โปรไฟล์', 'user'],
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

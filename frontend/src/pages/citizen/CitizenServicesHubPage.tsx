import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Icon, IconName } from '../../components/common/Icon';

interface CitizenServicesHubPageProps {
  onOpenScanner: () => void;
  onOpenMyQr: () => void;
  onOpenStatement: () => void;
  onOpenStatus: () => void;
  onOpenVouchers: () => void;
  onOpenProfile: () => void;
  onOpenMap: (shopId?: number) => void;
  onGoToTab: (tab: 'home' | 'missions' | 'wallet') => void;
}

export const CitizenServicesHubPage: React.FC<CitizenServicesHubPageProps> = ({
  onOpenScanner,
  onOpenMyQr,
  onOpenStatement,
  onOpenStatus,
  onOpenVouchers,
  onOpenProfile,
  onOpenMap,
  onGoToTab,
}) => {
  const { currentUser, wallet, userGrant, transactions, userStamps, missions, aiTargetShops, logout } = useApp();
  const [searchQuery, setSearchQuery] = useState('');

  const totalUserStamps = userStamps.reduce((acc, curr) => acc + curr.count, 0);

  // Grouped Services Definition
  const serviceCategories = [
    {
      categoryName: '💰 การเงิน & การใช้สิทธิ์ 60/40',
      description: 'ระบบชำระเงิน ตรวจสอบสิทธิรัฐ และบริหารกระเป๋าเงิน',
      items: [
        {
          id: 'scan_pay',
          name: 'สแกน QR จ่ายเงิน (60/40)',
          detail: 'สแกนจ่ายร้านค้าชุมชน รัฐช่วย 60% คุณจ่าย 40%',
          icon: 'scan' as IconName,
          badge: 'ยอดนิยม',
          color: 'from-blue-600 to-indigo-600',
          textColor: 'text-blue-600',
          bgLight: 'bg-blue-50',
          onClick: onOpenScanner,
        },
        {
          id: 'my_qr',
          name: 'QR รับสิทธิ์ของฉัน',
          detail: 'แสดง QR โทเคนความปลอดภัย 3 นาทีเพื่อรับสิทธิ์',
          icon: 'qr' as IconName,
          badge: 'ไดนามิก',
          color: 'from-violet-600 to-purple-600',
          textColor: 'text-violet-600',
          bgLight: 'bg-violet-50',
          onClick: onOpenMyQr,
        },
        {
          id: 'statement',
          name: 'สรุปรายรับ - รายจ่าย',
          detail: 'วิเคราะห์รายสัปดาห์ / รายเดือน และใบเสร็จ e-Receipt',
          icon: 'history' as IconName,
          badge: `${transactions.length} รายการ`,
          color: 'from-emerald-600 to-teal-600',
          textColor: 'text-emerald-600',
          bgLight: 'bg-emerald-50',
          onClick: onOpenStatement,
        },
        {
          id: 'grant_status',
          name: 'ตรวจสอบวงเงินสิทธิ 60/40',
          detail: `สิทธิ์คงเหลือ ฿${userGrant.remainingAmount.toLocaleString()} จาก ฿${userGrant.totalGrantAmount.toLocaleString()}`,
          icon: 'shield' as IconName,
          badge: 'อนุมัติแล้ว',
          color: 'from-amber-600 to-orange-600',
          textColor: 'text-amber-600',
          bgLight: 'bg-amber-50',
          onClick: onOpenStatus,
        },
      ],
    },
    {
      categoryName: '🏪 ร้านค้าชุมชน & AI อัจฉริยะ',
      description: 'ค้นหาร้านค้า สนับสนุนชุมชน และภารกิจชี้เป้าจาก AI',
      items: [
        {
          id: 'ai_target',
          name: 'ภารกิจชี้เป้าฟื้นฟูร้านค้าจาก AI',
          detail: `AI วิเคราะห์ ${aiTargetShops.length} ร้านค้าที่มียอดขายชะลอตัวเพื่อรับการอุดหนุน`,
          icon: 'sparkle' as IconName,
          badge: `${aiTargetShops.length} ร้านเป้าหมาย`,
          color: 'from-amber-500 to-amber-700',
          textColor: 'text-amber-600',
          bgLight: 'bg-amber-50',
          onClick: () => onGoToTab('missions'),
        },
        {
          id: 'community_missions',
          name: 'ภารกิจกระตุ้นเศรษฐกิจชุมชน',
          detail: `ทำภารกิจซื้อสินค้าขั้นต่ำ ฿150 เพื่อรับแสตมป์ดิจิทัลฟรี`,
          icon: 'flame' as IconName,
          badge: `${missions.length} ภารกิจ`,
          color: 'from-rose-500 to-red-600',
          textColor: 'text-rose-600',
          bgLight: 'bg-rose-50',
          onClick: () => onGoToTab('missions'),
        },
        {
          id: 'map_shops',
          name: 'แผนที่ร้านค้าชุมชนใกล้ฉัน',
          detail: 'ค้นหาพิกัดร้านค้าที่เข้าร่วมโครงการทั่วประเทศและนำทาง',
          icon: 'shop' as IconName,
          badge: 'พิกัด GPS',
          color: 'from-cyan-600 to-blue-600',
          textColor: 'text-cyan-600',
          bgLight: 'bg-cyan-50',
          onClick: () => onOpenMap(1),
        },
      ],
    },
    {
      categoryName: '🏅 แสตมป์ดิจิทัล & รางวัล OTOP',
      description: 'สะสมแสตมป์ชุมชน แลกของรางวัล และสิทธิพิเศษ',
      items: [
        {
          id: 'stamps_passport',
          name: 'สมุดสะสมแสตมป์ชุมชน (Passport)',
          detail: `คุณมีแสตมป์สะสม ${totalUserStamps} ดวง ประจำอำเภอต่างๆ`,
          icon: 'award' as IconName,
          badge: `${totalUserStamps} ดวง`,
          color: 'from-blue-700 to-indigo-800',
          textColor: 'text-blue-700',
          bgLight: 'bg-blue-50',
          onClick: () => onGoToTab('wallet'),
        },
        {
          id: 'redeem_otop',
          name: 'แลกรับของรางวัล OTOP ชุมชน',
          detail: 'นำแสตมป์ดิจิทัลมาแลกผลิตภัณฑ์ OTOP และคูปองส่วนลด',
          icon: 'gift' as IconName,
          badge: 'ของดี 77 จังหวัด',
          color: 'from-purple-600 to-pink-600',
          textColor: 'text-purple-600',
          bgLight: 'bg-purple-50',
          onClick: () => onGoToTab('wallet'),
        },
        {
          id: 'my_vouchers',
          name: 'คูปองและของรางวัลของฉัน',
          detail: 'ดูรหัสคูปองและของรางวัลที่กดแลกไว้พร้อมใช้งาน',
          icon: 'wallet' as IconName,
          badge: 'พร้อมใช้',
          color: 'from-emerald-600 to-teal-600',
          textColor: 'text-emerald-600',
          bgLight: 'bg-emerald-50',
          onClick: onOpenVouchers,
        },
      ],
    },
  ];

  // Search filter
  const filteredCategories = serviceCategories
    .map(cat => ({
      ...cat,
      items: cat.items.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.detail.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cat.categoryName.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    }))
    .filter(cat => cat.items.length > 0);

  return (
    <div className="min-h-screen bg-[#f3f6fc] text-[#14213d] pb-28 animate-fade-in flex flex-col">
      {/* 1. Header Bar */}
      <header className="sticky top-0 z-30 bg-gradient-to-r from-[#072460] via-[#0d348a] to-[#1249b8] text-white px-5 pt-6 pb-5 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <span className="grid size-10 place-items-center rounded-2xl bg-white text-[#0d348a] font-extrabold text-sm shadow-md">
              ไทย
            </span>
            <div>
              <h1 className="text-lg font-black tracking-tight leading-tight">รวมบริการทั้งหมด</h1>
              <p className="text-[11px] text-blue-200">ศูนย์รวมบริการประชาชน • โครงการ 60/40</p>
            </div>
          </div>
          <span className="text-[10px] font-extrabold bg-white/15 text-white border border-white/20 px-2.5 py-1 rounded-full">
            ALL SERVICES
          </span>
        </div>

        {/* Search Bar Input */}
        <div className="relative mt-2">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
            <Icon name="search" className="size-4" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="ค้นหาบริการ เช่น สแกน QR, รายรับ-รายจ่าย, แสตมป์..."
            className="w-full pl-9 pr-8 py-2.5 bg-white/95 text-slate-800 placeholder-slate-400 text-xs font-semibold rounded-2xl focus:outline-none focus:ring-2 focus:ring-white shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <Icon name="x" className="size-3.5" />
            </button>
          )}
        </div>
      </header>

      {/* 2. Quick Wallet Overview Strip */}
      <div className="px-4 -mt-2">
        <div className="rounded-[22px] bg-white p-3.5 border border-blue-100 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-blue-50 text-[#1769ed]">
              <Icon name="wallet" className="size-5" />
            </span>
            <div>
              <p className="text-[10px] text-slate-400 font-medium">เงินในกระเป๋า</p>
              <p className="text-sm font-extrabold text-[#123b84] font-mono">
                ฿ {wallet.balance.toLocaleString()}
              </p>
            </div>
          </div>
          <div className="h-8 w-px bg-slate-100" />
          <div className="text-right">
            <p className="text-[10px] text-slate-400 font-medium">สิทธิ์รัฐ 60% คงเหลือ</p>
            <p className="text-sm font-extrabold text-emerald-600 font-mono">
              ฿ {userGrant.remainingAmount.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Service Categories & Items */}
      <div className="px-4 pt-4 space-y-5 flex-1">
        {filteredCategories.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-[26px] border border-dashed border-slate-200 p-6 space-y-2">
            <span className="text-4xl block">🔍</span>
            <p className="text-sm font-bold text-slate-700">ไม่พบบริการที่ค้นหา</p>
            <p className="text-xs text-slate-400">ลองค้นหาด้วยคำอื่น เช่น สแกน, สิทธิ์, เงิน, แสตมป์</p>
          </div>
        ) : (
          filteredCategories.map(cat => (
            <div key={cat.categoryName} className="space-y-2.5">
              <div className="px-1">
                <h2 className="text-xs font-black text-slate-800 tracking-tight">
                  {cat.categoryName}
                </h2>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {cat.description}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {cat.items.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={item.onClick}
                    className="w-full text-left bg-white hover:bg-[#f8faff] active:scale-[0.99] p-3.5 rounded-[22px] border border-slate-100/90 hover:border-blue-200 shadow-xs transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span className={`grid size-11 shrink-0 place-items-center rounded-2xl ${item.bgLight} ${item.textColor} group-hover:scale-105 transition-transform`}>
                        <Icon name={item.icon} className="size-5" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-slate-800 group-hover:text-[#1769ed] transition-colors truncate">
                            {item.name}
                          </p>
                          {item.badge && (
                            <span className="text-[9px] font-extrabold text-[#1769ed] bg-blue-50 px-1.5 py-0.5 rounded-md shrink-0">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                          {item.detail}
                        </p>
                      </div>
                    </div>

                    <Icon name="chevron" className="size-4 text-slate-300 group-hover:text-[#1769ed] group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

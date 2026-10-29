import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Icon } from '../../components/common/Icon';
import { Reward } from '../../types';
import { StampRedeemModal } from '../../components/citizen/StampRedeemModal';
import { REGIONS, findProvince, type Region } from '../../../../shared/regions';
import { PROVINCES } from '../../../../shared/geography';

interface CitizenRewardsPageProps {
  onBack?: () => void;
  onOpenPassport?: () => void;
  onOpenVouchers?: () => void;
}

export const CitizenRewardsPage: React.FC<CitizenRewardsPageProps> = ({
  onBack,
  onOpenPassport,
  onOpenVouchers,
}) => {
  const {
    userStamps,
    districtStamps,
    rewards,
    redemptions,
    refreshCitizenData,
    userGpsLocation,
    refreshLocationNow,
    isGpsTracking,
  } = useApp();

  const [categoryFilter, setCategoryFilter] = useState<'all' | 'has_stamps' | 'otop' | 'discount' | 'can_redeem'>('all');
  const [regionFilter, setRegionFilter] = useState<Region | 'all'>('all');
  const [provinceFilter, setProvinceFilter] = useState<string>('all');
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [redeemModalOpen, setRedeemModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    void refreshCitizenData();
  }, [refreshCitizenData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshCitizenData();
      await refreshLocationNow();
    } finally {
      setIsRefreshing(false);
    }
  };

  const totalUserStamps = userStamps.reduce((acc, curr) => acc + curr.count, 0);
  const readyVouchersCount = redemptions.filter(r => r.status !== 'completed').length;
  const currentProvinceName = userGpsLocation?.provinceName;

  // 1. Group collected stamps by province name
  const userStampsByProvince = useMemo(() => {
    const counts: Record<string, number> = {};
    userStamps.forEach(us => {
      if (us.count <= 0) return;
      const ds = districtStamps.find(d => d.stampId === us.stampId);
      if (ds?.provName) {
        const pName = ds.provName.trim();
        counts[pName] = (counts[pName] || 0) + us.count;
      }
    });
    return counts;
  }, [userStamps, districtStamps]);

  // Provinces where the user has collected stamps, ordered by count descending
  const provincesWithStamps = useMemo(() => {
    return Object.keys(userStampsByProvince).sort(
      (a, b) => userStampsByProvince[b] - userStampsByProvince[a]
    );
  }, [userStampsByProvince]);

  // Regions that contain provinces where the user has stamps
  const regionsWithStamps = useMemo(() => {
    const set = new Set<string>();
    provincesWithStamps.forEach(pName => {
      const pObj = findProvince(pName);
      if (pObj?.region) set.add(pObj.region);
    });
    return set;
  }, [provincesWithStamps]);

  // 2. Build province options for dropdown filter - strictly emphasizing provinces with stamps first
  const provinceOptions = useMemo(() => {
    // Collect all provinces matching selected region
    const list: string[] = [];
    PROVINCES.forEach((p: { name: string; region: string }) => {
      if (regionFilter === 'all' || p.region === regionFilter) {
        list.push(p.name);
      }
    });

    // Also include any province name appearing in rewards if region matches
    rewards.forEach(r => {
      if (r.provinceName && r.provinceName !== 'ทั่วประเทศ' && !list.includes(r.provinceName)) {
        const pObj = findProvince(r.provinceName);
        if (regionFilter === 'all' || pObj?.region === regionFilter) {
          list.push(r.provinceName);
        }
      }
    });

    // 1st Priority: Provinces with collected stamps (highest count first)
    const withStamps = list
      .filter(p => (userStampsByProvince[p] || 0) > 0)
      .sort((a, b) => (userStampsByProvince[b] || 0) - (userStampsByProvince[a] || 0));

    // 2nd Priority: Current GPS province (if not already in withStamps)
    const hasGps = Boolean(currentProvinceName && list.includes(currentProvinceName) && !(userStampsByProvince[currentProvinceName] > 0));

    // 3rd Priority: Other provinces (sorted alphabetically in Thai)
    const others = list
      .filter(p => !(userStampsByProvince[p] > 0) && p !== currentProvinceName)
      .sort((a, b) => a.localeCompare(b, 'th'));

    return {
      withStamps,
      currentGps: hasGps ? currentProvinceName : null,
      others,
    };
  }, [regionFilter, rewards, userStampsByProvince, currentProvinceName]);

  // 3. Filter & Sort Rewards - Prioritizing provinces with collected stamps first
  const filteredRewards = useMemo(() => {
    return rewards
      .filter(reward => {
        // Category Filter
        const canRedeem = totalUserStamps >= reward.requiredStampCount;
        const isOtop = reward.rewardType === 'otop_product' || reward.rewardType === 'souvenir';
        const isDiscount = reward.rewardType === 'discount_voucher';
        const hasStamps = (userStampsByProvince[reward.provinceName] || 0) > 0;

        if (categoryFilter === 'can_redeem' && !canRedeem) return false;
        if (categoryFilter === 'otop' && !isOtop) return false;
        if (categoryFilter === 'discount' && !isDiscount) return false;
        if (categoryFilter === 'has_stamps' && !hasStamps) return false;

        // Region Filter
        if (regionFilter !== 'all') {
          const provObj = findProvince(reward.provinceName);
          if (!provObj || provObj.region !== regionFilter) return false;
        }

        // Province Filter
        if (provinceFilter !== 'all') {
          const cleanTarget = reward.provinceName.replace(/^(จังหวัด|จ\.)/g, '').trim();
          const cleanFilter = provinceFilter.replace(/^(จังหวัด|จ\.)/g, '').trim();
          if (!cleanTarget.includes(cleanFilter) && !cleanFilter.includes(cleanTarget)) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        // PRIORITY 1: Provinces with collected stamps (highest stamp count first)
        const aStamps = userStampsByProvince[a.provinceName] || 0;
        const bStamps = userStampsByProvince[b.provinceName] || 0;
        if (aStamps !== bStamps) return bStamps - aStamps;

        // PRIORITY 2: Current GPS Province
        if (currentProvinceName) {
          const aLocal = a.provinceName && (a.provinceName.includes(currentProvinceName) || currentProvinceName.includes(a.provinceName));
          const bLocal = b.provinceName && (b.provinceName.includes(currentProvinceName) || currentProvinceName.includes(b.provinceName));
          if (aLocal && !bLocal) return -1;
          if (!aLocal && bLocal) return 1;
        }

        // PRIORITY 3: In stock first
        if (a.remainingStock > 0 && b.remainingStock === 0) return -1;
        if (a.remainingStock === 0 && b.remainingStock > 0) return 1;

        return 0;
      });
  }, [
    rewards,
    categoryFilter,
    regionFilter,
    provinceFilter,
    userStampsByProvince,
    totalUserStamps,
    currentProvinceName,
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f3f7fd] via-[#f7f9fd] to-[#f0f4fa] text-[#0f172a] pb-28 animate-fade-in flex flex-col antialiased">
      {/* 1. Header Bar */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/85 border-b border-slate-200/60 px-4 py-3.5 shadow-xs flex items-center justify-between transition-all">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="grid size-10 place-items-center rounded-2xl bg-slate-100/80 hover:bg-slate-200/80 active:scale-95 transition-all text-slate-700 cursor-pointer shadow-xs border border-slate-200/40"
              aria-label="ย้อนกลับ"
            >
              <Icon name="chevron" className="size-5 rotate-180" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black tracking-tight text-slate-900">
                ศูนย์ของรางวัล & OTOP ชุมชน
              </h1>
              <span className="text-lg">🎁</span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              แลกรับผลิตภัณฑ์ OTOP และคูปองด้วยแสตมป์ดิจิทัล
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="grid size-8 place-items-center rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 transition text-slate-600 cursor-pointer shadow-xs border border-slate-200/60"
            title="รีเฟรชข้อมูลจากฐานข้อมูล"
            aria-label="รีเฟรชของรางวัล"
          >
            <Icon name="refresh" className={`size-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
          </button>
          <span className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-black flex items-center gap-1 shadow-xs">
            <span className="text-amber-500">★</span> {totalUserStamps} ดวง
          </span>
        </div>
      </header>

      {/* GPS Location Bar (Detects every 10 min) */}
      <div className="px-4 pt-3.5">
        <div className="rounded-[22px] bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white p-3.5 shadow-md border border-blue-400/30 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className={`size-8 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-400/40 grid place-items-center text-sm shrink-0 ${isGpsTracking ? 'animate-pulse' : ''}`}>
              📍
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-black text-white truncate">
                  {userGpsLocation ? `${userGpsLocation.districtName ? `${userGpsLocation.districtName}, ` : ''}${userGpsLocation.provinceName}` : 'กำลังระบุพิกัด GPS...'}
                </span>
                <span className="text-[9px] bg-blue-500/30 text-blue-200 px-1.5 py-0.2 rounded-full font-bold">
                  พิกัด 10 นาที
                </span>
              </div>
              <p className="text-[10px] text-blue-200/80 truncate">
                {userGpsLocation?.lastUpdated ? `อัปเดตล่าสุด ${userGpsLocation.lastUpdated}` : 'ระบบจะแนะนำสินค้า OTOP ตามพื้นที่ที่คุณอยู่ ณ ตอนนั้น'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void refreshLocationNow()}
            disabled={isGpsTracking}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white transition cursor-pointer shrink-0 ml-2"
            title="ดึงพิกัด GPS ใหม่ตอนนี้"
          >
            <Icon name="refresh" className={`size-3.5 ${isGpsTracking ? 'animate-spin text-amber-300' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Asset Overview Grid (Stamp Passport & My Vouchers) */}
      <div className="px-4 pt-3.5 grid grid-cols-2 gap-3">
        {/* Card 1: My Stamps & Passport */}
        <div className="rounded-[24px] bg-gradient-to-br from-[#0c2e68] via-[#103d8a] to-[#1769ed] p-4 text-white shadow-md relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">
                แสตมป์สะสม
              </span>
              <span className="text-base">🏅</span>
            </div>
            <p className="text-2xl font-black text-amber-300 font-mono tracking-tight leading-none">
              {totalUserStamps} <span className="text-xs text-blue-200 font-medium">ดวง</span>
            </p>
            <p className="text-[10px] text-blue-200 mt-1">
              {provincesWithStamps.length > 0
                ? `สะสมจาก ${provincesWithStamps.length} จังหวัด`
                : 'ใช้แลกของรางวัล OTOP'}
            </p>
          </div>

          {onOpenPassport && (
            <button
              type="button"
              onClick={onOpenPassport}
              className="mt-3 py-1.5 px-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer border border-white/20 shadow-xs"
            >
              <span>📖 เปิดสมุดพาสปอร์ต</span>
            </button>
          )}
        </div>

        {/* Card 2: My Vouchers Ready to Use */}
        <div className="rounded-[24px] bg-white p-4 border border-amber-200/80 shadow-md relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                คูปองของฉัน
              </span>
              <span className="text-base">🎟️</span>
            </div>
            <p className="text-2xl font-black text-slate-800 font-mono tracking-tight leading-none">
              {readyVouchersCount} <span className="text-xs text-slate-400 font-medium">ใบ</span>
            </p>
            <p className="text-[10px] text-slate-500 mt-1">คูปองพร้อมแสดงหน้าร้าน</p>
          </div>

          {onOpenVouchers && (
            <button
              type="button"
              onClick={onOpenVouchers}
              className="mt-3 py-1.5 px-2 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer border border-amber-300 shadow-xs"
            >
              <span>ดูคูปองของฉัน →</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Geographic Filter Panel (Region & Province with Stamp Prioritization) */}
      <div className="px-4 pt-4 space-y-2.5">
        <div className="bg-white rounded-[22px] p-3.5 border border-slate-200/80 shadow-xs space-y-3">
          {/* Section Heading & Reset */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="size-5 rounded-lg bg-blue-50 text-blue-600 grid place-items-center text-xs">
                🌐
              </span>
              <h2 className="text-xs font-black text-slate-800 tracking-tight">
                ตัวกรองภูมิภาค & จังหวัด (OTOP)
              </h2>
            </div>
            {(regionFilter !== 'all' || provinceFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setRegionFilter('all');
                  setProvinceFilter('all');
                }}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 transition cursor-pointer"
              >
                ล้างตัวกรอง
              </button>
            )}
          </div>

          {/* 3.1 Region Filter Tabs */}
          <div>
            <div className="text-[10px] font-bold text-slate-400 mb-1.5">เลือกภาค:</div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              <button
                type="button"
                onClick={() => {
                  setRegionFilter('all');
                  setProvinceFilter('all');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                  regionFilter === 'all'
                    ? 'bg-[#1769ed] text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                ทุกภาค
              </button>
              {(Object.keys(REGIONS) as Region[])
                .filter(key => key !== 'Unmapped')
                .map(rKey => {
                  const hasStampsInRegion = regionsWithStamps.has(rKey);
                  const isSelected = regionFilter === rKey;
                  return (
                    <button
                      key={rKey}
                      type="button"
                      onClick={() => {
                        setRegionFilter(rKey);
                        setProvinceFilter('all');
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1 ${
                        isSelected
                          ? 'bg-[#1769ed] text-white shadow-xs'
                          : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span>{REGIONS[rKey]}</span>
                      {hasStampsInRegion && (
                        <span className="text-[10px] text-amber-500 font-black" title="มีแสตมป์ในภาคนี้">
                          ★
                        </span>
                      )}
                    </button>
                  );
                })}
            </div>
          </div>

          {/* 3.2 Province Selector with Stamp Highlighting */}
          <div>
            <div className="text-[10px] font-bold text-slate-400 mb-1.5 flex items-center justify-between">
              <span>เลือกจังหวัด (เน้นจังหวัดที่มีแสตมป์สะสมขึ้นก่อน):</span>
              {provincesWithStamps.length > 0 && (
                <span className="text-amber-700 font-extrabold text-[10px]">
                  ⭐ คุณมีแสตมป์ {provincesWithStamps.length} จังหวัด
                </span>
              )}
            </div>

            <div className="relative">
              <select
                value={provinceFilter}
                onChange={e => setProvinceFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl px-3 py-2.5 pr-8 appearance-none shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">
                  📍 ทุกจังหวัด {regionFilter !== 'all' ? `ใน${REGIONS[regionFilter]}` : 'ทั่วประเทศ'}
                </option>

                {/* 1st Priority: Provinces with user stamps */}
                {provinceOptions.withStamps.length > 0 && (
                  <optgroup label="⭐ จังหวัดที่คุณมีแสตมป์สะสม (แนะนำ)">
                    {provinceOptions.withStamps.map(pName => (
                      <option key={pName} value={pName}>
                        {pName} (⭐ คุณมี {userStampsByProvince[pName]} แสตมป์)
                      </option>
                    ))}
                  </optgroup>
                )}

                {/* 2nd Priority: Current GPS location */}
                {provinceOptions.currentGps && (
                  <optgroup label="📍 จังหวัดตามพิกัด GPS คุณตอนนี้">
                    <option value={provinceOptions.currentGps}>
                      {provinceOptions.currentGps} (พิกัด GPS ณ ตอนนี้)
                    </option>
                  </optgroup>
                )}

                {/* 3rd Priority: Other provinces */}
                {provinceOptions.others.length > 0 && (
                  <optgroup label={`🏛️ จังหวัดอื่นๆ ${regionFilter !== 'all' ? `ใน${REGIONS[regionFilter]}` : ''}`}>
                    {provinceOptions.others.map(pName => (
                      <option key={pName} value={pName}>
                        {pName}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                ▼
              </div>
            </div>
          </div>
        </div>

        {/* 3.3 Quick Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {[
            { id: 'all', label: 'ทั้งหมด', count: rewards.length },
            ...(provincesWithStamps.length > 0 ? [{
              id: 'has_stamps',
              label: '⭐ จังหวัดที่มีแสตมป์',
              count: rewards.filter(r => (userStampsByProvince[r.provinceName] || 0) > 0).length,
            }] : []),
            {
              id: 'can_redeem',
              label: 'แลกได้ทันที',
              count: rewards.filter(r => totalUserStamps >= r.requiredStampCount).length,
            },
            {
              id: 'otop',
              label: 'สินค้า OTOP ชุมชน',
              count: rewards.filter(r => r.rewardType === 'otop_product' || r.rewardType === 'souvenir').length,
            },
            {
              id: 'discount',
              label: 'คูปองส่วนลด',
              count: rewards.filter(r => r.rewardType === 'discount_voucher').length,
            },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setCategoryFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                categoryFilter === tab.id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full ${
                  categoryFilter === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Rewards Catalog Grid */}
      <div className="px-4 pt-3.5 space-y-3 flex-1">
        <div className="flex justify-between items-center text-xs text-slate-500 px-0.5">
          <span>
            พบ {filteredRewards.length} รายการ
            {provinceFilter !== 'all' && ` • จ.${provinceFilter}`}
            {regionFilter !== 'all' && ` • ${REGIONS[regionFilter]}`}
          </span>
          <span className="text-[11px] text-blue-700 font-bold">1 แสตมป์ = 1 สิทธิ์</span>
        </div>

        {filteredRewards.length === 0 ? (
          <div className="py-14 text-center text-slate-400 bg-white rounded-3xl p-6 border border-slate-100 space-y-2">
            <span className="text-4xl block">🔍</span>
            <p className="text-xs font-bold text-slate-600">ไม่พบของรางวัลในเงื่อนไขนี้</p>
            <p className="text-[11px] text-slate-400">
              ลองปรับเปลี่ยนตัวกรองภาคหรือจังหวัดเพื่อดูของรางวัลและสินค้า OTOP อื่นๆ ได้เลยครับ
            </p>
            <button
              type="button"
              onClick={() => {
                setRegionFilter('all');
                setProvinceFilter('all');
                setCategoryFilter('all');
              }}
              className="mt-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold hover:bg-blue-100 transition cursor-pointer"
            >
              ดูของรางวัลทั้งหมด
            </button>
          </div>
        ) : (
          filteredRewards.map(reward => {
            const canRedeem = totalUserStamps >= reward.requiredStampCount;
            const diffStamps = reward.requiredStampCount - totalUserStamps;
            const stampCountForProv = userStampsByProvince[reward.provinceName] || 0;
            const isLocalGps = Boolean(
              currentProvinceName &&
              (reward.provinceName.includes(currentProvinceName) || currentProvinceName.includes(reward.provinceName))
            );
            const provMeta = findProvince(reward.provinceName);
            const regionName = provMeta?.region ? REGIONS[provMeta.region] : null;

            return (
              <div
                key={reward.rewardId}
                className="bg-white rounded-[24px] p-3.5 border border-slate-100 shadow-[0_4px_16px_rgba(0,0,0,0.03)] flex gap-3.5 items-center hover:shadow-md transition-all"
              >
                {/* Reward Image */}
                <div className="relative size-22 rounded-2xl overflow-hidden shrink-0 border border-slate-100">
                  <img
                    src={reward.imageUrl}
                    alt={reward.rewardName}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-1 left-1 bg-black/60 backdrop-blur text-white text-[8px] font-bold px-1.5 py-0.5 rounded-md">
                    {reward.rewardType === 'discount_voucher' ? 'คูปอง' : 'OTOP'}
                  </span>
                </div>

                {/* Details */}
                <div className="min-w-0 flex-1 flex flex-col justify-between h-full space-y-1.5">
                  <div>
                    {/* Location & Stamp Badges */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold text-blue-700 truncate">
                        {reward.provinceName}
                      </span>
                      {regionName && (
                        <span className="text-[8px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded-md">
                          {regionName}
                        </span>
                      )}
                      {stampCountForProv > 0 && (
                        <span className="text-[8px] bg-amber-50 text-amber-900 border border-amber-300 font-black px-1.5 py-0.2 rounded-full">
                          ⭐ คุณมี {stampCountForProv} แสตมป์
                        </span>
                      )}
                      {isLocalGps && (
                        <span className="text-[8px] bg-emerald-50 text-emerald-800 border border-emerald-300 font-extrabold px-1.5 py-0.2 rounded-full">
                          📍 พิกัดคุณตอนนี้
                        </span>
                      )}
                      {reward.remainingStock <= 5 && reward.remainingStock > 0 && (
                        <span className="text-[9px] font-black text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded-md">
                          เหลือ {reward.remainingStock} ชิ้น
                        </span>
                      )}
                    </div>

                    <h3 className="font-extrabold text-xs text-slate-900 line-clamp-1 leading-snug mt-0.5">
                      {reward.rewardName}
                    </h3>
                    <p className="text-[10px] text-slate-400 line-clamp-1">
                      {reward.description}
                    </p>
                  </div>

                  {/* Stamp Requirement & Redeem Button */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-50">
                    <div className="flex items-baseline gap-1">
                      <span className="text-xs font-black text-amber-500">★</span>
                      <span className="text-xs font-black text-slate-800">
                        {reward.requiredStampCount}
                      </span>
                      <span className="text-[10px] text-slate-400">แสตมป์</span>
                    </div>

                    <button
                      type="button"
                      disabled={!canRedeem}
                      onClick={() => {
                        setSelectedReward(reward);
                        setRedeemModalOpen(true);
                      }}
                      className={`py-1.5 px-3 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer shadow-xs ${
                        canRedeem
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-amber-500/20 active:scale-95'
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {canRedeem ? 'กดแลกรับเลย' : `ขาด ${diffStamps} ดวง`}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Redeem Modal */}
      <StampRedeemModal
        isOpen={redeemModalOpen}
        onClose={() => setRedeemModalOpen(false)}
        reward={selectedReward}
      />
    </div>
  );
};

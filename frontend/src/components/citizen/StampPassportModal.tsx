import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { DistrictStamp } from '../../types';
import { Icon } from '../common/Icon';
import { citizenService } from '../../services/citizenService';

interface StampPassportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoToRewards?: () => void;
  onOpenMapWithDistrict?: (distId: number) => void;
}

export const StampPassportModal: React.FC<StampPassportModalProps> = ({
  isOpen,
  onClose,
  onGoToRewards,
  onOpenMapWithDistrict,
}) => {
  const { districtStamps, userStamps, merchants, transactions, redemptions } = useApp();
  const [mainTab, setMainTab] = useState<'collection' | 'history'>('collection');
  const [filter, setFilter] = useState<'all' | 'collected' | 'missing'>('all');
  const [selectedStamp, setSelectedStamp] = useState<DistrictStamp | null>(null);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Load stamp history from backend or construct from transactions & redemptions
  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    setLoadingHistory(true);

    citizenService.getStampsHistory()
      .then(res => {
        if (!active) return;
        if (Array.isArray(res) && res.length > 0) {
          const normalized = res.map((item: any, idx: number) => {
            const isEarn = item.type === 'earn' || (!item.type && !item.Redemption_ID);
            const stampName = item.stampName || item.district_stamps?.Stamp_Name || item.Stamp_Name || (isEarn ? 'แสตมป์ดิจิทัล' : (item.rewardName || 'ของรางวัล OTOP'));
            const distName = item.distName || item.district_stamps?.districts?.Dist_Name || item.district_stamps?.Stamp_Name || item.Dist_Name || 'สินค้าชุมชน';
            const imageUrl = item.imageUrl || item.district_stamps?.Image_Url || item.Image_Url || '';
            const timestamp = item.timestamp || item.Earned_At || item.Redeemed_At || '';
            const count = item.count ?? item.Count ?? item.Quantity ?? 1;
            const source = item.source || (isEarn ? 'ซื้อสินค้าชุมชนครบยอดสะสม' : `ใช้แสตมป์แลกรับ ${stampName}`);

            return {
              id: item.id || `hist-${idx}`,
              type: isEarn ? ('earn' as const) : ('redeem' as const),
              stampName,
              distName,
              imageUrl,
              timestamp,
              source,
              count,
            };
          });
          setHistoryList(normalized);
        } else {
          // Fallback construction from client data
          buildLocalHistory();
        }
      })
      .catch(() => {
        if (active) buildLocalHistory();
      })
      .finally(() => {
        if (active) setLoadingHistory(false);
      });

    return () => { active = false; };
  }, [isOpen, transactions, userStamps, redemptions]);

  const buildLocalHistory = () => {
    const list: any[] = [];

    // Earned stamps from transactions
    transactions.forEach(t => {
      if (t.earnedStampId) {
        const stamp = districtStamps.find(s => s.stampId === t.earnedStampId);
        list.push({
          id: `tx-${t.txId}`,
          type: 'earn',
          stampName: stamp?.stampName || 'แสตมป์ดิจิทัล',
          distName: stamp?.distName || 'เชียงใหม่',
          imageUrl: stamp?.imageUrl,
          timestamp: t.txTimestamp,
          source: `ซื้อสินค้าครบ ฿${(t.totalAmount || 150).toLocaleString()} ณ ร้าน ${t.merchantName}`,
          count: 1,
        });
      }
    });

    // Directly awarded stamps in userStamps
    userStamps.forEach(us => {
      const stamp = districtStamps.find(s => s.stampId === us.stampId);
      const alreadyInList = list.some(item => item.stampName === stamp?.stampName);
      if (!alreadyInList) {
        list.push({
          id: `us-${us.userStampId}`,
          type: 'earn',
          stampName: stamp?.stampName || 'แสตมป์ประจำอำเภอ',
          distName: stamp?.distName || 'เชียงใหม่',
          imageUrl: stamp?.imageUrl,
          timestamp: us.earnedAt,
          source: us.earnSource === 'mission' ? 'สำเร็จภารกิจกระตุ้นเศรษฐกิจ AI' : 'ซื้อสินค้าชุมชนครบยอดสะสม',
          count: us.count,
        });
      }
    });

    // Redeemed stamps
    redemptions.forEach(r => {
      const stamp = districtStamps.find(s => s.stampId === r.stampId);
      list.push({
        id: `rd-${r.redemptionId}`,
        type: 'redeem',
        stampName: r.rewardName || 'ของรางวัล OTOP',
        distName: stamp?.distName || 'สินค้าชุมชน',
        imageUrl: stamp?.imageUrl,
        timestamp: r.redeemedAt,
        source: `ใช้แสตมป์แลกรับ ${r.rewardName}`,
        count: r.quantity || 1,
      });
    });

    // Sort by timestamp desc
    list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setHistoryList(list);
  };

  if (!isOpen) return null;

  const totalUserStamps = userStamps.reduce((acc, curr) => acc + curr.count, 0);
  const totalDistricts = districtStamps.length;
  const unlockedDistricts = districtStamps.filter(stamp => {
    const s = userStamps.find(us => us.stampId === stamp.stampId);
    return s && s.count > 0;
  });
  const unlockedCount = unlockedDistricts.length;
  const progressPercent = totalDistricts > 0 ? Math.round((unlockedCount / totalDistricts) * 100) : 0;

  // Rank / Title based on unlock progress
  const getExplorerTitle = () => {
    if (unlockedCount === totalDistricts) return { title: 'ยอดนักสำรวจล้านนาในตำนาน', color: 'from-amber-400 to-yellow-300' };
    if (unlockedCount >= 6) return { title: 'นักสำรวจล้านนาระดับทอง', color: 'from-amber-300 to-amber-500' };
    if (unlockedCount >= 3) return { title: 'นักเดินทางล้านนาระดับเงิน', color: 'from-slate-200 to-slate-400' };
    return { title: 'นักสำรวจมือใหม่', color: 'from-cyan-300 to-blue-300' };
  };

  const explorerInfo = getExplorerTitle();

  const filteredStamps = districtStamps.filter(stamp => {
    const has = (userStamps.find(s => s.stampId === stamp.stampId)?.count || 0) > 0;
    if (filter === 'collected') return has;
    if (filter === 'missing') return !has;
    return true;
  });

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[#051124]/80 p-3 sm:p-4 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[430px] max-h-[92vh] flex flex-col rounded-[32px] bg-gradient-to-b from-slate-900 via-slate-900 to-[#071733] border border-amber-500/20 shadow-2xl text-white overflow-hidden relative"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Glow & Decorative Pattern */}
        <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-amber-500/15 via-blue-600/10 to-transparent pointer-events-none" />

        {/* Modal Header */}
        <div className="relative z-10 flex items-center justify-between px-5 pt-5 pb-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/20 font-black">
              <Icon name="award" className="size-5" />
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-extrabold text-sm text-white tracking-wide">สมุดสะสมแสตมป์ชุมชน</h3>
                <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Passport
                </span>
              </div>
              <p className="text-[10px] text-blue-200/80">Digital District Stamp Passport • เชียงใหม่</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="grid size-8 place-items-center rounded-full bg-white/10 hover:bg-white/20 text-white/80 transition-colors cursor-pointer"
          >
            <Icon name="x" className="size-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 relative z-10">
          {/* PASSPORT COVER / HERO SUMMARY */}
          <div className="relative rounded-2xl bg-gradient-to-br from-[#0c2e68] via-[#103d8a] to-[#1769ed] p-4 border border-amber-400/30 shadow-xl overflow-hidden">
            {/* Watermark Crest */}
            <div className="absolute -right-4 -bottom-6 size-36 rounded-full border-4 border-white/5 opacity-40 pointer-events-none flex items-center justify-center">
              <span className="text-6xl select-none">🐘</span>
            </div>

            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="text-[9px] font-bold uppercase tracking-widest text-amber-300 flex items-center gap-1">
                  <span>✦</span> สมุดเดินทางล้านนาดิจิทัล
                </span>
                <p className={`text-xs font-black bg-gradient-to-r ${explorerInfo.color} bg-clip-text text-transparent mt-0.5`}>
                  {explorerInfo.title}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-blue-200">แสตมป์ในครอบครอง</span>
                <p className="text-2xl font-black text-amber-300 leading-tight">
                  {totalUserStamps} <span className="text-xs font-semibold text-white/80">ดวง</span>
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-3 pt-3 border-t border-white/15 space-y-1.5">
              <div className="flex justify-between text-[11px] font-bold">
                <span className="text-blue-100">
                  ปลดล็อกแล้ว <strong className="text-amber-300">{unlockedCount}</strong> จาก {totalDistricts} อำเภอ
                </span>
                <span className="text-amber-300 font-mono font-black">{progressPercent}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-black/30 overflow-hidden p-0.5 border border-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-400 to-amber-300 transition-all duration-500 shadow-sm"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* MAIN TAB SWITCHER: Passport vs History */}
          <div className="flex items-center gap-2 p-1 rounded-2xl bg-black/40 border border-white/10">
            <button
              onClick={() => setMainTab('collection')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                mainTab === 'collection'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <span>🏅 สมุดสะสมแสตมป์</span>
            </button>
            <button
              onClick={() => setMainTab('history')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                mainTab === 'history'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <span>📜 ประวัติการได้รับ ({historyList.length})</span>
            </button>
          </div>

          {/* TAB 1: COLLECTION GRID */}
          {mainTab === 'collection' && (
            <>
              {/* FILTER TABS */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/5 border border-white/10 text-xs">
                <button
                  onClick={() => setFilter('all')}
                  className={`flex-1 py-1.5 rounded-lg font-bold transition-all text-[11px] cursor-pointer ${
                    filter === 'all'
                      ? 'bg-amber-400 text-slate-950 shadow-sm'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  ทั้งหมด ({districtStamps.length})
                </button>
                <button
                  onClick={() => setFilter('collected')}
                  className={`flex-1 py-1.5 rounded-lg font-bold transition-all text-[11px] cursor-pointer ${
                    filter === 'collected'
                      ? 'bg-amber-400 text-slate-950 shadow-sm'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  มีแล้ว ({unlockedCount})
                </button>
                <button
                  onClick={() => setFilter('missing')}
                  className={`flex-1 py-1.5 rounded-lg font-bold transition-all text-[11px] cursor-pointer ${
                    filter === 'missing'
                      ? 'bg-amber-400 text-slate-950 shadow-sm'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  ยังไม่มี ({totalDistricts - unlockedCount})
                </button>
              </div>

              {/* STAMP GALLERY GRID */}
              <div className="grid grid-cols-2 gap-3">
                {filteredStamps.map(stamp => {
                  const count = userStamps.find(s => s.stampId === stamp.stampId)?.count || 0;
                  const has = count > 0;
                  const isSelected = selectedStamp?.stampId === stamp.stampId;

                  return (
                    <div
                      key={stamp.stampId}
                      onClick={() => setSelectedStamp(stamp)}
                      className={`group relative rounded-2xl p-3 border transition-all cursor-pointer flex flex-col items-center text-center overflow-hidden ${
                        isSelected
                          ? 'ring-2 ring-amber-400 bg-white/20 border-amber-300 shadow-lg scale-102'
                          : has
                          ? 'bg-gradient-to-b from-white/15 to-white/5 border-amber-400/40 hover:bg-white/20 hover:border-amber-300 hover:scale-101 shadow-md'
                          : 'bg-white/5 border-white/10 opacity-55 hover:opacity-75 grayscale hover:grayscale-0'
                      }`}
                    >
                      {/* Stamp Image Box */}
                      <div className="relative mt-1 mb-2">
                        <img
                          src={stamp.imageUrl}
                          alt={stamp.stampName}
                          className="size-20 rounded-xl object-cover border-2 border-white/20 shadow-md transition-transform group-hover:scale-105"
                        />

                        {/* Verified Red Seal if Owned */}
                        {has ? (
                          <div className="absolute -bottom-1 -right-1 bg-red-600/90 text-white border border-red-300 text-[8px] font-black px-1.5 py-0.5 rounded-full shadow-md rotate-[-8deg] pointer-events-none flex items-center gap-0.5">
                            <span>✓</span>
                            <span>VERIFIED</span>
                          </div>
                        ) : (
                          <div className="absolute inset-0 bg-slate-950/60 rounded-xl flex items-center justify-center text-white/80">
                            <span className="text-xl">🔒</span>
                          </div>
                        )}
                      </div>

                      {/* Stamp Details */}
                      <div className="w-full min-w-0">
                        <div className="flex items-center justify-center gap-1 mb-0.5">
                          <span className="text-[10px] text-amber-300 font-semibold truncate">
                            {stamp.distName}
                          </span>
                          {stamp.rarity === 'special' && (
                            <span className="text-[8px] font-black px-1 rounded bg-amber-400 text-slate-950">
                              หายาก
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-black text-white line-clamp-1 leading-snug">
                          {stamp.stampName}
                        </p>

                        {/* Count / Status Badge */}
                        <div className="mt-2 w-full">
                          {has ? (
                            <div className="py-0.5 px-2 rounded-lg bg-amber-400 text-slate-950 font-black text-[10px] flex items-center justify-center gap-1 shadow-xs">
                              <span>★ สะสมได้ {count} ดวง</span>
                            </div>
                          ) : (
                            <div className="py-0.5 px-2 rounded-lg bg-white/10 text-slate-300 font-medium text-[9px]">
                              ยังไม่ได้ครอบครอง
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredStamps.length === 0 && (
                <div className="text-center py-10 text-slate-400 space-y-2">
                  <span className="text-4xl block">🔍</span>
                  <p className="text-xs font-bold">ไม่พบแสตมป์ในหมวดหมู่นี้</p>
                </div>
              )}
            </>
          )}

          {/* TAB 2: STAMP ACTIVITY HISTORY */}
          {mainTab === 'history' && (
            <div className="space-y-2.5 animate-fade-in">
              <div className="flex justify-between items-center px-1">
                <span className="text-xs font-bold text-slate-300">ประวัติการรับ & ใช้งานแสตมป์</span>
                <span className="text-[10px] text-amber-300 font-medium">บันทึกจริงตามบิลธุรกรรม</span>
              </div>

              {loadingHistory ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <span className="size-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin inline-block" />
                  <p className="text-xs">กำลังโหลดประวัติแสตมป์...</p>
                </div>
              ) : historyList.length === 0 ? (
                <div className="py-12 text-center text-slate-400 bg-white/5 rounded-2xl p-6 border border-white/10 space-y-2">
                  <span className="text-4xl block">📜</span>
                  <p className="text-xs font-bold text-white">ยังไม่มีประวัติการได้รับแสตมป์</p>
                  <p className="text-[10px] text-slate-400 max-w-[220px] mx-auto leading-relaxed">
                    ช้อปสินค้าครบ ฿150 ต่อบิลในอำเภอต่างๆ เพื่อรับแสตมป์ประจำอำเภอดวงแรกของคุณ!
                  </p>
                </div>
              ) : (
                historyList.map(item => (
                  <div
                    key={item.id}
                    className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors flex items-center gap-3"
                  >
                    {/* Stamp Avatar */}
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.stampName}
                        className="size-11 rounded-xl object-cover border border-amber-400/40 shrink-0"
                      />
                    ) : (
                      <span className={`size-11 rounded-xl flex items-center justify-center text-base shrink-0 border ${
                        item.type === 'earn'
                          ? 'bg-amber-400/20 text-amber-300 border-amber-400/30'
                          : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                      }`}>
                        {item.type === 'earn' ? '★' : '🎁'}
                      </span>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-black text-white truncate">
                          {item.stampName || (item.type === 'earn' ? 'แสตมป์ดิจิทัล' : 'ของรางวัล OTOP')}
                        </span>
                        <span className={`text-[11px] font-black font-mono shrink-0 px-2 py-0.5 rounded-lg ${
                          item.type === 'earn'
                            ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}>
                          {item.type === 'earn' ? `+${item.count || 1} ดวง` : `-${item.count || 1} ดวง`}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 line-clamp-1 mt-0.5">
                        {item.source || (item.type === 'earn' ? 'ซื้อสินค้าชุมชนครบยอดสะสม' : 'แลกรับของรางวัล OTOP')}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                        <span className="flex items-center gap-1 truncate max-w-[60%]">
                          <span className="text-amber-400/90 text-xs">📍</span>
                          <span className="truncate">{item.distName || 'สินค้าชุมชน'}</span>
                        </span>
                        <span className="shrink-0">
                          {(() => {
                            if (!item.timestamp) return '';
                            try {
                              const d = new Date(item.timestamp);
                              if (isNaN(d.getTime())) return item.timestamp;
                              return d.toLocaleDateString('th-TH', {
                                day: 'numeric',
                                month: 'short',
                                year: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              });
                            } catch {
                              return item.timestamp;
                            }
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* SELECTED STAMP DETAIL SHEET (in Collection tab) */}
        {selectedStamp && mainTab === 'collection' && (
          <div className="relative z-20 bg-slate-950/95 border-t border-amber-400/40 p-4 animate-fade-in backdrop-blur-md shrink-0">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-3">
                <img
                  src={selectedStamp.imageUrl}
                  alt={selectedStamp.stampName}
                  className="size-13 rounded-xl object-cover border border-amber-400/50 shadow-md shrink-0"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-amber-300">{selectedStamp.distName}</span>
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                      {selectedStamp.rarity}
                    </span>
                  </div>
                  <h4 className="font-extrabold text-sm text-white truncate">{selectedStamp.stampName}</h4>
                  <p className="text-[10px] text-slate-300 line-clamp-1 mt-0.5">
                    {selectedStamp.symbolMeaning || selectedStamp.description}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStamp(null)}
                className="grid size-6 place-items-center rounded-full bg-white/10 hover:bg-white/20 text-white/70 text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Action Button for Selected Stamp */}
            <div className="mt-3 pt-2 border-t border-white/10 text-xs font-bold">
              {((userStamps.find(s => s.stampId === selectedStamp.stampId)?.count || 0) > 0) ? (
                <button
                  onClick={() => {
                    if (onGoToRewards) {
                      onGoToRewards();
                      onClose();
                    }
                  }}
                  className="w-full py-2.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs font-black"
                >
                  <Icon name="gift" className="size-4" />
                  <span>นำแสตมป์ไปแลกของรางวัล OTOP & คูปอง</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (onOpenMapWithDistrict) {
                      onOpenMapWithDistrict(selectedStamp.distId);
                      onClose();
                    }
                  }}
                  className="w-full py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer text-[11px]"
                >
                  <Icon name="map-pin" className="size-3.5" />
                  <span>ค้นหาร้านค้าใน {selectedStamp.distName} เพื่อปลดล็อกแสตมป์</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Modal Bottom Bar */}
        <div className="p-3 bg-slate-950 border-t border-white/10 flex items-center justify-between text-xs shrink-0">
          <span className="text-[10px] text-slate-400 flex items-center gap-1">
            <span>💡</span> ใช้ช้อปครบ ฿150 ต่อบิล เพื่อรับแสตมป์อำเภอ
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
};

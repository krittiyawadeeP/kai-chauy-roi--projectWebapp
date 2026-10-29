import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { useApp } from '../../context/AppContext';
import { Reward, StampRedemption } from '../../types';
import { Icon } from '../common/Icon';

interface StampRedeemModalProps {
  isOpen: boolean;
  onClose: () => void;
  reward: Reward | null;
}

export const StampRedeemModal: React.FC<StampRedeemModalProps> = ({
  isOpen,
  onClose,
  reward
}) => {
  const { redeemReward, userStamps, districtStamps } = useApp();
  const [successRedemption, setSuccessRedemption] = useState<StampRedemption | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isRedeeming, setIsRedeeming] = useState<boolean>(false);

  if (!isOpen || !reward) return null;

  const isProvincial = Boolean(reward.provinceName && reward.provinceName !== 'ทั่วประเทศ');
  const provStampsCount = isProvincial
    ? userStamps
        .filter(us => {
          const ds = districtStamps.find(d => d.stampId === us.stampId);
          return ds?.provName === reward.provinceName;
        })
        .reduce((acc, curr) => acc + curr.count, 0)
    : 0;
  const totalStamps = userStamps.reduce((acc, curr) => acc + curr.count, 0);
  const availableStamps = isProvincial ? provStampsCount : totalStamps;
  const hasEnough = availableStamps >= reward.requiredStampCount;

  const handleRedeem = async () => {
    if (isRedeeming) return;
    setIsRedeeming(true);
    setErrorMsg('');
    try {
      const res = await redeemReward(reward.rewardId);
      if (!res.success) {
        setErrorMsg(res.message);
        return;
      }
      setSuccessRedemption(res.redemption || null);
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 }
      });
    } catch (err: any) {
      setErrorMsg(err?.message || 'เกิดข้อผิดพลาดในการแลกรางวัล');
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleClose = () => {
    setSuccessRedemption(null);
    setErrorMsg('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[#07162d]/70 p-4 backdrop-blur-sm animate-fade-in"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-[380px] rounded-[28px] bg-white p-5 shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-amber-50 text-amber-600">
              <Icon name="gift" className="size-5" />
            </span>
            <div>
              <h3 className="font-bold text-sm text-slate-800">แลกรับของรางวัล OTOP</h3>
              <p className="text-[10px] text-slate-400">Digital District Stamp</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="grid size-8 place-items-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500"
          >
            <Icon name="x" className="size-4" />
          </button>
        </div>

        <div className="pt-3">
          {!successRedemption ? (
            <div className="space-y-3">
              <img
                src={reward.imageUrl}
                alt={reward.rewardName}
                className="w-full h-36 rounded-2xl object-cover border border-slate-100 shadow-xs"
              />

              <div>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                  ของดีประจำจังหวัด {reward.provinceName}
                </span>
                <h4 className="text-sm font-bold text-slate-800 mt-1">{reward.rewardName}</h4>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{reward.description}</p>
              </div>

              <div className="rounded-2xl bg-amber-50/80 p-3 border border-amber-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="grid size-8 place-items-center rounded-xl bg-amber-500 text-white font-bold">
                    {reward.requiredStampCount}
                  </span>
                  <div>
                    <span className="font-bold text-amber-950 block">แสตมป์ที่ต้องใช้</span>
                    <span className="text-[10px] text-amber-700">
                      {isProvincial
                        ? `คุณมีสะสมแสตมป์ ${reward.provinceName} ${availableStamps} ดวง`
                        : `คุณมีสะสม ${availableStamps} ดวง`}
                    </span>
                  </div>
                </div>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    hasEnough ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {hasEnough ? 'พอแลก' : `แสตมป์${isProvincial ? ` ${reward.provinceName}` : ''}ไม่พอ`}
                </span>
              </div>

              {errorMsg && (
                <p className="text-xs text-rose-600 bg-rose-50 p-2 rounded-xl border border-rose-200">
                  {errorMsg}
                </p>
              )}

              <button
                onClick={handleRedeem}
                disabled={!hasEnough || isRedeeming}
                className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all shadow-sm flex items-center justify-center gap-2 ${
                  hasEnough && !isRedeeming
                    ? 'bg-[#1769ed] hover:bg-blue-700 text-white cursor-pointer active:scale-98'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                {isRedeeming ? (
                  <>
                    <span className="size-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>กำลังบันทึกข้อมูลลงฐานข้อมูล...</span>
                  </>
                ) : (
                  <span>ยืนยันการแลกรับสิทธิ์</span>
                )}
              </button>
            </div>
          ) : (
            <div className="text-center py-2 space-y-3">
              <span className="mx-auto grid size-12 place-items-center rounded-full bg-emerald-100 text-emerald-600">
                <Icon name="check" className="size-6" />
              </span>
              <div>
                <h4 className="text-base font-bold text-slate-800">แลกรับสำเร็จ!</h4>
                <p className="text-xs text-slate-400">นำรหัสไปแสดงที่ร้านค้า OTOP</p>
              </div>

              <div className="p-3 bg-slate-900 rounded-2xl text-white">
                <span className="text-[9px] text-amber-300 uppercase tracking-widest font-bold block">
                  REDEMPTION CODE
                </span>
                <p className="text-lg font-mono font-bold text-emerald-400 mt-0.5">
                  {successRedemption.redemptionCode}
                </p>
              </div>

              <button
                onClick={handleClose}
                className="w-full py-2 bg-[#1769ed] hover:bg-blue-700 text-white rounded-xl text-xs font-bold"
              >
                เสร็จสิ้น
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

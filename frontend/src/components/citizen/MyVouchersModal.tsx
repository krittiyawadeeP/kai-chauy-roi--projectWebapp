import React from 'react';
import { StampRedemption } from '../../types';
import { Icon } from '../common/Icon';

interface MyVouchersModalProps {
  isOpen: boolean;
  onClose: () => void;
  redemptions: StampRedemption[];
}

export const MyVouchersModal: React.FC<MyVouchersModalProps> = ({
  isOpen,
  onClose,
  redemptions,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-white rounded-[32px] overflow-hidden shadow-2xl animate-scale-up max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-5 text-white flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="size-8 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-lg">
              🎁
            </span>
            <div>
              <h3 className="font-bold text-base">คูปองและของรางวัลของฉัน</h3>
              <p className="text-[11px] text-amber-100">สิทธิ์ที่แลกจากแสตมป์ชุมชน</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="size-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-sm font-bold transition"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1 space-y-3">
          {redemptions.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <span className="text-4xl block mb-2">🏷️</span>
              <p className="text-sm font-bold text-slate-600">ยังไม่มีคูปองที่แลกไว้</p>
              <p className="text-xs text-slate-400 mt-1">
                สะสมแสตมป์จากการใช้จ่าย 60/40 เพื่อแลกของรางวัล OTOP ได้เลย!
              </p>
            </div>
          ) : (
            redemptions.map(r => (
              <div
                key={r.redemptionId}
                className="bg-gradient-to-r from-amber-50/50 to-orange-50/40 border border-amber-200/80 rounded-2xl p-4 shadow-xs relative overflow-hidden"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-extrabold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                      พร้อมใช้งาน
                    </span>
                    <h4 className="font-bold text-sm text-slate-800 mt-1">{r.rewardName}</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">แลกเมื่อ: {r.redeemedAt}</p>
                  </div>
                </div>

                {/* Digital Voucher Code */}
                <div className="mt-3 bg-white p-3 rounded-xl border border-dashed border-amber-300 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">รหัสคูปอง / Barcode</span>
                    <span className="font-mono font-black text-sm text-amber-900 tracking-wider">
                      {r.redemptionCode || `THAI-REWARD-${r.redemptionId}`}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">
                    แสดงหน้าร้าน
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};

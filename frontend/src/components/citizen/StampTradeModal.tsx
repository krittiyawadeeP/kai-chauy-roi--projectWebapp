import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { DistrictStamp } from '../../types';
import { Icon } from '../common/Icon';

interface StampTradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  stamp: DistrictStamp | null;
}

export const StampTradeModal: React.FC<StampTradeModalProps> = ({
  isOpen,
  onClose,
  stamp
}) => {
  const { tradeStamp, userStamps } = useApp();
  const [recipient, setRecipient] = useState<string>('สมศรี มีโชค (เพื่อนชุมชน)');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  if (!isOpen || !stamp) return null;

  const currentCount = userStamps.find(s => s.stampId === stamp.stampId)?.count || 0;

  const handleTrade = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (currentCount <= 0) {
      setErrorMsg('คุณไม่มีแสตมป์ดวงนี้เพียงพอสำหรับการแลกเปลี่ยน');
      return;
    }
    const res = tradeStamp(stamp.stampId, recipient);
    if (!res.success) {
      setErrorMsg(res.message);
      return;
    }
    setSuccessMsg(res.message);
    setTimeout(() => {
      setSuccessMsg('');
      onClose();
    }, 1800);
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[#07162d]/70 p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[360px] rounded-[28px] bg-white p-5 shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-[#f0edff] text-[#6d55df]">
              <Icon name="repeat" className="size-5" />
            </span>
            <div>
              <h3 className="font-bold text-sm text-slate-800">แลกเปลี่ยนแสตมป์ดิจิทัล</h3>
              <p className="text-[10px] text-slate-400">Stamp Trading</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="grid size-8 place-items-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500"
          >
            <Icon name="x" className="size-4" />
          </button>
        </div>

        <form onSubmit={handleTrade} className="pt-3 space-y-3 text-xs">
          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#f8faff] border border-blue-50">
            <img
              src={stamp.imageUrl}
              alt={stamp.stampName}
              className="size-11 rounded-xl object-cover border border-slate-200"
            />
            <div>
              <p className="font-bold text-slate-800">{stamp.stampName}</p>
              <p className="text-[10px] text-[#1769ed]">คุณมีสะสม {currentCount} ดวง</p>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              ผู้รับการแลกเปลี่ยน (ชื่อ หรือ พร้อมเพย์)
            </label>
            <input
              type="text"
              required
              value={recipient}
              onChange={e => setRecipient(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1769ed]"
            />
          </div>

          {errorMsg && (
            <p className="text-xs text-rose-600 bg-rose-50 p-2 rounded-xl border border-rose-200">
              {errorMsg}
            </p>
          )}

          {successMsg && (
            <p className="text-xs text-emerald-600 bg-emerald-50 p-2 rounded-xl border border-emerald-200 font-bold">
              {successMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={currentCount <= 0}
            className="w-full py-2.5 bg-[#1769ed] hover:bg-blue-700 disabled:bg-slate-200 text-white rounded-xl font-bold transition-all shadow-sm"
          >
            ยืนยันส่งแสตมป์ 1 ดวง
          </button>
        </form>
      </div>
    </div>
  );
};

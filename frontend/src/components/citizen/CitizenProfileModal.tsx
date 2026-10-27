import React from 'react';
import { useApp } from '../../context/AppContext';
import { Icon } from '../common/Icon';

interface CitizenProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CitizenProfileModal: React.FC<CitizenProfileModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, wallet, userGrant, userStamps, logout, topupWallet } = useApp();

  if (!isOpen) return null;

  const totalStamps = userStamps.reduce((acc, curr) => acc + curr.count, 0);

  const handleLogout = () => {
    logout();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-white rounded-[32px] overflow-hidden shadow-2xl animate-scale-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header with Digital Citizen ID Card */}
        <div className="bg-gradient-to-br from-[#0c3483] via-[#1258dc] to-[#2575fc] p-5 text-white relative">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2">
              <span className="size-8 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center font-black text-sm">
                ไทย
              </span>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-blue-200 font-bold">
                  THAILAND DIGITAL CITIZEN
                </p>
                <p className="text-xs font-bold">บัตรประจำตัวประชาชนดิจิทัล</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="size-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-sm font-bold transition"
            >
              ✕
            </button>
          </div>

          <div className="flex items-center gap-3.5 my-3">
            <div className="size-16 rounded-2xl bg-white/10 border-2 border-white/40 flex items-center justify-center text-2xl font-bold overflow-hidden shadow-inner shrink-0">
              👤
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-base text-white truncate">
                {currentUser?.name || 'นายกิตติคุณ ศรีสวัสดิ์'}
              </h3>
              <p className="text-xs text-blue-200 font-mono tracking-wider mt-0.5">
                {currentUser?.citizenId || '1-1037-02948-11-2'}
              </p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-semibold text-emerald-200">ยืนยันตัวตนแล้ว</span>
                <span className="text-[10px] text-blue-200">• โทร {currentUser?.phone || '082-222-2222'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Benefits & Balances Overview */}
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {/* 60/40 Co-pay Quota */}
            <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-2xl">
              <p className="text-[11px] font-bold text-blue-900">สิทธิรัฐช่วยจ่าย 60%</p>
              <p className="text-lg font-black text-[#1058dc] mt-1">
                ฿{Number(userGrant?.remainingAmount || 0).toLocaleString()}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                จากทั้งหมด ฿{Number(userGrant?.totalGrantAmount || 0).toLocaleString()}
              </p>
            </div>

            {/* Wallet Balance */}
            <div className="p-3.5 bg-emerald-50/70 border border-emerald-100 rounded-2xl relative">
              <p className="text-[11px] font-bold text-emerald-900">กระเป๋าเงิน (จ่าย 40%)</p>
              <p className="text-lg font-black text-emerald-700 mt-1">
                ฿{Number(wallet?.balance || 0).toLocaleString()}
              </p>
              <button
                type="button"
                onClick={() => topupWallet(500)}
                className="mt-1 text-[10px] font-bold text-emerald-800 hover:text-emerald-950 underline cursor-pointer"
              >
                + เติมเงิน ฿500
              </button>
            </div>
          </div>

          {/* Stamps Summary */}
          <div className="flex items-center justify-between p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">⭐</span>
              <div>
                <p className="text-xs font-bold text-amber-900">แสตมป์ชุมชนดิจิทัล</p>
                <p className="text-[11px] text-amber-700">ใช้แลกสินค้า OTOP และส่วนลด</p>
              </div>
            </div>
            <span className="text-base font-black text-amber-900">
              {totalStamps} ดวง
            </span>
          </div>

          {/* Status info */}
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-xs space-y-1.5 text-slate-600">
            <div className="flex justify-between">
              <span>สถานะสิทธิ์โครงการ:</span>
              <span className="font-bold text-emerald-600">พร้อมใช้งาน (Active)</span>
            </div>
            <div className="flex justify-between">
              <span>ฐานข้อมูล:</span>
              <span className="font-mono text-slate-700">Cloud MySQL (Real-time)</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 space-y-2">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
            >
              <Icon name="logout" className="size-4" />
              <span>ออกจากระบบ (Sign Out)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

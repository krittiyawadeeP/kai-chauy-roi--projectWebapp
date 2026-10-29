import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { useApp } from '../../context/AppContext';
import { Icon } from '../common/Icon';

interface TopupModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultAmount?: number;
  onSuccess?: (amount: number) => void;
}

export const TopupModal: React.FC<TopupModalProps> = ({
  isOpen,
  onClose,
  defaultAmount = 300,
  onSuccess
}) => {
  const { wallet, topupWallet } = useApp();
  const [amount, setAmount] = useState<number>(defaultAmount);
  const [customInput, setCustomInput] = useState<string>('');
  const [selectedChannel, setSelectedChannel] = useState<'promptpay' | 'scb' | 'kbank' | 'ktb'>('promptpay');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  if (!isOpen) return null;

  const quickAmounts = [100, 300, 500, 1000, 2000];

  const handleSelectQuick = (val: number) => {
    setAmount(val);
    setCustomInput('');
    setErrorMsg('');
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    setCustomInput(val);
    const num = Number(val);
    if (num > 0) {
      setAmount(num);
    }
    setErrorMsg('');
  };

  const handleConfirm = async () => {
    if (amount <= 0) {
      setErrorMsg('กรุณาระบุจำนวนเงินที่ต้องการเติม');
      return;
    }
    if (amount < 20) {
      setErrorMsg('จำนวนเงินขั้นต่ำในการเติมคือ ฿20');
      return;
    }
    if (amount > 50000) {
      setErrorMsg('จำนวนเงินสูงสุดต่อครั้งคือ ฿50,000');
      return;
    }

    setErrorMsg('');
    setIsLoading(true);

    try {
      await topupWallet(amount);
      setSuccessMsg(`เติมเงินสำเร็จ +฿${amount.toLocaleString()} บาท เข้ากระเป๋าของคุณแล้ว`);
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.6 }
      });
      onSuccess?.(amount);

      setTimeout(() => {
        setIsLoading(false);
        setSuccessMsg('');
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err?.message || 'เติมเงินไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#07162d]/75 p-3 sm:p-4 backdrop-blur-sm animate-fade-in overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[390px] max-h-[92vh] rounded-[28px] bg-white p-5 shadow-2xl overflow-y-auto space-y-4 my-auto animate-scale-up overscroll-contain"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <span className="grid size-10 place-items-center rounded-2xl bg-[#eaf2ff] text-[#1769ed] shadow-xs">
              <Icon name="wallet" className="size-5" />
            </span>
            <div>
              <h3 className="font-black text-sm text-slate-800">เติมเงินเข้ากระเป๋า 40%</h3>
              <p className="text-[10px] text-slate-400">
                ยอดคงเหลือปัจจุบัน <span className="font-bold text-[#1769ed]">฿{Number(wallet?.balance || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer"
          >
            <Icon name="x" className="size-4" />
          </button>
        </div>

        {/* Quick Amount Selection */}
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-2">
            เลือกจำนวนเงินที่ต้องการเติม:
          </label>
          <div className="grid grid-cols-3 gap-2">
            {quickAmounts.map(val => (
              <button
                key={val}
                type="button"
                onClick={() => handleSelectQuick(val)}
                className={`py-2.5 px-2 rounded-2xl text-xs font-extrabold transition-all cursor-pointer border ${
                  amount === val && !customInput
                    ? 'bg-[#1769ed] text-white border-[#1769ed] shadow-md shadow-blue-500/25 scale-[1.02]'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/80'
                }`}
              >
                ฿{val.toLocaleString()}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setCustomInput(String(amount));
              }}
              className={`py-2.5 px-2 rounded-2xl text-xs font-bold transition-all cursor-pointer border ${
                customInput
                  ? 'bg-[#1769ed] text-white border-[#1769ed] shadow-md shadow-blue-500/25'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/80'
              }`}
            >
              ระบุเอง
            </button>
          </div>
        </div>

        {/* Custom Input */}
        <div>
          <label className="text-[11px] font-bold text-slate-600 block mb-1">
            หรือพิมพ์จำนวนเงินที่ต้องการ (บาท):
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-black text-sm">฿</span>
            <input
              type="text"
              inputMode="numeric"
              value={customInput || (quickAmounts.includes(amount) ? '' : amount)}
              onChange={handleCustomChange}
              placeholder={String(amount)}
              className="w-full pl-8 pr-3 py-2.5 border border-slate-200 rounded-2xl text-base font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>
        </div>

        {/* Payment Channels */}
        <div>
          <label className="text-[11px] font-bold text-slate-600 block mb-1.5">
            ช่องทางการเติมเงิน:
          </label>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => setSelectedChannel('promptpay')}
              className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                selectedChannel === 'promptpay'
                  ? 'border-blue-500 bg-blue-50/70 text-blue-900 font-bold ring-1 ring-blue-500'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className="text-base">📱</span>
              <span className="text-[11px]">พร้อมเพย์ QR</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedChannel('ktb')}
              className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                selectedChannel === 'ktb'
                  ? 'border-blue-500 bg-blue-50/70 text-blue-900 font-bold ring-1 ring-blue-500'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className="text-base">🏦</span>
              <span className="text-[11px]">Mobile Banking</span>
            </button>
          </div>
        </div>

        {/* Messages */}
        {errorMsg && (
          <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-600 text-center animate-fade-in flex items-center justify-center gap-1.5">
            <span>⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700 text-center animate-fade-in flex items-center justify-center gap-1.5">
            <span>✓</span>
            <span>{successMsg}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold transition-colors cursor-pointer"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading || !!successMsg}
            className="flex-[2] py-3 bg-[#1769ed] hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-2xl text-xs font-extrabold shadow-lg shadow-blue-500/25 transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            {isLoading ? (
              <span>กำลังทำรายการ...</span>
            ) : (
              <span>ยืนยันเติมเงิน ฿{amount.toLocaleString()}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

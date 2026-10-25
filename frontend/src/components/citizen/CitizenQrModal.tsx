import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { useApp } from '../../context/AppContext';
import { Icon } from '../common/Icon';

interface CitizenQrModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CitizenQrModal: React.FC<CitizenQrModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, wallet, userGrant } = useApp();
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState<number>(180); // 3 minutes
  const [qrToken, setQrToken] = useState<string>('');

  const formatCitizenId = (id?: string) => {
    if (!id || id.length !== 13) return id || '-';
    return `${id[0]}-${id.slice(1, 5)}-${id.slice(5, 10)}-${id.slice(10, 12)}-${id[12]}`;
  };

  const generateNewToken = () => {
    const timestamp = Date.now();
    const token = `TK-${currentUser?.userId || 0}-${timestamp}-${Math.floor(1000 + Math.random() * 9000)}`;
    const payload = JSON.stringify({
      app: 'THAI_CHAUY_THAI',
      type: 'CITIZEN_PAY_TOKEN',
      userId: currentUser?.userId,
      citizenId: currentUser?.citizenId,
      phone: currentUser?.phone,
      remainingGrant: userGrant.remainingAmount,
      walletBalance: wallet.balance,
      token,
      issuedAt: timestamp,
    });

    setQrToken(token);
    QRCode.toDataURL(payload, {
      width: 260,
      margin: 1.5,
      color: {
        dark: '#0c2e68',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then(url => setQrDataUrl(url))
      .catch(err => console.error('Failed to generate QR Code:', err));

    setTimeLeft(180);
  };

  // Generate on open
  useEffect(() => {
    if (isOpen) {
      generateNewToken();
    }
  }, [isOpen, currentUser?.userId]);

  // Countdown timer
  useEffect(() => {
    if (!isOpen) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          generateNewToken();
          return 180;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[#07162d]/75 p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[370px] rounded-[28px] bg-white p-5 text-center shadow-2xl relative overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header decoration */}
        <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-[#1769ed] via-[#5088f3] to-amber-400" />

        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-xl bg-blue-50 text-[#1769ed]">
              <Icon name="qr" className="size-4" />
            </span>
            <div className="text-left">
              <h3 className="font-bold text-sm text-slate-800">QR รับสิทธิ์ของฉัน</h3>
              <p className="text-[10px] text-slate-400">โครงการไทยช่วยไทยพลีส (60/40)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="grid size-7 place-items-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"
          >
            <Icon name="x" className="size-3.5" />
          </button>
        </div>

        {/* Status Pill */}
        <div className="mt-3.5 flex items-center justify-center gap-1.5">
          <span className="relative flex size-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full size-2 bg-emerald-500" />
          </span>
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
            พร้อมใช้งาน • สิทธิ์รัฐช่วยจ่าย 60%
          </span>
        </div>

        {/* Real Dynamic QR Code Display */}
        <div className="my-4 mx-auto w-fit p-3 bg-white rounded-2xl border-2 border-blue-100 shadow-md relative group">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="Citizen Co-Pay QR Code"
              className="size-52 object-contain rounded-lg mx-auto"
            />
          ) : (
            <div className="size-52 grid place-items-center bg-slate-50 rounded-lg">
              <div className="animate-spin size-8 border-3 border-[#1769ed] border-t-transparent rounded-full" />
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="grid size-9 place-items-center rounded-lg bg-[#1769ed] text-white text-xs font-extrabold shadow-md border-2 border-white">
              ไทย
            </div>
          </div>
        </div>

        {/* Citizen Info */}
        <div className="space-y-1">
          <p className="font-bold text-slate-800 text-sm">
            {currentUser?.name || (currentUser?.phone ? `คุณ (${currentUser.phone})` : 'ประชาชนผู้ใช้สิทธิ์')}
          </p>
          <p className="text-xs text-slate-500 font-mono">
            เลขบัตรประชาชน: {formatCitizenId(currentUser?.citizenId)}
          </p>
          {currentUser?.phone && (
            <p className="text-[11px] text-slate-400">
              เบอร์โทร: {currentUser.phone}
            </p>
          )}
        </div>

        {/* Balance & Grant Summary */}
        <div className="mt-3.5 grid grid-cols-2 gap-2 bg-[#f8faff] p-2.5 rounded-2xl border border-blue-50 text-left">
          <div className="bg-white p-2 rounded-xl border border-slate-100">
            <span className="text-[10px] text-slate-400 block font-medium">สิทธิ์รัฐ 60% คงเหลือ</span>
            <span className="text-xs font-extrabold text-emerald-600">
              ฿ {userGrant.remainingAmount.toLocaleString()}
            </span>
          </div>
          <div className="bg-white p-2 rounded-xl border border-slate-100">
            <span className="text-[10px] text-slate-400 block font-medium">เงินในกระเป๋า (40%)</span>
            <span className="text-xs font-extrabold text-[#123b84]">
              ฿ {wallet.balance.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Countdown & Refresh */}
        <div className="mt-3.5 flex items-center justify-between text-xs px-1">
          <span className="text-[11px] text-slate-400">
            รีเฟรชใน <strong className="text-[#1769ed] font-mono">{timeFormatted}</strong> นาที
          </span>
          <button
            type="button"
            onClick={generateNewToken}
            className="text-[11px] font-bold text-[#1769ed] hover:text-blue-700 flex items-center gap-1 cursor-pointer"
          >
            <span>รีเฟรช QR ทันที</span>
            <span>⟳</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-xl bg-slate-100 hover:bg-slate-200 py-2.5 text-xs font-bold text-slate-700 transition-colors"
        >
          ปิดหน้าต่าง
        </button>
      </div>
    </div>
  );
};

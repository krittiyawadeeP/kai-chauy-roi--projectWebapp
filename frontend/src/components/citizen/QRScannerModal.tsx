import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { useApp } from '../../context/AppContext';
import { Merchant, DistrictStamp } from '../../types';
import { Icon } from '../common/Icon';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  presetMerchantId?: number;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  presetMerchantId
}) => {
  const { merchants, executePayment, wallet, userGrant, missions, districtStamps } = useApp();

  const [step, setStep] = useState<'scan' | 'confirm' | 'success'>('scan');
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null);
  const [amount, setAmount] = useState<number>(200);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [awardedStamp, setAwardedStamp] = useState<DistrictStamp | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      if (presetMerchantId) {
        const m = merchants.find(item => item.mchId === presetMerchantId);
        if (m) {
          setSelectedMerchant(m);
          setStep('confirm');
          return;
        }
      }
      setStep('scan');
      setSelectedMerchant(merchants[0] || null);
    }
  }, [isOpen, presetMerchantId, merchants]);

  useEffect(() => {
    if (!isOpen && videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      setCameraActive(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const startCamera = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          setCameraActive(true);
        }
      }
    } catch {
      setCameraActive(false);
    }
  };

  const govPays = Math.round(amount * userGrant.govPayRatio * 100) / 100;
  const userPays = (Math.round(amount * 100) - Math.round(govPays * 100)) / 100;

  const matchingMission = selectedMerchant
    ? missions.find(
        m =>
          m.status === 'active' &&
          (m.targetMerchantId === selectedMerchant.mchId || m.targetDistId === selectedMerchant.distId) &&
          amount >= m.minSpend
      )
    : null;

  const previewStamp = matchingMission
    ? districtStamps.find(s => s.stampId === matchingMission.rewardStampId)
    : amount >= 150 && selectedMerchant
    ? districtStamps.find(s => s.distId === selectedMerchant.distId) || districtStamps[0]
    : null;

  const handleConfirmPay = () => {
    if (!selectedMerchant) return;
    setErrorMsg('');

    const res = executePayment({
      merchantId: selectedMerchant.mchId,
      totalAmount: amount,
      note: `ชำระเงินสิทธิ์ 60/40 ณ ร้าน ${selectedMerchant.shopName}`
    });

    if (!res.success) {
      setErrorMsg(res.message);
      return;
    }

    if (res.earnedStamp) {
      setAwardedStamp(res.earnedStamp);
    }

    setStep('success');
    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.6 }
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[#07162d]/70 p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[390px] rounded-[28px] bg-white p-5 shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-[#eaf2ff] text-[#1769ed]">
              <Icon name="scan" className="size-5" />
            </span>
            <div>
              <h3 className="font-bold text-sm text-slate-800">สแกน QR ชำระเงิน (60/40)</h3>
              <p className="text-[10px] text-slate-400">โครงการไทยช่วยไทยพลีส</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="grid size-8 place-items-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500"
          >
            <Icon name="x" className="size-4" />
          </button>
        </div>

        {/* STEP 1: SCANNER */}
        {step === 'scan' && (
          <div className="pt-4 flex flex-col items-center">
            {/* Viewfinder box */}
            <div className="relative size-60 rounded-[24px] bg-slate-900 overflow-hidden flex items-center justify-center border-2 border-[#1769ed] shadow-lg mb-3">
              {cameraActive ? (
                <video ref={videoRef} className="w-full h-full object-cover" />
              ) : (
                <div className="text-center p-4">
                  <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-white/10 text-white mb-2">
                    <Icon name="scan" className="size-6 animate-pulse" />
                  </span>
                  <p className="text-[11px] text-slate-300">หันกล้องไปที่ QR ร้านค้า</p>
                  <button
                    onClick={startCamera}
                    className="mt-2 text-[10px] bg-[#1769ed] hover:bg-blue-600 text-white px-3 py-1 rounded-full font-bold transition-all"
                  >
                    เปิดกล้องถ่ายจริง
                  </button>
                </div>
              )}

              {/* Laser line */}
              <div className="absolute inset-x-4 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_10px_#38bdf8] animate-bounce pointer-events-none" />
            </div>

            <p className="text-[11px] text-slate-400 mb-3">รองรับมาตรฐาน Thai QR & PromptPay</p>

            {/* Quick Demo Shop Presets */}
            <div className="w-full border-t border-slate-100 pt-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                เลือกร้านค้าจำลองเพื่อทดสอบสแกน:
              </span>
              <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                {merchants.filter(m => m.status === 'approved').map(shop => (
                  <button
                    key={shop.mchId}
                    onClick={() => {
                      setSelectedMerchant(shop);
                      setAmount(200);
                      setStep('confirm');
                    }}
                    className="w-full text-left p-2.5 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-[#f8faff] transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2.5">
                      <img
                        src={shop.imageUrl}
                        alt={shop.shopName}
                        className="size-9 rounded-lg object-cover border border-slate-100"
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-800 group-hover:text-[#1769ed]">
                          {shop.shopName}
                        </p>
                        <p className="text-[10px] text-slate-400">{shop.category}</p>
                      </div>
                    </div>
                    <Icon name="chevron" className="size-4 text-slate-300 group-hover:text-[#1769ed]" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: CONFIRM */}
        {step === 'confirm' && selectedMerchant && (
          <div className="pt-4 space-y-3.5">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#f8faff] border border-blue-50">
              <img
                src={selectedMerchant.imageUrl}
                alt={selectedMerchant.shopName}
                className="size-12 rounded-xl object-cover border border-slate-100"
              />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-xs text-slate-800 line-clamp-1">{selectedMerchant.shopName}</p>
                <p className="text-[10px] text-slate-400">{selectedMerchant.category}</p>
                <p className="text-[10px] text-[#1769ed] font-medium mt-0.5">
                  พร้อมเพย์: {selectedMerchant.promptpayId}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                ยอดรวมราคาสินค้า (บาท)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">฿</span>
                <input
                  type="number"
                  min="20"
                  step="10"
                  value={amount}
                  onChange={e => setAmount(Math.max(1, Number(e.target.value)))}
                  className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl font-bold text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1769ed]"
                />
              </div>

              {/* Quick Chips */}
              <div className="flex gap-1.5 mt-2">
                {[100, 150, 200, 300, 500].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAmount(val)}
                    className={`flex-1 py-1 text-xs rounded-lg font-bold transition-colors ${
                      amount === val
                        ? 'bg-[#1769ed] text-white'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    ฿{val}
                  </button>
                ))}
              </div>
            </div>

            {/* Split Calculation */}
            <div className="rounded-2xl bg-[#eaf2ff] p-3.5 text-xs space-y-2 border border-blue-100">
              <div className="flex justify-between items-center text-slate-700 pb-1.5 border-b border-blue-200/60 font-semibold">
                <span>สรุปการแบ่งจ่าย 60/40</span>
                <span>ยอดรวม ฿{amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">คุณชำระ ({Number((userGrant.userPayRatio * 100).toFixed(2))}%):</span>
                <strong className="text-base text-[#123b84]">฿ {userPays.toLocaleString()}</strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">รัฐช่วยจ่าย ({Number((userGrant.govPayRatio * 100).toFixed(2))}%):</span>
                <strong className="text-base text-emerald-600">฿ {govPays.toLocaleString()}</strong>
              </div>
            </div>

            {/* Stamp bonus hint */}
            {previewStamp && (
              <div className="rounded-xl bg-amber-50 p-2.5 border border-amber-200 flex items-center gap-2 text-xs text-amber-900">
                <span className="grid size-7 place-items-center rounded-lg bg-amber-500 text-white shrink-0">
                  <Icon name="award" className="size-4" />
                </span>
                <span className="text-[11px] leading-tight">
                  ยอดเกิน ฿150 รับ <strong className="font-bold">{previewStamp.stampName}</strong> ฟรี 1 ดวง
                </span>
              </div>
            )}

            {errorMsg && (
              <p className="text-xs text-rose-600 bg-rose-50 p-2 rounded-xl border border-rose-200">
                {errorMsg}
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setStep('scan')}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                ย้อนกลับ
              </button>
              <button
                onClick={handleConfirmPay}
                className="flex-[2] py-2.5 bg-[#1769ed] hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20"
              >
                ยืนยันชำระ ฿{userPays.toLocaleString()}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: SUCCESS */}
        {step === 'success' && selectedMerchant && (
          <div className="pt-4 text-center space-y-3">
            <span className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-100 text-emerald-600">
              <Icon name="check" className="size-8" />
            </span>
            <div>
              <h4 className="text-base font-bold text-slate-800">ชำระเงินสำเร็จแล้ว!</h4>
              <p className="text-xs text-slate-400 mt-0.5">
                ร้าน {selectedMerchant.shopName} ได้รับยอดชำระแล้ว
              </p>
            </div>

            <div className="rounded-2xl bg-[#f8faff] p-3 text-xs text-left space-y-1.5 border border-slate-100">
              <div className="flex justify-between text-slate-500">
                <span>ยอดรวม</span>
                <span className="font-bold text-slate-800">฿{amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>คุณจ่าย ({Number((userGrant.userPayRatio * 100).toFixed(2))}%)</span>
                <span className="font-bold text-[#1769ed]">฿{userPays.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>รัฐช่วยจ่าย ({Number((userGrant.govPayRatio * 100).toFixed(2))}%)</span>
                <span className="font-bold text-emerald-600">฿{govPays.toLocaleString()}</span>
              </div>
            </div>

            {awardedStamp && (
              <div className="rounded-2xl bg-amber-50 border border-amber-200 p-2.5 flex items-center gap-2.5 text-left">
                <img
                  src={awardedStamp.imageUrl}
                  alt={awardedStamp.stampName}
                  className="size-11 rounded-xl object-cover border border-amber-300"
                />
                <div>
                  <span className="text-[10px] font-bold text-amber-700">ได้รับแสตมป์ดิจิทัล!</span>
                  <p className="text-xs font-bold text-slate-800">{awardedStamp.stampName}</p>
                </div>
              </div>
            )}

            <button
              onClick={onClose}
              className="w-full py-2.5 bg-[#1769ed] hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20"
            >
              เสร็จสิ้น
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

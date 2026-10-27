import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Icon } from '../common/Icon';
import { QRCodeDisplay } from '../common/QRCodeDisplay';
import { ApiError } from '../../services/api';
import { ApiSale, merchantService } from '../../services/merchantService';

interface QRGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DAILY_SUBSIDY_LIMIT = 200;

export const QRGeneratorModal: React.FC<QRGeneratorModalProps> = ({ isOpen, onClose }) => {
  const { currentMerchant, missions, refreshMerchantData, userGrant } = useApp();
  const [amount, setAmount] = useState<number | ''>(200);
  const [downloadSuccess, setDownloadSuccess] = useState<string>('');
  const [userId, setUserId] = useState('');
  const [saleError, setSaleError] = useState('');
  const [saleResult, setSaleResult] = useState<ApiSale | null>(null);
  const [savingSale, setSavingSale] = useState(false);
  const qrContainerRef = useRef<HTMLDivElement | null>(null);

  const resetForm = () => {
    setAmount(200);
    setDownloadSuccess('');
    setUserId('');
    setSaleError('');
    setSaleResult(null);
    setSavingSale(false);
  };

  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen || !currentMerchant) return null;

  const numericAmount = typeof amount === 'number' ? amount : 0;
  const rawGovPays = Math.round(numericAmount * userGrant.govPayRatio * 100) / 100;
  const isCappedByDaily = rawGovPays > DAILY_SUBSIDY_LIMIT;
  const govPays = saleResult
    ? Number(saleResult.Gov_Subsidized_Amount)
    : Math.min(rawGovPays, DAILY_SUBSIDY_LIMIT, userGrant.remainingAmount);
  const userPays = saleResult
    ? Number(saleResult.User_Paid_Amount)
    : (Math.round(numericAmount * 100) - Math.round(govPays * 100)) / 100;

  const activeMission = missions.find(
    m => m.status === 'active' && m.targetMerchantId === currentMerchant.mchId
  );

  const qrPayload = JSON.stringify({
    app: 'thai-chuay-thai-please',
    scheme: 'co-payment',
    mchId: currentMerchant.mchId,
    shopName: currentMerchant.shopName,
    amount: numericAmount,
    userShare: userPays,
    govShare: govPays,
    missionId: activeMission?.missionId || null,
    timestamp: Date.now()
  });

  const handleSaveQrImage = () => {
    const canvas = qrContainerRef.current?.querySelector('canvas') || document.querySelector('canvas');
    if (!canvas) {
      setDownloadSuccess('ไม่พบรูปภาพ QR Code');
      setTimeout(() => setDownloadSuccess(''), 2500);
      return;
    }

    try {
      const imageUri = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = imageUri;
      link.download = `QR_${currentMerchant.shopName || 'ร้านค้า'}_${numericAmount || 0}บาท.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setDownloadSuccess('ดาวน์โหลดภาพ QR Code (.png) สำเร็จแล้ว');
      setTimeout(() => setDownloadSuccess(''), 2500);
    } catch (err) {
      console.error('Save QR error', err);
      setDownloadSuccess('ดาวน์โหลดไม่สำเร็จ กรุณาลองใหม่');
      setTimeout(() => setDownloadSuccess(''), 2500);
    }
  };

  const handleShare = async () => {
    const canvas = qrContainerRef.current?.querySelector('canvas') || document.querySelector('canvas');
    if (!canvas) return;

    if (navigator.share && navigator.canShare) {
      try {
        canvas.toBlob(async blob => {
          if (!blob) {
            handleSaveQrImage();
            return;
          }
          const file = new File([blob], `QR_${numericAmount}บาท.png`, { type: 'image/png' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: `QR ชำระเงิน ${currentMerchant.shopName}`,
              text: `ชำระเงินค่าสินค้า ฿${numericAmount} ณ ร้าน ${currentMerchant.shopName}`,
              files: [file]
            });
          } else {
            handleSaveQrImage();
          }
        }, 'image/png');
        return;
      } catch (err) {
        console.warn('Share error or cancelled', err);
      }
    } else {
      handleSaveQrImage();
    }
  };

  const handleRecordSale = async () => {
    setSavingSale(true);
    setSaleError('');
    try {
      const result = await merchantService.recordSale({
        User_ID: Number(userId),
        Total_Amount: numericAmount,
        District_ID: currentMerchant.distId,
      }) as ApiSale;
      setSaleResult(result);
      await refreshMerchantData();
    } catch (error) {
      setSaleError(error instanceof ApiError && error.status === 401 ? 'กรุณาเข้าสู่ระบบด้วยบัญชีร้านค้าก่อนบันทึกยอดขาย' : error instanceof Error ? error.message : 'บันทึกยอดขายไม่สำเร็จ');
    } finally {
      setSavingSale(false);
    }
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
            <span className="grid size-9 place-items-center rounded-xl bg-[#eaf2ff] text-[#1769ed]">
              <Icon name="qr" className="size-5" />
            </span>
            <div>
              <h3 className="font-bold text-sm text-slate-800">สร้าง QR Code รับเงิน</h3>
              <p className="text-[10px] text-slate-400">
                รัฐช่วย {Number((userGrant.govPayRatio * 100).toFixed(2))}% (สูงสุด ฿{DAILY_SUBSIDY_LIMIT}/วัน) · ลูกค้าจ่ายส่วนที่เหลือ
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="grid size-8 place-items-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 cursor-pointer"
          >
            <Icon name="x" className="size-4" />
          </button>
        </div>

        <div className="pt-3 space-y-3">
          <div className="p-2.5 rounded-xl bg-[#f8faff] border border-blue-50 text-xs flex items-center justify-between">
            <span className="font-bold text-slate-800">{currentMerchant.shopName}</span>
            <span className="text-[#1769ed] text-[11px]">รับเข้ากระเป๋าร้านค้า</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              ระบุยอดเงินที่ต้องการเรียกเก็บ (บาท)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">฿</span>
              <input
                type="number"
                min="1"
                step="10"
                placeholder="0"
                value={amount}
                onChange={e => {
                  const val = e.target.value;
                  if (val === '') {
                    setAmount('');
                  } else {
                    const parsed = Number(val);
                    setAmount(isNaN(parsed) ? '' : parsed);
                  }
                }}
                onBlur={() => {
                  if (amount === '' || amount <= 0) {
                    setAmount(10);
                  }
                }}
                className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl font-bold text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1769ed]"
              />
            </div>

            <div className="flex gap-1.5 mt-2">
              {[80, 150, 200, 300, 500].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAmount(val)}
                  className={`flex-1 py-1 text-xs rounded-lg font-bold transition-colors cursor-pointer ${amount === val
                      ? 'bg-[#1769ed] text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                >
                  ฿{val}
                </button>
              ))}
            </div>
          </div>

          {/* QR Code Display Canvas */}
          <div ref={qrContainerRef} className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50 border border-slate-200">
            <QRCodeDisplay value={qrPayload} size={160} />
            <p className="font-extrabold text-sm text-slate-800 mt-2">
              ยอดรวมเรียกเก็บ: ฿{numericAmount.toLocaleString()}
            </p>
          </div>

          {/* Calculation */}
          <div className="rounded-xl bg-[#eaf2ff] p-2.5 text-xs space-y-1.5 border border-blue-100">
            <div className="flex justify-between text-slate-600">
              <span>ลูกค้าชำระ (ประมาณการ):</span>
              <strong className="text-[#123b84]">฿ {userPays.toLocaleString()}</strong>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>เงินอุดหนุนจากรัฐ ({Number((userGrant.govPayRatio * 100).toFixed(2))}%):</span>
              <strong className="text-emerald-600">฿ {govPays.toLocaleString()}</strong>
            </div>
            {isCappedByDaily && !saleResult && (
              <div className="pt-1 border-t border-blue-200/50 text-[10px] text-amber-700 flex items-center gap-1 font-medium">
                <span>⚠️ รัฐช่วยสูงสุดไม่เกิน ฿{DAILY_SUBSIDY_LIMIT}/วัน ส่วนเกินลูกค้าชำระเพิ่ม</span>
              </div>
            )}
            <div className="text-[10px] text-slate-400">
              * ยอดชำระจริงขึ้นอยู่กับสิทธิ์คงเหลือประจำวันของลูกค้า ณ ขณะสแกน
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-3 space-y-2">
            <label className="block text-xs font-bold text-slate-700" htmlFor="sale-user-id">User_ID ลูกค้าเพื่อบันทึกยอดขาย</label>
            <input id="sale-user-id" type="number" min="1" value={userId} onChange={e => setUserId(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2" placeholder="ตัวอย่าง 2" />
            <p className="text-[10px] text-slate-500">User_ID คือเลขประจำตัวผู้ใช้ในฐานข้อมูล ทดสอบด้วยบัญชีลูกค้าที่มีอยู่จริง</p>
            {saleError && <p role="alert" className="text-xs text-rose-700">{saleError}</p>}
            {saleResult && <p role="status" className="text-xs text-emerald-700">บันทึกบิล #{saleResult.Tx_ID} แล้ว · ลูกค้าจ่าย ฿{Number(saleResult.User_Paid_Amount).toFixed(2)} · รัฐช่วย ฿{Number(saleResult.Gov_Subsidized_Amount).toFixed(2)}</p>}
            <button type="button" onClick={handleRecordSale} disabled={savingSale || !Number(userId) || numericAmount <= 0} className="w-full rounded-xl bg-[#115e59] py-2.5 text-xs font-bold text-white disabled:opacity-50 cursor-pointer">{savingSale ? 'กำลังบันทึก…' : 'ยืนยันและบันทึกยอดขาย'}</button>
          </div>

          {downloadSuccess && (
            <p className="text-center text-xs text-emerald-600 font-bold bg-emerald-50 py-1.5 rounded-lg border border-emerald-200">
              ✓ {downloadSuccess}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSaveQrImage}
              className="flex-1 py-2.5 bg-[#1769ed] hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Icon name="qr" className="size-4" />
              <span>บันทึกรูป QR</span>
            </button>
            <button
              onClick={handleShare}
              className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
            >
              แชร์
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

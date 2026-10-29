import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import jsQR from 'jsqr';
import { useApp } from '../../context/AppContext';
import { Merchant, DistrictStamp } from '../../types';
import { Icon } from '../common/Icon';
import { citizenService, type StampRule } from '../../services/citizenService';
import { PinPad } from '../common/PinPad';
import { TopupModal } from './TopupModal';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  presetMerchantId?: number;
  presetMissionId?: number;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  presetMerchantId,
  presetMissionId,
}) => {
  const { merchants, executePayment, wallet, userGrant, topupWallet, transactions, currentUser, userStamps, districtStamps, missions, aiTargetShops, setMerchants } = useApp();

  const [step, setStep] = useState<'scan' | 'confirm' | 'pin' | 'success'>('scan');
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null);
  const [scannedMissionId, setScannedMissionId] = useState<number | null>(presetMissionId ?? null);
  const [amount, setAmount] = useState<number>(200);
  const [selectedStamps, setSelectedStamps] = useState<Record<number, number>>({});
  const [topupModalOpen, setTopupModalOpen] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [awardedStamp, setAwardedStamp] = useState<DistrictStamp | null>(null);
  const [awardedStampCount, setAwardedStampCount] = useState(0);
  const [stampRule, setStampRule] = useState<StampRule | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [isPaying, setIsPaying] = useState<boolean>(false);
  const [topupSuccess, setTopupSuccess] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const isScanningFrameRef = useRef<boolean>(false);

  // Universal lookup across merchants, aiTargetShops, and missions
  const findMerchantAnywhere = (id: number): Merchant | null => {
    const m = merchants.find(item => item.mchId === id);
    if (m) return m;

    const ai = aiTargetShops.find(item => item.merchantId === id);
    if (ai) {
      return {
        mchId: ai.merchantId,
        userId: 0,
        shopName: ai.merchantName,
        category: (ai.category as any) || 'ร้านค้าชุมชน',
        address: `${ai.districtName} ${ai.provinceName}`,
        lat: null,
        lng: null,
        distId: ai.distId || ai.provinceId || currentUser.distId || 1201,
        provId: ai.provId || ai.provinceId || currentUser.provId || 12,
        ownerName: 'ผู้ประกอบการ',
        phone: '',
        status: 'approved',
        registeredAt: new Date().toISOString(),
        imageUrl: ai.imageUrl || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&auto=format&fit=crop&q=80',
        promptpayId: '',
        dailyAvgSales: 0,
        currentDailySales: 0,
        isAiTarget: true,
      };
    }

    const ms = missions.find(item => item.targetMerchantId === id);
    if (ms) {
      return {
        mchId: ms.targetMerchantId || id,
        userId: 0,
        shopName: ms.targetMerchantName || `ร้านค้าภารกิจ #${ms.missionId}`,
        category: (ms.category as any) || 'ของใช้ทั่วไป',
        address: 'ร้านค้าในโครงการ',
        lat: null,
        lng: null,
        distId: ms.targetDistId || currentUser.distId || 1201,
        provId: ms.targetProvId || currentUser.provId || 12,
        ownerName: 'ผู้ประกอบการ',
        phone: '',
        status: 'approved',
        registeredAt: new Date().toISOString(),
        imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&auto=format&fit=crop&q=80',
        promptpayId: '',
        dailyAvgSales: 0,
        currentDailySales: 0,
        isAiTarget: Boolean(ms.isAiMission),
      };
    }

    return null;
  };

  const findMissionAnywhere = (mId: number): { missionId: number; missionName: string; targetMerchantId?: number; minSpend?: number | null } | null => {
    const m = missions.find(item => item.missionId === mId);
    if (m) return m;

    const ai = aiTargetShops.find(item => item.analysisId === mId || item.missionId === mId);
    if (ai) {
      return {
        missionId: ai.analysisId || ai.missionId || mId,
        missionName: ai.missionTitle,
        targetMerchantId: ai.merchantId,
        minSpend: 0,
      };
    }

    return null;
  };

  const stopCamera = () => {
    isScanningFrameRef.current = false;
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setTopupSuccess('');
      setIsPaying(false);
      setAwardedStamp(null);
      setAwardedStampCount(0);
      setSelectedStamps({});
      setScannedMissionId(presetMissionId ?? null);
      if (presetMerchantId) {
        const m = findMerchantAnywhere(presetMerchantId);
        if (m) {
          setSelectedMerchant(m);
          setStep('confirm');
          return;
        }
      }
      setStep('scan');
      setSelectedMerchant(null);
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, presetMerchantId, presetMissionId, merchants, aiTargetShops, missions]);

  useEffect(() => {
    let active = true;
    setStampRule(null);
    if (!isOpen || !selectedMerchant) return;
    citizenService.getStampRule(selectedMerchant.distId)
      .then(rule => { if (active) setStampRule(rule); })
      .catch(() => { /* Payment still checks the current rule on the server. */ });
    return () => { active = false; };
  }, [isOpen, selectedMerchant?.distId]);

  // Support Ctrl+V paste image from clipboard
  useEffect(() => {
    if (!isOpen || step !== 'scan') return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            processImageFile(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen, step]);

  if (!isOpen) return null;

  const handleDetectedCode = (rawText: string) => {
    setErrorMsg('');
    const text = rawText.trim();
    if (!text) {
      setErrorMsg('ไม่พบข้อมูลใน QR Code');
      return;
    }

    // 1. Try JSON payload (generated by merchant QR)
    let parsed: any = null;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
        parsed = null;
      }
    }

    if (parsed && typeof parsed === 'object') {
      // Mission field in QR:
      // When outside mission: 'mission' is null
      // When inside mission: 'mission' is the mission ID (number)
      const rawMission = parsed.mission !== undefined ? parsed.mission : (parsed.missionId !== undefined ? parsed.missionId : parsed.Mission_ID);
      const missionNum = rawMission !== null && rawMission !== undefined && rawMission !== '' && !isNaN(Number(rawMission))
        ? Number(rawMission)
        : null;

      const missionObj = missionNum ? findMissionAnywhere(missionNum) : null;
      let parsedMchId = Number(parsed.mchId || parsed.merchantId || parsed.Mch_ID || parsed.shopId || 0);
      if ((!parsedMchId || isNaN(parsedMchId)) && missionObj?.targetMerchantId) {
        parsedMchId = missionObj.targetMerchantId;
      }

      const found = findMerchantAnywhere(parsedMchId);
      if (found) {
        setSelectedMerchant(found);
        if (!merchants.some(m => m.mchId === found.mchId)) {
          setMerchants(prev => (prev.some(m => m.mchId === found.mchId) ? prev : [...prev, found]));
        }
        setScannedMissionId(missionNum || (missionObj ? missionObj.missionId : null));
        if (typeof parsed.amount === 'number' && parsed.amount > 0) {
          setAmount(parsed.amount);
        } else {
          setAmount(200);
        }
        setStep('confirm');
        return;
      }

      // If merchant is not yet in merchants array, synthesize merchant from mission or QR payload
      if (missionObj || parsed.shopName) {
        let shopDistId = Number(parsed.distId || parsed.districtId || 0);
        let shopProvId = Number(parsed.provId || parsed.provinceId || 0);
        const shopNameText = String(parsed.shopName || '');
        if (!shopProvId) {
          if (shopNameText.includes('สตูล')) { shopProvId = 91; shopDistId = 9101; }
          else if (shopNameText.includes('นครปฐม')) { shopProvId = 73; shopDistId = 7301; }
          else if (shopNameText.includes('เชียงใหม่')) { shopProvId = 50; shopDistId = 5001; }
          else if (shopNameText.includes('นนทบุรี')) { shopProvId = 12; shopDistId = 1201; }
          else if (shopNameText.includes('กรุงเทพ')) { shopProvId = 10; shopDistId = 1001; }
          else {
            shopProvId = currentUser.provId || 12;
            shopDistId = currentUser.distId || 1201;
          }
        }

        const fallbackMch: Merchant = {
          mchId: parsedMchId || missionNum || 1,
          userId: 0,
          shopName: missionObj?.missionName ? `ร้านค้า: ${missionObj.missionName}` : (parsed.shopName || `ร้านค้าภารกิจ #${missionNum || 1}`),
          category: 'ของใช้ทั่วไป',
          address: 'ร้านค้าในโครงการ',
          lat: null,
          lng: null,
          distId: shopDistId,
          provId: shopProvId,
          ownerName: 'ผู้ประกอบการ',
          phone: parsed.phone || '',
          status: 'approved',
          registeredAt: new Date().toISOString(),
          imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&auto=format&fit=crop&q=80',
          promptpayId: parsed.promptpayId || '',
          dailyAvgSales: 0,
          currentDailySales: 0,
          isAiTarget: false,
        };
        setSelectedMerchant(fallbackMch);
        setMerchants(prev => (prev.some(m => m.mchId === fallbackMch.mchId) ? prev : [...prev, fallbackMch]));
        setScannedMissionId(missionNum || (missionObj ? missionObj.missionId : null));
        if (typeof parsed.amount === 'number' && parsed.amount > 0) {
          setAmount(parsed.amount);
        } else {
          setAmount(200);
        }
        setStep('confirm');
        return;
      }
    }

    // 2. Try URL query parameter e.g. mission=1 or mchId=1
    const missionParamMatch = text.match(/(?:mission|missionId|Mission_ID)=([0-9]+)/i);
    if (missionParamMatch) {
      const mId = Number(missionParamMatch[1]);
      setScannedMissionId(mId);
      const mObj = findMissionAnywhere(mId);
      if (mObj?.targetMerchantId) {
        const found = findMerchantAnywhere(mObj.targetMerchantId);
        if (found) {
          setSelectedMerchant(found);
          if (!merchants.some(m => m.mchId === found.mchId)) {
            setMerchants(prev => (prev.some(m => m.mchId === found.mchId) ? prev : [...prev, found]));
          }
          setAmount(200);
          setStep('confirm');
          return;
        }
      }
    }

    const match = text.match(/(?:mchId|merchantId|shopId)=([0-9]+)/i);
    if (match) {
      const id = Number(match[1]);
      const found = findMerchantAnywhere(id);
      if (found) {
        setSelectedMerchant(found);
        if (!merchants.some(m => m.mchId === found.mchId)) {
          setMerchants(prev => (prev.some(m => m.mchId === found.mchId) ? prev : [...prev, found]));
        }
        setAmount(200);
        setStep('confirm');
        return;
      }
    }

    // 3. Try direct numeric ID
    if (/^\d+$/.test(text)) {
      const id = Number(text);
      const found = findMerchantAnywhere(id);
      if (found) {
        setSelectedMerchant(found);
        if (!merchants.some(m => m.mchId === found.mchId)) {
          setMerchants(prev => (prev.some(m => m.mchId === found.mchId) ? prev : [...prev, found]));
        }
        setAmount(200);
        setStep('confirm');
        return;
      }
    }

    // 4. Try matching shop name, promptpay, or phone
    const foundByNameOrPhone = merchants.find(m =>
      m.shopName.toLowerCase().includes(text.toLowerCase()) ||
      (m.phone && m.phone.replace(/\D/g, '') === text.replace(/\D/g, '')) ||
      (m.promptpayId && m.promptpayId.replace(/\D/g, '') === text.replace(/\D/g, ''))
    ) || aiTargetShops.find(a =>
      a.merchantName.toLowerCase().includes(text.toLowerCase())
    );
    if (foundByNameOrPhone) {
      const mch = 'mchId' in foundByNameOrPhone ? foundByNameOrPhone : findMerchantAnywhere(foundByNameOrPhone.merchantId);
      if (mch) {
        setSelectedMerchant(mch);
        setAmount(200);
        setStep('confirm');
        return;
      }
    }

    // Fallback: If QR is recognized from our app or valid format, match first merchant
    if (merchants.length > 0) {
      setSelectedMerchant(merchants[0]);
      setAmount(200);
      setStep('confirm');
      return;
    }

    setErrorMsg(`ไม่พบร้านค้าที่ตรงกับ QR Code (${text.slice(0, 30)}...)`);
  };

  const decodeQRFromCanvasSource = async (
    source: CanvasImageSource,
    sourceWidth: number,
    sourceHeight: number
  ): Promise<string | null> => {
    if (!sourceWidth || !sourceHeight) return null;

    // Strategy 1: Native BarcodeDetector API (built into Chromium/Edge/Android)
    try {
      const BarcodeDetectorClass = (window as any).BarcodeDetector;
      if (BarcodeDetectorClass) {
        const detector = new BarcodeDetectorClass({ formats: ['qr_code'] });
        const results = await detector.detect(source);
        if (results && results.length > 0 && results[0].rawValue) {
          return results[0].rawValue.trim();
        }
      }
    } catch (_) {
      // Fall through to jsQR multi-scale canvas
    }

    // Strategy 2: Multi-scale Canvas rendering with jsQR
    // 160x160 QR codes with dense modules require bilinear upscaling (1.5x / 2x / 2.5x)
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    const attempts = [
      { scale: 1.5, pad: 0 },
      { scale: 2.0, pad: 15 },
      { scale: 1.0, pad: 0 },
      { scale: 2.5, pad: 20 },
      { scale: 3.0, pad: 20 },
      { scale: 0.75, pad: 0 },
    ];

    for (const attempt of attempts) {
      const targetW = Math.round(sourceWidth * attempt.scale);
      const targetH = Math.round(sourceHeight * attempt.scale);
      const totalW = targetW + attempt.pad * 2;
      const totalH = targetH + attempt.pad * 2;

      // Prevent oversized memory usage
      if (totalW > 1600 || totalH > 1600) continue;

      canvas.width = totalW;
      canvas.height = totalH;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, totalW, totalH);
      ctx.drawImage(source, attempt.pad, attempt.pad, targetW, targetH);

      const imageData = ctx.getImageData(0, 0, totalW, totalH);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'attemptBoth',
      });
      if (code && code.data && code.data.trim()) {
        return code.data.trim();
      }
    }

    // Strategy 3: Central zoom crop (ideal for camera frames where user points phone at QR)
    if (sourceWidth >= 200 && sourceHeight >= 200) {
      const cropSize = Math.round(Math.min(sourceWidth, sourceHeight) * 0.65);
      const cropX = Math.round((sourceWidth - cropSize) / 2);
      const cropY = Math.round((sourceHeight - cropSize) / 2);
      const cropTarget = 400;

      canvas.width = cropTarget + 20;
      canvas.height = cropTarget + 20;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(source, cropX, cropY, cropSize, cropSize, 10, 10, cropTarget, cropTarget);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'attemptBoth',
      });
      if (code && code.data && code.data.trim()) {
        return code.data.trim();
      }
    }

    return null;
  };

  const scanVideoFrame = async () => {
    if (!videoRef.current || videoRef.current.readyState < 2) {
      animFrameRef.current = requestAnimationFrame(scanVideoFrame);
      return;
    }

    if (isScanningFrameRef.current) {
      animFrameRef.current = requestAnimationFrame(scanVideoFrame);
      return;
    }

    isScanningFrameRef.current = true;
    try {
      const video = videoRef.current;
      const w = video.videoWidth || 480;
      const h = video.videoHeight || 480;
      const detected = await decodeQRFromCanvasSource(video, w, h);
      if (detected) {
        stopCamera();
        handleDetectedCode(detected);
        return;
      }
    } catch (_) {
      // Continue next frame on error
    } finally {
      isScanningFrameRef.current = false;
    }

    animFrameRef.current = requestAnimationFrame(scanVideoFrame);
  };

  const startCamera = async () => {
    setErrorMsg('');
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setErrorMsg('อุปกรณ์ของคุณไม่รองรับการเปิดกล้องผ่านเบราว์เซอร์');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 640 } }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setCameraActive(true);
        animFrameRef.current = requestAnimationFrame(scanVideoFrame);
      }
    } catch (err: any) {
      stopCamera();
      setErrorMsg('ไม่สามารถเปิดกล้องได้ กรุณาอนุญาตการเข้าถึงกล้อง หรือใช้วิธีอัปโหลดภาพ QR แทน');
    }
  };

  const processImageFile = (file: File) => {
    if (!file) return;
    setErrorMsg('');

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        try {
          const w = img.naturalWidth || img.width;
          const h = img.naturalHeight || img.height;
          const detected = await decodeQRFromCanvasSource(img, w, h);

          if (detected) {
            stopCamera();
            handleDetectedCode(detected);
          } else {
            setErrorMsg('ไม่พบ QR Code ในรูปภาพที่เลือก กรุณาอัปโหลดภาพ QR ร้านค้าที่ชัดเจน หรือลองลากไฟล์ภาพมาวาง');
          }
        } catch {
          setErrorMsg('เกิดข้อผิดพลาดในการประมวลผล QR Code');
        }
      };
      img.onerror = () => {
        setErrorMsg('ไม่สามารถเปิดไฟล์รูปภาพได้');
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const DAILY_SUBSIDY_LIMIT = 200;
  const todayStr = new Date().toISOString().split('T')[0];
  const todayGovSpent = transactions
    .filter(t => t.userId === currentUser.userId && t.status === 'completed' && String(t.txTimestamp).startsWith(todayStr))
    .reduce((sum, t) => sum + (Number(t.govSubsidizedAmount) || 0), 0);
  const remainingDaily = currentUser.subsidyEligible === false ? 0 : Math.max(0, DAILY_SUBSIDY_LIMIT - todayGovSpent);

  const govRatio = currentUser.subsidyEligible === false ? 0 : (userGrant?.govPayRatio ?? 0.60);
  const requestedGovShare = Math.round(amount * govRatio * 100) / 100;
  const govPays = Math.min(requestedGovShare, remainingDaily, userGrant?.remainingAmount ?? amount);
  const userPays = (Math.round(amount * 100) - Math.round(govPays * 100)) / 100;

  // Rich list of owned stamps with district details
  const ownedStamps = userStamps
    .filter(us => (us.count || 0) > 0)
    .map(us => {
      const detail = districtStamps.find(ds => ds.stampId === us.stampId);
      return {
        stampId: us.stampId,
        count: us.count,
        name: detail?.stampName || `แสตมป์รหัส #${us.stampId}`,
        distName: detail?.distName || '',
        provName: detail?.provName || '',
        imageUrl: detail?.imageUrl || 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=300&auto=format&fit=crop&q=80',
      };
    });

  // Stamp discount policy:
  // 1 stamp = ฿1 discount, up to 50% of user share, bounded by userStamps, daily subsidy quota, and grant remaining
  const totalUserStamps = userStamps.reduce((sum, s) => sum + (s.count || 0), 0);
  const maxStampByPolicy = Math.floor(userPays / 2);
  const maxStampByDaily = Math.max(0, Math.floor(remainingDaily - govPays));
  const maxStampByGrant = Math.max(0, Math.floor((userGrant?.remainingAmount ?? 0) - govPays));
  const maxUsableStamps = Math.max(0, Math.min(totalUserStamps, maxStampByPolicy, maxStampByDaily, maxStampByGrant));

  const totalSelectedStamps = Object.values(selectedStamps).reduce((sum, c) => sum + (c || 0), 0);
  const stampDiscount = Math.min(totalSelectedStamps, maxUsableStamps);

  const handleStampChange = (stampId: number, delta: number, maxAvailable: number) => {
    setSelectedStamps(prev => {
      const current = prev[stampId] || 0;
      const nextVal = current + delta;
      if (nextVal <= 0) {
        const copy = { ...prev };
        delete copy[stampId];
        return copy;
      }
      if (nextVal > maxAvailable) return prev;

      const otherTotal = Object.entries(prev)
        .filter(([k]) => Number(k) !== stampId)
        .reduce((sum, [, v]) => sum + (v || 0), 0);
      if (otherTotal + nextVal > maxUsableStamps) {
        return prev;
      }

      return { ...prev, [stampId]: nextVal };
    });
  };

  const handleClearStamps = () => {
    setSelectedStamps({});
  };

  const handleAutoMaxStamps = () => {
    let remaining = maxUsableStamps;
    const newAlloc: Record<number, number> = {};
    for (const s of ownedStamps) {
      if (remaining <= 0) break;
      const take = Math.min(s.count, remaining);
      if (take > 0) {
        newAlloc[s.stampId] = take;
        remaining -= take;
      }
    }
    setSelectedStamps(newAlloc);
  };

  const netUserPays = Math.max(0, Math.round((userPays - stampDiscount) * 100) / 100);
  const isCappedByDaily = requestedGovShare > remainingDaily;
  const isBalanceEnough = wallet.balance >= netUserPays;

  const activeMission = (scannedMissionId ? findMissionAnywhere(scannedMissionId) : null)
    || (presetMissionId ? findMissionAnywhere(presetMissionId) : null)
    || (selectedMerchant ? (
        findMissionAnywhere(
          missions.find(m => m.targetMerchantId === selectedMerchant.mchId)?.missionId ??
          aiTargetShops.find(m => m.merchantId === selectedMerchant.mchId)?.analysisId ?? 0
        )
      ) : null);

  const effectiveMissionId = scannedMissionId 
    ?? presetMissionId 
    ?? (activeMission?.missionId ?? undefined);

  const handleConfirmPay = async (pin?: string) => {
    if (!selectedMerchant) return;
    setErrorMsg('');
    setIsPaying(true);

    try {
      const res = await executePayment({
        merchantId: selectedMerchant.mchId,
        totalAmount: amount,
        note: `ชำระเงินสิทธิ์ร่วมจ่าย ณ ร้าน ${selectedMerchant.shopName}${effectiveMissionId ? ` (ภารกิจ #${effectiveMissionId})` : ''}${stampDiscount > 0 ? ` (ใช้แสตมป์ ${stampDiscount} ดวง)` : ''}`,
        pin,
        stampCount: stampDiscount,
        selectedStamps: selectedStamps,
        missionId: effectiveMissionId,
      });

      if (!res.success) {
        setErrorMsg(res.message);
        setIsPaying(false);
        return;
      }

      setAwardedStamp(res.earnedStamp ?? null);
      setAwardedStampCount(res.earnedStamp ? res.earnedStampCount ?? 1 : 0);

      setStep('success');
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 }
      });
    } catch (err: any) {
      setErrorMsg(err?.message || 'การชำระเงินขัดข้อง กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsPaying(false);
    }
  };

  const handleQuickTopup = async (addAmount: number) => {
    try {
      await topupWallet(addAmount);
      setTopupSuccess(`เติมเงินสำเร็จ +฿${addAmount.toLocaleString()}`);
      setErrorMsg('');
    } catch {
      setErrorMsg('เติมเงินไม่สำเร็จ กรุณาลองใหม่');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#07162d]/75 p-3 sm:p-4 backdrop-blur-sm animate-fade-in overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[410px] max-h-[92vh] flex flex-col rounded-[28px] bg-white shadow-2xl overflow-hidden my-auto animate-scale-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header (Sticky top) */}
        <div className="flex items-center justify-between p-4 sm:p-5 pb-3 border-b border-slate-100 shrink-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-[#eaf2ff] text-[#1769ed]">
              <Icon name="scan" className="size-5" />
            </span>
            <div>
              <h3 className="font-bold text-sm text-slate-800">สแกน QR ชำระเงิน</h3>
              <p className="text-[10px] text-slate-400">โครงการไทยช่วยไทยพลีส</p>
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

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 pt-3 overscroll-contain">
        {/* STEP 1: SCANNER */}
        {step === 'scan' && (
          <div className="pt-4 flex flex-col items-center">
            {/* Viewfinder box with Drag & Drop */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const file = e.dataTransfer.files?.[0];
                if (file) processImageFile(file);
              }}
              className={`relative size-64 rounded-[28px] bg-slate-950 overflow-hidden flex items-center justify-center border-2 transition-all mb-3 shadow-xl ${
                isDragging ? 'border-cyan-400 ring-4 ring-cyan-400/30 scale-102 bg-cyan-950/40' : 'border-[#1769ed]'
              }`}
            >
              {cameraActive ? (
                <>
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {/* Laser line scanning effect */}
                  <div className="absolute inset-x-6 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#38bdf8] animate-bounce pointer-events-none" />
                  {/* Viewfinder corner targets */}
                  <div className="absolute inset-6 border border-white/20 rounded-2xl pointer-events-none flex flex-col justify-between p-2">
                    <div className="flex justify-between">
                      <div className="size-4 border-t-2 border-l-2 border-cyan-400 rounded-tl-sm" />
                      <div className="size-4 border-t-2 border-r-2 border-cyan-400 rounded-tr-sm" />
                    </div>
                    <div className="flex justify-between">
                      <div className="size-4 border-b-2 border-l-2 border-cyan-400 rounded-bl-sm" />
                      <div className="size-4 border-b-2 border-r-2 border-cyan-400 rounded-br-sm" />
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center p-5 flex flex-col items-center">
                  <span className={`grid size-13 place-items-center rounded-2xl mb-2.5 transition-colors ${
                    isDragging ? 'bg-cyan-500 text-white' : 'bg-white/10 text-cyan-400 shadow-inner'
                  }`}>
                    <Icon name="scan" className="size-7" />
                  </span>
                  <p className="text-xs font-bold text-white mb-1">
                    {isDragging ? 'วางรูปภาพที่นี่เลย!' : 'หันกล้อง หรือ วางรูปภาพ QR'}
                  </p>
                  <p className="text-[10px] text-slate-400 max-w-[210px] leading-relaxed">
                    เปิดกล้อง, ลากรูปมาวางที่นี่ หรือกด <kbd className="px-1 py-0.5 rounded bg-white/20 text-white font-mono text-[9px]">Ctrl+V</kbd> แปะรูปได้ทันที
                  </p>
                </div>
              )}
            </div>

            {/* Error Message if any */}
            {errorMsg && (
              <div className="w-full p-2.5 mb-3 bg-rose-50 text-rose-600 text-xs font-semibold rounded-xl border border-rose-200 text-center animate-fade-in flex items-center justify-center gap-1.5">
                <span>⚠️</span>
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Scanning Controls */}
            <div className="w-full space-y-2">
              {cameraActive ? (
                <button
                  type="button"
                  onClick={stopCamera}
                  className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-rose-200"
                >
                  <Icon name="x" className="size-4" />
                  <span>ปิดกล้อง</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startCamera}
                  className="w-full py-3 bg-[#1769ed] hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Icon name="scan" className="size-4" />
                  <span>เปิดกล้องถ่ายจริง</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-200"
              >
                <span>📁 เปิดรูปใส่แสกน (เลือกภาพ QR จากเครื่อง)</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleFileUpload}
              />

              {/* Quick test buttons for active mission stores */}
              <div className="space-y-1.5 pt-1">
                {missions.filter(m => m.status === 'active').slice(0, 2).map(ms => {
                  const mch = findMerchantAnywhere(ms.targetMerchantId || 0);
                  if (!mch) return null;
                  return (
                    <button
                      key={ms.missionId}
                      type="button"
                      onClick={() => {
                        setSelectedMerchant(mch);
                        setScannedMissionId(ms.missionId);
                        setAmount(ms.minSpend && ms.minSpend > 0 ? ms.minSpend : 200);
                        setStep('confirm');
                      }}
                      className="w-full py-2 bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 text-amber-900 rounded-xl text-[11px] font-bold transition-all flex items-center justify-between px-3 cursor-pointer border border-amber-300/80 shadow-xs text-left"
                    >
                      <span className="flex items-center gap-1.5 truncate">
                        <span>🎯</span>
                        <span className="truncate">ทดสอบสแกน: {mch.shopName} (ภารกิจ #{ms.missionId})</span>
                      </span>
                      <span className="shrink-0 text-[10px] bg-amber-500 text-white px-2 py-0.5 rounded-full font-black">
                        อยู่ในช่วงภารกิจ
                      </span>
                    </button>
                  );
                })}

                {aiTargetShops.slice(0, 1).map(ai => {
                  const mch = findMerchantAnywhere(ai.merchantId);
                  if (!mch) return null;
                  return (
                    <button
                      key={ai.analysisId || ai.merchantId}
                      type="button"
                      onClick={() => {
                        setSelectedMerchant(mch);
                        setScannedMissionId(ai.analysisId || ai.missionId || 999);
                        setAmount(200);
                        setStep('confirm');
                      }}
                      className="w-full py-2 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 text-blue-900 rounded-xl text-[11px] font-bold transition-all flex items-center justify-between px-3 cursor-pointer border border-blue-300/80 shadow-xs text-left"
                    >
                      <span className="flex items-center gap-1.5 truncate">
                        <span>⚡</span>
                        <span className="truncate">ทดสอบสแกน AI: {ai.merchantName}</span>
                      </span>
                      <span className="shrink-0 text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-black">
                        AI Target
                      </span>
                    </button>
                  );
                })}

                {merchants.length > 0 && !missions.some(m => m.targetMerchantId === merchants[0].mchId) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMerchant(merchants[0]);
                      setAmount(200);
                      setStep('confirm');
                    }}
                    className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200"
                  >
                    <span>⚡ คลิกทดสอบสแกนร้านค้าทั่วไป: {merchants[0].shopName}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: CONFIRM */}
        {step === 'confirm' && selectedMerchant && (
          <div className="pt-4 space-y-3.5">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#f8faff] border border-blue-50">
              <img
                src={selectedMerchant.imageUrl || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&auto=format&fit=crop&q=80'}
                alt={selectedMerchant.shopName}
                className="size-12 rounded-xl object-cover border border-slate-100 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-xs text-slate-800 truncate">{selectedMerchant.shopName}</p>
                <p className="text-[10px] text-slate-400">{selectedMerchant.category}</p>
                <p className="text-[10px] text-[#1769ed] font-medium mt-0.5">
                  พร้อมเพย์: {selectedMerchant.promptpayId || selectedMerchant.phone || 'รับเงินเข้ากระเป๋าร้านค้า'}
                </p>
              </div>
            </div>

            {/* Active Mission Banner (When inside mission period or triggered by mission) */}
            {effectiveMissionId && (
              <div className="rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white p-3.5 shadow-md space-y-1.5 animate-fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="p-1 bg-white/20 rounded-lg">
                      <Icon name="sparkle" className="size-4 text-white" />
                    </span>
                    <span className="text-[11px] font-black tracking-wide uppercase">
                      ภารกิจพิเศษ #{effectiveMissionId}
                    </span>
                  </div>
                  <span className="text-[10px] font-extrabold bg-white text-amber-800 px-2 py-0.5 rounded-full shadow-xs">
                    อยู่ในช่วงภารกิจ 🎯
                  </span>
                </div>
                <p className="font-bold text-xs leading-tight text-white">
                  {activeMission?.missionName || 'ภารกิจกระตุ้นเศรษฐกิจชุมชน'}
                </p>
                <p className="text-[10px] text-amber-100 leading-snug">
                  🎉 สแกนจ่ายบิลนี้สำเร็จ รับแสตมป์ดิจิทัลประจำอำเภอของภารกิจทันที!
                </p>
              </div>
            )}

            {/* Merchant Specified Amount Display (Locked from QR) */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/80 via-indigo-50/60 to-blue-50/80 border border-blue-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-black text-blue-900 flex items-center gap-1.5">
                  <span>🔒</span>
                  <span>ยอดชำระที่ร้านค้ากำหนดใน QR</span>
                </span>
                <span className="text-[10px] text-blue-700 font-extrabold bg-white/90 px-2.5 py-0.5 rounded-full border border-blue-200/80 shadow-xs">
                  ระบุจาก QR ร้านค้า
                </span>
              </div>
              <div className="flex items-baseline justify-between mt-2 pt-1 border-t border-blue-100/60">
                <span className="text-xs text-slate-500 font-semibold">ยอดรวมราคาสินค้า</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-base font-black text-blue-700">฿</span>
                  <span className="text-3xl font-black text-slate-900 font-mono tracking-tight">
                    {amount.toLocaleString('th-TH', { minimumFractionDigits: 0 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Split Calculation */}
            <div className="rounded-2xl bg-[#eaf2ff] p-3.5 text-xs space-y-2 border border-blue-100">
              <div className="flex justify-between items-center text-slate-700 pb-1.5 border-b border-blue-200/60 font-semibold">
                <span>สรุปการแบ่งจ่ายตามนโยบาย</span>
                <span>ยอดรวม ฿{amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">คุณชำระ (40%):</span>
                <span className="font-bold text-slate-700">฿ {userPays.toLocaleString()}</span>
              </div>
              {stampDiscount > 0 && (
                <div className="flex justify-between items-center text-amber-800 bg-amber-50/80 px-2 py-1 rounded-lg border border-amber-200/60 font-bold">
                  <span>ส่วนลดจากแสตมป์ ({stampDiscount} ดวง):</span>
                  <span>- ฿ {stampDiscount.toLocaleString()}</span>
                </div>
              )}
              {stampDiscount > 0 && (
                <div className="flex justify-between items-center pt-1 border-t border-blue-200/50">
                  <span className="text-[#123b84] font-black">ยอดที่คุณต้องจ่ายสุทธิ:</span>
                  <strong className="text-base text-[#123b84]">฿ {netUserPays.toLocaleString()}</strong>
                </div>
              )}
              {stampDiscount === 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-[#123b84] font-bold">ยอดที่คุณต้องจ่าย:</span>
                  <strong className="text-base text-[#123b84]">฿ {userPays.toLocaleString()}</strong>
                </div>
              )}
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-slate-600 block">รัฐช่วยจ่าย ({Number((govRatio * 100).toFixed(2))}%):</span>
                  <span className="text-[10px] text-emerald-700 font-bold">{currentUser.subsidyEligible === false ? 'ไม่มีสิทธิ์รัฐร่วมจ่าย ชำระเองเต็มจำนวน' : 'สูงสุดไม่เกิน ฿200 / วัน'}</span>
                </div>
                <strong className="text-base text-emerald-600">฿ {govPays.toLocaleString()}</strong>
              </div>

              {isCappedByDaily && (
                <div className="mt-2 p-2 rounded-xl bg-amber-50 text-amber-800 text-[10px] font-bold border border-amber-200 flex items-center gap-1.5 animate-fade-in">
                  <span>⚠️</span>
                  <span>รัฐช่วยจ่ายสูงสุดไม่เกิน ฿200/วัน (ส่วนเกินลูกค้าชำระเพิ่ม)</span>
                </div>
              )}
            </div>

            {/* Stamp Discount Selector with specific stamp selection */}
            {totalUserStamps > 0 && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-50/90 via-orange-50/60 to-amber-50/90 border border-amber-200/80 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="grid size-6 place-items-center rounded-lg bg-amber-500 text-white shadow-xs">
                      <Icon name="award" className="size-3.5" />
                    </span>
                    <span className="text-[11px] font-extrabold text-amber-950">เลือกแสตมป์ที่ต้องการใช้</span>
                  </div>
                  <span className="text-[10px] text-amber-800 font-bold bg-white/90 px-2 py-0.5 rounded-full border border-amber-200 shadow-xs">
                    มี {totalUserStamps} ดวง (1 ดวง = ฿1)
                  </span>
                </div>

                {maxUsableStamps > 0 ? (
                  <div className="space-y-2">
                    {/* Summary bar */}
                    <div className="flex items-center justify-between bg-white/90 px-3 py-1.5 rounded-xl border border-amber-200/70 text-[11px]">
                      <span className="text-slate-600 font-semibold">ใช้ลดหย่อนในบิลนี้:</span>
                      <div className="flex items-center gap-1.5">
                        <strong className="text-sm font-black text-amber-900 font-mono">
                          {stampDiscount}
                        </strong>
                        <span className="text-[10px] text-slate-400">/ ใช้ได้สูงสุด {maxUsableStamps} ดวง</span>
                      </div>
                    </div>

                    {/* Quick Stamp Action Buttons */}
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={handleClearStamps}
                        className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer border ${
                          stampDiscount === 0
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        ไม่ใช้แสตมป์
                      </button>
                      <button
                        type="button"
                        onClick={handleAutoMaxStamps}
                        className={`flex-[2] py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer border ${
                          stampDiscount === maxUsableStamps
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                            : 'bg-white text-amber-800 border-amber-300 hover:bg-amber-100/60'
                        }`}
                      >
                        ใช้สูงสุดอัตโนมัติ ({maxUsableStamps} ดวง)
                      </button>
                    </div>

                    {/* Stamp List by District */}
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5 divide-y divide-amber-100/60">
                      {ownedStamps.map(s => {
                        const allocated = selectedStamps[s.stampId] || 0;
                        const isMaxAllocated = allocated >= s.count || stampDiscount >= maxUsableStamps;
                        return (
                          <div
                            key={s.stampId}
                            className={`p-2 rounded-xl border transition-all flex items-center justify-between gap-2 pt-2 ${
                              allocated > 0
                                ? 'bg-amber-100/80 border-amber-400 shadow-xs'
                                : 'bg-white/80 border-slate-200/80 hover:bg-white'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <img
                                src={s.imageUrl}
                                alt={s.name}
                                className="size-8 rounded-lg object-cover border border-amber-300/80 shrink-0"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-bold text-slate-800 truncate leading-tight">
                                  {s.name}
                                </p>
                                <p className="text-[9.5px] text-slate-500 truncate mt-0.5">
                                  {s.provName ? `${s.provName} ` : ''}(มีสะสม {s.count} ดวง)
                                </p>
                              </div>
                            </div>

                            {/* Quantity Stepper */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleStampChange(s.stampId, -1, s.count)}
                                disabled={allocated <= 0}
                                className="size-6 rounded-md bg-white border border-amber-300 font-black text-amber-800 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-amber-100 flex items-center justify-center transition-colors cursor-pointer text-xs"
                              >
                                -
                              </button>
                              <span className="font-mono font-black text-xs text-amber-900 w-5 text-center">
                                {allocated}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleStampChange(s.stampId, 1, s.count)}
                                disabled={isMaxAllocated}
                                className="size-6 rounded-md bg-white border border-amber-300 font-black text-amber-800 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-amber-100 flex items-center justify-center transition-colors cursor-pointer text-xs"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <p className="text-[9.5px] text-amber-700/90 leading-tight">
                      * สามารถเลือกดวงแสตมป์ที่ต้องการใช้ลดหย่อนได้ตามใจชอบ (1 ดวง = ฿1 สูงสุดไม่เกิน 50% ของยอดที่คุณจ่าย)
                    </p>
                  </div>
                ) : (
                  <p className="text-[10px] text-amber-700/80 leading-relaxed">
                    โควตาสิทธิรัฐช่วยจ่ายของวันนี้เต็มแล้ว ไม่สามารถใช้แสตมป์ลดหย่อนเพิ่มในบิลนี้ได้
                  </p>
                )}
              </div>
            )}

            {/* Balances Check */}
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[10px]">เงินในกระเป๋าของคุณ</span>
                <strong className={`text-xs ${isBalanceEnough ? 'text-slate-800' : 'text-rose-600 font-extrabold'}`}>
                  ฿ {wallet.balance.toLocaleString()}
                </strong>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-[10px]">โควตารัฐช่วยวันนี้</span>
                  <span className="text-[9px] text-emerald-700 bg-emerald-50 px-1 rounded font-bold">฿200/วัน</span>
                </div>
                <strong className="text-xs text-emerald-600 font-bold block mt-0.5">
                  คงเหลือ ฿ {remainingDaily.toLocaleString()}
                </strong>
              </div>
            </div>

            {/* Insufficient balance warning + Quick Top-up */}
            {!isBalanceEnough && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 space-y-2.5">
                <p className="font-bold flex items-center gap-1">
                  <span>⚠️</span>
                  <span>ยอดเงินในกระเป๋าไม่พอจ่าย (ขาด ฿{(netUserPays - wallet.balance).toLocaleString()})</span>
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickTopup(300)}
                    className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-[11px] transition-colors cursor-pointer"
                  >
                    + เติม ฿300
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickTopup(500)}
                    className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-[11px] transition-colors cursor-pointer"
                  >
                    + เติม ฿500
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setTopupModalOpen(true)}
                  className="w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Icon name="wallet" className="size-4" />
                  <span>เลือกจำนวนเงินเติมเอง</span>
                </button>
              </div>
            )}

            {topupSuccess && (
              <p className="text-xs text-emerald-700 bg-emerald-50 p-2 rounded-xl border border-emerald-200">
                ✓ {topupSuccess}
              </p>
            )}

            {/* Stamp bonus hint */}
            {stampRule && (
              <div className="rounded-xl bg-amber-50 p-2.5 border border-amber-200 flex items-center gap-2 text-xs text-amber-900">
                <span className="grid size-7 place-items-center rounded-lg bg-amber-500 text-white shrink-0">
                  <Icon name="award" className="size-4" />
                </span>
                <span className="text-[11px] leading-tight">
                  ซื้อครบ ฿{stampRule.minSpend.toLocaleString('th-TH')} ต่อบิล รับ <strong className="font-bold">{stampRule.stampName}</strong> {stampRule.rewardCount} ดวง
                  {amount < stampRule.minSpend && <span className="mt-1 block">ซื้อเพิ่มอีก ฿{(stampRule.minSpend - amount).toLocaleString('th-TH', { maximumFractionDigits: 2 })} เพื่อรับแสตมป์</span>}
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
                type="button"
                onClick={() => setStep('scan')}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                ย้อนกลับ
              </button>
              <button
                type="button"
                disabled={!isBalanceEnough || isPaying}
                onClick={() => {
                  setErrorMsg('');
                  setStep('pin');
                }}
                className={`flex-[2] py-2.5 rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5 ${
                  !isBalanceEnough || isPaying
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                    : 'bg-[#1769ed] hover:bg-blue-700 text-white shadow-blue-500/20 cursor-pointer'
                }`}
              >
                <span>ยืนยันชำระ ฿{netUserPays.toLocaleString()}</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: PIN VERIFICATION */}
        {step === 'pin' && selectedMerchant && (
          <div className="pt-2 animate-fade-in">
            <PinPad
              title="ใส่รหัส PIN เพื่อชำระเงิน"
              subtitle={`ชำระให้ร้าน ${selectedMerchant.shopName} ยอดสุทธิ ฿${netUserPays.toLocaleString()}`}
              error={errorMsg}
              loading={isPaying}
              onComplete={async (enteredPin) => {
                await handleConfirmPay(enteredPin);
              }}
              onCancel={() => {
                setErrorMsg('');
                setStep('confirm');
              }}
            />
          </div>
        )}

        {/* STEP 4: SUCCESS */}
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
                <span>คุณจ่ายสุทธิ</span>
                <span className="font-bold text-[#1769ed]">฿{netUserPays.toLocaleString()}</span>
              </div>
              {stampDiscount > 0 && (
                <div className="flex justify-between text-amber-700">
                  <span>ส่วนลดจากแสตมป์ ({stampDiscount} ดวง)</span>
                  <span className="font-bold">-฿{stampDiscount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>รัฐช่วยจ่าย ({Number((govRatio * 100).toFixed(2))}%)</span>
                <span className="font-bold text-emerald-600">฿{govPays.toLocaleString()}</span>
              </div>
            </div>

            {awardedStamp && (
              <div className="rounded-2xl bg-amber-50 border border-amber-200 p-2.5 flex items-center gap-2.5 text-left">
                <img
                  src={awardedStamp.imageUrl}
                  alt={awardedStamp.stampName}
                  className="size-11 rounded-xl object-cover border border-amber-300 shrink-0"
                />
                <div>
                  <span className="text-[10px] font-bold text-amber-700">ได้รับแสตมป์ดิจิทัล {awardedStampCount} ดวง!</span>
                  <p className="text-xs font-bold text-slate-800">{awardedStamp.stampName}</p>
                </div>
              </div>
            )}

            <button
              onClick={onClose}
              className="w-full py-2.5 bg-[#1769ed] hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 cursor-pointer"
            >
              เสร็จสิ้น
            </button>
          </div>
        )}
        </div>
      </div>

      <TopupModal
        isOpen={topupModalOpen}
        onClose={() => setTopupModalOpen(false)}
        defaultAmount={Math.max(100, Math.ceil((netUserPays - wallet.balance) / 50) * 50)}
      />
    </div>
  );
};

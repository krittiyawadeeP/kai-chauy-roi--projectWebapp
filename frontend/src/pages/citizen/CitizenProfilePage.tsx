import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Icon, IconName } from '../../components/common/Icon';
import { INITIAL_PROVINCES } from '../../mock/initialData';
import { api } from '../../services/api';

interface CitizenProfilePageProps {
  onBack?: () => void;
  onOpenStatement?: () => void;
  onOpenStatus?: () => void;
  onOpenVouchers?: () => void;
  onOpenMyQr?: () => void;
  onGoToTab?: (tab: string) => void;
}

export const CitizenProfilePage: React.FC<CitizenProfilePageProps> = ({
  onBack,
  onOpenStatement,
  onOpenStatus,
  onOpenVouchers,
  onOpenMyQr,
  onGoToTab,
}) => {
  const {
    currentUser,
    setCurrentUser,
    wallet,
    userGrant,
    userStamps,
    logout,
    topupWallet,
  } = useApp();

  // Tab / Section toggle inside Profile
  const [activeSection, setActiveSection] = useState<'overview' | 'security' | 'personal' | 'settings'>('overview');

  // Copy Feedback
  const [copied, setCopied] = useState(false);

  // Edit Phone / Profile State
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [phoneInput, setPhoneInput] = useState(currentUser?.phone || '');
  const [selectedProvId, setSelectedProvId] = useState<number>(currentUser?.provId || 1);
  const [profileSaveLoading, setProfileSaveLoading] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');
  const [profileErrorMsg, setProfileErrorMsg] = useState('');

  // Change Password State
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState('');
  const [passwordErrorMsg, setPasswordErrorMsg] = useState('');

  // Settings Toggles
  const [smsAlert, setSmsAlert] = useState(true);
  const [biometricLogin, setBiometricLogin] = useState(true);
  const [aiMissionsAlert, setAiMissionsAlert] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(true);

  // Logout Confirm Modal
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Legal / PDPA Modal
  const [legalModalType, setLegalModalType] = useState<'pdpa' | 'terms' | null>(null);

  // Quick Topup Modal
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [topupAmount, setTopupAmount] = useState<number>(500);

  // Total Stamps calculation
  const totalStamps = userStamps.reduce((acc, curr) => acc + curr.count, 0);

  // Format 13-digit ID: 1-7302-01403-95-3
  const rawId = (currentUser?.citizenId || '1730201403953').replace(/[^0-9]/g, '');
  const formattedId = rawId.length === 13
    ? `${rawId.slice(0, 1)}-${rawId.slice(1, 5)}-${rawId.slice(5, 10)}-${rawId.slice(10, 12)}-${rawId.slice(12)}`
    : currentUser?.citizenId || '1-7302-01403-95-3';

  // Province Name lookup
  const provinceObj = INITIAL_PROVINCES.find(p => p.provId === (currentUser?.provId || selectedProvId));
  const currentProvinceName = provinceObj ? provinceObj.provName : 'กรุงเทพมหานคร';

  // Copy to clipboard handler
  const handleCopyCitizenId = () => {
    navigator.clipboard?.writeText(rawId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Save Personal Profile handler (Phone & Province)
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaveLoading(true);
    setProfileSuccessMsg('');
    setProfileErrorMsg('');

    try {
      if (!phoneInput || phoneInput.trim().length < 9) {
        throw new Error('กรุณากรอกหมายเลขโทรศัพท์อย่างน้อย 9-10 หลัก');
      }

      await api.patch(`/user/${currentUser.userId}`, {
        Phone: phoneInput.trim(),
        Province_ID: selectedProvId,
      });

      setCurrentUser({
        ...currentUser,
        phone: phoneInput.trim(),
        provId: selectedProvId,
      });

      setProfileSuccessMsg('บันทึกข้อมูลส่วนบุคคลเรียบร้อยแล้ว');
      setIsEditingPhone(false);
      setTimeout(() => setProfileSuccessMsg(''), 3000);
    } catch (err: any) {
      setProfileErrorMsg(err?.message || 'ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setProfileSaveLoading(false);
    }
  };

  // Change Password Handler
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordSuccessMsg('');
    setPasswordErrorMsg('');

    try {
      if (!oldPassword) {
        throw new Error('กรุณากรอกรหัสผ่านเดิม');
      }
      if (!newPassword || newPassword.length < 4) {
        throw new Error('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 4 ตัวอักษร');
      }
      if (newPassword !== confirmPassword) {
        throw new Error('รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน');
      }

      await api.patch(`/user/${currentUser.userId}/password`, {
        oldPassword,
        newPassword,
      });

      setPasswordSuccessMsg('เปลี่ยนรหัสผ่านใหม่สำเร็จแล้วอย่างปลอดภัย');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setPasswordSuccessMsg('');
        setShowPasswordForm(false);
      }, 2500);
    } catch (err: any) {
      setPasswordErrorMsg(err?.message || 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Handle Quick Topup
  const handleConfirmTopup = () => {
    topupWallet(topupAmount);
    setShowTopupModal(false);
  };

  return (
    <div className="min-h-screen bg-[#f3f6fc] text-[#14213d] pb-28 animate-fade-in flex flex-col">
      {/* 1. Header with Gradient & App Identity */}
      <header className="sticky top-0 z-30 bg-gradient-to-r from-[#072460] via-[#0d348a] to-[#1249b8] text-white px-5 pt-5 pb-5 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="grid size-9 place-items-center rounded-xl bg-white/15 hover:bg-white/25 text-white transition cursor-pointer"
                aria-label="ย้อนกลับ"
              >
                <Icon name="chevron" className="size-5 rotate-180" />
              </button>
            ) : (
              <span className="grid size-9 place-items-center rounded-xl bg-white text-[#0d348a] font-extrabold text-sm shadow-md">
                ไทย
              </span>
            )}
            <div>
              <h1 className="text-lg font-black tracking-tight leading-tight">โปรไฟล์ผู้ใช้งาน</h1>
              <p className="text-[11px] text-blue-200">ระบบจัดการบัญชี & สิทธิพลเมืองดิจิทัล</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 px-2.5 py-1 rounded-full">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              ยืนยันตัวตนแล้ว
            </span>
          </div>
        </div>

        {/* Section Navigation Tabs */}
        <div className="flex items-center gap-1.5 bg-black/20 p-1 rounded-2xl backdrop-blur-sm text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveSection('overview')}
            className={`flex-1 py-1.5 text-center rounded-xl transition ${
              activeSection === 'overview'
                ? 'bg-white text-[#0d348a] shadow-sm font-bold'
                : 'text-blue-100 hover:text-white'
            }`}
          >
            ภาพรวม & สิทธิ์
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('personal')}
            className={`flex-1 py-1.5 text-center rounded-xl transition ${
              activeSection === 'personal'
                ? 'bg-white text-[#0d348a] shadow-sm font-bold'
                : 'text-blue-100 hover:text-white'
            }`}
          >
            ข้อมูลส่วนตัว
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('security')}
            className={`flex-1 py-1.5 text-center rounded-xl transition ${
              activeSection === 'security'
                ? 'bg-white text-[#0d348a] shadow-sm font-bold'
                : 'text-blue-100 hover:text-white'
            }`}
          >
            ความปลอดภัย
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('settings')}
            className={`flex-1 py-1.5 text-center rounded-xl transition ${
              activeSection === 'settings'
                ? 'bg-white text-[#0d348a] shadow-sm font-bold'
                : 'text-blue-100 hover:text-white'
            }`}
          >
            ตั้งค่า
          </button>
        </div>
      </header>

      {/* 2. Thailand Digital Citizen ID Card Banner (ThaID Style) */}
      <div className="px-4 -mt-2">
        <div className="relative rounded-[28px] overflow-hidden bg-gradient-to-br from-[#0c2e68] via-[#104ab0] to-[#1d6eed] text-white p-5 shadow-xl border border-white/20">
          {/* Subtle background guilloche badge pattern */}
          <div className="absolute -right-8 -bottom-8 size-40 rounded-full border-[18px] border-white/10 pointer-events-none" />
          <div className="absolute right-12 top-4 size-20 rounded-full bg-cyan-400/10 blur-xl pointer-events-none" />

          {/* Card Top Row */}
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-lg bg-white/20 backdrop-blur font-black text-xs text-white">
                TH
              </span>
              <div>
                <p className="text-[9px] uppercase tracking-wider text-blue-200 font-extrabold leading-tight">
                  KINGDOM OF THAILAND
                </p>
                <p className="text-[11px] font-bold text-white">บัตรประจำตัวประชาชนดิจิทัล (ThaID)</p>
              </div>
            </div>

            <span className="text-[10px] font-bold bg-white/15 px-2 py-0.5 rounded-full border border-white/25 text-blue-100">
              IAL 2.3
            </span>
          </div>

          {/* Avatar & Citizen Details */}
          <div className="flex items-center gap-4 relative z-10">
            <div className="relative">
              <div className="size-16 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-500 border-2 border-white/50 flex items-center justify-center text-3xl shadow-md overflow-hidden shrink-0">
                👤
              </div>
              <span className="absolute -bottom-1 -right-1 size-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-[9px] text-white font-bold">
                ✓
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-blue-200 font-medium">ชื่อผู้ถือบัตร</p>
              <h2 className="text-base font-black text-white truncate leading-tight">
                {currentUser?.name || 'นายกิตติคุณ ศรีสวัสดิ์'}
              </h2>

              {/* 13-digit ID with Copy Button */}
              <div className="mt-1.5 flex items-center gap-2">
                <span className="text-xs font-mono font-bold tracking-wider text-amber-200 bg-black/25 px-2.5 py-0.5 rounded-lg border border-amber-300/30">
                  {formattedId}
                </span>
                <button
                  type="button"
                  onClick={handleCopyCitizenId}
                  className="px-2 py-0.5 bg-white/20 hover:bg-white/30 rounded-md text-[10px] font-bold text-white transition flex items-center gap-1 cursor-pointer"
                  title="คัดลอกเลขบัตร"
                >
                  {copied ? (
                    <>
                      <Icon name="check" className="size-2.5 text-emerald-300" />
                      <span className="text-emerald-200">คัดลอกแล้ว</span>
                    </>
                  ) : (
                    <>
                      <Icon name="share" className="size-2.5" />
                      <span>คัดลอก</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Card Bottom Meta */}
          <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-[11px] text-blue-100 relative z-10">
            <div className="flex items-center gap-1.5">
              <span>เบอร์:</span>
              <span className="font-bold text-white font-mono">{currentUser?.phone || '092-469-3659'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span>พื้นที่:</span>
              <span className="font-bold text-white">{currentProvinceName}</span>
            </div>
            {onOpenMyQr && (
              <button
                type="button"
                onClick={onOpenMyQr}
                className="text-[10px] bg-white text-[#0d348a] font-black px-2.5 py-1 rounded-xl shadow hover:bg-blue-50 transition cursor-pointer flex items-center gap-1"
              >
                <Icon name="qr" className="size-3" />
                <span>QR ประจำตัว</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area based on Selected Tab */}
      <div className="px-4 pt-4 space-y-4 flex-1">
        {/* ================= SECTION 1: OVERVIEW & ELIGIBILITY ================= */}
        {activeSection === 'overview' && (
          <>
            {/* 60/40 Quota & Wallet Balance Grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Subsidy Quota */}
              <div className="rounded-[22px] bg-white p-4 border border-blue-100 shadow-sm relative overflow-hidden flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="grid size-8 place-items-center rounded-xl bg-blue-50 text-blue-600">
                    <Icon name="shield" className="size-4" />
                  </span>
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                    รัฐช่วย 60%
                  </span>
                </div>
                <div className="mt-3">
                  <p className="text-[11px] text-slate-500 font-medium">สิทธิ์คงเหลือ</p>
                  <p className="text-xl font-black text-[#0d348a] font-mono leading-tight">
                    ฿{Number(userGrant?.remainingAmount || 0).toLocaleString()}
                  </p>
                  {/* Progress bar */}
                  <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(
                          100,
                          (Number(userGrant?.remainingAmount || 0) /
                            Math.max(1, Number(userGrant?.totalGrantAmount || 1000))) *
                            100
                        )}%`,
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    จากวงเงิน ฿{Number(userGrant?.totalGrantAmount || 1000).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Wallet Balance (40%) */}
              <div className="rounded-[22px] bg-white p-4 border border-emerald-100 shadow-sm relative overflow-hidden flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="grid size-8 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                    <Icon name="wallet" className="size-4" />
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowTopupModal(true)}
                    className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100/80 hover:bg-emerald-200 px-2 py-0.5 rounded-full transition cursor-pointer"
                  >
                    + เติมเงิน
                  </button>
                </div>
                <div className="mt-3">
                  <p className="text-[11px] text-slate-500 font-medium">กระเป๋าเงิน (จ่าย 40%)</p>
                  <p className="text-xl font-black text-emerald-600 font-mono leading-tight">
                    ฿{Number(wallet?.balance || 0).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">พร้อมใช้หักชำระทันที</p>
                </div>
              </div>
            </div>

            {/* Stamp & OTOP Passport Strip */}
            <div className="rounded-[22px] bg-white p-3.5 border border-amber-100 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-2xl bg-amber-50 text-amber-600 text-xl shadow-xs">
                  ⭐
                </span>
                <div>
                  <p className="text-xs font-bold text-slate-800">แสตมป์ชุมชนดิจิทัล</p>
                  <p className="text-[11px] text-slate-400">สะสมจากการซื้อสินค้า เพื่อแลกรับของรางวัล OTOP</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-amber-700 bg-amber-50 px-3 py-1 rounded-xl border border-amber-200">
                  {totalStamps} ดวง
                </span>
                {onOpenVouchers && (
                  <button
                    type="button"
                    onClick={onOpenVouchers}
                    className="grid size-8 place-items-center rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer transition"
                    title="ดูคูปองของฉัน"
                  >
                    <Icon name="chevron" className="size-4" />
                  </button>
                )}
              </div>
            </div>

            {/* KYC & Registration Status Card */}
            <div className="rounded-[24px] bg-white p-4 border border-slate-100 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-emerald-500" />
                  <h3 className="text-xs font-bold text-slate-800">สถานะการลงทะเบียน & รับสิทธิ์</h3>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                  อนุมัติสมบูรณ์
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <p className="text-[10px] text-slate-400">รหัสคำขอลงทะเบียน</p>
                  <p className="font-mono font-bold text-slate-700 mt-0.5">
                    REG-2026-{String(currentUser?.userId || 1089).padStart(4, '0')}
                  </p>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <p className="text-[10px] text-slate-400">วันหมดอายุสิทธิ์</p>
                  <p className="font-mono font-bold text-slate-700 mt-0.5">31 ธ.ค. 2569</p>
                </div>
              </div>

              {/* Verification checklist */}
              <div className="space-y-1.5 pt-1 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-600 flex items-center gap-1.5">
                    <span className="text-emerald-500 text-xs">✓</span> ตรวจสอบสัญชาติไทย (DOPA)
                  </span>
                  <span className="text-[11px] font-bold text-emerald-600">ผ่าน</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-600 flex items-center gap-1.5">
                    <span className="text-emerald-500 text-xs">✓</span> บัญชีสิทธิเงินสนับสนุนรัฐ 60%
                  </span>
                  <span className="text-[11px] font-bold text-emerald-600">฿1,000</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-600 flex items-center gap-1.5">
                    <span className="text-emerald-500 text-xs">✓</span> การเชื่อมต่อ Cloud Database
                  </span>
                  <span className="text-[11px] font-bold text-blue-600 font-mono">MySQL Live</span>
                </div>
              </div>

              {onOpenStatus && (
                <button
                  type="button"
                  onClick={onOpenStatus}
                  className="w-full mt-2 py-2.5 bg-blue-50/70 hover:bg-blue-100/80 text-[#0d348a] font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Icon name="status" className="size-4" />
                  <span>ตรวจสอบรายละเอียดคำขอ & ไทม์ไลน์</span>
                </button>
              )}
            </div>

            {/* Quick Actions Shortcuts */}
            <div className="rounded-[24px] bg-white p-3.5 border border-slate-100 shadow-sm space-y-2">
              <h3 className="text-xs font-bold text-slate-700 px-1">บริการด่วนของบัญชี</h3>

              {onOpenStatement && (
                <button
                  type="button"
                  onClick={onOpenStatement}
                  className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 border border-slate-100 transition cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                      <Icon name="history" className="size-4" />
                    </span>
                    <div>
                      <p className="text-xs font-bold text-slate-800">สรุปรายรับ - รายจ่าย</p>
                      <p className="text-[10px] text-slate-400">ดูสถิติรายสัปดาห์ / รายเดือน และ e-Receipt</p>
                    </div>
                  </div>
                  <Icon name="chevron" className="size-4 text-slate-400" />
                </button>
              )}

              {onOpenVouchers && (
                <button
                  type="button"
                  onClick={onOpenVouchers}
                  className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 border border-slate-100 transition cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 place-items-center rounded-xl bg-amber-50 text-amber-600">
                      <Icon name="gift" className="size-4" />
                    </span>
                    <div>
                      <p className="text-xs font-bold text-slate-800">คูปอง & ของรางวัลของฉัน</p>
                      <p className="text-[10px] text-slate-400">ตรวจสอบสิทธิ์คูปองส่วนลด OTOP ที่แลกไว้</p>
                    </div>
                  </div>
                  <Icon name="chevron" className="size-4 text-slate-400" />
                </button>
              )}
            </div>
          </>
        )}

        {/* ================= SECTION 2: PERSONAL INFORMATION ================= */}
        {activeSection === 'personal' && (
          <div className="rounded-[24px] bg-white p-4 border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-xs font-bold text-slate-800">ข้อมูลส่วนบุคคลและที่อยู่</h3>
                <p className="text-[10px] text-slate-400">ข้อมูลที่ลงทะเบียนในโครงการคนละครึ่ง 60/40</p>
              </div>
              {!isEditingPhone && (
                <button
                  type="button"
                  onClick={() => setIsEditingPhone(true)}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2.5 py-1 rounded-xl transition cursor-pointer"
                >
                  แก้ไขข้อมูล
                </button>
              )}
            </div>

            {profileSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                <Icon name="check" className="size-4 text-emerald-600 shrink-0" />
                <span>{profileSuccessMsg}</span>
              </div>
            )}

            {profileErrorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <Icon name="x" className="size-4 text-red-600 shrink-0" />
                <span>{profileErrorMsg}</span>
              </div>
            )}

            {!isEditingPhone ? (
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <span className="text-slate-500">ชื่อ - นามสกุล</span>
                  <span className="font-bold text-slate-800">{currentUser?.name || 'นายกิตติคุณ ศรีสวัสดิ์'}</span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <span className="text-slate-500">เลขประจำตัวประชาชน (13 หลัก)</span>
                  <span className="font-mono font-bold text-slate-800">{formattedId}</span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <span className="text-slate-500">เบอร์โทรศัพท์ที่ติดต่อได้</span>
                  <span className="font-mono font-bold text-slate-800">{currentUser?.phone || '092-469-3659'}</span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <span className="text-slate-500">จังหวัดที่ลงทะเบียนรับสิทธิ์</span>
                  <span className="font-bold text-slate-800">{currentProvinceName}</span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <span className="text-slate-500">สถานะบัญชี</span>
                  <span className="font-bold text-emerald-600">พร้อมใช้งาน (Active)</span>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveProfile} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    เบอร์โทรศัพท์มือถือ *
                  </label>
                  <input
                    type="tel"
                    value={phoneInput}
                    onChange={e => setPhoneInput(e.target.value)}
                    placeholder="เช่น 0924693659"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <p className="text-[10px] text-slate-400 mt-1">ใช้สำหรับการรับรหัส OTP และแจ้งเตือน SMS</p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    จังหวัดที่ลงทะเบียนใช้งาน *
                  </label>
                  <select
                    value={selectedProvId}
                    onChange={e => setSelectedProvId(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {INITIAL_PROVINCES.map(prov => (
                      <option key={prov.provId} value={prov.provId}>
                        {prov.provName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingPhone(false);
                      setPhoneInput(currentUser?.phone || '');
                      setProfileErrorMsg('');
                    }}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 font-bold text-xs hover:bg-slate-50 cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={profileSaveLoading}
                    className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition disabled:opacity-50 cursor-pointer"
                  >
                    {profileSaveLoading ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ================= SECTION 3: SECURITY & PASSWORD ================= */}
        {activeSection === 'security' && (
          <div className="space-y-4">
            {/* Password Change Card */}
            <div className="rounded-[24px] bg-white p-4 border border-slate-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="grid size-8 place-items-center rounded-xl bg-blue-50 text-blue-600">
                    <Icon name="shield" className="size-4" />
                  </span>
                  <div>
                    <h3 className="text-xs font-bold text-slate-800">รหัสผ่าน & ความปลอดภัย</h3>
                    <p className="text-[10px] text-slate-400">เปลี่ยนรหัสผ่านเพื่อความปลอดภัยของบัญชี</p>
                  </div>
                </div>
                {!showPasswordForm && (
                  <button
                    type="button"
                    onClick={() => setShowPasswordForm(true)}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2.5 py-1 rounded-xl transition cursor-pointer"
                  >
                    เปลี่ยนรหัสผ่าน
                  </button>
                )}
              </div>

              {passwordSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                  <Icon name="check" className="size-4 text-emerald-600 shrink-0" />
                  <span>{passwordSuccessMsg}</span>
                </div>
              )}

              {passwordErrorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <Icon name="x" className="size-4 text-red-600 shrink-0" />
                  <span>{passwordErrorMsg}</span>
                </div>
              )}

              {showPasswordForm ? (
                <form onSubmit={handleChangePassword} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      รหัสผ่านปัจจุบัน *
                    </label>
                    <div className="relative">
                      <input
                        type={showOldPass ? 'text' : 'password'}
                        value={oldPassword}
                        onChange={e => setOldPassword(e.target.value)}
                        placeholder="กรอกรหัสผ่านเดิม"
                        className="w-full px-3.5 py-2.5 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowOldPass(!showOldPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showOldPass ? '🙈' : '👁️'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      รหัสผ่านใหม่ (อย่างน้อย 4 ตัวอักษร) *
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPass ? 'text' : 'password'}
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="กรอกรหัสผ่านใหม่"
                        className="w-full px-3.5 py-2.5 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPass(!showNewPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showNewPass ? '🙈' : '👁️'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      ยืนยันรหัสผ่านใหม่อีกครั้ง *
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowPasswordForm(false);
                        setOldPassword('');
                        setNewPassword('');
                        setConfirmPassword('');
                        setPasswordErrorMsg('');
                      }}
                      className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 font-bold text-xs hover:bg-slate-50 cursor-pointer"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="submit"
                      disabled={passwordLoading}
                      className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition disabled:opacity-50 cursor-pointer"
                    >
                      {passwordLoading ? 'กำลังบันทึก...' : 'บันทึกรหัสผ่าน'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-slate-800">รหัสผ่านบัญชี</p>
                    <p className="text-[10px] text-slate-400">อัปเดตล่าสุดเมื่อลงทะเบียนระบบ</p>
                  </div>
                  <span className="text-slate-400 font-mono">••••••••</span>
                </div>
              )}
            </div>

            {/* Active Session & Device Info */}
            <div className="rounded-[24px] bg-white p-4 border border-slate-100 shadow-sm space-y-2">
              <h3 className="text-xs font-bold text-slate-800">อุปกรณ์ที่กำลังใช้งาน</h3>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">📱</span>
                  <div>
                    <p className="font-bold text-slate-800">สมาร์ตโฟนเครื่องนี้</p>
                    <p className="text-[10px] text-emerald-600 font-medium">เชื่อมต่ออยู่ • ปลอดภัยสูงสุด</p>
                  </div>
                </div>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                  ปัจจุบัน
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ================= SECTION 4: APP SETTINGS & LEGAL ================= */}
        {activeSection === 'settings' && (
          <div className="space-y-4">
            {/* Notification & Preference Toggles */}
            <div className="rounded-[24px] bg-white p-4 border border-slate-100 shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-slate-800">การแจ้งเตือน & ความเป็นส่วนตัว</h3>

              {/* SMS Alert */}
              <div className="flex items-center justify-between py-2 border-b border-slate-50">
                <div>
                  <p className="text-xs font-bold text-slate-800">แจ้งเตือน SMS เมื่อใช้จ่าย</p>
                  <p className="text-[10px] text-slate-400">ส่ง SMS แจ้งยอด 60/40 เมื่อเกิน ฿100</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSmsAlert(!smsAlert)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition duration-300 cursor-pointer ${
                    smsAlert ? 'bg-blue-600' : 'bg-slate-200'
                  }`}
                >
                  <div
                    className={`bg-white size-4 rounded-full shadow-md transform transition duration-300 ${
                      smsAlert ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Biometrics */}
              <div className="flex items-center justify-between py-2 border-b border-slate-50">
                <div>
                  <p className="text-xs font-bold text-slate-800">สแกนลายนิ้วมือ / Face ID</p>
                  <p className="text-[10px] text-slate-400">ใช้สแกนใบหน้าเพื่อยืนยันก่อนชำระเงิน</p>
                </div>
                <button
                  type="button"
                  onClick={() => setBiometricLogin(!biometricLogin)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition duration-300 cursor-pointer ${
                    biometricLogin ? 'bg-blue-600' : 'bg-slate-200'
                  }`}
                >
                  <div
                    className={`bg-white size-4 rounded-full shadow-md transform transition duration-300 ${
                      biometricLogin ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* AI Mission Alerts */}
              <div className="flex items-center justify-between py-2 border-b border-slate-50">
                <div>
                  <p className="text-xs font-bold text-slate-800">ภารกิจชี้เป้าร้านค้าจาก AI</p>
                  <p className="text-[10px] text-slate-400">แนะนำร้านค้าชุมชนที่ต้องการการอุดหนุน</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAiMissionsAlert(!aiMissionsAlert)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition duration-300 cursor-pointer ${
                    aiMissionsAlert ? 'bg-blue-600' : 'bg-slate-200'
                  }`}
                >
                  <div
                    className={`bg-white size-4 rounded-full shadow-md transform transition duration-300 ${
                      aiMissionsAlert ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Weekly Digest */}
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-xs font-bold text-slate-800">สรุปการใช้สิทธิ์รายสัปดาห์</p>
                  <p className="text-[10px] text-slate-400">รับรายงานสรุปยอดประหยัด 60% ประจำสัปดาห์</p>
                </div>
                <button
                  type="button"
                  onClick={() => setWeeklyDigest(!weeklyDigest)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition duration-300 cursor-pointer ${
                    weeklyDigest ? 'bg-blue-600' : 'bg-slate-200'
                  }`}
                >
                  <div
                    className={`bg-white size-4 rounded-full shadow-md transform transition duration-300 ${
                      weeklyDigest ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Support & Legal Links */}
            <div className="rounded-[24px] bg-white p-4 border border-slate-100 shadow-sm space-y-2">
              <h3 className="text-xs font-bold text-slate-800 mb-2">ช่วยเหลือ & นโยบายความคุ้มครอง</h3>

              <a
                href="tel:1111"
                className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 border border-slate-100 transition text-left cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-xl bg-blue-50 text-blue-600 font-bold text-sm">
                    📞
                  </span>
                  <div>
                    <p className="text-xs font-bold text-slate-800">ศูนย์บริการประชาชน สายด่วน 1111</p>
                    <p className="text-[10px] text-slate-400">ติดต่อเจ้าหน้าที่ภาครัฐได้ตลอด 24 ชั่วโมง</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">
                  โทรฟรี
                </span>
              </a>

              <button
                type="button"
                onClick={() => setLegalModalType('pdpa')}
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 border border-slate-100 transition text-left cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-xl bg-violet-50 text-violet-600 font-bold text-sm">
                    🔒
                  </span>
                  <div>
                    <p className="text-xs font-bold text-slate-800">นโยบายคุ้มครองข้อมูลส่วนบุคคล (PDPA)</p>
                    <p className="text-[10px] text-slate-400">พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562</p>
                  </div>
                </div>
                <Icon name="chevron" className="size-4 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={() => setLegalModalType('terms')}
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 border border-slate-100 transition text-left cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-xl bg-amber-50 text-amber-600 font-bold text-sm">
                    📋
                  </span>
                  <div>
                    <p className="text-xs font-bold text-slate-800">เงื่อนไขและข้อกำหนดโครงการคนละครึ่ง 60/40</p>
                    <p className="text-[10px] text-slate-400">กฎเกณฑ์การใช้สิทธิ์และการอุดหนุน</p>
                  </div>
                </div>
                <Icon name="chevron" className="size-4 text-slate-400" />
              </button>
            </div>

            {/* App Version Info */}
            <div className="text-center py-2 text-[10px] text-slate-400">
              <p>ไทยช่วยไทยพลีส (โครงการคนละครึ่ง 60/40)</p>
              <p className="mt-0.5 font-mono">เวอร์ชัน 2.4.0 • Build 2026.10.19</p>
              <p className="mt-0.5">กระทรวงการคลัง & สำนักงานส่งเสริมเศรษฐกิจดิจิทัล (depa)</p>
            </div>
          </div>
        )}

        {/* ================= PROMINENT LOGOUT BUTTON ================= */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full py-3.5 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-extrabold text-xs rounded-2xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
          >
            <span className="text-sm">🚪</span>
            <span>ออกจากระบบอย่างปลอดภัย (Sign Out)</span>
          </button>
        </div>
      </div>

      {/* ================= MODAL: QUICK TOP-UP ================= */}
      {showTopupModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in"
          onClick={() => setShowTopupModal(false)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-[28px] overflow-hidden shadow-2xl p-5 space-y-4 animate-scale-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="grid size-9 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                  <Icon name="wallet" className="size-5" />
                </span>
                <div>
                  <h3 className="text-sm font-black text-slate-800">เติมเงินกระเป๋า 40%</h3>
                  <p className="text-[10px] text-slate-400">ยอดคงเหลือปัจจุบัน ฿{wallet.balance.toLocaleString()}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTopupModal(false)}
                className="size-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-xs font-bold transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 font-medium">เลือกจำนวนเงินที่ต้องการเติม:</p>

            <div className="grid grid-cols-2 gap-2.5">
              {[100, 300, 500, 1000].map(amt => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setTopupAmount(amt)}
                  className={`py-3 px-4 rounded-2xl border text-center font-bold text-sm transition cursor-pointer ${
                    topupAmount === amt
                      ? 'bg-emerald-500 text-white border-emerald-500 shadow-md'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  ฿{amt.toLocaleString()}
                </button>
              ))}
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setShowTopupModal(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmTopup}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow cursor-pointer"
              >
                ยืนยันเติมเงิน ฿{topupAmount.toLocaleString()}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: LOGOUT CONFIRMATION ================= */}
      {showLogoutConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in"
          onClick={() => setShowLogoutConfirm(false)}
        >
          <div
            className="w-full max-w-xs bg-white rounded-[28px] overflow-hidden shadow-2xl p-5 text-center space-y-4 animate-scale-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="size-14 rounded-full bg-red-100 text-red-600 mx-auto flex items-center justify-center text-2xl shadow-inner">
              🚪
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-800">ยืนยันการออกจากระบบ?</h3>
              <p className="text-xs text-slate-500 mt-1">
                คุณจะต้องเข้าสู่ระบบใหม่ด้วยหมายเลขบัตรประชาชนและเบอร์โทรศัพท์เพื่อใช้งานอีกครั้ง
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  logout();
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition shadow-md cursor-pointer"
              >
                ออกจากระบบ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: PDPA & TERMS ================= */}
      {legalModalType && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in"
          onClick={() => setLegalModalType(null)}
        >
          <div
            className="w-full max-w-sm max-h-[80vh] bg-white rounded-[28px] overflow-hidden shadow-2xl p-5 flex flex-col space-y-3 animate-scale-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-800">
                {legalModalType === 'pdpa'
                  ? 'นโยบายคุ้มครองข้อมูลส่วนบุคคล (PDPA)'
                  : 'เงื่อนไขโครงการคนละครึ่ง 60/40'}
              </h3>
              <button
                type="button"
                onClick={() => setLegalModalType(null)}
                className="size-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-xs font-bold transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto text-xs text-slate-600 space-y-2.5 pr-1 leading-relaxed">
              {legalModalType === 'pdpa' ? (
                <>
                  <p className="font-bold text-slate-800">การคุ้มครองข้อมูลส่วนบุคคลตาม พ.ร.บ. พ.ศ. 2562</p>
                  <p>
                    โครงการไทยช่วยไทยพลีสและกระทรวงการคลังให้ความสำคัญสูงสุดกับการคุ้มครองข้อมูลส่วนบุคคลของท่าน
                    ข้อมูลเลขประจำตัวประชาชน 13 หลัก, ชื่อ-นามสกุล, หมายเลขโทรศัพท์ และประวัติการทำธุรกรรม
                    จะถูกจัดเก็บและประมวลผลเพื่อวัตถุประสงค์ในการตรวจสอบสิทธิ์โครงการคนละครึ่ง 60/40
                    และป้องกันการทุจริตเท่านั้น
                  </p>
                  <p>
                    ระบบใช้การเข้ารหัสข้อมูลระดับสากล SSL/TLS 256-bit และจัดเก็บบนคลาวด์มาตรฐานความปลอดภัยภาครัฐ
                    ท่านมีสิทธิในการเข้าถึง ขอแก้ไข หรือเพิกถอนความยินยอมได้ตามที่กฎหมายกำหนด
                  </p>
                </>
              ) : (
                <>
                  <p className="font-bold text-slate-800">ข้อกำหนดและเงื่อนไขการใช้สิทธิ์</p>
                  <p>
                    1. ผู้ได้รับสิทธิ์จะได้รับเงินสนับสนุนจากรัฐบาล 60% ของยอดซื้อสินค้า ณ ร้านค้าชุมชนที่เข้าร่วมโครงการ
                    โดยผู้ใช้ต้องชำระส่วนที่เหลือ 40% จากกระเป๋าเงินดิจิทัล
                  </p>
                  <p>
                    2. วงเงินสิทธิรัฐสนับสนุนสูงสุดไม่เกิน ฿1,000 ต่อคนตลอดระยะเวลาโครงการ และสามารถใช้ได้ถึงวันที่ 31 ธันวาคม 2569
                  </p>
                  <p>
                    3. การชำระเงินผ่าน QR Dynamic Token มีอายุ 3 นาที เพื่อความปลอดภัยสูงสุดในการทำธุรกรรม
                  </p>
                </>
              )}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setLegalModalType(null)}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow cursor-pointer"
              >
                รับทราบและเข้าใจแล้ว
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

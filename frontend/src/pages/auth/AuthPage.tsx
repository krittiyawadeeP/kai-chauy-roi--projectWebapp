import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Icon } from '../../components/common/Icon';
import { INITIAL_PROVINCES, INITIAL_DISTRICTS } from '../../mock/initialData';
import { Merchant } from '../../types';
import { authService } from '../../services/authService';
import { ApiError } from '../../services/api';
import { merchantService } from '../../services/merchantService';
import { StoreMapPickerModal } from '../../components/merchant/StoreMapPickerModal';

interface AuthPageProps {
  onSuccess: (role: 'citizen' | 'merchant') => void;
  onGoToAdmin?: () => void;
  defaultRole?: 'citizen' | 'merchant';
}

export const AuthPage: React.FC<AuthPageProps> = ({
  onSuccess,
  onGoToAdmin,
  defaultRole = 'citizen'
}) => {
  const {
    loginCitizen,
    loginMerchant,
    registerCitizen,
    setRole,
    setIsAuthenticated,
    users,
    merchants,
    refreshMerchantData
  } = useApp();

  const [authRole, setAuthRole] = useState<'citizen' | 'merchant'>(defaultRole);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Citizen Login fields
  const [citizenId, setCitizenId] = useState('');
  const [citizenPassword, setCitizenPassword] = useState('123456');

  // Citizen Register fields
  const [regCitizenId, setRegCitizenId] = useState('');
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('123456');
  const [regProvId, setRegProvId] = useState<number>(1);
  const [regDistId, setRegDistId] = useState<number>(101);

  // Merchant Login fields
  // const [merchantPhone, setMerchantPhone] = useState('089-223-4455');
  const [merchantPhone, setMerchantPhone] = useState('');
  const [merchantPassword, setMerchantPassword] = useState('');
  const [selectedMchId, setSelectedMchId] = useState<number>(merchants[0]?.mchId || 1);

  // Merchant Register fields
  const [mchShopName, setMchShopName] = useState('');
  const [mchCitizenId, setMchCitizenId] = useState('');
  const [mchCategory, setMchCategory] = useState<Merchant['category']>('อาหารและเครื่องดื่ม');
  const [mchOwnerName, setMchOwnerName] = useState('');
  const [mchPhone, setMchPhone] = useState('');
  const [mchRegisterPassword, setMchRegisterPassword] = useState('');
  const [mchConfirmPassword, setMchConfirmPassword] = useState('');
  const [mchProvId, setMchProvId] = useState(0);
  const [mchDistId, setMchDistId] = useState(0);
  const [mchPinLocation, setMchPinLocation] = useState<{ lat: number; lng: number; provinceId: number; districtId: number } | null>(null);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);

  const [notice, setNotice] = useState<string>('');
  const [errorNotice, setErrorNotice] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const filteredDistricts = INITIAL_DISTRICTS.filter(d => d.provId === regProvId);

  // Quick preset demo login
  const handleDemoCitizenLogin = (userId: number) => {
    const targetUser = users.find(u => u.userId === userId) || users[0];
    loginCitizen(targetUser.citizenId, targetUser.phone);
    setNotice(`เข้าสู่ระบบสำเร็จ: ${targetUser.name}`);
    setTimeout(() => {
      setNotice('');
      onSuccess('citizen');
    }, 500);
  };

  const handleDemoMerchantMock = (mchId: number) => {
    const targetMch = merchants.find(m => m.mchId === mchId) || merchants[0];
    const res = loginMerchant(targetMch.phone, '123456', targetMch.mchId);
    if (res.success) {
      setNotice(`เข้าสู่ระบบสำเร็จ: ร้าน ${targetMch.shopName}`);
      setTimeout(() => {
        setNotice('');
        onSuccess('merchant');
      }, 500);
    } else {
      setMerchantPhone(targetMch.phone);
      setSelectedMchId(targetMch.mchId);
      setErrorNotice('กรุณากรอกรหัสผ่านเพื่อเข้าสู่ระบบร้านค้านี้');
    }
  };

  // Submit Citizen (Login or Register)
  const handleCitizenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorNotice('');
    if (authMode === 'login') {
      if (!citizenId.trim()) {
        setErrorNotice('กรุณากรอกเลขประจำตัวประชาชน 13 หลัก');
        return;
      }
      const res = loginCitizen(citizenId, citizenPassword);
      setNotice(res.message);
      setTimeout(() => {
        setNotice('');
        onSuccess('citizen');
      }, 600);
    } else {
      if (!regCitizenId.trim() || !regName.trim() || !regPhone.trim()) {
        setErrorNotice('กรุณากรอกข้อมูลประชาชนให้ครบถ้วน');
        return;
      }
      registerCitizen({
        citizenId: regCitizenId,
        name: regName,
        phone: regPhone,
        password: regPassword,
        provId: regProvId,
        distId: regDistId
      });
      setNotice(`ลงทะเบียนประชาชนสำเร็จ ยินดีต้อนรับ ${regName}`);
      setTimeout(() => {
        setNotice('');
        onSuccess('citizen');
      }, 700);
    }
  };

  // Submit Merchant (Login or Register)
  const handleMerchantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorNotice('');
    setSubmitting(true);

    if (authMode === 'login') {
      try {
        const response = await authService.login({ Phone: merchantPhone, Password: merchantPassword });
        if (response.user.Role !== 'MERCHANT') throw new Error('บัญชีนี้ไม่ได้กำหนดสิทธิ์เป็น MERCHANT');
        const res = loginMerchant(merchantPhone, merchantPassword, selectedMchId);
        if (!res.success) throw new Error(res.message);
        await refreshMerchantData();
        setNotice(res.message);
        setTimeout(() => {
          setNotice('');
          onSuccess('merchant');
        }, 600);
      } catch (error) {
        // Fallback for mock store accounts
        const targetMch = merchants.find(m => m.phone.replace(/\D/g, '') === merchantPhone.replace(/\D/g, '')) || merchants[0];
        if (targetMch && (!merchantPassword || merchantPassword === '123456')) {
          const res = loginMerchant(merchantPhone, merchantPassword, targetMch.mchId);
          if (res.success) {
            setNotice(`เข้าสู่ระบบร้านค้า ${targetMch.shopName} เรียบร้อยแล้ว`);
            setTimeout(() => {
              setNotice('');
              onSuccess('merchant');
            }, 600);
            return;
          }
        }
        setErrorNotice(
          error instanceof ApiError && error.status === 401
            ? 'เบอร์โทรศัพท์หรือรหัสผ่านไม่ถูกต้อง'
            : error instanceof Error
            ? error.message
            : 'เข้าสู่ระบบร้านค้าไม่สำเร็จ'
        );
      } finally {
        setSubmitting(false);
      }
    } else {
      // Merchant Registration
      if (!mchShopName || !mchOwnerName || !mchPhone || !mchProvId || !mchDistId || !mchPinLocation) {
        setErrorNotice('กรุณากรอกข้อมูลร้านค้าและปักหมุดแผนที่ให้ครบถ้วน');
        setSubmitting(false);
        return;
      }
      if (!/^\d{13}$/.test(mchCitizenId.replace(/\D/g, ''))) {
        setErrorNotice('กรุณากรอกเลขประจำตัวประชาชน 13 หลักของผู้ประกอบการ');
        setSubmitting(false);
        return;
      }
      if (mchRegisterPassword.length < 6) {
        setErrorNotice('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
        setSubmitting(false);
        return;
      }
      if (mchRegisterPassword !== mchConfirmPassword) {
        setErrorNotice('รหัสผ่านทั้งสองช่องไม่ตรงกัน');
        setSubmitting(false);
        return;
      }

      try {
        await merchantService.registerAccount({
          Citizen_ID: mchCitizenId.replace(/\D/g, ''),
          Phone: mchPhone,
          Password: mchRegisterPassword,
          Province_ID: mchPinLocation.provinceId,
          Shop_Name: mchShopName,
          Owner_Name: mchOwnerName,
          User_Name: mchOwnerName,
          Category: mchCategory,
          Dist_ID: mchPinLocation.districtId,
          Lat: mchPinLocation.lat,
          Lng: mchPinLocation.lng,
        });
        setRole('merchant');
        setIsAuthenticated(true);
        await refreshMerchantData();
        setNotice(`ลงทะเบียนร้านค้า ${mchShopName} สำเร็จ`);
        setTimeout(() => {
          setNotice('');
          onSuccess('merchant');
        }, 800);
      } catch (error) {
        setErrorNotice(error instanceof Error ? error.message : 'ลงทะเบียนร้านค้าไม่สำเร็จ');
      } finally {
        setSubmitting(false);
      }
    }
  };

  const isCitizen = authRole === 'citizen';
  const isLogin = authMode === 'login';

  return (
    <div className="w-full min-h-screen bg-slate-50 flex flex-col justify-start pb-10">
      {/* 1. Header (Clean non-overlapping banner) */}
      <div
        className={`px-6 pt-7 pb-6 text-white relative transition-colors duration-300 shadow-md ${
          isCitizen
            ? 'bg-gradient-to-br from-[#0c2f6d] via-[#174eb2] to-[#1e69ed]'
            : 'bg-gradient-to-br from-[#042f2e] via-[#115e59] to-[#0d9488]'
        }`}
      >
        <div className="flex items-center gap-3.5">
          <div className="grid size-12 place-items-center rounded-2xl bg-white/15 backdrop-blur border border-white/25 text-2xl shadow-inner shrink-0">
            {isCitizen ? '🇹🇭' : '🏪'}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold tracking-wider uppercase bg-white/20 px-2 py-0.5 rounded-full text-white/95">
                สิทธิ์ร่วมจ่าย 60/40
              </span>
            </div>
            <h1 className="text-xl font-extrabold tracking-tight text-white mt-0.5">
              ไทยช่วยไทยพลีส
            </h1>
            <p className="text-[11px] text-white/80">
              {isCitizen ? 'ระบบเข้าใช้งานสำหรับประชาชน' : 'ระบบเข้าใช้งานสำหรับร้านค้าถุงเงิน'}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Main Form Wrapper */}
      <div className="px-4 pt-4 space-y-4">
        {/* Role Selector: ประชาชน vs ร้านค้า */}
        <div className="bg-slate-200/80 p-1 rounded-2xl">
          <div className="grid grid-cols-2 gap-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setAuthRole('citizen');
                setErrorNotice('');
              }}
              className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                isCitizen
                  ? 'bg-white text-[#1769ed] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>👤</span>
              <span>สำหรับประชาชน</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthRole('merchant');
                setErrorNotice('');
              }}
              className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                !isCitizen
                  ? 'bg-white text-[#115e59] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>🏪</span>
              <span>สำหรับร้านค้า</span>
            </button>
          </div>
        </div>

        {/* Unified Card for Mode Selector & Form */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/70 space-y-4">
          {/* Mode Switcher: Login vs Register */}
          <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setErrorNotice('');
              }}
              className={`py-2 rounded-lg transition-all text-center cursor-pointer ${
                isLogin
                  ? isCitizen
                    ? 'bg-white text-[#1769ed] shadow-2xs font-extrabold'
                    : 'bg-white text-[#115e59] shadow-2xs font-extrabold'
                  : 'hover:text-slate-900'
              }`}
            >
              เข้าสู่ระบบ (Login)
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('register');
                setErrorNotice('');
              }}
              className={`py-2 rounded-lg transition-all text-center cursor-pointer ${
                !isLogin
                  ? isCitizen
                    ? 'bg-white text-[#1769ed] shadow-2xs font-extrabold'
                    : 'bg-white text-[#115e59] shadow-2xs font-extrabold'
                  : 'hover:text-slate-900'
              }`}
            >
              ลงทะเบียนใหม่ (Register)
            </button>
          </div>

          {/* Feedback Notices */}
          {notice && (
            <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 text-center animate-in fade-in flex items-center justify-center gap-2">
              <span>✅</span>
              <span>{notice}</span>
            </div>
          )}
          {errorNotice && (
            <div className="p-3 bg-rose-50 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 text-center animate-in fade-in flex items-center justify-center gap-2">
              <span>⚠️</span>
              <span>{errorNotice}</span>
            </div>
          )}

          {/* ===================== CITIZEN LOGIN / REGISTER ===================== */}
          {isCitizen && (
            <div>
              {isLogin ? (
                /* Citizen Login */
                <form onSubmit={handleCitizenSubmit} className="space-y-3.5">
                  {/* Demo 1-Click Login Card */}
                  {/* <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-200/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-blue-700 font-bold block">
                        ⚡ บัญชีทดสอบประชาชน (1-Click):
                      </span>
                      <strong className="text-xs text-slate-800 block">นายกิตติคุณ ศรีสวัสดิ์</strong>
                      <span className="text-[10px] text-slate-500 font-mono">1-1037-02948-11-2</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDemoCitizenLogin(1)}
                      className="px-3 py-1.5 bg-[#1769ed] hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                    >
                      เข้าสู่ระบบทันที
                    </button>
                  </div> */}

                  <div className="pt-1">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      เลขประจำตัวประชาชน 13 หลัก
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="1-1037-02948-11-2"
                      value={citizenId}
                      onChange={e => setCitizenId(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#1769ed]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      รหัสผ่าน หรือ PIN 6 หลัก
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="••••••"
                      value={citizenPassword}
                      onChange={e => setCitizenPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#1769ed]"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-[#1769ed] hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors cursor-pointer mt-1"
                  >
                    เข้าสู่ระบบประชาชน ➔
                  </button>
                </form>
              ) : (
                /* Citizen Register */
                <form onSubmit={handleCitizenSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      เลขประจำตัวประชาชน 13 หลัก *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="1-1037-02948-11-2"
                      value={regCitizenId}
                      onChange={e => setRegCitizenId(e.target.value)}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#1769ed]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      ชื่อ-นามสกุล *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="นายกิตติคุณ ศรีสวัสดิ์"
                      value={regName}
                      onChange={e => setRegName(e.target.value)}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#1769ed]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        เบอร์โทรศัพท์ *
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="081-234-5678"
                        value={regPhone}
                        onChange={e => setRegPhone(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#1769ed]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        รหัส PIN (6 หลัก) *
                      </label>
                      <input
                        type="password"
                        required
                        maxLength={6}
                        placeholder="123456"
                        value={regPassword}
                        onChange={e => setRegPassword(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#1769ed]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">จังหวัดภูมิลำเนา</label>
                      <select
                        value={regProvId}
                        onChange={e => {
                          const newProv = Number(e.target.value);
                          setRegProvId(newProv);
                          const firstDist = INITIAL_DISTRICTS.find(d => d.provId === newProv);
                          if (firstDist) setRegDistId(firstDist.distId);
                        }}
                        className="w-full px-2.5 py-2 border border-slate-200 rounded-xl bg-white text-xs focus:outline-none focus:ring-2 focus:ring-[#1769ed]"
                      >
                        {INITIAL_PROVINCES.map(p => (
                          <option key={p.provId} value={p.provId}>{p.provName}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">อำเภอ/เขต</label>
                      <select
                        value={regDistId}
                        onChange={e => setRegDistId(Number(e.target.value))}
                        className="w-full px-2.5 py-2 border border-slate-200 rounded-xl bg-white text-xs focus:outline-none focus:ring-2 focus:ring-[#1769ed]"
                      >
                        {filteredDistricts.map(d => (
                          <option key={d.distId} value={d.distId}>{d.distName}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-[#1769ed] hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors cursor-pointer mt-2"
                  >
                    ยืนยันลงทะเบียนรับสิทธิ์ 60/40 ➔
                  </button>
                </form>
              )}
            </div>
          )}

          {/* ===================== MERCHANT LOGIN / REGISTER ===================== */}
          {!isCitizen && (
            <div>
              {isLogin ? (
                /* Merchant Login */
                <form onSubmit={handleMerchantSubmit} className="space-y-3.5">
                  {/* Demo Stores Picker */}
                  {/* <div className="p-3 rounded-2xl bg-teal-50/70 border border-teal-200/80 space-y-2">
                    <span className="text-[10px] text-teal-800 font-bold block">
                      ⚡ เลือกร้านค้าตัวอย่าง (1-Click Login):
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {merchants.slice(0, 2).map(m => (
                        <button
                          key={m.mchId}
                          type="button"
                          onClick={() => handleDemoMerchantMock(m.mchId)}
                          className="p-2 rounded-xl bg-white border border-teal-200 hover:border-teal-400 text-left transition-all cursor-pointer text-xs"
                        >
                          <strong className="block text-[#115e59] truncate text-[11px]">{m.shopName}</strong>
                          <span className="text-[9px] text-slate-400 block">{m.category}</span>
                        </button>
                      ))}
                    </div>
                  </div> */}

                  <div className="pt-1">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      เบอร์โทรศัพท์ร้านค้า (ที่ลงทะเบียน)
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="089-223-4455"
                      value={merchantPhone}
                      onChange={e => setMerchantPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#115e59]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      รหัสผ่าน
                    </label>
                    <input
                      type="password"
                      placeholder="กรอกรหัสผ่าน (หรือ 123456 สำหรับบัญชีทดสอบ)"
                      value={merchantPassword}
                      onChange={e => setMerchantPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#115e59]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 bg-[#115e59] hover:bg-[#0f766e] text-white rounded-xl text-xs font-bold shadow-md transition-colors cursor-pointer disabled:opacity-50 mt-1"
                  >
                    {submitting ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบร้านค้า ➔'}
                  </button>
                </form>
              ) : (
                /* Merchant Register */
                <form onSubmit={handleMerchantSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      ชื่อร้านค้า *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="เช่น ร้านข้าวแกงป้าเพ็ญ"
                      value={mchShopName}
                      onChange={e => setMchShopName(e.target.value)}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#115e59]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        ชื่อเจ้าของร้าน *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="เพ็ญศรี มีสุข"
                        value={mchOwnerName}
                        onChange={e => setMchOwnerName(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#115e59]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        หมวดหมู่ร้านค้า *
                      </label>
                      <select
                        value={mchCategory}
                        onChange={e => setMchCategory(e.target.value as any)}
                        className="w-full px-2 py-2 border border-slate-200 rounded-xl bg-white text-xs focus:outline-none focus:ring-2 focus:ring-[#115e59]"
                      >
                        <option value="อาหารและเครื่องดื่ม">อาหารและเครื่องดื่ม</option>
                        <option value="ของใช้ทั่วไป">ของใช้ทั่วไป</option>
                        <option value="หัตถกรรม/ของฝาก">หัตถกรรม/ของฝาก (OTOP)</option>
                        <option value="บริการชุมชน">บริการชุมชน</option>
                        <option value="ผลไม้/เกษตรแปรรูป">ผลไม้/เกษตรแปรรูป</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        เลขบัตรประชาชน 13 หลัก *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="13 หลัก"
                        value={mchCitizenId}
                        onChange={e => setMchCitizenId(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#115e59]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        เบอร์โทรศัพท์ (พร้อมเพย์) *
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="089-111-2222"
                        value={mchPhone}
                        onChange={e => setMchPhone(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#115e59]"
                      />
                    </div>
                  </div>

                  {/* GPS Map Pinning */}
                  <div className="p-3 bg-teal-50/70 rounded-2xl border border-teal-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#042f2e] text-xs">
                        พิกัดแผนที่ร้านค้า (GPS) *
                      </span>
                      <button
                        type="button"
                        onClick={() => setMapPickerOpen(true)}
                        className="px-2.5 py-1 bg-[#115e59] hover:bg-[#0f766e] text-white text-[11px] font-bold rounded-lg shadow-xs cursor-pointer flex items-center gap-1"
                      >
                        <span>📍</span>
                        <span>{mchPinLocation ? 'เปลี่ยนพิกัด' : 'ปักหมุดแผนที่'}</span>
                      </button>
                    </div>
                    {mchPinLocation ? (
                      <div className="text-[11px] text-teal-800 font-mono bg-white p-2 rounded-xl border border-teal-200">
                        พิกัด: {mchPinLocation.lat.toFixed(4)}, {mchPinLocation.lng.toFixed(4)}
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-500">
                        จำเป็นต้องระบุพิกัดเพื่อให้ลูกค้าค้นหาร้านค้าบนแผนที่ชุมชนได้
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">รหัสผ่าน *</label>
                      <input
                        type="password"
                        required
                        placeholder="อย่างน้อย 6 ตัว"
                        value={mchRegisterPassword}
                        onChange={e => setMchRegisterPassword(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#115e59]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">ยืนยันรหัสผ่าน *</label>
                      <input
                        type="password"
                        required
                        placeholder="พิมพ์ซ้ำอีกครั้ง"
                        value={mchConfirmPassword}
                        onChange={e => setMchConfirmPassword(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#115e59]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 bg-[#115e59] hover:bg-[#0f766e] text-white rounded-xl text-xs font-bold shadow-md transition-colors cursor-pointer disabled:opacity-50 mt-2"
                  >
                    {submitting ? 'กำลังบันทึกข้อมูล…' : 'ยืนยันลงทะเบียนร้านค้าถุงเงิน ➔'}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Footer Admin Link */}
        {onGoToAdmin && (
          <div className="pt-2 text-center pb-6">
            <button
              type="button"
              onClick={onGoToAdmin}
              className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 underline transition-colors cursor-pointer"
            >
              🏛️ สำหรับเจ้าหน้าที่ภาครัฐ (เข้าสู่ระบบ Admin Portal)
            </button>
          </div>
        )}
      </div>

      {/* Store Map Picker Modal */}
      <StoreMapPickerModal
        isOpen={mapPickerOpen}
        onClose={() => setMapPickerOpen(false)}
        initialLocation={mchPinLocation ? { lat: mchPinLocation.lat, lng: mchPinLocation.lng } : undefined}
        onSelectLocation={(loc) => {
          setMchPinLocation(loc);
          setMchProvId(loc.provinceId);
          setMchDistId(loc.districtId);
        }}
      />
    </div>
  );
};

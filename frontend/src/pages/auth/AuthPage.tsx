import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Merchant } from '../../types';
import { authService } from '../../services/authService';
import { ApiError } from '../../services/api';
import { merchantService } from '../../services/merchantService';
import { StoreMapPickerModal } from '../../components/merchant/StoreMapPickerModal';
import { ApiProvince, ApiDistrict, geoService } from '../../services/geoService';

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
    setRole,
    setIsAuthenticated,
    refreshMerchantData,
    refreshCitizenData
  } = useApp();

  const [authRole, setAuthRole] = useState<'citizen' | 'merchant'>(defaultRole);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Citizen Login fields
  const [citizenId, setCitizenId] = useState('1100703611736');
  const [citizenPassword, setCitizenPassword] = useState('123456');

  // Citizen Register fields
  const [regCitizenId, setRegCitizenId] = useState('');
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('123456');
  const [regProvId, setRegProvId] = useState<number>(10);
  const [regDistId, setRegDistId] = useState<number>(0);

  // Geographic state from DB
  const [provinces, setProvinces] = useState<ApiProvince[]>([]);
  const [districts, setDistricts] = useState<ApiDistrict[]>([]);
  const [loadingGeo, setLoadingGeo] = useState(false);

  // Merchant Login fields
  const [merchantPhone, setMerchantPhone] = useState('0618700517');
  const [merchantPassword, setMerchantPassword] = useState('123456');

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

  // Fetch real provinces from Cloud MySQL
  useEffect(() => {
    setLoadingGeo(true);
    geoService.getProvinces()
      .then(items => {
        setProvinces(items);
        if (items.length > 0) {
          setRegProvId(prev => prev || items[0].Prov_ID);
        }
      })
      .catch(err => {
        console.error('Failed to load provinces:', err);
      })
      .finally(() => setLoadingGeo(false));
  }, []);

  // Fetch real districts when selected province changes
  useEffect(() => {
    if (!regProvId) return;
    geoService.getDistricts(regProvId)
      .then(items => {
        setDistricts(items);
        if (items.length > 0) {
          setRegDistId(items[0].Dist_ID);
        }
      })
      .catch(err => {
        console.error('Failed to load districts:', err);
      });
  }, [regProvId]);

  // Submit Citizen (Login or Register)
  const handleCitizenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorNotice('');
    setSubmitting(true);
    try {
      if (authMode === 'login') {
        const cleanIdentifier = citizenId.replace(/\D/g, '');
        if (!cleanIdentifier) {
          setErrorNotice('กรุณากรอกเลขประจำตัวประชาชน 13 หลัก หรือเบอร์โทรศัพท์');
          return;
        }
        const response = await authService.login({ identifier: cleanIdentifier, Password: citizenPassword });
        if (response.user.Role !== 'USER') {
          throw new Error(`บัญชีนี้ไม่ใช่บัญชีประชาชน (Role ในระบบ: ${response.user.Role})`);
        }
        const res = loginCitizen(response.user.Citizen_ID, response.user.Phone, response.user);
        await refreshCitizenData();
        setNotice(res.message);
        setTimeout(() => {
          setNotice('');
          onSuccess('citizen');
        }, 600);
      } else {
        const cleanRegId = regCitizenId.replace(/\D/g, '');
        const cleanRegPhone = regPhone.replace(/\D/g, '');

        if (!cleanRegId || !regName.trim() || !cleanRegPhone) {
          setErrorNotice('กรุณากรอกข้อมูลประชาชนให้ครบถ้วน');
          return;
        }
        if (!/^\d{13}$/.test(cleanRegId)) {
          setErrorNotice('เลขประจำตัวประชาชนต้องมี 13 หลัก');
          return;
        }
        if (cleanRegPhone.length < 9) {
          setErrorNotice('เบอร์โทรศัพท์ต้องมีอย่างน้อย 9-10 หลัก');
          return;
        }
        if (regPassword.length < 6) {
          setErrorNotice('รหัสผ่าน / PIN ต้องมีอย่างน้อย 6 หลัก');
          return;
        }
        if (!regProvId) {
          setErrorNotice('กรุณาเลือกจังหวัดภูมิลำเนา');
          return;
        }

        const response = await authService.register({
          Citizen_ID: cleanRegId,
          Phone: cleanRegPhone,
          Password: regPassword,
          Name: regName.trim(),
          Province_ID: regProvId,
          Role: 'USER',
        });
        loginCitizen(response.user.Citizen_ID, response.user.Phone, response.user);
        await refreshCitizenData();
        setNotice(`ลงทะเบียนประชาชนสำเร็จ ยินดีต้อนรับคุณ ${regName}`);
        setTimeout(() => {
          setNotice('');
          onSuccess('citizen');
        }, 700);
      }
    } catch (error) {
      setErrorNotice(
        error instanceof ApiError && error.status === 401
          ? 'ข้อมูลเข้าสู่ระบบไม่ถูกต้อง (เลขบัตร/เบอร์โทร หรือรหัสผ่านไม่ตรง)'
          : error instanceof Error
          ? error.message
          : 'เข้าสู่ระบบประชาชนไม่สำเร็จ'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Merchant (Login or Register)
  const handleMerchantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorNotice('');
    setSubmitting(true);

    if (authMode === 'login') {
      try {
        const cleanPhone = merchantPhone.replace(/\D/g, '');
        if (!cleanPhone) {
          setErrorNotice('กรุณากรอกเบอร์โทรศัพท์หรือเลขประจำตัวร้านค้า');
          return;
        }

        const response = await authService.login({ identifier: cleanPhone, Password: merchantPassword });
        if (response.user.Role !== 'MERCHANT') {
          throw new Error(`บัญชีนี้ไม่ใช่บัญชีร้านค้า (Role ในระบบ: ${response.user.Role})`);
        }

        const targetMchId = response.merchant?.Mch_ID;
        const res = loginMerchant(cleanPhone, merchantPassword, targetMchId);
        if (!res.success) throw new Error(res.message);

        await refreshMerchantData();
        setNotice(res.message);
        setTimeout(() => {
          setNotice('');
          onSuccess('merchant');
        }, 600);
      } catch (error) {
        setErrorNotice(
          error instanceof ApiError && error.status === 401
            ? 'เบอร์โทรศัพท์หรือรหัสผ่านร้านค้าไม่ถูกต้อง'
            : error instanceof Error
            ? error.message
            : 'เข้าสู่ระบบร้านค้าไม่สำเร็จ'
        );
      } finally {
        setSubmitting(false);
      }
    } else {
      // Merchant Registration
      const cleanMchCitizenId = mchCitizenId.replace(/\D/g, '');
      const cleanMchPhone = mchPhone.replace(/\D/g, '');

      if (!mchShopName.trim() || !mchOwnerName.trim() || !cleanMchPhone || !mchProvId || !mchDistId || !mchPinLocation) {
        setErrorNotice('กรุณากรอกข้อมูลร้านค้าและปักหมุดแผนที่ให้ครบถ้วน');
        setSubmitting(false);
        return;
      }
      if (!/^\d{13}$/.test(cleanMchCitizenId)) {
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
          Citizen_ID: cleanMchCitizenId,
          Phone: cleanMchPhone,
          Password: mchRegisterPassword,
          Province_ID: mchPinLocation.provinceId,
          Shop_Name: mchShopName.trim(),
          Owner_Name: mchOwnerName.trim(),
          User_Name: mchOwnerName.trim(),
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
      {/* 1. Header Banner */}
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
                  {/* Quick Seeded DB Accounts Helper */}
                  <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-200/80 space-y-2">
                    <span className="text-[10px] text-blue-700 font-bold block">
                      ⚡ บัญชีประชาชนในฐานข้อมูล Cloud MySQL (กดเพื่อกรอกอัตโนมัติ):
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setCitizenId('1100703611736');
                          setCitizenPassword('123456');
                          setErrorNotice('');
                        }}
                        className="p-2 rounded-xl bg-white border border-blue-200 hover:border-blue-400 text-left transition-all cursor-pointer text-xs"
                      >
                        <strong className="block text-[#1769ed] truncate text-[11px]">ผู้ใช้ทดสอบ 1</strong>
                        <span className="text-[9px] text-slate-500 font-mono block">1100703611736 (123456)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCitizenId('2222222222222');
                          setCitizenPassword('password456');
                          setErrorNotice('');
                        }}
                        className="p-2 rounded-xl bg-white border border-blue-200 hover:border-blue-400 text-left transition-all cursor-pointer text-xs"
                      >
                        <strong className="block text-[#1769ed] truncate text-[11px]">ผู้ใช้ทดสอบ 2</strong>
                        <span className="text-[9px] text-slate-500 font-mono block">2222222222222 (password456)</span>
                      </button>
                    </div>
                  </div>

                  <div className="pt-1">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      เลขประจำตัวประชาชน 13 หลัก หรือ เบอร์โทรศัพท์
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="1100703611736 หรือ 0618700516"
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
                    disabled={submitting}
                    className="w-full py-3 bg-[#1769ed] hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors cursor-pointer disabled:opacity-50 mt-1"
                  >
                    {submitting ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบประชาชน ➔'}
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
                      placeholder="เช่น 1100703611799"
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
                      placeholder="เช่น สมชาย ใจดี"
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
                        placeholder="0812345678"
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
                        minLength={6}
                        placeholder="123456"
                        value={regPassword}
                        onChange={e => setRegPassword(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#1769ed]"
                      />
                    </div>
                  </div>

                  {/* Province & District from real DB */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        จังหวัดภูมิลำเนา *
                      </label>
                      <select
                        value={regProvId}
                        disabled={loadingGeo || provinces.length === 0}
                        onChange={e => setRegProvId(Number(e.target.value))}
                        className="w-full px-2.5 py-2 border border-slate-200 rounded-xl bg-white text-xs focus:outline-none focus:ring-2 focus:ring-[#1769ed] disabled:bg-slate-100"
                      >
                        {provinces.map(p => (
                          <option key={p.Prov_ID} value={p.Prov_ID}>
                            {p.Prov_Name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        อำเภอ/เขต
                      </label>
                      <select
                        value={regDistId}
                        disabled={districts.length === 0}
                        onChange={e => setRegDistId(Number(e.target.value))}
                        className="w-full px-2.5 py-2 border border-slate-200 rounded-xl bg-white text-xs focus:outline-none focus:ring-2 focus:ring-[#1769ed] disabled:bg-slate-100"
                      >
                        {districts.map(d => (
                          <option key={d.Dist_ID} value={d.Dist_ID}>
                            {d.Dist_Name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 bg-[#1769ed] hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors cursor-pointer disabled:opacity-50 mt-2"
                  >
                    {submitting ? 'กำลังบันทึกข้อมูล…' : 'ยืนยันลงทะเบียนรับสิทธิ์ 60/40 ➔'}
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
                  {/* Quick Seeded DB Merchant Helper */}
                  <div className="p-3 rounded-2xl bg-teal-50/70 border border-teal-200/80 space-y-2">
                    <span className="text-[10px] text-teal-800 font-bold block">
                      ⚡ บัญชีร้านค้าในฐานข้อมูล Cloud MySQL (กดเพื่อกรอกอัตโนมัติ):
                    </span>
                    <div className="grid grid-cols-1 gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setMerchantPhone('0618700517');
                          setMerchantPassword('123456');
                          setErrorNotice('');
                        }}
                        className="p-2 rounded-xl bg-white border border-teal-200 hover:border-teal-400 text-left transition-all cursor-pointer text-xs"
                      >
                        <strong className="block text-[#115e59] truncate text-[11px]">ร้านค้าตัวอย่าง (User 12)</strong>
                        <span className="text-[9px] text-slate-500 font-mono block">เบอร์: 0618700517 | รหัสผ่าน: 123456</span>
                      </button>
                    </div>
                  </div>

                  <div className="pt-1">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      เบอร์โทรศัพท์ร้านค้า หรือ เลขประจำตัว
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="0618700517 หรือ 1100703611737"
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
                      required
                      placeholder="กรอกรหัสผ่าน"
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
                        <option value="เสื้อผ้าและเครื่องแต่งกาย">เสื้อผ้าและเครื่องแต่งกาย</option>
                        <option value="สุขภาพและความงาม">สุขภาพและความงาม</option>
                        <option value="บ้านและเครื่องใช้">บ้านและเครื่องใช้</option>
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
                        placeholder="0812345678"
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
                        จำเป็นต้องระบุพิกัดเพื่อให้ลูกค้าค้นหาร้านค้าบนแผนที่โครงการได้
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
        onLocationSelect={(loc) => {
          setMchPinLocation(loc);
          setMchProvId(loc.provinceId);
          setMchDistId(loc.districtId);
        }}
      />
    </div>
  );
};

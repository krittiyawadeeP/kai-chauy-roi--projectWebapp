import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Icon } from '../common/Icon';
import { INITIAL_PROVINCES, INITIAL_DISTRICTS } from '../../mock/initialData';
import { Merchant } from '../../types';
import { authService, LoginPayload } from '../../services/authService';
import { ApiError } from '../../services/api';
import { merchantService } from '../../services/merchantService';
import { StoreMapPickerModal } from '../merchant/StoreMapPickerModal';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultRole?: 'citizen' | 'merchant';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  defaultRole = 'citizen'
}) => {
  const {
    loginCitizen,
    loginMerchant,
    registerCitizen,
    registerMerchant,
    setRole,
    setIsAuthenticated,
    users,
    merchants,
    currentUser,
    currentMerchant,
    isAuthenticated,
    logout,
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
  const [merchantPhone, setMerchantPhone] = useState('089-223-4455');
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
  const [mchAddress, setMchAddress] = useState('');
  const [mchProvId, setMchProvId] = useState(0);
  const [mchDistId, setMchDistId] = useState(0);
  const [mchPinLocation, setMchPinLocation] = useState<{ lat: number; lng: number; provinceId: number; districtId: number } | null>(null);

  const [notice, setNotice] = useState<string>('');
  const [errorNotice, setErrorNotice] = useState<string>('');

  const filteredDistricts = INITIAL_DISTRICTS.filter(d => d.provId === regProvId);

  if (!isOpen) return null;

  // Quick preset login helper
  const handleDemoCitizenLogin = (userId: number) => {
    const targetUser = users.find(u => u.userId === userId) || users[0];
    loginCitizen(targetUser.citizenId, targetUser.phone);
    setNotice(`เข้าสู่ระบบสำเร็จ: ${targetUser.name}`);
    setTimeout(() => {
      setNotice('');
      onClose();
    }, 1000);
  };

  const handleDemoMerchantLogin = (mchId: number) => {
    const targetMch = merchants.find(m => m.mchId === mchId) || merchants[0];
    setMerchantPhone(targetMch.phone);
    setSelectedMchId(targetMch.mchId);
    setErrorNotice('ตัวอย่างร้านเป็นข้อมูล mock โปรดกรอกเบอร์และรหัสผ่านบัญชี MERCHANT ที่ seed ไว้ใน backend');
  };

  const handleCitizenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorNotice('');
    if (authMode === 'login') {
      if (!citizenId) {
        setErrorNotice('กรุณากรอกเลขประจำตัวประชาชน 13 หลัก');
        return;
      }
      const res = loginCitizen(citizenId, citizenPassword);
      setNotice(res.message);
      setTimeout(() => {
        setNotice('');
        onClose();
      }, 1000);
    } else {
      if (!regCitizenId || !regName || !regPhone) {
        setErrorNotice('กรุณากรอกข้อมูลให้ครบถ้วน');
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
        onClose();
      }, 1200);
    }
  };

  const handleMerchantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorNotice('');
    if (authMode === 'login') {
      try {
        const response = await authService.login({ Phone: merchantPhone, Password: merchantPassword });
        if (response.user.Role !== 'MERCHANT') throw new Error('บัญชีนี้ยังไม่ได้กำหนด role เป็น MERCHANT');
        const res = loginMerchant(merchantPhone, merchantPassword, selectedMchId);
        if (!res.success) throw new Error(res.message);
        await refreshMerchantData();
        setNotice(res.message);
        setTimeout(() => { setNotice(''); onClose(); }, 1000);
      } catch (error) {
        setErrorNotice(error instanceof ApiError && error.status === 401 ? 'เบอร์โทรศัพท์หรือรหัสผ่านไม่ถูกต้อง' : error instanceof Error ? error.message : 'เข้าสู่ระบบไม่สำเร็จ');
      }
    } else {
      if (!mchShopName || !mchOwnerName || !mchPhone || !mchProvId || !mchDistId || !mchPinLocation) {
        setErrorNotice('กรุณากรอกข้อมูลร้านค้าให้ครบถ้วน');
        return;
      }
      if (!/^\d{13}$/.test(mchCitizenId.replace(/\D/g, ''))) {
        setErrorNotice('กรุณากรอกเลขประจำตัวประชาชน 13 หลัก');
        return;
      }
      if (mchRegisterPassword.length < 6) {
        setErrorNotice('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
        return;
      }
      if (mchRegisterPassword !== mchConfirmPassword) {
        setErrorNotice('รหัสผ่านทั้งสองช่องไม่ตรงกัน');
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
      } catch (error) {
        setErrorNotice(error instanceof Error ? error.message : 'ลงทะเบียนร้านค้าไม่สำเร็จ');
        return;
      }
      setNotice(`ลงทะเบียนร้านค้า ${mchShopName} สำเร็จ`);
      setTimeout(() => {
        setNotice('');
        onClose();
      }, 1200);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[#07162d]/75 p-3 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[410px] rounded-[28px] bg-white p-5 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span
              className={`grid size-9 place-items-center rounded-xl ${authRole === 'merchant' ? 'bg-teal-50 text-[#115e59]' : 'bg-blue-50 text-[#1769ed]'
                }`}
            >
              <Icon name="user" className="size-5" />
            </span>
            <div>
              <h3 className="font-bold text-sm text-slate-800">
                ระบบเข้าสู่ระบบ / ลงทะเบียน (Authentication)
              </h3>
              <p className="text-[10px] text-slate-400">ไทยช่วยไทยพลีส</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="grid size-8 place-items-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500"
          >
            <Icon name="x" className="size-4" />
          </button>
        </div>

        {/* Role Selector: ประชาชน vs ร้านค้า */}
        <div className="pt-3">
          <div className="grid grid-cols-2 gap-2 bg-[#f1f5fb] p-1 rounded-2xl text-xs font-bold text-slate-600">
            <button
              type="button"
              onClick={() => {
                setAuthRole('citizen');
                setErrorNotice('');
              }}
              className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${authRole === 'citizen'
                  ? 'bg-[#1769ed] text-white shadow-sm'
                  : 'hover:text-slate-900'
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
              className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${authRole === 'merchant'
                  ? 'bg-[#115e59] text-white shadow-sm'
                  : 'hover:text-slate-900'
                }`}
            >
              <span>🏪</span>
              <span>สำหรับร้านค้า</span>
            </button>
          </div>
        </div>

        {/* Mode Switcher: Login vs Register */}
        <div className="pt-2">
          <div className="flex border-b border-slate-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setErrorNotice('');
              }}
              className={`flex-1 py-2 text-center transition-colors ${authMode === 'login'
                  ? authRole === 'merchant'
                    ? 'text-[#115e59] border-b-2 border-[#115e59] font-bold'
                    : 'text-[#1769ed] border-b-2 border-[#1769ed] font-bold'
                  : 'text-slate-400 hover:text-slate-600'
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
              className={`flex-1 py-2 text-center transition-colors ${authMode === 'register'
                  ? authRole === 'merchant'
                    ? 'text-[#115e59] border-b-2 border-[#115e59] font-bold'
                    : 'text-[#1769ed] border-b-2 border-[#1769ed] font-bold'
                  : 'text-slate-400 hover:text-slate-600'
                }`}
            >
              สมัครสมาชิกใหม่ (Register)
            </button>
          </div>
        </div>

        {/* Notices */}
        {notice && (
          <div className="mt-3 p-2.5 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 text-center">
            {notice}
          </div>
        )}
        {errorNotice && (
          <div className="mt-3 p-2.5 bg-rose-50 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 text-center">
            {errorNotice}
          </div>
        )}

        {/* FORM CONTENT */}
        <div className="overflow-y-auto pr-1 flex-1 py-3 text-xs space-y-3">
          {/* ===================== CITIZEN AUTH ===================== */}
          {authRole === 'citizen' && (
            <>
              {authMode === 'login' ? (
                <form onSubmit={handleCitizenSubmit} className="space-y-3">
                  {/* Quick test account chip */}
                  <div className="p-2.5 bg-blue-50/80 rounded-xl border border-blue-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-blue-600 font-bold block">
                        ⚡ บัญชีประชาชนทดสอบ (1-Click Login):
                      </span>
                      <span className="font-semibold text-slate-800 text-[11px]">
                        นายกิตติคุณ ศรีสวัสดิ์
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDemoCitizenLogin(1)}
                      className="px-2.5 py-1 bg-[#1769ed] text-white rounded-lg text-[10px] font-bold shadow-xs hover:bg-blue-700"
                    >
                      เข้าสู่ระบบทันที
                    </button>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      เลขประจำตัวประชาชน 13 หลัก
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="1-1037-02948-11-2"
                      value={citizenId}
                      onChange={e => setCitizenId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1769ed]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      รหัสผ่าน หรือ รหัส PIN 6 หลัก
                    </label>
                    <input
                      type="password"
                      placeholder="••••••"
                      value={citizenPassword}
                      onChange={e => setCitizenPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1769ed]"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-[#1769ed] hover:bg-blue-700 text-white rounded-xl font-bold shadow-md shadow-blue-500/20 transition-all mt-1"
                  >
                    เข้าสู่ระบบประชาชน
                  </button>
                </form>
              ) : (
                <form onSubmit={handleCitizenSubmit} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      เลขประจำตัวประชาชน 13 หลัก *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="x-xxxx-xxxxx-xx-x"
                      value={regCitizenId}
                      onChange={e => setRegCitizenId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1769ed]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      ชื่อ-นามสกุล *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="เช่น นายสมชาย ใจดี"
                      value={regName}
                      onChange={e => setRegName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1769ed]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      เบอร์โทรศัพท์ *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="081-xxx-xxxx"
                      value={regPhone}
                      onChange={e => setRegPhone(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1769ed]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">จังหวัด</label>
                      <select
                        value={regProvId}
                        onChange={e => {
                          const p = Number(e.target.value);
                          setRegProvId(p);
                          const d = INITIAL_DISTRICTS.find(dist => dist.provId === p);
                          if (d) setRegDistId(d.distId);
                        }}
                        className="w-full px-2.5 py-2 border border-slate-200 rounded-xl bg-white"
                      >
                        {INITIAL_PROVINCES.map(p => (
                          <option key={p.provId} value={p.provId}>{p.provName}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">อำเภอ</label>
                      <select
                        value={regDistId}
                        onChange={e => setRegDistId(Number(e.target.value))}
                        className="w-full px-2.5 py-2 border border-slate-200 rounded-xl bg-white"
                      >
                        {filteredDistricts.map(d => (
                          <option key={d.distId} value={d.distId}>{d.distName}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">ตั้งรหัสผ่าน</label>
                    <input
                      type="password"
                      value={regPassword}
                      onChange={e => setRegPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">รหัสผ่าน</label>
                    <input type="password" required value={merchantPassword} onChange={e => setMerchantPassword(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#115e59]" />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-[#1769ed] hover:bg-blue-700 text-white rounded-xl font-bold shadow-md shadow-blue-500/20 transition-all mt-1"
                  >
                    ยืนยันลงทะเบียนรับสิทธิ์ 60/40
                  </button>
                </form>
              )}
            </>
          )}

          {/* ===================== MERCHANT AUTH ===================== */}
          {authRole === 'merchant' && (
            <>
              {authMode === 'login' ? (
                <form onSubmit={handleMerchantSubmit} className="space-y-3">
                  <div className="p-2.5 bg-teal-50 rounded-xl border border-teal-200">
                    <span className="text-[10px] text-[#115e59] font-bold block mb-1">
                      ⚡ เลือกร้านค้าตัวอย่างเพื่อทดสอบเข้าสู่ระบบ:
                    </span>
                    <div className="space-y-1.5">
                      {merchants.slice(0, 3).map(m => (
                        <button
                          key={m.mchId}
                          type="button"
                          onClick={() => handleDemoMerchantLogin(m.mchId)}
                          className="w-full text-left p-2 rounded-lg bg-white border border-teal-100 hover:border-teal-400 flex items-center justify-between text-[11px]"
                        >
                          <span className="font-bold text-slate-800">{m.shopName}</span>
                          <span className="text-[10px] text-teal-700 font-bold bg-teal-50 px-2 py-0.5 rounded-md">
                            เข้าสู่ระบบ
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      เบอร์โทรศัพท์ร้านค้า / พร้อมเพย์
                    </label>
                    <input
                      type="tel"
                      value={merchantPhone}
                      onChange={e => setMerchantPhone(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#115e59]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">รหัสผ่าน</label>
                    <input type="password" required value={merchantPassword} onChange={e => setMerchantPassword(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#115e59]" />
                  </div>

                  <p className="text-[10px] text-slate-500">บัญชีต้องมี Role = MERCHANT และมีโปรไฟล์ร้านใน backend</p>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-[#115e59] hover:bg-[#0f766e] text-white rounded-xl font-bold shadow-md shadow-teal-900/20 transition-all mt-1"
                  >
                    เข้าสู่ระบบร้านค้า
                  </button>
                </form>
              ) : (
                <form onSubmit={handleMerchantSubmit} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">เลขประจำตัวประชาชน 13 หลัก *</label>
                    <input type="text" inputMode="numeric" required maxLength={13} value={mchCitizenId} onChange={e => setMchCitizenId(e.target.value.replace(/\D/g, '').slice(0, 13))} className="w-full px-3 py-2 border border-slate-200 rounded-xl" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">ชื่อเจ้าของร้าน *</label>
                    <input type="text" required value={mchOwnerName} onChange={e => setMchOwnerName(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">เบอร์โทรศัพท์ *</label>
                    <input type="tel" required value={mchPhone} onChange={e => setMchPhone(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl" />
                  </div>
                  <StoreMapPickerModal
                    isOpen
                    inline
                    onClose={() => undefined}
                    initialLocation={mchPinLocation || undefined}
                    onLocationChange={location => {
                      setMchPinLocation(location);
                      if (!location) return;
                      setMchProvId(location.provinceId);
                      setMchDistId(location.districtId);
                    }}
                  />
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">ตั้งรหัสผ่าน (อย่างน้อย 6 ตัวอักษร) *</label>
                    <input type="password" required minLength={6} autoComplete="new-password" value={mchRegisterPassword} onChange={e => setMchRegisterPassword(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">ยืนยันรหัสผ่าน *</label>
                    <input type="password" required minLength={6} autoComplete="new-password" value={mchConfirmPassword} onChange={e => setMchConfirmPassword(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">ชื่อร้านค้า *</label>
                    <input type="text" required value={mchShopName} onChange={e => setMchShopName(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">หมวดหมู่ร้านค้า *</label>
                    <select value={mchCategory} onChange={e => setMchCategory(e.target.value as Merchant['category'])} className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white">
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
                  {/* <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">ที่ตั้งร้านค้า *</label>
                    <textarea rows={2} required value={mchAddress} onChange={e => setMchAddress(e.target.value)} placeholder="ระบุที่ตั้งร้านค้า" className="w-full px-3 py-2 border border-slate-200 rounded-xl" />
                  </div> */}
                  <button type="submit" disabled={!mchProvId || !mchDistId || !mchPinLocation} className="w-full py-2.5 bg-[#115e59] hover:bg-[#0f766e] text-white rounded-xl font-bold shadow-md shadow-teal-900/20 transition-all mt-1">
                    ยืนยันลงทะเบียนร้านค้าใหม่
                  </button>
                </form>
              )}
            </>
          )}
        </div>

        {/* Current logged-in status footer */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span>
            สถานะปัจจุบัน: <strong className="text-slate-800">{authRole === 'citizen' ? currentUser.name : currentMerchant.shopName}</strong>
          </span>
          <button
            onClick={() => {
              logout();
              setNotice('ออกจากระบบเรียบร้อยแล้ว');
              setTimeout(() => setNotice(''), 1000);
            }}
            className="text-rose-600 font-bold hover:underline"
          >
            ออกจากระบบ
          </button>
        </div>
      </div>
    </div>
  );
};

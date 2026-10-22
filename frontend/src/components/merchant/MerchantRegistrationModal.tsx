import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Merchant } from '../../types';
import { Icon } from '../common/Icon';
import { authStorage, ApiError } from '../../services/api';
import { merchantService } from '../../services/merchantService';
import { ApiDistrict, ApiProvince, geoService } from '../../services/geoService';

interface MerchantRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MerchantRegistrationModal: React.FC<MerchantRegistrationModalProps> = ({
  isOpen,
  onClose
}) => {
  const { currentMerchant, registerMerchant, refreshMerchantData } = useApp();

  const [activeTab, setActiveTab] = useState<'status' | 'register'>('status');
  const [shopName, setShopName] = useState('');
  const [category, setCategory] = useState<Merchant['category']>('อาหารและเครื่องดื่ม');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [provId, setProvId] = useState<number>(0);
  const [distId, setDistId] = useState<number>(0);
  const [provinces, setProvinces] = useState<ApiProvince[]>([]);
  const [districts, setDistricts] = useState<ApiDistrict[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setLoadingLocations(true);
    geoService.getProvinces()
      .then(items => {
        setProvinces(items);
        const initialProvinceId = items.some(item => item.Prov_ID === provId) ? provId : items[0]?.Prov_ID ?? 0;
        setProvId(initialProvinceId);
      })
      .catch(error => setSubmitError(error instanceof Error ? error.message : 'โหลดจังหวัดไม่สำเร็จ'))
      .finally(() => setLoadingLocations(false));
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !provId) {
      setDistricts([]);
      setDistId(0);
      return;
    }
    setLoadingLocations(true);
    geoService.getDistricts(provId)
      .then(items => {
        setDistricts(items);
        setDistId(current => items.some(item => item.Dist_ID === current) ? current : items[0]?.Dist_ID ?? 0);
      })
      .catch(error => setSubmitError(error instanceof Error ? error.message : 'โหลดอำเภอไม่สำเร็จ'))
      .finally(() => setLoadingLocations(false));
  }, [isOpen, provId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName || !ownerName || !phone || !address || !provId || !distId) {
      alert('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }
    if (authStorage.getToken()) {
      setSubmitting(true);
      setSubmitError('');
      try {
        await merchantService.register({ Shop_Name: shopName, Name: ownerName, Category: category, Dist_ID: distId });
        await refreshMerchantData();
        setSubmitted(true);
        setTimeout(() => { setActiveTab('status'); setSubmitted(false); }, 1500);
      } catch (error) {
        setSubmitError(error instanceof ApiError && error.status === 401 ? 'กรุณาเข้าสู่ระบบก่อนสมัครร้าน' : error instanceof Error ? error.message : 'สมัครร้านไม่สำเร็จ');
      } finally {
        setSubmitting(false);
      }
      return;
    }
    registerMerchant({
      shopName,
      category,
      address,
      ownerName,
      phone,
      provId,
      distId
    });
    setSubmitted(true);
    setTimeout(() => {
      setActiveTab('status');
      setSubmitted(false);
    }, 1500);
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[#07162d]/70 p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[400px] rounded-[28px] bg-white p-5 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-[#eaf2ff] text-[#1769ed]">
              <Icon name="shop" className="size-5" />
            </span>
            <div>
              <h3 className="font-bold text-sm text-slate-800">ลงทะเบียนและสถานะร้านค้า</h3>
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

        <div className="flex bg-[#e8effa] p-1 rounded-2xl text-xs font-bold text-slate-600 my-3">
          <button
            onClick={() => setActiveTab('status')}
            className={`flex-1 py-1.5 rounded-xl transition-all ${
              activeTab === 'status' ? 'bg-white text-[#123b84] shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            สถานะร้านค้า
          </button>
          <button
            onClick={() => setActiveTab('register')}
            className={`flex-1 py-1.5 rounded-xl transition-all ${
              activeTab === 'register' ? 'bg-white text-[#123b84] shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            + สมัครร้านใหม่
          </button>
        </div>

        <div className="overflow-y-auto pr-1 flex-1 space-y-3 text-xs">
          {activeTab === 'status' ? (
            <div className="space-y-3">
              {currentMerchant ? (
                <div className="rounded-[22px] bg-[#f8faff] p-4 border border-blue-100 space-y-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={currentMerchant.imageUrl}
                      alt={currentMerchant.shopName}
                      className="size-14 rounded-xl object-cover border border-slate-200"
                    />
                    <div>
                      <h4 className="font-bold text-sm text-slate-800">{currentMerchant.shopName}</h4>
                      <p className="text-slate-500 text-[11px]">{currentMerchant.category}</p>
                      <span className="inline-block mt-1 text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.2 rounded-full border border-emerald-200">
                        {currentMerchant.status === 'approved' ? 'อนุมัติเรียบร้อย' : 'รอตรวจสอบ'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 text-[11px] space-y-1 text-slate-600 border-t border-slate-100">
                    <p>เจ้าของ: <strong className="text-slate-800">{currentMerchant.ownerName}</strong></p>
                    <p>กระเป๋าร้านค้า: <strong className="text-[#1769ed] font-mono">฿ {currentMerchant.walletBalance?.toLocaleString('th-TH', { minimumFractionDigits: 2 }) ?? '—'}</strong></p>
                    <p>ที่ตั้ง: {currentMerchant.address}</p>
                  </div>
                </div>
              ) : (
                <p className="text-center text-slate-400 py-6">ไม่มีข้อมูลร้านค้า</p>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              {submitError && <div role="alert" className="p-2.5 bg-rose-50 text-rose-800 rounded-xl">{submitError}</div>}
              {authStorage.getToken() && <p className="text-[10px] text-slate-500">API รับชื่อร้าน หมวดหมู่ พิกัด และอำเภอ โดยผูกกับบัญชีที่เข้าสู่ระบบ</p>}
              {submitted && (
                <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-xl font-medium">
                  บันทึกข้อมูลแล้ว อยู่ระหว่างรอตรวจสอบโดยภาครัฐ
                </div>
              )}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">ชื่อร้านค้า *</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น กาแฟโบราณลุงเปี๊ยก"
                  value={shopName}
                  onChange={e => setShopName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">หมวดหมู่ร้านค้า *</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
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

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">เจ้าของร้าน *</label>
                  <input
                    type="text"
                    required
                    value={ownerName}
                    onChange={e => setOwnerName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">เบอร์โทรศัพท์ *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">ที่ตั้งร้าน *</label>
                <textarea
                  rows={2}
                  required
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">จังหวัด *</label>
                  <select
                    required
                    value={provId || ''}
                    disabled={loadingLocations || provinces.length === 0}
                    onChange={e => { setProvId(Number(e.target.value)); setDistId(0); }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
                  >
                    <option value="" disabled>{loadingLocations ? 'กำลังโหลดจังหวัด...' : 'เลือกจังหวัด'}</option>
                    {provinces.map(item => <option key={item.Prov_ID} value={item.Prov_ID}>{item.Prov_Name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">อำเภอ *</label>
                  <select
                    required
                    value={distId || ''}
                    disabled={loadingLocations || !provId || districts.length === 0}
                    onChange={e => setDistId(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
                  >
                    <option value="" disabled>{loadingLocations ? 'กำลังโหลดอำเภอ...' : 'เลือกอำเภอ'}</option>
                    {districts.map(item => <option key={item.Dist_ID} value={item.Dist_ID}>{item.Dist_Name}</option>)}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || loadingLocations || provinces.length === 0 || districts.length === 0 || !distId}
                className="w-full py-2.5 bg-[#1769ed] hover:bg-blue-700 text-white rounded-xl font-bold shadow-md shadow-blue-500/20 transition-all mt-2"
              >
                {submitting ? 'กำลังส่งคำขอ…' : 'ยื่นคำขอลงทะเบียนร้านค้า'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

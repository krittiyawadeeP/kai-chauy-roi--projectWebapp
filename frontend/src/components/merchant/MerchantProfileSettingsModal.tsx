import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Icon } from '../common/Icon';
import { Merchant } from '../../types';
import { StoreMapPickerModal } from './StoreMapPickerModal';
import { ApiError } from '../../services/api';
import { ApiDistrict, ApiProvince, geoService } from '../../services/geoService';

interface MerchantProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MerchantProfileSettingsModal: React.FC<MerchantProfileSettingsModalProps> = ({
  isOpen,
  onClose
}) => {
  const { currentMerchant, updateMerchantProfile } = useApp();

  const [shopName, setShopName] = useState('');
  const [category, setCategory] = useState<Merchant['category']>('อาหารและเครื่องดื่ม');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [provinceId, setProvinceId] = useState(0);
  const [districtId, setDistrictId] = useState(0);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [provinces, setProvinces] = useState<ApiProvince[]>([]);
  const [districts, setDistricts] = useState<ApiDistrict[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (isOpen && currentMerchant) {
      setShopName(currentMerchant.shopName || '');
      setCategory(currentMerchant.category || 'อาหารและเครื่องดื่ม');
      setOwnerName(currentMerchant.ownerName || '');
      setPhone(currentMerchant.phone || '');
      setProvinceId(currentMerchant.provId || 0);
      setDistrictId(currentMerchant.distId || 0);
      setLat(currentMerchant.lat ?? null);
      setLng(currentMerchant.lng ?? null);
      setSavedNotice(false);
      setSaveError('');
    }
  }, [isOpen, currentMerchant]);

  useEffect(() => {
    if (!isOpen) return;
    setLoadingLocations(true);
    geoService.getProvinces()
      .then(items => {
        setProvinces(items);
        if (currentMerchant?.provId && items.some(item => item.Prov_ID === currentMerchant.provId)) {
          setProvinceId(currentMerchant.provId);
        } else if (items.length > 0 && !provinceId) {
          setProvinceId(items[0].Prov_ID);
        }
      })
      .catch(error => setSaveError(error instanceof Error ? error.message : 'โหลดจังหวัดไม่สำเร็จ'))
      .finally(() => setLoadingLocations(false));
  }, [isOpen, currentMerchant?.provId]);

  useEffect(() => {
    if (!isOpen || !provinceId) return;
    setLoadingLocations(true);
    geoService.getDistricts(provinceId)
      .then(items => {
        setDistricts(items);
        if (items.some(item => item.Dist_ID === currentMerchant?.distId)) {
          setDistrictId(currentMerchant!.distId);
        } else if (!items.some(item => item.Dist_ID === districtId)) {
          setDistrictId(items[0]?.Dist_ID ?? 0);
        }
      })
      .catch(error => setSaveError(error instanceof Error ? error.message : 'โหลดอำเภอไม่สำเร็จ'))
      .finally(() => setLoadingLocations(false));
  }, [isOpen, provinceId]);

  if (!isOpen || !currentMerchant) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError('');
    try {
      await updateMerchantProfile(currentMerchant.mchId, {
        shopName: shopName.trim(),
        ownerName: ownerName.trim(),
        category,
        distId: districtId,
        lat: lat ?? undefined,
        lng: lng ?? undefined,
      });
      setSavedNotice(true);
      setTimeout(() => {
        setSavedNotice(false);
        onClose();
      }, 1000);
    } catch (error) {
      setSaveError(
        error instanceof ApiError && error.status === 401
          ? 'กรุณาเข้าสู่ระบบก่อนบันทึกข้อมูล'
          : error instanceof Error
          ? error.message
          : 'บันทึกข้อมูลไม่สำเร็จ'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[#07162d]/75 p-3 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[440px] rounded-[28px] bg-white p-5 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-teal-50 text-[#115e59]">
              <Icon name="shop" className="size-5" />
            </span>
            <div>
              <h3 className="font-bold text-sm text-slate-800">ตั้งค่าโปรไฟล์ร้านค้า</h3>
              <p className="text-[10px] text-slate-400">แก้ไขข้อมูลร้านค้าตามโครงสร้างฐานข้อมูล</p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="grid size-8 place-items-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 cursor-pointer"
          >
            <Icon name="x" className="size-4" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSave} className="overflow-y-auto pr-1 flex-1 py-3 space-y-3.5 text-xs">
          {savedNotice && (
            <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-xl font-bold border border-emerald-200 text-center animate-in fade-in">
              ✅ บันทึกข้อมูลและอัปเดตโปรไฟล์ร้านค้าสำเร็จแล้ว!
            </div>
          )}
          {saveError && (
            <div role="alert" className="p-2.5 bg-rose-50 text-rose-800 rounded-xl border border-rose-200">
              ⚠️ {saveError}
            </div>
          )}

          {/* Shop Name */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              ชื่อร้านค้า *
            </label>
            <input
              type="text"
              required
              value={shopName}
              onChange={e => setShopName(e.target.value)}
              placeholder="เช่น ร้านข้าวแกงป้าเพ็ญ"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#115e59] font-bold text-slate-800"
            />
          </div>

          {/* Owner & Phone */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                ชื่อเจ้าของร้าน *
              </label>
              <input
                type="text"
                required
                value={ownerName}
                onChange={e => setOwnerName(e.target.value)}
                placeholder="เช่น สมศรี ดวงดี"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#115e59]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                เบอร์โทรศัพท์ (บัญชี)
              </label>
              <input
                type="text"
                disabled
                value={phone || '-'}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-100 text-slate-500 font-mono cursor-not-allowed"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              หมวดหมู่ร้านค้า *
            </label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value as any)}
              className="w-full px-2.5 py-2 border border-slate-200 rounded-xl bg-white text-xs focus:outline-none focus:ring-2 focus:ring-[#115e59]"
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

          {/* Province & District */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                จังหวัด
              </label>
              <select
                value={provinceId}
                disabled={loadingLocations || provinces.length === 0}
                onChange={event => {
                  const nextProvinceId = Number(event.target.value);
                  setProvinceId(nextProvinceId);
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs disabled:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#115e59]"
              >
                {provinces.map(item => (
                  <option key={item.Prov_ID} value={item.Prov_ID}>
                    {item.Prov_Name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                อำเภอ/เขต *
              </label>
              <select
                value={districtId}
                disabled={loadingLocations || districts.length === 0}
                onChange={event => setDistrictId(Number(event.target.value))}
                className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs disabled:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#115e59]"
              >
                {districts.map(item => (
                  <option key={item.Dist_ID} value={item.Dist_ID}>
                    {item.Dist_Name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* GEOLOCATION PIN SECTION */}
          <div className="p-3 bg-[#f0fdfa] rounded-2xl border border-teal-200 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-[#042f2e] text-[11px] block">
                  พิกัดแผนที่ร้านค้า (GPS)
                </span>
                <span className="text-[10px] text-[#115e59] font-mono">
                  {lat != null && lng != null
                    ? `ละติจูด ${lat.toFixed(6)}, ลองจิจูด ${lng.toFixed(6)}`
                    : 'ยังไม่ได้ระบุพิกัดร้าน'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMapPickerOpen(true)}
                className="px-3 py-1.5 bg-[#115e59] hover:bg-[#0f766e] text-white rounded-xl font-bold text-[11px] transition-all flex items-center gap-1 shadow-xs cursor-pointer"
              >
                <span>📍 ปักหมุดแผนที่</span>
              </button>
            </div>
            <p className="text-[10px] text-slate-500">
              พิกัดนี้จะใช้แสดงในระบบค้นหาร้านค้าและแผนที่โครงการสำหรับประชาชน
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-[2] py-2.5 bg-[#115e59] hover:bg-[#0f766e] text-white rounded-xl font-bold shadow-md shadow-teal-900/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Icon name="check" className="size-4" />
              <span>{saving ? 'กำลังบันทึก…' : 'บันทึกการเปลี่ยนแปลง'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Map Picker Sub-Modal */}
      <StoreMapPickerModal
        isOpen={mapPickerOpen}
        onClose={() => setMapPickerOpen(false)}
        initialLocation={lat != null && lng != null ? { lat, lng, provinceId, districtId } : undefined}
        onLocationSelect={(loc) => {
          setProvinceId(loc.provinceId);
          setDistrictId(loc.districtId);
          setLat(loc.lat);
          setLng(loc.lng);
        }}
      />
    </div>
  );
};

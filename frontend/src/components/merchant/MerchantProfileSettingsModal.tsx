import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Icon } from '../common/Icon';
import { Merchant } from '../../types';
import { StoreMapPickerModal } from './StoreMapPickerModal';
import { ApiError, authStorage } from '../../services/api';
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
  const [promptpayId, setPromptpayId] = useState('');
  const [provinceId, setProvinceId] = useState(0);
  const [districtId, setDistrictId] = useState(0);
  const [provinces, setProvinces] = useState<ApiProvince[]>([]);
  const [districts, setDistricts] = useState<ApiDistrict[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [openingHours, setOpeningHours] = useState('08:00 - 17:00 น.');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
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
      setPromptpayId(currentMerchant.promptpayId || currentMerchant.phone || '');
      setProvinceId(currentMerchant.provId || 0);
      setDistrictId(currentMerchant.distId || 0);
      setOpeningHours(currentMerchant.openingHours || '08:00 - 17:00 น.');
      setDescription(currentMerchant.description || '');
      setImageUrl(currentMerchant.imageUrl || '');
      setSavedNotice(false);
    }
  }, [isOpen, currentMerchant]);

  useEffect(() => {
    if (!isOpen) return;
    setLoadingLocations(true);
    geoService.getProvinces()
      .then(items => {
        setProvinces(items);
        const initialProvinceId = items.some(item => item.Prov_ID === currentMerchant?.provId)
          ? currentMerchant!.provId
          : items[0]?.Prov_ID ?? 0;
        setProvinceId(initialProvinceId);
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
        if (!items.some(item => item.Dist_ID === currentMerchant?.distId && item.Dist_ID === districtId)) {
          const selected = items.some(item => item.Dist_ID === districtId) ? districtId : items[0]?.Dist_ID ?? 0;
          setDistrictId(selected);
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
      shopName,
      category,
      distId: districtId,
    });
    setSavedNotice(true);
    setTimeout(() => {
      setSavedNotice(false);
      onClose();
    }, 1200);
    } catch (error) {
      setSaveError(error instanceof ApiError && error.status === 401 ? 'กรุณาเข้าสู่ระบบก่อนบันทึกข้อมูล' : error instanceof Error ? error.message : 'บันทึกไม่สำเร็จ');
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
        className="w-full max-w-[420px] rounded-[28px] bg-white p-5 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-teal-50 text-[#115e59]">
              <Icon name="shop" className="size-5" />
            </span>
            <div>
              <h3 className="font-bold text-sm text-slate-800">ตั้งค่าโปรไฟล์ร้านค้า</h3>
              <p className="text-[10px] text-slate-400">แก้ไขข้อมูลและพิกัดร้านในโครงการ</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="grid size-8 place-items-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500"
          >
            <Icon name="x" className="size-4" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSave} className="overflow-y-auto pr-1 flex-1 py-3 space-y-3.5 text-xs">
          {savedNotice && (
            <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-xl font-bold border border-emerald-200 text-center">
              บันทึกข้อมูลและอัปเดตโปรไฟล์ร้านค้าสำเร็จแล้ว!
            </div>
          )}
          {saveError && <div role="alert" className="p-2.5 bg-rose-50 text-rose-800 rounded-xl border border-rose-200">{saveError}</div>}
          {authStorage.getToken() && <p className="text-[10px] text-slate-500">จังหวัดและอำเภอโหลดจากฐานข้อมูล และบันทึกตำแหน่งร้านด้วย Dist_ID</p>}

          {/* Shop Image Preview */}
          <div className="relative rounded-2xl overflow-hidden border border-slate-200 h-32 bg-slate-100 group">
            <img src={imageUrl} alt={shopName} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-white text-[11px] font-bold bg-white/20 px-3 py-1 rounded-full backdrop-blur-xs">
                เปลี่ยนรูปภาพหน้าร้าน
              </span>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">URL รูปภาพหน้าร้าน</label>
            <input
              type="text"
              value={imageUrl}
              onChange={e => setImageUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#115e59]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">ชื่อร้านค้า *</label>
            <input
              type="text"
              required
              value={shopName}
              onChange={e => setShopName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#115e59] font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">หมวดหมู่ร้านค้า</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as any)}
                className="w-full px-2.5 py-2 border border-slate-200 rounded-xl bg-white"
              >
                <option value="อาหารและเครื่องดื่ม">อาหารและเครื่องดื่ม</option>
                <option value="ของใช้ทั่วไป">ของใช้ทั่วไป</option>
                <option value="หัตถกรรม/ของฝาก">หัตถกรรม/ของฝาก (OTOP)</option>
                <option value="บริการชุมชน">บริการชุมชน</option>
                <option value="ผลไม้/เกษตรแปรรูป">ผลไม้/เกษตรแปรรูป</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">เวลาเปิด-ปิด</label>
              <input
                type="text"
                value={openingHours}
                onChange={e => setOpeningHours(e.target.value)}
                placeholder="เช่น 08:00 - 18:00 น."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">ชื่อเจ้าของร้าน</label>
              <input
                type="text"
                value={ownerName}
                onChange={e => setOwnerName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl"
              />
            </div> */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">หมายเลขพร้อมเพย์ (รับเงิน)</label>
              <input
                type="text"
                value={promptpayId}
                onChange={e => setPromptpayId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono"
              />
            </div>
          </div>

          {/* GEOLOCATION PIN SECTION */}
          <div className="p-3 bg-[#f0fdfa] rounded-2xl border border-teal-200 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-[#042f2e] text-[11px] block">พิกัดแผนที่ร้านค้า (GPS)</span>
                <span className="text-[10px] text-[#115e59] font-mono">
                  {currentMerchant.lat != null && currentMerchant.lng != null
                    ? `ละติจูด ${currentMerchant.lat.toFixed(6)}, ลองจิจูด ${currentMerchant.lng.toFixed(6)}`
                    : 'ยังไม่ได้ระบุพิกัดร้าน'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMapPickerOpen(true)}
                className="px-3 py-1.5 bg-[#115e59] hover:bg-[#0f766e] text-white rounded-xl font-bold text-[11px] transition-all flex items-center gap-1 shadow-xs"
              >
                <span>📍 ปักหมุดบนแผนที่</span>
              </button>
            </div>
            <p className="text-[10px] text-slate-500">
              พิกัดนี้จะใช้แสดงในระบบนำทางสำหรับประชาชนที่ต้องการเดินทางมาทำภารกิจล่าแสตมป์
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">จังหวัด</label>
              <select
                value={provinceId}
                disabled={loadingLocations || provinces.length === 0}
                onChange={event => {
                  const nextProvinceId = Number(event.target.value);
                  setProvinceId(nextProvinceId);
                  setDistrictId(0);
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 disabled:bg-slate-100"
              >
                {provinces.map(item => <option key={item.Prov_ID} value={item.Prov_ID}>{item.Prov_Name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">อำเภอ</label>
              <select
                value={districtId}
                disabled={loadingLocations || districts.length === 0}
                onChange={event => setDistrictId(Number(event.target.value))}
                className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 disabled:bg-slate-100"
              >
                {districts.map(item => <option key={item.Dist_ID} value={item.Dist_ID}>{item.Dist_Name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">คำแนะนำ / รายละเอียดร้าน</label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="จุดเด่น สินค้าแนะนำ หรือโปรโมชันของร้าน"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-[2] py-2.5 bg-[#115e59] hover:bg-[#0f766e] text-white rounded-xl font-bold shadow-md shadow-teal-900/20 transition-all flex items-center justify-center gap-1.5"
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
        mchId={currentMerchant.mchId}
      />
    </div>
  );
};

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useApp } from '../../context/AppContext';
import { Icon } from '../common/Icon';
import { ApiError, authStorage } from '../../services/api';
import { getCoordinates } from '../../services/merchantService';

interface StoreMapPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  mchId?: number;
}

export const StoreMapPickerModal: React.FC<StoreMapPickerModalProps> = ({
  isOpen,
  onClose,
  mchId
}) => {
  const { currentMerchant, updateMerchantLocation, merchants } = useApp();

  const targetShop = mchId ? merchants.find(m => m.mchId === mchId) : currentMerchant;

  const [lat, setLat] = useState<number | null>(targetShop?.lat ?? null);
  const [lng, setLng] = useState<number | null>(targetShop?.lng ?? null);
  const [addressInput, setAddressInput] = useState<string>(targetShop?.address || '');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // Sync initial coords and address when opened
  useEffect(() => {
    if (isOpen && targetShop) {
      setLat(targetShop.lat ?? null);
      setLng(targetShop.lng ?? null);
      setAddressInput(targetShop.address || '');
      setSavedSuccess(false);
      setSaveError('');
    }
  }, [isOpen, targetShop?.mchId]);

  // Initialize the map for the selected shop.
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    const coordinates = getCoordinates(targetShop?.lat, targetShop?.lng);
    const map = L.map(mapContainerRef.current, {
      // The country view is only a viewport; it must never become a shop coordinate.
      center: coordinates ?? [13, 101],
      zoom: coordinates ? 15 : 5,
      zoomControl: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat: clickLat, lng: clickLng } = e.latlng;
      setLat(Number(clickLat.toFixed(6)));
      setLng(Number(L.Util.wrapNum(clickLng, [-180, 180]).toFixed(6)));
      setSaveError('');
    });

    mapInstanceRef.current = map;
    const resizeTimer = setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      clearTimeout(resizeTimer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, [isOpen, targetShop?.mchId]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!isOpen || !map) return;
    const coordinates = getCoordinates(lat, lng);
    if (!coordinates) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }
    if (markerRef.current) {
      markerRef.current.setLatLng(coordinates);
      return;
    }
    const marker = L.marker(coordinates, {
      draggable: true,
      icon: L.divIcon({
        className: 'custom-pin-icon',
        html: '<div style="width:28px;height:28px;background:#115e59;border:3px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 6px #0005"></div>',
        iconSize: [28, 40], iconAnchor: [14, 34],
      }),
    }).addTo(map);
    marker.on('dragend', () => {
      const position = marker.getLatLng();
      setLat(Number(position.lat.toFixed(6)));
      setLng(Number(L.Util.wrapNum(position.lng, [-180, 180]).toFixed(6)));
    });
    markerRef.current = marker;
  }, [isOpen, targetShop?.mchId, lat, lng]);

  if (!isOpen || !targetShop) return null;

  const handleUseCurrentGPS = () => {
    setSaveError('');
    if (navigator.geolocation) {
      setGpsLoading(true);
      navigator.geolocation.getCurrentPosition(
        position => {
          const newLat = Number(position.coords.latitude.toFixed(6));
          const newLng = Number(position.coords.longitude.toFixed(6));
          setLat(newLat);
          setLng(newLng);
          mapInstanceRef.current?.setView([newLat, newLng], 16);
          setGpsLoading(false);
        },
        () => {
          setGpsLoading(false);
          setSaveError('อ่าน GPS ไม่สำเร็จ กรุณาอนุญาตตำแหน่งหรือเลือกที่ตั้งร้านบนแผนที่');
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      setSaveError('อุปกรณ์นี้ไม่รองรับ GPS กรุณาเลือกที่ตั้งร้านบนแผนที่');
    }
  };

  const handleSavePin = async () => {
    const coordinates = getCoordinates(lat, lng);
    if (!coordinates) {
      setSaveError('กรุณาเลือกที่ตั้งร้านหรือระบุพิกัดให้ถูกต้องก่อนบันทึก');
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      await updateMerchantLocation(targetShop.mchId, coordinates[0], coordinates[1], addressInput);
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 1200);
    } catch (error) {
      setSaveError(error instanceof ApiError && error.status === 401 ? 'กรุณาเข้าสู่ระบบก่อนบันทึกพิกัด' : error instanceof Error ? error.message : 'บันทึกพิกัดไม่สำเร็จ');
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
        className="w-full max-w-[420px] rounded-[28px] bg-white p-5 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-teal-50 text-[#115e59]">
              <Icon name="shop" className="size-5" />
            </span>
            <div>
              <h3 className="font-bold text-sm text-slate-800">ปักหมุดพิกัดร้านค้าบนแผนที่ (GPS)</h3>
              <p className="text-[10px] text-slate-400">{targetShop.shopName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="grid size-8 place-items-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500"
          >
            <Icon name="x" className="size-4" />
          </button>
        </div>

        {/* GPS uses the device position only when the shop owner requests it. */}
        <div className="py-2.5 flex items-center gap-1.5 overflow-x-auto text-[10px] font-bold">
          <button
            onClick={handleUseCurrentGPS}
            disabled={gpsLoading}
            className="px-2.5 py-1.5 rounded-lg bg-[#115e59] text-white flex items-center gap-1 shrink-0 hover:bg-teal-800 transition-colors"
          >
            <span className="size-2 rounded-full bg-emerald-300 animate-ping" />
            <span>{gpsLoading ? 'กำลังดึงพิกัด...' : '📍 พิกัดปัจจุบัน (GPS)'}</span>
          </button>
        </div>
        <p className="text-[10px] text-slate-500">ใช้ GPS เมื่ออยู่หน้าร้าน หรือซูมแผนที่เพื่อเลือกที่ตั้งร้านจริง</p>

        {/* Map Container */}
        <div className="relative w-full h-[280px] rounded-2xl overflow-hidden border border-slate-200 shadow-inner my-1">
          <div ref={mapContainerRef} className="w-full h-full z-10" />

          {/* Hint Overlay */}
          <div className="absolute top-2 left-2 right-2 z-20 pointer-events-none">
            <span className="inline-block bg-slate-900/80 text-white text-[10px] px-2.5 py-1 rounded-full backdrop-blur-xs font-medium">
              💡 แตะบนแผนที่ หรือลากหมุดเพื่อระบุตำแหน่งหน้าร้านจริง
            </span>
          </div>
        </div>

        {/* Coordinates Details & Address Input */}
        <div className="pt-2 text-xs space-y-2 overflow-y-auto">
          <div className="grid grid-cols-2 gap-2 bg-[#f0fdfa] p-2.5 rounded-xl border border-teal-100 text-[11px]">
            <div>
              <span className="text-slate-400 block text-[10px]">ละติจูด (Latitude)</span>
              <input
                type="number"
                step="0.000001"
                min={-90}
                max={90}
                aria-label="ละติจูดร้าน"
                value={lat ?? ''}
                onChange={e => {
                  const val = e.target.value === '' ? null : Number(e.target.value);
                  setLat(val);
                  const coordinates = getCoordinates(val, lng);
                  if (coordinates) mapInstanceRef.current?.panTo(coordinates);
                }}
                className="w-full font-mono font-bold text-[#115e59] bg-white px-2 py-1 rounded-lg border border-teal-200 focus:outline-none"
              />
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">ลองจิจูด (Longitude)</span>
              <input
                type="number"
                step="0.000001"
                min={-180}
                max={180}
                aria-label="ลองจิจูดร้าน"
                value={lng ?? ''}
                onChange={e => {
                  const val = e.target.value === '' ? null : Number(e.target.value);
                  setLng(val);
                  const coordinates = getCoordinates(lat, val);
                  if (coordinates) mapInstanceRef.current?.panTo(coordinates);
                }}
                className="w-full font-mono font-bold text-[#115e59] bg-white px-2 py-1 rounded-lg border border-teal-200 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
              ที่อยู่ / จุดสังเกตหน้าร้าน
            </label>
            <input
              type="text"
              value={addressInput}
              onChange={e => setAddressInput(e.target.value)}
              placeholder="เช่น 12/4 ถ.ประชาราษฎร์ ใกล้ท่าน้ำนนท์"
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl text-[11px] focus:outline-none focus:ring-1 focus:ring-[#115e59]"
            />
          </div>

          {savedSuccess && (
            <p className="text-center text-xs font-bold text-emerald-700 bg-emerald-50 py-2 rounded-xl border border-emerald-200">
              ✓ บันทึกพิกัดและที่ตั้งร้านค้าเรียบร้อยแล้ว!
            </p>
          )}
          {saveError && <p role="alert" className="text-center text-xs text-rose-700 bg-rose-50 py-2 rounded-xl">{saveError}</p>}
          {authStorage.getToken() && <p className="text-[10px] text-slate-500">บันทึกพิกัดได้ ส่วนที่อยู่ข้อความยังไม่รองรับใน API</p>}

          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleSavePin}
              disabled={saving || gpsLoading || !getCoordinates(lat, lng)}
              className="flex-[2] py-2.5 bg-[#115e59] hover:bg-[#0f766e] text-white rounded-xl text-xs font-bold shadow-md shadow-teal-900/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Icon name="check" className="size-4" />
              <span>{saving ? 'กำลังบันทึก…' : 'บันทึกตำแหน่งร้านนี้'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

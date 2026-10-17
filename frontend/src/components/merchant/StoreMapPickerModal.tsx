import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { useApp } from '../../context/AppContext';
import { Icon } from '../common/Icon';

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

  const [lat, setLat] = useState<number>(targetShop?.lat || 13.8475);
  const [lng, setLng] = useState<number>(targetShop?.lng || 100.4932);
  const [addressInput, setAddressInput] = useState<string>(targetShop?.address || '');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // Sync initial coords and address when opened
  useEffect(() => {
    if (isOpen && targetShop) {
      setLat(targetShop.lat || 13.8475);
      setLng(targetShop.lng || 100.4932);
      setAddressInput(targetShop.address || '');
      setSavedSuccess(false);
    }
  }, [isOpen, targetShop]);

  // Initialize or update Leaflet Map
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    const initialLat = lat || 13.8475;
    const initialLng = lng || 100.4932;

    const customIcon = L.divIcon({
      className: 'custom-pin-icon',
      html: `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
          <div style="background: #115e59; color: white; border-radius: 9999px; padding: 7px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.35); border: 2.5px solid white;">
            <svg style="width: 20px; height: 20px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 10v10h16V10M3 4h18l-2 6H5L3 4Z" />
              <path d="M9 20v-6h6v6" />
            </svg>
          </div>
          <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 8px solid #115e59; margin-top: -1px;"></div>
        </div>
      `,
      iconSize: [38, 44],
      iconAnchor: [19, 44]
    });

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: 15,
        zoomControl: true
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(map);

      const marker = L.marker([initialLat, initialLng], {
        icon: customIcon,
        draggable: true
      }).addTo(map);

      marker.on('dragend', () => {
        const position = marker.getLatLng();
        setLat(Number(position.lat.toFixed(6)));
        setLng(Number(position.lng.toFixed(6)));
      });

      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat: clickLat, lng: clickLng } = e.latlng;
        marker.setLatLng([clickLat, clickLng]);
        setLat(Number(clickLat.toFixed(6)));
        setLng(Number(clickLng.toFixed(6)));
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;

      // Small delay to trigger map resize recalculation
      setTimeout(() => {
        map.invalidateSize();
      }, 250);
    } else {
      mapInstanceRef.current.setView([initialLat, initialLng], 15);
      if (markerRef.current) {
        markerRef.current.setLatLng([initialLat, initialLng]);
      }
      setTimeout(() => {
        mapInstanceRef.current?.invalidateSize();
      }, 150);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, [isOpen]);

  if (!isOpen || !targetShop) return null;

  const handleUseCurrentGPS = () => {
    if (navigator.geolocation) {
      setGpsLoading(true);
      navigator.geolocation.getCurrentPosition(
        position => {
          const newLat = Number(position.coords.latitude.toFixed(6));
          const newLng = Number(position.coords.longitude.toFixed(6));
          setLat(newLat);
          setLng(newLng);
          if (mapInstanceRef.current && markerRef.current) {
            mapInstanceRef.current.setView([newLat, newLng], 16);
            markerRef.current.setLatLng([newLat, newLng]);
          }
          setGpsLoading(false);
        },
        () => {
          setGpsLoading(false);
          // Fallback location
          const fallbackLat = 13.8475;
          const fallbackLng = 100.4932;
          setLat(fallbackLat);
          setLng(fallbackLng);
          if (mapInstanceRef.current && markerRef.current) {
            mapInstanceRef.current.setView([fallbackLat, fallbackLng], 15);
            markerRef.current.setLatLng([fallbackLat, fallbackLng]);
          }
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  };

  const setPresetLocation = (targetLat: number, targetLng: number, presetAddress: string) => {
    setLat(targetLat);
    setLng(targetLng);
    setAddressInput(presetAddress);
    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.setView([targetLat, targetLng], 15);
      markerRef.current.setLatLng([targetLat, targetLng]);
    }
  };

  const handleSavePin = () => {
    updateMerchantLocation(targetShop.mchId, lat, lng, addressInput);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
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

        {/* Quick GPS & Preset location chips */}
        <div className="py-2.5 flex items-center gap-1.5 overflow-x-auto text-[10px] font-bold">
          <button
            onClick={handleUseCurrentGPS}
            disabled={gpsLoading}
            className="px-2.5 py-1.5 rounded-lg bg-[#115e59] text-white flex items-center gap-1 shrink-0 hover:bg-teal-800 transition-colors"
          >
            <span className="size-2 rounded-full bg-emerald-300 animate-ping" />
            <span>{gpsLoading ? 'กำลังดึงพิกัด...' : '📍 พิกัดปัจจุบัน (GPS)'}</span>
          </button>
          <button
            onClick={() => setPresetLocation(13.8475, 100.4932, '12/4 ถ.ประชาราษฎร์ ต.สวนใหญ่ อ.เมือง จ.นนทบุรี')}
            className="px-2.5 py-1.5 rounded-lg bg-teal-50 text-[#115e59] border border-teal-200 hover:bg-teal-100 shrink-0"
          >
            ท่าน้ำนนท์
          </button>
          <button
            onClick={() => setPresetLocation(13.9123, 100.4908, '55 หมู่ 1 ต.เกาะเกร็ด อ.ปากเกร็ด จ.นนทบุรี')}
            className="px-2.5 py-1.5 rounded-lg bg-teal-50 text-[#115e59] border border-teal-200 hover:bg-teal-100 shrink-0"
          >
            เกาะเกร็ด
          </button>
          <button
            onClick={() => setPresetLocation(13.7516, 100.5015, '88 ถ.ดินสอ แขวงเสาชิงช้า เขตพระนคร กรุงเทพฯ')}
            className="px-2.5 py-1.5 rounded-lg bg-teal-50 text-[#115e59] border border-teal-200 hover:bg-teal-100 shrink-0"
          >
            เสาชิงช้า/พระนคร
          </button>
          <button
            onClick={() => setPresetLocation(18.7903, 98.9972, '14 ถ.วิชยานนท์ ต.ช้างม่อย อ.เมือง จ.เชียงใหม่')}
            className="px-2.5 py-1.5 rounded-lg bg-teal-50 text-[#115e59] border border-teal-200 hover:bg-teal-100 shrink-0"
          >
            กาดหลวง/เชียงใหม่
          </button>
        </div>

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
                value={lat}
                onChange={e => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) {
                    setLat(val);
                    if (mapInstanceRef.current && markerRef.current) {
                      mapInstanceRef.current.setView([val, lng]);
                      markerRef.current.setLatLng([val, lng]);
                    }
                  }
                }}
                className="w-full font-mono font-bold text-[#115e59] bg-white px-2 py-1 rounded-lg border border-teal-200 focus:outline-none"
              />
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">ลองจิจูด (Longitude)</span>
              <input
                type="number"
                step="0.000001"
                value={lng}
                onChange={e => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) {
                    setLng(val);
                    if (mapInstanceRef.current && markerRef.current) {
                      mapInstanceRef.current.setView([lat, val]);
                      markerRef.current.setLatLng([lat, val]);
                    }
                  }
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

          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleSavePin}
              className="flex-[2] py-2.5 bg-[#115e59] hover:bg-[#0f766e] text-white rounded-xl text-xs font-bold shadow-md shadow-teal-900/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Icon name="check" className="size-4" />
              <span>บันทึกตำแหน่งร้านนี้</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

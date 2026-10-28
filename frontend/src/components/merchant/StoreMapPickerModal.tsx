import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useApp } from '../../context/AppContext';
import { Icon } from '../common/Icon';
import { ApiDistrict, ApiProvince, geoService } from '../../services/geoService';
import { getCoordinates } from '../../services/merchantService';

interface StoreMapPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  mchId?: number;
  inline?: boolean;
  initialLocation?: { lat: number; lng: number; provinceId?: number; districtId?: number };
  onLocationSelect?: (location: { lat: number; lng: number; provinceId: number; districtId: number }) => void;
  onLocationChange?: (location: { lat: number; lng: number; provinceId: number; districtId: number } | null) => void;
}

// Fallback dictionary mapping legacy mock IDs to real DOPA IDs in MySQL table `districts`
const DUMMY_TO_REAL_DISTRICT: Record<number, { provId: number; distId: number }> = {
  101: { provId: 12, distId: 1201 }, // เมืองนนทบุรี
  102: { provId: 12, distId: 1206 }, // ปากเกร็ด
  103: { provId: 12, distId: 1202 }, // บางกรวย
  104: { provId: 12, distId: 1203 }, // บางใหญ่
  201: { provId: 10, distId: 1001 }, // พระนคร
  202: { provId: 10, distId: 1002 }, // ดุสิต
  203: { provId: 10, distId: 1013 }, // สัมพันธวงศ์
  301: { provId: 50, distId: 5001 }, // เมืองเชียงใหม่
  302: { provId: 50, distId: 5007 }, // แม่ริม
  303: { provId: 50, distId: 5013 }, // สันกำแพง
  401: { provId: 14, distId: 1401 }, // พระนครศรีอยุธยา
  1: { provId: 10, distId: 1007 },   // Pathum Wan
  2: { provId: 50, distId: 5001 },   // Mueang Chiang Mai
};

const matchProvinceFromAddress = (
  addr: Record<string, string | undefined>,
  displayName: string,
  provList: ApiProvince[]
): ApiProvince | undefined => {
  const candidates = [addr.province, addr.state, addr.city, addr.region]
    .filter((v): v is string => Boolean(v))
    .map(v => v.replace(/จังหวัด/g, '').trim())
    .filter(Boolean);

  for (const candidate of candidates) {
    const exact = provList.find(p => p.Prov_Name.replace(/จังหวัด/g, '').trim() === candidate);
    if (exact) return exact;
    const partial = provList.find(p => {
      const pName = p.Prov_Name.replace(/จังหวัด/g, '').trim();
      return pName.includes(candidate) || candidate.includes(pName);
    });
    if (partial) return partial;
  }

  if (displayName) {
    return provList.find(p => displayName.includes(p.Prov_Name.replace(/จังหวัด/g, '').trim()));
  }
  return undefined;
};

const matchDistrictFromAddress = (
  addr: Record<string, string | undefined>,
  displayName: string,
  distList: ApiDistrict[]
): ApiDistrict | undefined => {
  const candidates = [
    addr.city_district,
    addr.borough,
    addr.district,
    addr.county,
    addr.municipality,
    addr.town,
    addr.suburb,
  ]
    .filter((v): v is string => Boolean(v))
    .map(v => v.replace(/^(อำเภอ|เขต|เทศบาลนคร|เทศบาลเมือง|เทศบาลตำบล|ตำบล|แขวง)/g, '').trim())
    .filter(Boolean);

  for (const candidate of candidates) {
    const exact = distList.find(d => d.Dist_Name.replace(/^(อำเภอ|เขต)/g, '').trim() === candidate);
    if (exact) return exact;
    const partial = distList.find(d => {
      const dName = d.Dist_Name.replace(/^(อำเภอ|เขต)/g, '').trim();
      return dName.includes(candidate) || candidate.includes(dName);
    });
    if (partial) return partial;
  }

  if (displayName) {
    return distList.find(d => displayName.includes(d.Dist_Name.replace(/^(อำเภอ|เขต)/g, '').trim()));
  }
  return undefined;
};

export const StoreMapPickerModal: React.FC<StoreMapPickerModalProps> = ({
  isOpen,
  onClose,
  mchId,
  inline = false,
  initialLocation,
  onLocationSelect,
  onLocationChange
}) => {
  const { currentMerchant, updateMerchantLocation, merchants } = useApp();

  const targetShop = inline || onLocationSelect ? null : mchId ? merchants.find(m => m.mchId === mchId) : currentMerchant;

  const [lat, setLat] = useState<number>(initialLocation?.lat ?? targetShop?.lat ?? 13.8475);
  const [lng, setLng] = useState<number>(initialLocation?.lng ?? targetShop?.lng ?? 100.4932);
  const [hasSelectedLocation, setHasSelectedLocation] = useState(Boolean(getCoordinates(initialLocation?.lat ?? targetShop?.lat, initialLocation?.lng ?? targetShop?.lng)));
  const [addressInput, setAddressInput] = useState<string>(targetShop?.address || '');

  // Geographic state (Stores real IDs from MySQL database: Prov_ID e.g. 12, Dist_ID e.g. 1201)
  const [provinces, setProvinces] = useState<ApiProvince[]>([]);
  const [districts, setDistricts] = useState<ApiDistrict[]>([]);
  const [provinceId, setProvinceId] = useState<number>(() => {
    if (initialLocation?.provinceId) return initialLocation.provinceId;
    const rawDistId = targetShop?.distId;
    if (rawDistId && DUMMY_TO_REAL_DISTRICT[rawDistId]) {
      return DUMMY_TO_REAL_DISTRICT[rawDistId].provId;
    }
    if (targetShop?.provId === 1) return 12;
    if (targetShop?.provId === 2) return 10;
    if (targetShop?.provId === 3) return 50;
    if (targetShop?.provId === 4) return 14;
    return initialLocation?.provinceId || targetShop?.provId || 12;
  });

  const [districtId, setDistrictId] = useState<number>(() => {
    if (initialLocation?.districtId) return initialLocation.districtId;
    const rawDistId = targetShop?.distId;
    if (rawDistId && DUMMY_TO_REAL_DISTRICT[rawDistId]) {
      return DUMMY_TO_REAL_DISTRICT[rawDistId].distId;
    }
    return initialLocation?.districtId || targetShop?.distId || 1201;
  });

  const [loadingLocations, setLoadingLocations] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsMessage, setGpsMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const initialAutoPanDoneRef = useRef(false);
  const onLocationChangeRef = useRef(onLocationChange);
  onLocationChangeRef.current = onLocationChange;
  const provincesRef = useRef<ApiProvince[]>(provinces);
  provincesRef.current = provinces;
  const districtsRef = useRef<ApiDistrict[]>(districts);
  districtsRef.current = districts;
  const provinceIdRef = useRef<number>(provinceId);
  provinceIdRef.current = provinceId;
  const districtIdRef = useRef<number>(districtId);
  districtIdRef.current = districtId;
  const geocodingPromiseRef = useRef<Promise<void> | null>(null);
  const reverseGeocodePinRef = useRef<(targetLat: number, targetLng: number) => Promise<void>>(async () => {});

  // 1. Initial Load: Fetch Provinces from DB
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoadingLocations(true);

    geoService.getProvinces()
      .then(provs => {
        if (!isMounted) return;
        provincesRef.current = provs;
        setProvinces(provs);

        // Sanitize initial provId
        let targetProvId = initialLocation?.provinceId || (inline ? provs[0]?.Prov_ID : targetShop?.provId) || 12;
        if (!inline && !initialLocation?.provinceId && targetShop?.distId && DUMMY_TO_REAL_DISTRICT[targetShop.distId]) {
          targetProvId = DUMMY_TO_REAL_DISTRICT[targetShop.distId].provId;
        } else if (!inline && !initialLocation?.provinceId && targetProvId === 1) {
          targetProvId = 12;
        }

        const validProv = provs.find(p => p.Prov_ID === targetProvId) || provs[0];
        if (validProv) {
          provinceIdRef.current = validProv.Prov_ID;
          setProvinceId(validProv.Prov_ID);
        }
      })
      .catch(err => {
        console.warn('Failed to load provinces from DB:', err);
      })
      .finally(() => {
        if (isMounted) setLoadingLocations(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, inline, targetShop?.provId, targetShop?.distId, initialLocation?.provinceId]);

  // 2. Load Districts from DB when provinceId changes
  useEffect(() => {
    if (!isOpen || !provinceId) return;

    let isMounted = true;
    setLoadingLocations(true);

    geoService.getDistricts(provinceId)
      .then(dists => {
        if (!isMounted) return;
        districtsRef.current = dists;
        setDistricts(dists);

        // If districtId already belongs to this province, retain it
        const currentMatches = dists.find(d => d.Dist_ID === districtIdRef.current);
        if (currentMatches) {
          return;
        }

        // Check if targetShop had a mapped districtId
        let targetDist = initialLocation?.districtId || (inline ? 0 : targetShop?.distId) || 0;
        if (!inline && !initialLocation?.districtId && targetDist && DUMMY_TO_REAL_DISTRICT[targetDist]) {
          targetDist = DUMMY_TO_REAL_DISTRICT[targetDist].distId;
        }

        const matchTarget = dists.find(d => d.Dist_ID === targetDist);
        if (matchTarget) {
          districtIdRef.current = matchTarget.Dist_ID;
          setDistrictId(matchTarget.Dist_ID);
          return;
        }

        // Try matching district name in shop address (e.g. "ปากเกร็ด" or "เมืองนนทบุรี")
        const matchByAddr = !inline && dists.find(d => targetShop?.address && targetShop.address.includes(d.Dist_Name));
        if (matchByAddr) {
          districtIdRef.current = matchByAddr.Dist_ID;
          setDistrictId(matchByAddr.Dist_ID);
          return;
        }

        // Fallback to first district in this province
        if (dists.length > 0) {
          districtIdRef.current = dists[0].Dist_ID;
          setDistrictId(dists[0].Dist_ID);
        }
      })
      .catch(err => {
        console.warn('Failed to load districts from DB:', err);
      })
      .finally(() => {
        if (isMounted) setLoadingLocations(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, provinceId, initialLocation?.districtId]);

  // Sync initial coords and address when modal opens
  useEffect(() => {
    if (isOpen && (targetShop || onLocationSelect || onLocationChange)) {
      setLat(initialLocation?.lat ?? targetShop?.lat ?? 13.8475);
      setLng(initialLocation?.lng ?? targetShop?.lng ?? 100.4932);
      setHasSelectedLocation(Boolean(getCoordinates(initialLocation?.lat ?? targetShop?.lat, initialLocation?.lng ?? targetShop?.lng)));
      if (!inline) setAddressInput(targetShop?.address || '');
      setSavedSuccess(false);
      setSaveError('');
    }
  }, [isOpen, inline, targetShop, initialLocation?.lat, initialLocation?.lng]);

  // Reverse Geocode: From Pin (Lat, Lng) -> Auto Select Real Province & District from DB
  const reverseGeocodePin = async (targetLat: number, targetLng: number) => {
    const run = async () => {
      setIsGeocoding(true);
      setSaveError('');
      try {
        let provList = provincesRef.current;
        if (provList.length === 0) {
          try {
            provList = await geoService.getProvinces();
            provincesRef.current = provList;
            setProvinces(provList);
          } catch (err) {
            console.warn('Failed to fetch provinces during reverse geocode:', err);
          }
        }

        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${targetLat}&lon=${targetLng}&accept-language=th`,
          { headers: { 'User-Agent': 'ThaiChuayThaiWebapp/1.0' } }
        );
        if (!res.ok) return;

        const data = await res.json();
        const addr: Record<string, string | undefined> = data.address || {};
        const displayName: string = data.display_name || '';

        const matchedProv = matchProvinceFromAddress(addr, displayName, provList);

        if (matchedProv) {
          const dists = await geoService.getDistricts(matchedProv.Prov_ID);
          const matchedDist = matchDistrictFromAddress(addr, displayName, dists);
          const fallbackDistId =
            matchedDist?.Dist_ID ??
            (dists.find(d => d.Dist_ID === districtIdRef.current)?.Dist_ID || dists[0]?.Dist_ID || 0);

          provinceIdRef.current = matchedProv.Prov_ID;
          districtsRef.current = dists;
          districtIdRef.current = fallbackDistId;

          setProvinceId(matchedProv.Prov_ID);
          setDistricts(dists);
          setDistrictId(fallbackDistId);
        } else if (districtsRef.current.length > 0) {
          const matchedDist = matchDistrictFromAddress(addr, displayName, districtsRef.current);
          if (matchedDist) {
            districtIdRef.current = matchedDist.Dist_ID;
            setDistrictId(matchedDist.Dist_ID);
          } else if (!districtsRef.current.some(d => d.Dist_ID === districtIdRef.current)) {
            const firstDistId = districtsRef.current[0].Dist_ID;
            districtIdRef.current = firstDistId;
            setDistrictId(firstDistId);
          }
        }

        // Auto update address display
        if (displayName && (!addressInput || addressInput.startsWith('12/4') || addressInput.startsWith('55'))) {
          setAddressInput(displayName.split(',').slice(0, 3).join(', '));
        }
      } catch (err) {
        console.warn('Reverse geocoding error:', err);
      } finally {
        setIsGeocoding(false);
      }
    };

    const promise = run();
    geocodingPromiseRef.current = promise;
    try {
      await promise;
    } finally {
      if (geocodingPromiseRef.current === promise) {
        geocodingPromiseRef.current = null;
      }
    }
  };
  reverseGeocodePinRef.current = reverseGeocodePin;

  // Forward Geocode & Auto-pan: From Dropdown -> Map Auto-Pan
  const panToDistrict = async (provName: string, distName: string, markSelected = false) => {
    if (!mapInstanceRef.current || !markerRef.current) return;
    setIsGeocoding(true);

    try {
      const query = encodeURIComponent(`อำเภอ${distName} จังหวัด${provName} ประเทศไทย`);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1&accept-language=th`,
        { headers: { 'User-Agent': 'ThaiChuayThaiWebapp/1.0' } }
      );

      if (res.ok) {
        const results = await res.json();
        if (results && results.length > 0) {
          const newLat = parseFloat(Number(results[0].lat).toFixed(6));
          const newLng = parseFloat(Number(results[0].lon).toFixed(6));

          setLat(newLat);
          setLng(newLng);
          if (markSelected) setHasSelectedLocation(true);

          mapInstanceRef.current.flyTo([newLat, newLng], 14, { duration: 1.2 });
          markerRef.current.setLatLng([newLat, newLng]);
          return;
        }
      }

      // Fallback: search by province only
      const provQuery = encodeURIComponent(`จังหวัด${provName} ประเทศไทย`);
      const provRes = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${provQuery}&limit=1&accept-language=th`,
        { headers: { 'User-Agent': 'ThaiChuayThaiWebapp/1.0' } }
      );
      if (provRes.ok) {
        const provResults = await provRes.json();
        if (provResults && provResults.length > 0) {
          const pLat = parseFloat(Number(provResults[0].lat).toFixed(6));
          const pLng = parseFloat(Number(provResults[0].lon).toFixed(6));
          setLat(pLat);
          setLng(pLng);
          if (markSelected) setHasSelectedLocation(true);
          mapInstanceRef.current.flyTo([pLat, pLng], 13, { duration: 1.2 });
          markerRef.current.setLatLng([pLat, pLng]);
        }
      }
    } catch (err) {
      console.warn('Forward pan error:', err);
    } finally {
      setIsGeocoding(false);
    }
  };

  // Initialize or update Leaflet Map
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    const initialLat = lat;
    const initialLng = lng;

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
        const newLat = Number(position.lat.toFixed(6));
        const newLng = Number(position.lng.toFixed(6));
        setLat(newLat);
        setLng(newLng);
        setHasSelectedLocation(true);
        setSaveError('');
        void reverseGeocodePinRef.current(newLat, newLng);
      });

      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat: clickLat, lng: clickLng } = e.latlng;
        const newLat = Number(clickLat.toFixed(6));
        const newLng = Number(clickLng.toFixed(6));
        marker.setLatLng([newLat, newLng]);
        setLat(newLat);
        setLng(newLng);
        setHasSelectedLocation(true);
        setSaveError('');
        void reverseGeocodePinRef.current(newLat, newLng);
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;

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

  useEffect(() => {
    const selectedDistrict = districts.find(item => item.Dist_ID === districtId);
    const selectedProvince = provinces.find(item => item.Prov_ID === provinceId);
    if (!inline || !isOpen || hasSelectedLocation || initialAutoPanDoneRef.current || !selectedDistrict || !selectedProvince) return;
    initialAutoPanDoneRef.current = true;
    void panToDistrict(selectedProvince.Prov_Name, selectedDistrict.Dist_Name);
  }, [inline, isOpen, hasSelectedLocation, provinces, districts, provinceId, districtId]);

  useEffect(() => {
    if (!inline || !hasSelectedLocation || isGeocoding || loadingLocations || !districts.some(item => item.Dist_ID === districtId)) return;
    onLocationChangeRef.current?.({ lat, lng, provinceId, districtId });
  }, [inline, hasSelectedLocation, districts, lat, lng, provinceId, districtId, isGeocoding, loadingLocations]);

  if (!isOpen || (!targetShop && !onLocationSelect && !onLocationChange)) return null;

  // Handle GPS Button
  const handleUseCurrentGPS = () => {
    setGpsMessage('');

    if (!navigator.geolocation) {
      setGpsMessage('เบราว์เซอร์นี้ไม่รองรับการระบุตำแหน่ง');
      return;
    }

    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      position => {
        const newLat = Number(position.coords.latitude.toFixed(6));
        const newLng = Number(position.coords.longitude.toFixed(6));
        setLat(newLat);
        setLng(newLng);
        setHasSelectedLocation(true);
        setSaveError('');
        setGpsMessage('ได้พิกัดปัจจุบันแล้ว');
        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.flyTo([newLat, newLng], 16);
          markerRef.current.setLatLng([newLat, newLng]);
        }
        void reverseGeocodePinRef.current(newLat, newLng);
        setGpsLoading(false);
      },
      error => {
        const message = error.code === error.PERMISSION_DENIED
          ? 'กรุณาอนุญาตการเข้าถึงตำแหน่งในเบราว์เซอร์'
          : error.code === error.POSITION_UNAVAILABLE
            ? 'ไม่สามารถระบุตำแหน่งได้ในขณะนี้'
            : 'ระบุตำแหน่งใช้เวลานานเกินไป กรุณาลองอีกครั้ง';
        setGpsMessage(message);
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // Quick Preset Locations with Real DOPA District IDs
  const setPresetLocation = (targetLat: number, targetLng: number, presetAddress: string, targetProvId: number, targetDistId: number) => {
    setLat(targetLat);
    setLng(targetLng);
    setHasSelectedLocation(true);
    setSaveError('');
    setAddressInput(presetAddress);
    provinceIdRef.current = targetProvId;
    districtIdRef.current = targetDistId;
    setProvinceId(targetProvId);

    geoService.getDistricts(targetProvId).then(dists => {
      districtsRef.current = dists;
      setDistricts(dists);
      setDistrictId(targetDistId);
    });

    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.flyTo([targetLat, targetLng], 15);
      markerRef.current.setLatLng([targetLat, targetLng]);
    }
  };

  // Handle Dropdown Change: Province
  const handleProvinceChange = (newProvId: number) => {
    if (inline) {
      setHasSelectedLocation(false);
      onLocationChangeRef.current?.(null);
    } else {
      setHasSelectedLocation(true);
    }
    setSaveError('');
    provinceIdRef.current = newProvId;
    setProvinceId(newProvId);

    const prov = provinces.find(p => p.Prov_ID === newProvId);
    if (prov) {
      geoService.getDistricts(newProvId).then(dists => {
        districtsRef.current = dists;
        setDistricts(dists);
        if (dists.length > 0) {
          const firstDist = dists[0];
          districtIdRef.current = firstDist.Dist_ID;
          setDistrictId(firstDist.Dist_ID);
          void panToDistrict(prov.Prov_Name, firstDist.Dist_Name, !inline);
        }
      });
    }
  };

  // Handle Dropdown Change: District
  const handleDistrictChange = (newDistId: number) => {
    if (inline) {
      setHasSelectedLocation(false);
      onLocationChangeRef.current?.(null);
    } else {
      setHasSelectedLocation(true);
    }
    setSaveError('');
    districtIdRef.current = newDistId;
    setDistrictId(newDistId);
    const prov = provinces.find(p => p.Prov_ID === provinceId);
    const dist = districts.find(d => d.Dist_ID === newDistId);
    if (prov && dist) {
      void panToDistrict(prov.Prov_Name, dist.Dist_Name, !inline);
    }
  };

  // Handle Save Pin (Always update DB with real Dist_ID from MySQL)
  const handleSavePin = async () => {
    if (geocodingPromiseRef.current) {
      await geocodingPromiseRef.current;
    }

    const currentDists = districtsRef.current;
    const currentProvId = provinceIdRef.current;
    const currentDistId = districtIdRef.current;
    const validDistId = currentDists.some(item => item.Dist_ID === currentDistId)
      ? currentDistId
      : currentDists[0]?.Dist_ID ?? 0;

    if (!hasSelectedLocation || !getCoordinates(lat, lng) || !validDistId) {
      setSaveError('กรุณาเลือกตำแหน่งร้านและอำเภอที่ถูกต้องก่อนบันทึก');
      return;
    }
    setSaving(true);
    setSaveError('');

    try {
      if (onLocationSelect) {
        onLocationSelect({ lat, lng, provinceId: currentProvId, districtId: validDistId });
        setSavedSuccess(true);
        setTimeout(() => {
          setSavedSuccess(false);
          onClose();
        }, 900);
        return;
      }

      if (!targetShop) return;
      await updateMerchantLocation(targetShop.mchId, lat, lng, addressInput, validDistId);
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 900);
    } catch (error) {
      console.warn('Backend update failed:', error);
      setSaveError('บันทึกพิกัดไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const selectedProvName = provinces.find(p => p.Prov_ID === provinceId)?.Prov_Name || '';
  const selectedDistObj = districts.find(d => d.Dist_ID === districtId);
  const selectedDistName = selectedDistObj?.Dist_Name || '';

  return (
    <div
      className={inline ? 'w-full animate-fade-in' : 'fixed inset-0 z-50 grid place-items-center bg-[#07162d]/75 p-3 backdrop-blur-sm animate-fade-in'}
      onClick={inline ? undefined : onClose}
    >
      <div
        className={inline ? 'w-full rounded-2xl border border-teal-200 bg-white p-3 shadow-sm' : 'w-full max-w-[450px] rounded-[28px] bg-white p-5 shadow-2xl overflow-hidden flex flex-col max-h-[94vh]'}
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
              <p className="text-[10px] text-slate-400">{inline ? 'เลือกจังหวัด/อำเภอ แล้วลากหมุดให้ตรงร้านค้า' : targetShop?.shopName || 'เลือกตำแหน่งร้านค้า'}</p>
            </div>
          </div>
          {!inline && (
            <button
              type="button"
              onClick={onClose}
              className="grid size-8 place-items-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 cursor-pointer"
            >
              <Icon name="x" className="size-4" />
            </button>
          )}
        </div>

        {/* 2-Way Dropdown: จังหวัด & อำเภอ with Auto-Pan */}
        <div className="pt-1 pb-1 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
              <span>📍 เขตพื้นที่ร้านค้า (2 ทิศทาง)</span>
            </span>
            {isGeocoding ? (
              <span className="text-[10px] text-teal-600 font-medium flex items-center gap-1 animate-pulse">
                <span className="size-1.5 rounded-full bg-teal-500" />
                กำลังค้นหาพิกัด...
              </span>
            ) : (
              <span className="text-[10px] text-slate-400">เลือกพื้นที่ หรือ ขยับหมุด</span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-0.5">จังหวัด</label>
              <select
                value={provinceId}
                disabled={loadingLocations || provinces.length === 0}
                onChange={e => handleProvinceChange(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium focus:ring-1 focus:ring-[#115e59] focus:outline-none disabled:bg-slate-100"
              >
                {provinces.map(p => (
                  <option key={p.Prov_ID} value={p.Prov_ID}>
                    {p.Prov_Name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-0.5">อำเภอ/เขต (Dist_ID)</label>
              <select
                value={districtId}
                disabled={loadingLocations || districts.length === 0}
                onChange={e => handleDistrictChange(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium focus:ring-1 focus:ring-[#115e59] focus:outline-none disabled:bg-slate-100 font-mono"
              >
                {districts.map(d => (
                  <option key={d.Dist_ID} value={d.Dist_ID}>
                    {d.Dist_Name} ({d.Dist_ID})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* GPS Quick Action */}
        <div className="py-1 flex items-center justify-between text-[11px]">
          <button
            type="button"
            onClick={handleUseCurrentGPS}
            disabled={gpsLoading}
            className="px-2.5 py-1 rounded-lg bg-[#115e59] text-white flex items-center gap-1 hover:bg-teal-800 transition-colors cursor-pointer text-[10px] font-bold"
          >
            <span className="size-1.5 rounded-full bg-emerald-300 animate-ping" />
            <span>{gpsLoading ? 'กำลังดึง GPS...' : '📍 ใช้พิกัดปัจจุบัน (GPS)'}</span>
          </button>

          {selectedDistName && selectedProvName && (
            <span className="text-[10px] font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200 truncate max-w-[240px]">
              อ.{selectedDistName} จ.{selectedProvName} (Dist_ID: {districtId})
            </span>
          )}
        </div>
        {gpsMessage && (
          <p role="status" aria-live="polite" className={`text-[10px] ${gpsMessage === 'ได้พิกัดปัจจุบันแล้ว' ? 'text-emerald-700' : 'text-rose-700'}`}>
            {gpsMessage}
          </p>
        )}

        {/* Map Container */}
        <div className="relative w-full h-[240px] rounded-2xl overflow-hidden border border-slate-200 shadow-inner my-1">
          <div ref={mapContainerRef} className="w-full h-full z-10" />

          {/* Hint Overlay */}
          <div className="absolute top-2 left-2 right-2 z-20 pointer-events-none flex justify-between items-center">
            <span className="inline-block bg-slate-900/80 text-white text-[10px] px-2.5 py-1 rounded-full backdrop-blur-xs font-medium">
              💡 ลากหมุด หรือแตะบนแผนที่เพื่อระบุหน้าร้าน
            </span>
          </div>
        </div>

        {/* Coordinates Details & Address Input */}
        <div className="pt-2 text-xs space-y-2 overflow-y-auto">
          <div className="grid grid-cols-2 gap-2 bg-[#f0fdfa] p-2 rounded-xl border border-teal-100 text-[11px]">
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
                    setHasSelectedLocation(true);
                    setSaveError('');
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
                    setHasSelectedLocation(true);
                    setSaveError('');
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

          {savedSuccess && (
            <p className="text-center text-xs font-bold text-emerald-700 bg-emerald-50 py-1.5 rounded-xl border border-emerald-200 animate-fade-in">
              ✓ บันทึกพิกัดและอำเภอ (Dist_ID: {districtId}) เรียบร้อยแล้ว!
            </p>
          )}
          {saveError && (
            <p role="alert" className="text-center text-xs text-rose-700 bg-rose-50 py-1.5 rounded-xl">
              {saveError}
            </p>
          )}

          {!inline && <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleSavePin}
              disabled={saving}
              className="flex-[2] py-2.5 bg-[#115e59] hover:bg-[#0f766e] text-white rounded-xl text-xs font-bold shadow-md shadow-teal-900/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Icon name="check" className="size-4" />
              <span>{saving ? 'กำลังบันทึก…' : 'บันทึกตำแหน่งร้านนี้'}</span>
            </button>
          </div>}
        </div>
      </div>
    </div>
  );
};

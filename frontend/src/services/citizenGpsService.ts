import { geoService, ApiProvince, ApiDistrict } from './geoService';
import { CitizenGpsLocation, Merchant } from '../types';
import { api } from './api';

export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export const citizenGpsService = {
  /**
   * Request device GPS coordinates
   */
  getDeviceCoordinates: (): Promise<{ lat: number; lng: number; accuracy?: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('เบราว์เซอร์นี้ไม่รองรับการระบุพิกัด GPS'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: Number(position.coords.latitude.toFixed(6)),
            lng: Number(position.coords.longitude.toFixed(6)),
            accuracy: position.coords.accuracy,
          });
        },
        (error) => {
          let msg = 'ไม่สามารถระบุตำแหน่งได้';
          if (error.code === error.PERMISSION_DENIED) {
            msg = 'กรุณาอนุญาตการเข้าถึงตำแหน่ง GPS ในเบราว์เซอร์';
          } else if (error.code === error.TIMEOUT) {
            msg = 'การดึงพิกัด GPS ใช้เวลานานเกินไป';
          }
          reject(new Error(msg));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        }
      );
    });
  },

  /**
   * Reverse geocode GPS coordinate to Province & District
   */
  resolveLocation: async (
    lat: number,
    lng: number,
    accuracy?: number,
    fallbackMerchants: Merchant[] = []
  ): Promise<CitizenGpsLocation> => {
    const nowIso = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';
    let provinces: ApiProvince[] = [];

    try {
      provinces = await geoService.getProvinces();
    } catch {
      // fallback if backend geo fails
    }

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=th`,
        { headers: { 'User-Agent': 'ThaiChuayThaiWebapp/1.0' } }
      );

      if (res.ok) {
        const data = await res.json();
        const addr: Record<string, string | undefined> = data.address || {};
        const displayName: string = data.display_name || '';

        // Match Province
        const provCandidate = [addr.province, addr.state, addr.city, addr.region]
          .filter((v): v is string => Boolean(v))
          .map((v) => v.replace(/จังหวัด/g, '').trim())[0];

        let matchedProv = provinces.find((p) => {
          const name = p.Prov_Name.replace(/จังหวัด/g, '').trim();
          return provCandidate ? name === provCandidate || provCandidate.includes(name) || name.includes(provCandidate) : false;
        });

        if (!matchedProv && displayName) {
          matchedProv = provinces.find((p) =>
            displayName.includes(p.Prov_Name.replace(/จังหวัด/g, '').trim())
          );
        }

        if (matchedProv) {
          let districts: ApiDistrict[] = [];
          try {
            districts = await geoService.getDistricts(matchedProv.Prov_ID);
          } catch {
            //
          }

          // Match District
          const distCandidates = [
            addr.city_district,
            addr.borough,
            addr.district,
            addr.county,
            addr.suburb,
            addr.town,
          ]
            .filter((v): v is string => Boolean(v))
            .map((v) => v.replace(/^(อำเภอ|เขต|เทศบาลนคร|เทศบาลเมือง|เทศบาลตำบล|ตำบล|แขวง)/g, '').trim());

          let matchedDist = districts.find((d) => {
            const dName = d.Dist_Name.replace(/^(อำเภอ|เขต)/g, '').trim();
            return distCandidates.some((c) => dName === c || c.includes(dName) || dName.includes(c));
          });

          if (!matchedDist && displayName) {
            matchedDist = districts.find((d) =>
              displayName.includes(d.Dist_Name.replace(/^(อำเภอ|เขต)/g, '').trim())
            );
          }

          const resolvedDist = matchedDist || districts[0];

          return {
            lat,
            lng,
            accuracy,
            provinceId: matchedProv.Prov_ID,
            provinceName: matchedProv.Prov_Name,
            districtId: resolvedDist?.Dist_ID,
            districtName: resolvedDist?.Dist_Name,
            address: displayName.split(',').slice(0, 3).join(', ') || undefined,
            lastUpdated: nowIso,
            isMockOrFallback: false,
          };
        }
      }
    } catch {
      // Nominatim failed or offline, fall through to distance fallback
    }

    // Fallback: match by closest merchant with lat/lng
    const shopsWithCoords = fallbackMerchants.filter((m) => m.lat && m.lng);
    if (shopsWithCoords.length > 0) {
      let nearestShop = shopsWithCoords[0];
      let minDistance = calculateDistanceKm(lat, lng, nearestShop.lat!, nearestShop.lng!);

      for (const shop of shopsWithCoords) {
        const dist = calculateDistanceKm(lat, lng, shop.lat!, shop.lng!);
        if (dist < minDistance) {
          minDistance = dist;
          nearestShop = shop;
        }
      }

      const provObj = provinces.find((p) => p.Prov_ID === nearestShop.provId);
      return {
        lat,
        lng,
        accuracy,
        provinceId: nearestShop.provId,
        provinceName: provObj?.Prov_Name || 'เชียงใหม่',
        districtId: nearestShop.distId,
        districtName: `พื้นที่ใกล้เคียง (${nearestShop.shopName})`,
        address: nearestShop.address,
        lastUpdated: nowIso,
        isMockOrFallback: false,
      };
    }

    // Default fallback (Chiang Mai or Bangkok based on coords)
    const isNorth = lat > 17;
    return {
      lat,
      lng,
      accuracy,
      provinceId: isNorth ? 50 : 10,
      provinceName: isNorth ? 'เชียงใหม่' : 'กรุงเทพมหานคร',
      districtId: isNorth ? 5001 : 1001,
      districtName: isNorth ? 'เมืองเชียงใหม่' : 'พระนคร',
      lastUpdated: nowIso,
      isMockOrFallback: true,
    };
  },

  /**
   * Sync active location with backend
   */
  syncLocationWithBackend: async (location: CitizenGpsLocation) => {
    try {
      await api.post('/users/me/location', {
        lat: location.lat,
        lng: location.lng,
        provinceId: location.provinceId,
        districtId: location.districtId,
      });
    } catch {
      // ignore
    }
  },
};

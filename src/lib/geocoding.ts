import {
  IRANIAN_CITIES,
  SUPPORTED_CITY_CENTERS,
  normalizeCity,
  normalizePersianLocationText,
  resolveCityAlias
} from './cities';

export type ReverseGeocodeResult = {
  city: string;
  address: string;
  approximate: boolean;
  providerAvailable: boolean;
};

export class GeocodingProviderError extends Error {
  constructor(
    public readonly kind: 'timeout' | 'temporary',
    message: string
  ) {
    super(message);
    this.name = 'GeocodingProviderError';
  }
}

const geocodingGlobal = globalThis as typeof globalThis & {
  __hamyarGeocodeCache?: Map<string, { expiresAt: number; value: ReverseGeocodeResult }>;
  __hamyarGeocodePending?: Map<string, Promise<ReverseGeocodeResult>>;
};
const resultCache = geocodingGlobal.__hamyarGeocodeCache ||= new Map();
const pendingRequests = geocodingGlobal.__hamyarGeocodePending ||= new Map();
const CACHE_TTL_MS = 15 * 60 * 1000;
const PROVIDER_TIMEOUTS_MS = [2200, 1000] as const;
const ADDRESS_FALLBACK_MESSAGE = 'آدرس دقیق موقتاً در دسترس نیست، موقعیت روی نقشه ذخیره شد.';
const PROVIDER_URL = process.env.REVERSE_GEOCODING_PROVIDER_URL?.trim()
  || 'https://nominatim.openstreetmap.org/reverse';

export function areValidCoordinates(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLng = (lng2 - lng1) * rad;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function nearestSupportedCity(lat: number, lng: number): string | null {
  let nearest: { city: string; distance: number; radiusKm: number } | null = null;
  for (const center of SUPPORTED_CITY_CENTERS) {
    const distance = distanceKm(lat, lng, center.lat, center.lng);
    if (!nearest || distance < nearest.distance) nearest = { city: center.city, distance, radiusKm: center.radiusKm };
  }
  return nearest && nearest.distance <= nearest.radiusKm ? nearest.city : null;
}

function cityFromProvider(data: any, lat: number, lng: number): { city: string; approximate: boolean } {
  const address = data?.address && typeof data.address === 'object' ? data.address : {};
  const fields = [
    address.city, address.town, address.municipality, address.county, address.district,
    address.suburb, address.borough, address.village, address.city_district,
    address.state_district
  ].filter((value): value is string => typeof value === 'string' && Boolean(value.trim()));

  for (const field of fields) {
    const exact = normalizeCity(field);
    if (exact) return { city: exact, approximate: false };
  }
  for (const field of fields) {
    const alias = resolveCityAlias(field);
    if (alias) return { city: alias, approximate: true };
  }

  const combined = normalizePersianLocationText([...fields, data?.display_name || ''].join('،'));
  for (const city of IRANIAN_CITIES) {
    if (city !== 'سایر شهرهای ایران' && combined.includes(normalizePersianLocationText(city))) {
      return { city, approximate: true };
    }
  }

  const nearest = nearestSupportedCity(lat, lng);
  if (nearest) return { city: nearest, approximate: true };

  const provinceFallback = resolveCityAlias(address.state || address.province);
  return { city: provinceFallback || 'سایر شهرهای ایران', approximate: true };
}

function conciseAddress(data: any, fallbackCity: string): string {
  const address = data?.address && typeof data.address === 'object' ? data.address : {};
  const fields = [
    address.neighbourhood, address.suburb, address.city_district, address.road,
    address.pedestrian, address.village, address.town, address.city, address.municipality,
    address.county, address.state
  ];
  const parts: string[] = [];
  for (const field of fields) {
    if (typeof field !== 'string') continue;
    const clean = field.trim();
    if (clean && !parts.some(part => normalizePersianLocationText(part) === normalizePersianLocationText(clean))) {
      parts.push(clean);
    }
    if (parts.length === 5) break;
  }
  if (parts.length) return parts.join('، ');
  if (typeof data?.display_name === 'string' && data.display_name.trim()) {
    return data.display_name.split(',').map((part: string) => part.trim()).filter(Boolean).slice(0, 5).join('، ');
  }
  return fallbackCity === 'سایر شهرهای ایران' ? 'موقعیت انتخاب‌شده روی نقشه' : fallbackCity;
}

async function requestProvider(lat: number, lng: number): Promise<any> {
  const params = new URLSearchParams({
    format: 'jsonv2', lat: String(lat), lon: String(lng),
    'accept-language': 'fa', addressdetails: '1', zoom: '16'
  });
  const coordinateLog = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  let lastFailure: 'timeout' | 'temporary' = 'temporary';
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timeoutMs = PROVIDER_TIMEOUTS_MS[attempt];
    const timeout = setTimeout(
      () => controller.abort(new DOMException(`Provider timeout after ${timeoutMs}ms`, 'TimeoutError')),
      timeoutMs
    );
    try {
      const response = await fetch(`${PROVIDER_URL}?${params}`, {
        headers: { Accept: 'application/json', 'Accept-Language': 'fa', 'User-Agent': 'Hamyar-Bohran/1.0' },
        signal: controller.signal,
        cache: 'no-store'
      });
      console.info(
        `[reverse-geocode] provider status=${response.status} attempt=${attempt + 1} coordinates=${coordinateLog}`
      );
      if (response.ok) {
        const data = await response.json();
        const hasAddress = data?.address && typeof data.address === 'object'
          && Object.keys(data.address).length > 0;
        const hasDisplayName = typeof data?.display_name === 'string' && data.display_name.trim();
        if (data && typeof data === 'object' && (hasAddress || hasDisplayName)) return data;
        lastFailure = 'temporary';
        console.warn(
          `[reverse-geocode] unusable provider response attempt=${attempt + 1} coordinates=${coordinateLog}`
        );
        continue;
      }
      if (response.status < 500 && response.status !== 429) {
        throw new GeocodingProviderError('temporary', `Provider rejected the request (${response.status})`);
      }
      lastFailure = 'temporary';
    } catch (error) {
      if (error instanceof GeocodingProviderError) throw error;
      const timedOut = controller.signal.aborted;
      lastFailure = timedOut ? 'timeout' : 'temporary';
      console.warn(
        `[reverse-geocode] ${timedOut ? `timeout after ${timeoutMs}ms` : 'temporary network failure'} attempt=${attempt + 1} coordinates=${coordinateLog}`
      );
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new GeocodingProviderError(
    lastFailure,
    lastFailure === 'timeout' ? 'Reverse-geocoding provider timed out' : 'Reverse-geocoding provider is temporarily unavailable'
  );
}

export async function reverseGeocodeIranianCity(
  lat: number,
  lng: number,
  options: { allowProviderFallback?: boolean } = {}
): Promise<ReverseGeocodeResult> {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  const pendingKey = `${key}:${options.allowProviderFallback ? 'fallback' : 'strict'}`;
  const cached = resultCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const pending = pendingRequests.get(pendingKey);
  if (pending) return pending;

  const request = (async () => {
    let data: any;
    try {
      data = await requestProvider(lat, lng);
    } catch (error) {
      if (!options.allowProviderFallback) throw error;
      const city = nearestSupportedCity(lat, lng) || 'سایر شهرهای ایران';
      console.warn(
        `[reverse-geocode] using coordinate fallback reason=${error instanceof GeocodingProviderError ? error.kind : 'temporary'} coordinates=${key}`
      );
      return {
        city,
        address: ADDRESS_FALLBACK_MESSAGE,
        approximate: true,
        providerAvailable: false
      };
    }
    const detected = cityFromProvider(data, lat, lng);
    const value: ReverseGeocodeResult = {
      city: detected.city,
      address: conciseAddress(data, detected.city),
      approximate: detected.approximate,
      providerAvailable: true
    };
    resultCache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, value });
    return value;
  })();
  pendingRequests.set(pendingKey, request);
  try {
    return await request;
  } finally {
    pendingRequests.delete(pendingKey);
  }
}

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
const FALLBACK_CACHE_TTL_MS = 60 * 1000;
const PRIMARY_TIMEOUTS_MS = [4000, 3500] as const;
const SECONDARY_TIMEOUT_MS = 3000;
const ADDRESS_FALLBACK_MESSAGE = 'آدرس دقیق موقتاً در دسترس نیست، موقعیت روی نقشه ذخیره شد.';
const PRIMARY_PROVIDER_URL = process.env.REVERSE_GEOCODING_PROVIDER_URL?.trim()
  || 'https://nominatim.openstreetmap.org/reverse';
const SECONDARY_PROVIDER_URL = process.env.REVERSE_GEOCODING_FALLBACK_URL?.trim()
  || 'https://api.bigdatacloud.net/data/reverse-geocode-client';

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

type ProviderAttempt = {
  name: string;
  url: string;
  timeoutMs: number;
  attempt: number;
  normalize?: (data: any) => any;
};

function secondaryProviderData(data: any): any {
  const locality = typeof data?.locality === 'string' ? data.locality : '';
  const city = typeof data?.city === 'string' ? data.city : '';
  const state = typeof data?.principalSubdivision === 'string' ? data.principalSubdivision : '';
  const country = typeof data?.countryName === 'string' ? data.countryName : '';
  return {
    address: {
      city: locality || city,
      town: city || locality,
      state,
      country,
      postcode: typeof data?.postcode === 'string' ? data.postcode : ''
    },
    display_name: [locality, city, state, country].filter(Boolean).join(', ')
  };
}

async function requestProviderAttempt(provider: ProviderAttempt, coordinateLog: string): Promise<any> {
  const controller = new AbortController();
  const startedAt = Date.now();
  const timeout = setTimeout(
    () => controller.abort(new DOMException(`Provider timeout after ${provider.timeoutMs}ms`, 'TimeoutError')),
    provider.timeoutMs
  );
  try {
    const response = await fetch(provider.url, {
      headers: { Accept: 'application/json', 'Accept-Language': 'fa', 'User-Agent': 'Hamyar-Bohran/1.0' },
      signal: controller.signal,
      cache: 'no-store'
    });
    const responseTimeMs = Date.now() - startedAt;
    if (!response.ok) {
      const reason = response.status === 429 ? 'rate_limited' : `http_${response.status}`;
      console.warn(
        `[reverse-geocode] provider=${provider.name} attempt=${provider.attempt} status=${response.status} responseTimeMs=${responseTimeMs} fallbackReason=${reason} coordinates=${coordinateLog}`
      );
      throw new GeocodingProviderError('temporary', `${provider.name} rejected the request (${response.status})`);
    }
    const rawData = await response.json();
    const data = provider.normalize ? provider.normalize(rawData) : rawData;
    const hasAddress = data?.address && typeof data.address === 'object'
      && Object.values(data.address).some(value => typeof value === 'string' && value.trim());
    const hasDisplayName = typeof data?.display_name === 'string' && data.display_name.trim();
    if (!data || typeof data !== 'object' || (!hasAddress && !hasDisplayName)) {
      console.warn(
        `[reverse-geocode] provider=${provider.name} attempt=${provider.attempt} status=${response.status} responseTimeMs=${responseTimeMs} fallbackReason=unusable_response coordinates=${coordinateLog}`
      );
      throw new GeocodingProviderError('temporary', `${provider.name} returned no usable address`);
    }
    console.info(
      `[reverse-geocode] provider=${provider.name} attempt=${provider.attempt} status=${response.status} responseTimeMs=${responseTimeMs} result=success coordinates=${coordinateLog}`
    );
    return data;
  } catch (error) {
    if (error instanceof GeocodingProviderError) throw error;
    const responseTimeMs = Date.now() - startedAt;
    const timedOut = controller.signal.aborted;
    const reason = timedOut ? 'timeout' : 'network_failure';
    console.warn(
      `[reverse-geocode] provider=${provider.name} attempt=${provider.attempt} responseTimeMs=${responseTimeMs} fallbackReason=${reason} coordinates=${coordinateLog}`
    );
    throw new GeocodingProviderError(timedOut ? 'timeout' : 'temporary', `${provider.name} ${reason}`);
  } finally {
    clearTimeout(timeout);
  }
}

async function requestProvider(lat: number, lng: number): Promise<any> {
  const primaryParams = new URLSearchParams({
    format: 'jsonv2', lat: String(lat), lon: String(lng),
    'accept-language': 'fa', addressdetails: '1', zoom: '16'
  });
  const secondaryParams = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    localityLanguage: 'fa'
  });
  const coordinateLog = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  let lastFailure: 'timeout' | 'temporary' = 'temporary';
  for (let attempt = 0; attempt < PRIMARY_TIMEOUTS_MS.length; attempt++) {
    try {
      return await requestProviderAttempt({
        name: 'nominatim',
        url: `${PRIMARY_PROVIDER_URL}?${primaryParams}`,
        timeoutMs: PRIMARY_TIMEOUTS_MS[attempt],
        attempt: attempt + 1
      }, coordinateLog);
    } catch (error) {
      lastFailure = error instanceof GeocodingProviderError ? error.kind : 'temporary';
      if (attempt < PRIMARY_TIMEOUTS_MS.length - 1) {
        console.info(
          `[reverse-geocode] provider=nominatim next=retry fallbackReason=${lastFailure} coordinates=${coordinateLog}`
        );
      }
    }
  }

  console.info(
    `[reverse-geocode] provider=nominatim next=secondary fallbackReason=${lastFailure} coordinates=${coordinateLog}`
  );
  try {
    return await requestProviderAttempt({
      name: 'bigdatacloud',
      url: `${SECONDARY_PROVIDER_URL}?${secondaryParams}`,
      timeoutMs: SECONDARY_TIMEOUT_MS,
      attempt: 1,
      normalize: secondaryProviderData
    }, coordinateLog);
  } catch (error) {
    lastFailure = error instanceof GeocodingProviderError ? error.kind : 'temporary';
    throw new GeocodingProviderError(
      lastFailure,
      lastFailure === 'timeout'
        ? 'Reverse-geocoding providers timed out'
        : 'Reverse-geocoding providers are temporarily unavailable'
    );
  }
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
        `[reverse-geocode] provider=coordinate-fallback responseTimeMs=0 fallbackReason=${error instanceof GeocodingProviderError ? error.kind : 'temporary'} coordinates=${key}`
      );
      const fallbackValue: ReverseGeocodeResult = {
        city,
        address: ADDRESS_FALLBACK_MESSAGE,
        approximate: true,
        providerAvailable: false
      };
      resultCache.set(key, { expiresAt: Date.now() + FALLBACK_CACHE_TTL_MS, value: fallbackValue });
      return fallbackValue;
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

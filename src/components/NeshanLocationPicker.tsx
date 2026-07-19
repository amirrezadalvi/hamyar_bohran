'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Crosshair, MapPin, Navigation } from 'lucide-react';

interface LocationCoords {
  lat: number;
  lng: number;
}

interface NeshanLocationPickerProps {
  apiKey?: string;
  initialCenter?: LocationCoords;
  initialZoom?: number;
  onLocationSelect?: (coords: LocationCoords) => void;
  darkMode?: boolean;
  height?: string;
}

type PickerMode = 'manual' | 'gps';

export default function NeshanLocationPicker({
  apiKey,
  initialCenter = { lat: 35.699756, lng: 51.338076 },
  initialZoom = 14,
  onLocationSelect,
  darkMode = true,
  height = '100%',
}: NeshanLocationPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);

  const [isMapReady, setIsMapReady] = useState(false);
  const [mode, setMode] = useState<PickerMode>('manual');
  const [selectedCoords, setSelectedCoords] = useState<LocationCoords>(initialCenter);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const gpsRequestPendingRef = useRef(false);

  const tileUrl = apiKey
    ? `https://api.neshan.org/v1/tile?key=${apiKey}&z={z}&x={x}&y={y}`
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  const tileAttribution = apiKey
    ? '&copy; <a href="https://neshan.org">Neshan</a>'
    : '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>';

  useEffect(() => {
    let destroyed = false;

    async function initMap() {
      const L = await import('leaflet').then(m => m.default);
      await import('leaflet/dist/leaflet.css' as any);

      if (destroyed || !mapContainerRef.current) return;

      leafletRef.current = L;

      const map = L.map(mapContainerRef.current, {
        center: [initialCenter.lat, initialCenter.lng],
        zoom: initialZoom,
        zoomControl: true,
      });

      L.tileLayer(tileUrl, {
        attribution: tileAttribution,
        maxZoom: 18,
      }).addTo(map);

      const defaultIcon = L.icon({
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });

      const marker = L.marker([initialCenter.lat, initialCenter.lng], {
        draggable: true,
        icon: defaultIcon,
      }).addTo(map);

      marker.on('dragend', function () {
        const pos = marker.getLatLng();
        const coords = { lat: pos.lat, lng: pos.lng };
        setMode('manual');
        setSelectedCoords(coords);
        onLocationSelect?.(coords);
      });

      map.on('click', function (e: any) {
        if (mode === 'manual') {
          const coords = { lat: e.latlng.lat, lng: e.latlng.lng };
          marker.setLatLng([coords.lat, coords.lng]);
          setMode('manual');
          setSelectedCoords(coords);
          onLocationSelect?.(coords);
        }
      });

      mapRef.current = map;
      markerRef.current = marker;
      setIsMapReady(true);

      map.invalidateSize();
    }

    initMap();

    return () => {
      destroyed = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (mapRef.current) {
      const map = mapRef.current;
      map.eachLayer((layer: any) => {
        if (layer instanceof leafletRef.current?.TileLayer) {
          map.removeLayer(layer);
        }
      });
      leafletRef.current?.tileLayer(tileUrl, {
        attribution: tileAttribution,
        maxZoom: 18,
      }).addTo(map);
    }
  }, [apiKey]);

  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;
    markerRef.current.setLatLng([initialCenter.lat, initialCenter.lng]);
    setSelectedCoords(initialCenter);
  }, [initialCenter.lat, initialCenter.lng]);

  const handleGetCurrentLocation = useCallback(async () => {
    if (gpsRequestPendingRef.current) return;
    if (!navigator.geolocation) {
      setGpsError('مرورگر شما از دریافت موقعیت مکانی پشتیبانی نمیکند.');
      return;
    }
    if (!window.isSecureContext) {
      const isLanHttp = window.location.protocol === 'http:'
        && !['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
      setGpsError(isLanHttp
        ? 'دریافت موقعیت مکانی در مرورگر تلفن همراه به اتصال امن HTTPS نیاز دارد. localhost روی همان دستگاه یا نسخه HTTPS را استفاده کنید.'
        : 'دریافت موقعیت مکانی به HTTPS یا localhost نیاز دارد.');
      return;
    }
    if (window.self !== window.top) {
      setGpsError('دریافت موقعیت مکانی در این قاب ممکن نیست؛ صفحه را مستقیماً باز کنید یا دسترسی geolocation را برای iframe فعال کنید.');
      return;
    }

    gpsRequestPendingRef.current = true;
    setGpsLoading(true);
    setGpsError(null);

    const finish = () => {
      gpsRequestPendingRef.current = false;
      setGpsLoading(false);
    };
    const showPositionError = (error: GeolocationPositionError) => {
      finish();
      switch (error.code) {
        case error.PERMISSION_DENIED:
          setGpsError('دسترسی موقعیت مکانی داده نشد. لطفاً دسترسی Location را در تنظیمات مرورگر فعال کنید.');
          break;
        case error.POSITION_UNAVAILABLE:
          setGpsError('موقعیت فعلی دستگاه در دسترس نیست. GPS یا سرویس موقعیت مکانی دستگاه را بررسی کنید.');
          break;
        case error.TIMEOUT:
          setGpsError('دریافت موقعیت بیش از حد طول کشید. دوباره تلاش کنید یا موقعیت را دستی روی نقشه انتخاب کنید.');
          break;
        default:
          setGpsError('موقعیت فعلی دستگاه در دسترس نیست. GPS یا سرویس موقعیت مکانی دستگاه را بررسی کنید.');
      }
    };
    const acceptPosition = (position: GeolocationPosition) => {
      const coords: LocationCoords = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
      setSelectedCoords(coords);
      onLocationSelect?.(coords);
      mapRef.current?.setView([coords.lat, coords.lng], 16);
      markerRef.current?.setLatLng([coords.lat, coords.lng]);
      setMode('gps');
      finish();
    };
    const requestPosition = () => navigator.geolocation.getCurrentPosition(
      acceptPosition,
      (error) => {
        if (error.code !== error.PERMISSION_DENIED) {
          navigator.geolocation.getCurrentPosition(
            acceptPosition,
            showPositionError,
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
          );
          return;
        }
        showPositionError(error);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );

    try {
      if (navigator.permissions?.query) {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        if (permission.state === 'denied') {
          finish();
          setGpsError('دسترسی موقعیت مکانی قبلاً در مرورگر مسدود شده است. از تنظیمات سایت مرورگر، دسترسی Location را روی Allow قرار دهید و دوباره تلاش کنید.');
          return;
        }
      }
      requestPosition();
    } catch {
      requestPosition();
    }
  }, [onLocationSelect]);

  const toggleMode = useCallback((newMode: PickerMode) => {
    setMode(newMode);
    if (newMode === 'manual') {
      setGpsError(null);
    }
  }, []);

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl border"
      style={{
        height,
        borderColor: darkMode ? 'rgba(51,65,85,0.6)' : 'rgba(203,213,225,0.8)',
      }}
    >
      <div
        ref={mapContainerRef}
        className="w-full h-full"
        style={{ backgroundColor: '#111827' }}
      />

      {!isMapReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 z-10">
          <div className="flex flex-col items-center gap-3">
            <MapPin className="w-8 h-8 text-emerald-500 animate-pulse" />
            <span className="text-xs text-slate-400 font-bold">در حال بارگذاری نقشه نشان...</span>
          </div>
        </div>
      )}

      {gpsError && (
        <div className="absolute top-4 left-4 right-4 z-20 bg-red-600/90 backdrop-blur-sm text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl border border-red-500/40">
          {gpsError}
        </div>
      )}

      <div className="absolute top-4 right-4 z-20 flex gap-2">
        <button
          type="button"
          onClick={() => toggleMode('manual')}
          className={`px-3 py-2 rounded-xl text-[11px] font-black transition-all shadow-lg border backdrop-blur-sm flex items-center gap-1.5 ${
            mode === 'manual'
              ? 'bg-emerald-600 border-emerald-500 text-white shadow-emerald-600/20'
              : darkMode
                ? 'bg-slate-900/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                : 'bg-white/80 border-slate-300 text-slate-700 hover:bg-white'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>دستی</span>
        </button>

        <button
          type="button"
          onClick={handleGetCurrentLocation}
          disabled={gpsLoading || !isMapReady}
          className={`px-3 py-2 rounded-xl text-[11px] font-black transition-all shadow-lg border backdrop-blur-sm flex items-center gap-1.5 ${
            mode === 'gps'
              ? 'bg-amber-600 border-amber-500 text-white shadow-amber-600/20'
              : darkMode
                ? 'bg-slate-900/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                : 'bg-white/80 border-slate-300 text-slate-700 hover:bg-white'
          }`}
        >
          {gpsLoading ? (
            <Crosshair className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Navigation className="w-3.5 h-3.5" />
          )}
          <span>{gpsLoading ? 'در حال دریافت...' : 'موقعیت من'}</span>
        </button>
      </div>

      <div
        className={`absolute bottom-4 right-4 left-4 z-20 flex items-center justify-between gap-3 backdrop-blur-md rounded-xl px-4 py-2.5 border transition-all ${
          darkMode
            ? 'bg-slate-900/80 border-slate-700/60'
            : 'bg-white/80 border-slate-300/60'
        }`}
      >
        <div className="flex items-center gap-2 text-[11px] font-bold">
          <MapPin className={`w-3.5 h-3.5 ${mode === 'gps' ? 'text-amber-400' : 'text-emerald-400'}`} />
          <span className={darkMode ? 'text-slate-300' : 'text-slate-700'}>
            {mode === 'gps' ? 'موقعیت مکانی فعلی' : 'موقعیت انتخاب‌شده'}
          </span>
        </div>

        <div className="text-[11px] font-mono font-black tracking-tighter text-right dir-ltr">
          <span className={darkMode ? 'text-cyan-400' : 'text-cyan-700'}>
            {selectedCoords.lat.toFixed(6)}
          </span>
          <span className={darkMode ? 'text-slate-600' : 'text-slate-400'}> , </span>
          <span className={darkMode ? 'text-amber-400' : 'text-amber-700'}>
            {selectedCoords.lng.toFixed(6)}
          </span>
        </div>
      </div>
    </div>
  );
}

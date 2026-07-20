'use client';import { Shield, Users, Radio, ShieldAlert, AlertTriangle, UserPlus, Medal, Activity, Check, PhoneCall, LayoutDashboard, Lock, User, Smartphone, ThumbsUp, ThumbsDown, Filter, ArrowUpDown, Flame, Bomb, Wind, Sun, Moon, Eye, CheckCircle, Key, Settings, Truck, Mail, BarChart3, Globe, Monitor, ShieldCheck, Copy, ChevronDown, Home, Headphones, Upload, Send, MessageSquareCode, Bot, MapPin, FileText } from 'lucide-react';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import NeshanLocationPicker from '@/components/NeshanLocationPicker';
import HomepageCircularStatistics, { type HomepageStatistics } from '@/components/HomepageCircularStatistics';
import { IRANIAN_CITIES } from '@/lib/cities';

interface Incident {
  id: number;
  type: string;
  severityValue: number;
  description: string;
  reporterName: string;
  reporterPhone: string;
  lat: number;
  lng: number;
  status: 'در دست بررسی' | 'تایید شده' | 'رد صلاحیت شده' | 'تحت کنترل همیار (اعزام نیرو)';
  assignedHamyars?: string[];
  likes: number; 
  dislikes: number; 
  manualAddress?: string;
  mapLat?: number;
  mapLng?: number;
  city?: string;
}

interface Volunteer {
  id: number;
  fullName: string;
  phone: string;
  nationalId: string;
  gender: 'زن' | 'مرد' | '';
  birthDate?: string;
  skills: string[];
  job: string;
  address: string;
  status: 'در انتظار تایید' | 'تایید شده' | 'رد صلاحیت شده';
  rank?: 'امدادگر رسمی' | 'امدادگر ارشد' | 'امدادگر متخصص';
  city?: string;
  documents?: VolunteerDocument[];
}

interface VolunteerDocument {
  id: number;
  originalName: string;
  contentType: string;
  size: number;
  uploadedAt?: string;
}

interface SiteAnalytics {
  totalVisVisits: number;
  uniqueUsers: number;
  mobileHits: number;
  desktopHits: number;
  lastActiveTime: string;
}

interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

const TEHRAN_FALLBACK = { lat: 35.6892, lng: 51.3890 };

const checkMelliCode = (code: string): boolean => {
  const cleanCode = code.trim();
  if (!/^\d{10}$/.test(cleanCode)) return false;
  if (new Set(cleanCode).size === 1) return false;
  let totalSum = 0;
  for (let i = 0; i < 9; i++) { totalSum += parseInt(cleanCode[i]) * (10 - i); }
  const remainder = totalSum % 11;
  const controlDigit = parseInt(cleanCode[9]);
  return remainder < 2 ? controlDigit === remainder : controlDigit === (11 - remainder);
};

const isPersianName = (name: string): boolean => /^[\u0600-\u06FF\s]+$/.test(name.trim()) && name.trim().length >= 3;
const isValidIranianPhone = (phone: string): boolean => /^09\d{9}$/.test(phone.trim());

// آرایه‌های تاریخ تولد شمسی
const persianMonths = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
const persianDays = Array.from({ length: 31 }, (_, i) => i + 1);
const persianYears = Array.from({ length: 104 }, (_, i) => 1405 - i); // از ۱۴۰۳ تا ۱۳۰۰

export default function CrisisManagementSystem() {
    // 🟢 این استیت‌ها را به بخش استیت‌های بالای کامپوننت اضافه کن:
const [showMissionModal, setShowMissionModal] = useState(false);
const [selectedIncidentForMission, setSelectedIncidentForMission] = useState<Incident | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [currentView, setCurrentView] = useState<'home' | 'report' | 'volunteer' | 'admin' | 'support' | 'admin-edit' | 'analytics' | 'support-ai'>('home');
  const [severityValue, setSeverityValue] = useState<number>(20);
  const [markerPos, setMarkerPos] = useState(TEHRAN_FALLBACK);
  
  const [darkMode, setDarkMode] = useState(true);
  const [adminTab, setAdminTab] = useState<'incidents' | 'volunteers'>('incidents');
  const [selectedVolForPage, setSelectedVolForPage] = useState<Volunteer | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [isHamyarLoggedIn, setIsHamyarLoggedIn] = useState(false); 
  const [loggedInHamyar, setLoggedInHamyar] = useState<Volunteer | null>(null); 
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);        
  
  const [authIdentifier, setAuthIdentifier] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isAuthMode, setIsAuthMode] = useState(false);

  const [authMethod, setAuthMethod] = useState<'password' | 'otp'>('password');
  const [authOtpSent, setAuthOtpSent] = useState(false);
  const [authOtpCode, setAuthOtpCode] = useState('');
  const [authVerificationId, setAuthVerificationId] = useState('');
  
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState<'newest' | 'critical'>('newest');

  const [bannedPhones, setBannedPhones] = useState<string[]>(['09120000000']);
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [passwordChangeLoading, setPasswordChangeLoading] = useState(false);
// 🟢 این بلوک را جایگزین خط تعریف pendingMissionIncidentId کن:
  const [pendingMissionIncidentId, setPendingMissionIncidentId] = useState<number | null>(null);
  const [missionAgreementChecked, setMissionAgreementChecked] = useState(false);
  const [missionLoading, setMissionLoading] = useState(false);  const [volSubmitErrorMsg, setVolSubmitErrorMsg] = useState('');

  const [adminProfile, setAdminProfile] = useState({
    fullName: 'امیررضا دلوی',
    email: 'hamyarbohran@gmail.com',
    phone: '09912201633',
    studentId: '220701057'
  });

  const [analytics, setAnalytics] = useState<SiteAnalytics>({
    totalVisVisits: 0,
    uniqueUsers: 0,
    mobileHits: 0,
    desktopHits: 0,
    lastActiveTime: 'در حال پایش...'
  });

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [incidentsLoading, setIncidentsLoading] = useState(true);
  const [incidentsLoadError, setIncidentsLoadError] = useState(false);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [homepageStatistics, setHomepageStatistics] = useState<HomepageStatistics | null>(null);
  const [homepageStatisticsError, setHomepageStatisticsError] = useState(false);

  const [crisisType, setCrisisType] = useState('زلزله یا تخریب سازه');
  const [customCrisis, setCustomCrisis] = useState('');
  const [incidentDesc, setIncidentDesc] = useState('');
  const [incidentAddress, setIncidentAddress] = useState('');
  const [isIncidentSubmitting, setIsIncidentSubmitting] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(''); 
  const [isAddressResolving, setIsAddressResolving] = useState(false);
  const [reporterName, setReporterName] = useState('');
  const [reporterPhone, setReporterPhone] = useState('');

  const [volName, setVolName] = useState('');
  const [volPhone, setVolPhone] = useState('');
  const [volNationalId, setVolNationalId] = useState('');
  const [volGender, setVolGender] = useState<'زن' | 'مرد' | ''>('');
  
  const [volBirthDay, setVolBirthDay] = useState('');
  const [volBirthMonth, setVolBirthMonth] = useState('');
  const [volBirthYear, setVolBirthYear] = useState('');

  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [customSkill, setCustomSkill] = useState('');
  const [volJob, setVolJob] = useState('');
  const [volAddress, setVolAddress] = useState('');
  const [volDocument, setVolDocument] = useState<VolunteerDocument | null>(null);
  const [volDocumentUploading, setVolDocumentUploading] = useState(false);
  const [volDocumentError, setVolDocumentError] = useState('');
  const [volDocumentMaxSize, setVolDocumentMaxSize] = useState(30 * 1024 * 1024);
  const [volDocumentMaxSizeMb, setVolDocumentMaxSizeMb] = useState(30);

  const [reportOtpSent, setReportOtpSent] = useState(false);
  const [reportOtpCode, setReportOtpCode] = useState('');
  const [isReportPhoneVerified, setIsReportPhoneVerified] = useState(false);
  const [reportVerificationId, setReportVerificationId] = useState('');

  const [volOtpSent, setVolOtpSent] = useState(false);
  const [volOtpCode, setVolOtpCode] = useState('');
  const [isVolPhoneVerified, setIsVolPhoneVerified] = useState(false);
  const [volVerificationId, setVolVerificationId] = useState('');

  const [volCooldown, setVolCooldown] = useState(false);
  const [volCooldownSeconds, setVolCooldownSeconds] = useState(0);

  const [openCrisisDropdown, setOpenCrisisDropdown] = useState(false);
  const [openGenderDropdown, setOpenGenderDropdown] = useState(false);
  const [openBirthDropdown, setOpenBirthDropdown] = useState<'day' | 'month' | 'year' | null>(null);
  const [openCityDropdown, setOpenCityDropdown] = useState(false);
  const [openFilterDropdown, setOpenFilterDropdown] = useState(false);
  const [openSortDropdown, setOpenSortDropdown] = useState(false);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'model', content: 'سلام! من دستیار هوشمند سامانه همیار بحران هستم. چطور می‌توانم در زمینه ثبت فوریت‌های اضطراری، کمک‌های اولیه یا عضویت داوطلبان راهنمایی‌تان کنم؟' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const analyticsFired = useRef(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const geocodeRequestRef = useRef(0);
  const geocodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const geocodeAbortRef = useRef<AbortController | null>(null);
  const geocodeCacheRef = useRef(new Map<string, { city: string; address: string }>());
  
  const [incidentCity, setIncidentCity] = useState('');
  const [volCity, setVolCity] = useState('');

  const refreshIncidents = async () => {
    setIncidentsLoading(true);
    try {
      const response = await fetch('/api/incidents', { cache: 'no-store' });
      if (!response.ok) throw new Error('Failed to fetch incidents');
      setIncidents(await response.json());
      setIncidentsLoadError(false);
    } catch (error) {
      setIncidentsLoadError(true);
      throw error;
    } finally {
      setIncidentsLoading(false);
    }
  };

  const refreshVolunteers = async () => {
    const response = await fetch('/api/volunteers');
    if (!response.ok) throw new Error('Failed to fetch volunteers');
    setVolunteers(await response.json());
  };

  const refreshHomepageStatistics = async () => {
    try {
      const response = await fetch('/api/statistics', { cache: 'no-store' });
      if (!response.ok) throw new Error('Failed to fetch homepage statistics');
      const data = await response.json();
      if (
        !Number.isInteger(data.registeredVolunteers) ||
        !Number.isInteger(data.approvedVolunteers) ||
        !Number.isInteger(data.rejectedVolunteers) ||
        !Number.isInteger(data.registeredIncidents) ||
        !Number.isInteger(data.approvedIncidents) ||
        !Number.isInteger(data.rejectedIncidents) ||
        !Number.isInteger(data.coveredCities)
      ) {
        throw new Error('Invalid homepage statistics response');
      }
      setHomepageStatistics({
        registeredVolunteers: data.registeredVolunteers,
        approvedVolunteers: data.approvedVolunteers,
        rejectedVolunteers: data.rejectedVolunteers,
        registeredIncidents: data.registeredIncidents,
        approvedIncidents: data.approvedIncidents,
        rejectedIncidents: data.rejectedIncidents,
        coveredCities: data.coveredCities
      });
      setHomepageStatisticsError(false);
    } catch (error) {
      console.error('Error loading homepage statistics:', error);
      setHomepageStatisticsError(true);
    }
  };

  const getIncidentMapUrl = (incident: Incident) => {
    const lat = Number(incident.mapLat ?? incident.lat);
    const lng = Number(incident.mapLng ?? incident.lng);
    return Number.isFinite(lat) && Number.isFinite(lng)
      ? `https://www.google.com/maps?q=${lat},${lng}`
      : null;
  };

  const volunteerFieldClass = `w-full rounded-xl border px-4 py-3 text-sm font-bold outline-none transition-all focus:ring-2 focus:ring-red-500/30 ${
    darkMode
      ? 'border-slate-700 bg-slate-800/50 text-white focus:border-red-500 placeholder:text-slate-500'
      : 'border-slate-200 bg-slate-50/50 text-slate-900 focus:border-red-400 placeholder:text-slate-400'
  }`;
  // ====== تابع تبدیل مختصات به آدرس ======
// ====== تابع تبدیل مختصات به آدرس با OpenStreetMap ======
const fetchAddressFromCoords = async (lat: number, lng: number, signal: AbortSignal) => {
  try {
    const response = await fetch('/api/geocode/reverse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat, lng }),
      signal
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data?.city && data?.address
      ? {
          city: String(data.city),
          address: String(data.address),
          providerAvailable: data.providerAvailable !== false
        }
      : null;
  } catch (error) {
    if (!(error instanceof DOMException && error.name === 'AbortError')) {
      console.error('Reverse geocoding failed temporarily');
    }
    return null;
  }
};

// ====== تابع مدیریت انتخاب لوکیشن (با نگهداری آدرس دستی) ======
// ====== تابع مدیریت انتخاب لوکیشن (فقط برای نمایش زیر نقشه) ======
const handleLocationSelect = (coords: { lat: number; lng: number }) => {
  const requestId = ++geocodeRequestRef.current;
  setMarkerPos(coords);
  setIncidentCity('');
  setSelectedAddress('');
  setIsAddressResolving(true);
  if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current);
  geocodeAbortRef.current?.abort();
  const cacheKey = `${coords.lat.toFixed(4)},${coords.lng.toFixed(4)}`;
  const cached = geocodeCacheRef.current.get(cacheKey);
  if (cached) {
    setSelectedAddress(cached.address);
    setIncidentCity(cached.city);
    setIsAddressResolving(false);
    return;
  }
  geocodeTimerRef.current = setTimeout(async () => {
    const controller = new AbortController();
    geocodeAbortRef.current = controller;
    const location = await fetchAddressFromCoords(coords.lat, coords.lng, controller.signal);
    if (requestId !== geocodeRequestRef.current) return;
    setIsAddressResolving(false);
    if (location) {
      if (location.providerAvailable) geocodeCacheRef.current.set(cacheKey, location);
      setSelectedAddress(location.address);
      setIncidentCity(location.city);
    } else {
      setSelectedAddress('آدرس دقیق موقتاً در دسترس نیست، موقعیت روی نقشه ذخیره شد.');
    }
  }, 350);
};

  useEffect(() => {
    return () => {
      if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current);
      geocodeAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (volCooldown && volCooldownSeconds > 0) {
      timer = setTimeout(() => {
        setVolCooldownSeconds(prev => prev - 1);
      }, 1000);
    } else if (volCooldown && volCooldownSeconds === 0) {
      setVolCooldown(false);
    }
    return () => clearTimeout(timer);
  }, [volCooldown, volCooldownSeconds]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    fetch('/api/uploads/sign')
      .then(response => response.ok ? response.json() : null)
      .then(config => {
        if (Number.isFinite(config?.maxSize) && config.maxSize > 0) setVolDocumentMaxSize(config.maxSize);
        if (Number.isFinite(config?.maxSizeMb) && config.maxSizeMb > 0) setVolDocumentMaxSizeMb(config.maxSizeMb);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!finePointer.matches || reducedMotion.matches) return;

    let frame = 0;
    const handlePointerMove = (event: PointerEvent) => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        document.documentElement.style.setProperty('--cursor-x', `${event.clientX}px`);
        document.documentElement.style.setProperty('--cursor-y', `${event.clientY}px`);
      });
    };
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isChatLoading]);

useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedView = localStorage.getItem('hamyar_current_view');
      const savedTheme = localStorage.getItem('hamyar_theme');

      fetch('/api/auth/session')
        .then(async response => response.ok ? response.json() : { user: null })
        .then(({ user }) => {
          if (user?.role === 'senior_admin') {
            setIsAdminLoggedIn(true);
            setIsHamyarLoggedIn(false);
            refreshVolunteers().catch(err => console.error('Error loading volunteers:', err));
          } else if (user?.role === 'approved_volunteer' && user.volunteer) {
            setIsHamyarLoggedIn(true);
            setIsAdminLoggedIn(false);
            setLoggedInHamyar(user.volunteer);
            localStorage.setItem('hamyar_logged_in_data', JSON.stringify(user.volunteer));
          } else {
            setIsAdminLoggedIn(false);
            setIsHamyarLoggedIn(false);
            setLoggedInHamyar(null);
          }
          refreshIncidents().catch(err => console.error('Error loading incidents:', err));
        })
        .catch(err => console.error('Error restoring session:', err));

      if (savedView) {
        setCurrentView(savedView as any);
      } else {
        setCurrentView('home');
      }
      
      if (savedTheme !== null) setDarkMode(savedTheme === 'dark');

      if (analyticsFired.current) return;
      analyticsFired.current = true;

      const userIsMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent);
      const isNewUnique = !localStorage.getItem('real_unique_user');

      // ... بقیه کدهای مربوط به آمار سایت (fetch analytics) ...

      fetch('/api/analytics')
        .then(res => res.json())
        .then(data => {
          const updated = {
            totalVisVisits: data.totalVisVisits + 1,
            uniqueUsers: isNewUnique ? data.uniqueUsers + 1 : data.uniqueUsers,
            mobileHits: userIsMobile ? data.mobileHits + 1 : data.mobileHits,
            desktopHits: !userIsMobile ? data.desktopHits + 1 : data.desktopHits,
            lastActiveTime: new Date().toLocaleTimeString('fa-IR')
          };

          return fetch('/api/analytics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updated)
          }).then(res => res.json());
        })
        .then(updatedAnalytics => {
          setAnalytics(updatedAnalytics);
          if (isNewUnique) localStorage.setItem('real_unique_user', 'true');
        })
        .catch(err => {
          console.error('Analytics sync failed:', err);
        });
    }
  }, []);

  useEffect(() => {
    refreshIncidents().catch(err => console.error('Error loading incidents:', err));
    refreshHomepageStatistics();
  }, []);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 2000);
  };

  const navigateToView = (viewName: 'home' | 'report' | 'volunteer' | 'admin' | 'support' | 'admin-edit' | 'analytics' | 'support-ai') => {
    setCurrentView(viewName);
    if (typeof window !== 'undefined') {
      localStorage.setItem('hamyar_current_view', viewName);
    }
  };

  const toggleTheme = () => {
    const nextMode = !darkMode;
    setDarkMode(nextMode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('hamyar_theme', nextMode ? 'dark' : 'light');
    }
  };

  const createIdempotencyKey = (phone: string) => {
    return `login-${phone.trim()}-${Math.floor(Date.now() / 1000)}-${Math.random().toString(36).substring(2, 7)}`;
  };

  const handleSendReportOTP = async (phone: string, provider: 'bale' | 'sms' = 'bale') => {
    if (!isValidIranianPhone(phone)) { alert("❌ شماره همراه باید ۱۱ رقم و با ۰۹ شروع شود."); return; }
    if (bannedPhones.includes(phone.trim())) { alert("🚫 دسترسی این شماره همراه مسدود است."); return; }
    const generatedKey = createIdempotencyKey(phone);
    try {
      const response = await fetch('/api/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', phone: phone.trim(), idempotencyKey: generatedKey, provider, purpose: 'incident_report' })
      });
      if (response.ok) {
        const data = await response.json();
        setReportVerificationId(data.verification_id);
        setReportOtpSent(true);
        alert(provider === 'sms' ? "🚀 کد تایید از طریق پیامک (کاوه نگار) ارسال شد." : "🚀 کد تایید به حساب بله شما ارسال شد.");
      } else {
        alert("❌ خطا در اتصال به سرور درگاه تایید هویت.");
      }
    } catch (err) {
      alert("❌ خطا در شبکه.");
    }
  };

  const handleVerifyReportOTP = async () => {
    try {
      const response = await fetch('/api/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', verification_id: reportVerificationId, code: reportOtpCode })
      });
      const result = await response.json();
      if (response.ok && (result.verified === true || result.status === 'success' || result.data?.verified === true)) {
        setIsReportPhoneVerified(true);
        setReportOtpSent(false);
        alert("✅ تایید هویت با موفقیت انجام شد!");
      } else {
        alert("❌ کد تایید هویت نامعتبر یا منقضی شده است.");
      }
    } catch (err) {
      alert("❌ خطا در فرآیند تایید پاسخ درگاه.");
    }
  };

  const handleSendVolOTP = async (phone: string, provider: 'bale' | 'sms' = 'bale') => {
    if (!isValidIranianPhone(phone)) { alert("❌ شماره همراه نامعتبر است."); return; }
    if (bannedPhones.includes(phone.trim())) { alert("🚫 شماره شما در لیست سیاه قرار دارد."); return; }
    if (volCooldown) return; 

    const generatedKey = createIdempotencyKey(phone);
    try {
      const response = await fetch('/api/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', phone: phone.trim(), idempotencyKey: generatedKey, provider, purpose: 'volunteer_application' })
      });
      if (response.ok) {
        const data = await response.json();
        setVolVerificationId(data.verification_id);
        setVolOtpSent(true);
        setVolSubmitErrorMsg('');
        alert(provider === 'sms' ? "🚀 کد تایید از طریق پیامک (کاوه نگار) ارسال شد." : "🚀 کد تایید به حساب بله شما ارسال شد.");
        setVolCooldown(true);
        setVolCooldownSeconds(120);
      } else {
        alert("❌ خطا در ارسال کد.");
      }
    } catch (err) {
      alert("❌ خطای شبکه.");
    }
  };

  const handleVerifyVolOTP = async () => {
    try {
      const response = await fetch('/api/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', verification_id: volVerificationId, code: volOtpCode })
      });
      const result = await response.json();
      if (response.ok && (result.verified === true || result.status === 'success' || result.data?.verified === true)) {
        setIsVolPhoneVerified(true);
        setVolOtpSent(false);
        setVolSubmitErrorMsg('');
        alert("✅ تایید هویت با موفقیت انجام شد!");
        setVolCooldown(false);
        setVolCooldownSeconds(0);
      } else {
        alert("❌ کد تایید نادرست است.");
      }
    } catch (err) {
      alert("❌ خطا در تایید کد.");
    }
  };

  const handleSendAuthOTP = async () => {
    const phone = authIdentifier.trim();
    if (!isValidIranianPhone(phone)) { alert("❌ جهت ورود پیامکی، لطفاً یک شماره همراه معتبر وارد کنید."); return; }
    if (bannedPhones.includes(phone)) { alert("🚫 شماره همراه وارد شده مسدود است."); return; }
    
    const generatedKey = createIdempotencyKey(phone);
    try {
      const response = await fetch('/api/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', phone: phone, idempotencyKey: generatedKey, provider: authMethod === 'otp' ? 'bale' : 'sms', purpose: 'login' })
      });
      if (response.ok) {
        const data = await response.json();
        setAuthVerificationId(data.verification_id);
        setAuthOtpSent(true);
        alert("🚀 کد یکبار مصرف با موفقیت ارسال شد.");
      } else {
        alert("❌ خطا در ارسال کد ورود.");
      }
    } catch (err) {
      alert("❌ خطای ارتباطی.");
    }
  };

const handleAdminAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const ident = authIdentifier.trim();

    if (authMethod === 'password') {
      const pass = authPassword.trim();
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: ident, password: pass })
        });
        const result = await response.json();
        if (!response.ok) {
          alert(`❌ ${result.error || 'اطلاعات ورود نامعتبر است.'}`);
          return;
        }

        if (result.user.role === 'senior_admin') {
          setIsAdminLoggedIn(true);
          setIsHamyarLoggedIn(false);
          setLoggedInHamyar(null);
          await refreshVolunteers();
        } else {
          setIsHamyarLoggedIn(true);
          setIsAdminLoggedIn(false);
          setLoggedInHamyar(result.user.volunteer);
          localStorage.setItem('hamyar_logged_in_data', JSON.stringify(result.user.volunteer));
        }
        await refreshIncidents();
        setIsAuthMode(false);
        navigateToView('admin');
        setAuthIdentifier(''); setAuthPassword('');
      } catch {
        alert('❌ خطای ارتباط با سرور احراز هویت.');
      }
    } else {
      if (!authOtpSent) { alert("❌ ابتدا باید درخواست ارسال کد تایید را ثبت کنید."); return; }
      
      let verified = false;
      try {
        const response = await fetch('/api/otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'verify', verification_id: authVerificationId, code: authOtpCode, phone: ident, purpose: 'login' })
        });
        const result = await response.json();
        if (response.ok && (result.verified === true || result.status === 'success' || result.data?.verified === true)) {
          verified = true;
          if (result.user?.role === 'senior_admin') {
            setIsAdminLoggedIn(true);
            setIsHamyarLoggedIn(false);
            setLoggedInHamyar(null);
            await refreshVolunteers();
          } else if (result.user?.role === 'approved_volunteer' && result.user.volunteer) {
            setIsHamyarLoggedIn(true);
            setLoggedInHamyar(result.user.volunteer);
            setIsAdminLoggedIn(false);
            localStorage.setItem('hamyar_logged_in_data', JSON.stringify(result.user.volunteer));
          }
          await refreshIncidents();
        } else if (result.error) {
          alert(`❌ ${result.error}`);
          return;
        }
      } catch (err) {
        alert("❌ خطا در تایید کد ورود.");
        return;
      }

      if (verified) {
        setIsAuthMode(false);
        navigateToView('admin');
        setAuthIdentifier(''); setAuthOtpCode(''); setAuthOtpSent(false);
        alert('✅ ورود پیامکی با موفقیت انجام شد.');
      } else {
        alert("❌ کد تایید هویت نامعتبر یا منقضی شده است.");
      }
    }
  };

  const handleIncidentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isIncidentSubmitting) return;
    
    if (markerPos.lat === TEHRAN_FALLBACK.lat && markerPos.lng === TEHRAN_FALLBACK.lng) {
      alert("❌ خطای موقعیت‌یابی: شما لوکیشن حادثه را تغییر نداده‌اید! لطفاً ابتدا موقعیت دقیق بحران را روی نقشه نشان علامت‌گذاری کنید.");
      return;
    }

    if (!isReportPhoneVerified && !isAdminLoggedIn) { alert("❌ ابتدا باید شماره همراه خود را تایید کنید."); return; }
    if (!isPersianName(reporterName)) { alert("❌ نام باید با حروف الفبای فارسی تایپ شود!"); return; }

    const finalType = crisisType === 'other' ? customCrisis : crisisType;
    const locationString = ` (موقعیت متنی: ${incidentAddress.trim()} | مختصات ماهواره‌ای: lat: ${markerPos.lat.toFixed(4)}, lng: ${markerPos.lng.toFixed(4)})`;
    
    const newIncident: Incident = {
      id: Date.now(),
      type: finalType,
      severityValue: severityValue,
      description: incidentDesc + locationString,
      reporterName: reporterName.trim(),
      reporterPhone: reporterPhone.trim(),
      lat: markerPos.lat,
      lng: markerPos.lng,
      status: isAdminLoggedIn ? 'تایید شده' : 'در دست بررسی',
      likes: 0,
      dislikes: 0,
      assignedHamyars: [],
      manualAddress: incidentAddress,   // ← اضافه کنید
      mapLat: markerPos.lat,            // ← اضافه کنید
      mapLng: markerPos.lng,            // ← اضافه کنید
      city: incidentCity                // ← اضافه کنید
    };

    setIsIncidentSubmitting(true);
    try {
      const response = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newIncident)
      });
      const result = await response.json();
      if (!response.ok) {
        alert(`❌ ${result.error || 'ثبت گزارش ناموفق بود.'}`);
        return;
      }

      newIncident.city = result.city || newIncident.city;
      setIncidents(prev => [newIncident, ...prev]);
      refreshHomepageStatistics();
      alert(result.warning
        ? `✅ گزارش ثبت شد. ${result.warning}`
        : (isAdminLoggedIn ? '🚨 گزارش با تایید آنی ثبت گردید.' : '🚨 گزارش واقعه ثبت شد و پیامک تأیید ارسال گردید.'));
      setIncidentDesc(''); setIncidentAddress(''); setReporterName(''); setReporterPhone(''); setSeverityValue(20); setIsReportPhoneVerified(false);
      setIncidentCity('');
      setMarkerPos(TEHRAN_FALLBACK);
      if(isAdminLoggedIn) navigateToView('admin');
    } catch {
      alert('❌ خطای شبکه؛ گزارش ثبت نشد.');
    } finally {
      setIsIncidentSubmitting(false);
    }
  };

  const handleVolunteerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setVolSubmitErrorMsg('');
    if (volDocumentUploading) {
      alert('لطفاً تا پایان آپلود مدرک صبر کنید.');
      return;
    }
    if (!isVolPhoneVerified) { 
      alert('❌ خطا: جهت ثبت درخواست ابتدا باید شماره همراه خود را احراز هویت کنید.');
      return; 
    }
    if (!isPersianName(volName)) { alert("❌ نام باید صرفاً با حروف فارسی قرار بگیرد."); return; }
    if (!checkMelliCode(volNationalId)) { alert("❌ کد ملی معتبر نیست!"); return; }
    if (volGender === '') { alert("❌ لطفا جنسیت خود را انتخاب کنید."); return; }
    if (!volBirthDay || !volBirthMonth || !volBirthYear) { alert("❌ لطفا تاریخ تولد خود را به صورت کامل (روز، ماه، سال) وارد کنید."); return; }
    if (!volCity) { alert('❌ لطفاً شهر محل سکونت را از فهرست انتخاب کنید.'); return; }
    if (selectedSkills.length === 0) { alert("❌ لطفا حداقل یک تخصص انتخاب کنید."); return; }

    const finalSkills = selectedSkills.filter(s => s !== 'other_skill');
    if (selectedSkills.includes('other_skill') && customSkill.trim()) {
      finalSkills.push(customSkill.trim());
    }

    const birthDateStr = `${volBirthYear}/${volBirthMonth}/${volBirthDay}`;

    const newVolunteer: Volunteer = {
      id: Date.now(), 
      fullName: volName.trim(), 
      phone: volPhone.trim(), 
      nationalId: volNationalId.trim(), 
      gender: volGender, 
      birthDate: birthDateStr,
      skills: finalSkills, 
      job: volJob.trim(), 
      address: volAddress.trim(), 
      status: 'در انتظار تایید',
      city: volCity.trim()  // ← اضافه کنید
    };

    try {
      const response = await fetch('/api/volunteers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newVolunteer)
      });
      const result = await response.json();
      if (!response.ok) {
        setVolSubmitErrorMsg(result.error || 'ثبت درخواست داوطلبی ناموفق بود.');
        alert(`❌ ${result.error || 'ثبت درخواست داوطلبی ناموفق بود.'}`);
        return;
      }
      setVolunteers(prev => [{ ...newVolunteer, id: result.id }, ...prev]);
      refreshHomepageStatistics();
      setVolSubmitErrorMsg('');
      alert('📝 درخواست داوطلبی با موفقیت ثبت شد.');
      setVolName(''); setVolPhone(''); setVolNationalId(''); setVolGender('');
      setVolBirthDay(''); setVolBirthMonth(''); setVolBirthYear('');
      setSelectedSkills([]); setCustomSkill(''); setVolJob(''); setVolAddress(''); setVolCity(''); setIsVolPhoneVerified(false);
      setVolDocument(null); setVolDocumentError('');
    } catch {
      alert('❌ خطای شبکه؛ درخواست ثبت نشد.');
    }
  };

  const handleVolunteerDocumentSelect = async (file: File | undefined) => {
    if (!file || volDocumentUploading) return;
    setVolDocumentError('');
    const extension = file.name.toLowerCase().split('.').pop();
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type) || !['pdf', 'jpg', 'jpeg', 'png'].includes(extension || '')) {
      setVolDocumentError('فقط فایل‌های PDF، JPG، JPEG و PNG مجاز هستند.');
      return;
    }
    if (file.size <= 0 || file.size > volDocumentMaxSize) {
      setVolDocumentError(`حجم فایل باید بیشتر از صفر و حداکثر ${volDocumentMaxSizeMb} مگابایت باشد.`);
      return;
    }
    if (!isVolPhoneVerified) {
      setVolDocumentError('ابتدا شماره همراه خود را تأیید کنید.');
      return;
    }

    setVolDocumentUploading(true);
    try {
      const signResponse = await fetch('/api/uploads/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: file.name, contentType: file.type, size: file.size })
      });
      const signed = await signResponse.json();
      if (!signResponse.ok) throw new Error(signed.error || 'آماده‌سازی آپلود فایل ممکن نشد.');
      const uploadId = Number(signed.uploadId);
      const uploadResponse = await fetch(signed.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file
      });
      if (!uploadResponse.ok) throw new Error('ارسال فایل به فضای ذخیره‌سازی ناموفق بود.');
      const completeResponse = await fetch('/api/uploads/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadId })
      });
      const completed = await completeResponse.json();
      if (!completeResponse.ok) throw new Error(completed.error || 'تأیید فایل آپلودشده ممکن نشد.');
      setVolDocument({ id: Number(completed.documentId), originalName: file.name, contentType: file.type, size: file.size });
    } catch (error) {
      setVolDocumentError(error instanceof Error ? error.message : 'آپلود فایل ممکن نشد.');
    } finally {
      setVolDocumentUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleViewVolunteerDocument = async (documentId: number) => {
    const preview = window.open('', '_blank', 'noopener,noreferrer');
    try {
      const response = await fetch(`/api/uploads/${documentId}/download`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'مشاهده فایل ممکن نشد.');
      if (preview) preview.location.href = result.url;
      else window.location.href = result.url;
    } catch (error) {
      preview?.close();
      alert(error instanceof Error ? error.message : 'مشاهده فایل ممکن نشد.');
    }
  };

  const handleDeleteVolunteerDocument = async (documentId: number) => {
    if (!confirm('آیا از حذف این مدرک مطمئن هستید؟')) return;
    const response = await fetch(`/api/uploads/${documentId}`, { method: 'DELETE' });
    const result = await response.json();
    if (!response.ok) {
      alert(result.error || 'حذف فایل ممکن نشد.');
      return;
    }
    setVolunteers(prev => prev.map(volunteer => ({
      ...volunteer,
      documents: volunteer.documents?.filter(document => document.id !== documentId)
    })));
    setSelectedVolForPage(prev => prev ? {
      ...prev,
      documents: prev.documents?.filter(document => document.id !== documentId)
    } : null);
  };

  const handleChangeHamyarPassword = async () => {
    const next = newPasswordInput;
    if (next.length < 6 || (next.match(/[A-Za-z]/g)?.length || 0) < 2 || (next.match(/[0-9]/g)?.length || 0) < 2) {
      alert('❌ گذرواژه جدید باید حداقل ۶ کاراکتر و شامل دست‌کم ۲ حرف و ۲ رقم انگلیسی باشد.');
      return;
    }
    if (next !== confirmPasswordInput) { alert('❌ تکرار گذرواژه جدید مطابقت ندارد.'); return; }
    if (next === currentPasswordInput) { alert('❌ گذرواژه جدید نباید با گذرواژه فعلی یکسان باشد.'); return; }

    setPasswordChangeLoading(true);
    try {
      const response = await fetch('/api/auth/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentPasswordInput, newPassword: next, confirmation: confirmPasswordInput })
      });
      const result = await response.json();
      if (!response.ok) { alert(`❌ ${result.error || 'تغییر گذرواژه ناموفق بود.'}`); return; }
      setCurrentPasswordInput(''); setNewPasswordInput(''); setConfirmPasswordInput('');
      alert('✅ گذرواژه با موفقیت تغییر یافت.');
    } catch {
      alert('❌ خطای شبکه در تغییر گذرواژه.');
    } finally {
      setPasswordChangeLoading(false);
    }
  };

  const handleVote = (id: number, type: 'like' | 'dislike') => {
    setIncidents(prev => prev.map(inc => {
      if (inc.id === id) {
        return {
          ...inc,
          likes: type === 'like' ? inc.likes + 1 : inc.likes,
          dislikes: type === 'dislike' ? inc.dislikes + 1 : inc.dislikes
        };
      }
      return inc;
    }));
  };

  const handleSaveAdminProfile = (e: React.FormEvent) => {
    e.preventDefault();
    alert("⚙️ اطلاعات با موفقیت بروزرسانی شد.");
    navigateToView('admin');
  };

  const handleCopyToClipboardAndToast = (text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      showToast("📋 کپی شد!");
    }
  };

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const userText = chatInput.trim();
    setChatInput('');
    
    const updatedMessages = [...chatMessages, { role: 'user', content: userText } as ChatMessage];
    setChatMessages(updatedMessages);
    setIsChatLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages })
      });

      if (response.ok) {
        const data = await response.json();
        setChatMessages(prev => [...prev, { role: 'model', content: data.reply }]);
      } else {
        setChatMessages(prev => [...prev, { role: 'model', content: '❌ خطا در دریافت پاسخ از هسته پردازشی. لطفاً مجدداً تلاش فرمایید.' }]);
      }
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'model', content: '❌ ارتباط با سرور هوش مصنوعی قطع شد. وضعیت شبکه را بررسی کنید.' }]);
    } finally {
      setIsChatLoading(false);
    }
  };

const processedIncidents = useMemo(() => {
  let result = [...incidents];
  
  // 🟢 گارد فرانت‌باند: اگر همیار لاگین بود، حوادث "در دست بررسی" را کلاً نبیند
  if (isHamyarLoggedIn && !isAdminLoggedIn) {
    result = result.filter(inc => inc.status === 'تایید شده' || inc.status === 'تحت کنترل همیار (اعزام نیرو)');
  }

  if (filterType !== 'all') { result = result.filter(inc => inc.type === filterType); }
  if (sortBy === 'critical') { result.sort((a, b) => b.severityValue - a.severityValue); }
  else { result.sort((a, b) => b.id - a.id); }
  return result;
}, [incidents, filterType, sortBy, isHamyarLoggedIn, isAdminLoggedIn]);

  const statsMemo = useMemo(() => {
    return {
      total: incidents.length,
      pending: incidents.filter(i => i.status === 'در دست بررسی').length,
      approved: incidents.filter(i => i.status === 'تایید شده' || i.status === 'تحت کنترل همیار (اعزام نیرو)').length,
      critical: incidents.filter(i => i.severityValue >= 75).length
    };
  }, [incidents]);

  const severityColor = useMemo(() => {
    if (severityValue < 35) return 'rgb(16, 185, 129)';
    if (severityValue < 70) return 'rgb(245, 158, 11)';
    return 'rgb(239, 68, 68)';
  }, [severityValue]);

  const getCrisisIconComponent = (type: string, color: string) => {
    if (type.includes('زلزله')) return <ShieldAlert className="w-5 h-5" style={{ color }} />;
    if (type.includes('بمباران') || type.includes('موشک')) return <Bomb className="w-5 h-5" style={{ color }} />;
    if (type.includes('آتش')) return <Flame className="w-5 h-5" style={{ color }} />;
    if (type.includes('سیل')) return <Activity className="w-5 h-5" style={{ color }} />;
    return <Wind className="w-5 h-5" style={{ color }} />;
  };

  return (
    <main dir="rtl" className={`relative w-full h-screen flex flex-col md:flex-row overflow-hidden font-sans select-none antialiased transition-colors duration-300 ${darkMode ? 'bg-slate-900 text-slate-100' : 'bg-[#e0f2fe]'}`}>
      <div aria-hidden="true" className={`cursor-glow ${darkMode ? 'cursor-glow-dark' : 'cursor-glow-light'}`} />
      
      {/* 🎧 ویجت پشتیبانی شناور */}
      {currentView !== 'support-ai' && (
        <div className="fixed left-4 bottom-20 md:left-8 md:bottom-8 z-[480] flex flex-col items-center group">
          <button
            type="button"
            onClick={() => { navigateToView('support-ai'); setIsAuthMode(false); setSelectedVolForPage(null); }}
            className={`p-4 rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.3)] transition-all duration-300 hover:scale-110 active:scale-95 flex items-center justify-center ${
              darkMode 
                ? 'bg-slate-900 text-cyan-400 border border-slate-800 hover:border-cyan-500/50 shadow-[0_0_25px_rgba(34,211,238,0.15)]' 
                : 'bg-white text-cyan-600 border border-slate-200 hover:border-cyan-300 shadow-[0_8px_30px_rgba(0,0,0,0.12)]'
            }`}
            title="چت‌بات هوشمند"
          >
            <Bot className={`w-5 h-5 md:w-6 md:h-6 ${darkMode ? 'text-blue-400' : 'text-[#2563EB]'} ${currentView === 'home' ? 'animate-bounce' : 'animate-pulse'}`} />
          </button>
          <span className={`absolute top-full mt-2 whitespace-nowrap text-[10px] font-black px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none shadow ${darkMode ? 'bg-slate-950 text-slate-300' : 'bg-slate-800 text-white'}`}>🤖 چت‌بات هوشمند</span>
        </div>
      )}

      {/* پیام شناور کاستوم */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-[999] bg-red-600 text-white font-black text-xs px-4 py-2 rounded-xl shadow-2xl animate-fadeIn">
          {toastMessage}
        </div>
      )}

      <style jsx global>{`
        .leaflet-control-attribution, 
        .leaflet-control-attribution a, 
        .leaflet-control-attribution span {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          height: 0 !important;
          width: 0 !important;
        }
      `}</style>

      {/* ☀️ سوئیچر تم */}
      <div className="absolute top-4 left-4 md:left-28 z-[410] flex items-center gap-2">
        <button type="button" onClick={toggleTheme} className={`p-3.5 rounded-xl border transition-all duration-300 ${darkMode ? 'bg-slate-900 border-slate-800 text-amber-400' : 'bg-white border-slate-300 text-slate-800 shadow-md hover:bg-slate-100'}`}>
          {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>

      {/* 🖥️ سایدبار دسکتاپ */}
      <aside className={`hidden md:flex absolute top-0 right-0 w-24 hover:w-80 h-full border-l justify-between flex-col z-[405] shadow-[-5px_0_40px_rgba(0,0,0,0.15)] transition-[width] duration-[360ms] ease-[cubic-bezier(0.22,1,0.36,1)] group overflow-hidden ${darkMode ? 'bg-slate-900/95 border-slate-800' : 'bg-gradient-to-b from-pink-50 to-blue-50 border-slate-300 text-slate-900 shadow-xl'}`}>
        <div className="w-full h-full p-4 flex flex-col items-center justify-start gap-6 overflow-hidden">
          <div className="flex flex-col items-center text-center gap-2 border-b border-black/5 w-full min-w-[240px] pb-4">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/40 flex items-center justify-center shadow-lg shrink-0">
              <Radio className="w-7 h-7 text-red-500 animate-pulse" />
            </div>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-[240ms] group-hover:delay-100">
              <h1 className="text-base font-black tracking-tight">سامانه همیار بحران</h1>
              <p className="text-[9px] text-red-500 font-mono tracking-widest uppercase mt-0.5 font-black">Tactical Command Center</p>
            </div>
          </div>

          <nav className="w-full flex flex-col items-center justify-start gap-3">
            <button onClick={() => { navigateToView('home'); setIsAuthMode(false); setSelectedVolForPage(null); }} className={`flex w-full h-12 group-hover:h-auto items-center justify-center group-hover:justify-start px-4 py-3 rounded-2xl text-xs font-black transition-all duration-200 text-right ${currentView === 'home' && !isAuthMode ? 'bg-gradient-to-r from-red-700 to-red-600 text-white shadow-lg scale-105' : 'text-slate-500 hover:bg-black/5 font-black'}`}>
              <Home className={`w-6 h-6 shrink-0 ${currentView === 'home' && !isAuthMode ? 'text-white' : 'text-red-600'}`} />
                <span className="absolute group-hover:static opacity-0 group-hover:opacity-100 transition-opacity duration-[240ms] group-hover:delay-100 whitespace-nowrap mr-3 text-xs font-black">خانه</span>
            </button>

            <button onClick={() => { navigateToView('report'); setIsAuthMode(false); setSelectedVolForPage(null); }} className={`flex w-full h-12 group-hover:h-auto items-center justify-center group-hover:justify-start px-4 py-3 rounded-2xl text-xs font-black transition-all duration-200 text-right ${currentView === 'report' && !isAuthMode ? 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg scale-105' : 'text-slate-500 hover:bg-black/5 font-black'}`}>
              <Shield className={`w-6 h-6 shrink-0 ${currentView === 'report' && !isAuthMode ? 'text-white' : 'text-red-500'}`} />
                <span className="absolute group-hover:static opacity-0 group-hover:opacity-100 transition-opacity duration-[240ms] group-hover:delay-100 whitespace-nowrap mr-3 text-xs font-black">لایه ثبت سریع حادثه</span>
            </button>

            {isAdminLoggedIn && (
              <button onClick={() => { navigateToView('analytics'); setIsAuthMode(false); setSelectedVolForPage(null); }} className={`flex w-full h-12 group-hover:h-auto items-center justify-center group-hover:justify-start px-4 py-3 rounded-2xl text-xs font-black transition-all duration-200 text-right ${currentView === 'analytics' && !isAuthMode ? 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg scale-105' : 'text-slate-500 hover:bg-black/5 font-black'}`}>
                <BarChart3 className={`w-5 h-5 shrink-0 ${currentView === 'analytics' && !isAuthMode ? 'text-white' : 'text-red-500'}`} />
                  <span className="absolute group-hover:static opacity-0 group-hover:opacity-100 transition-opacity duration-[240ms] group-hover:delay-100 whitespace-nowrap mr-3 text-xs font-black">پایش آمار بازدید سایت</span>
              </button>
            )}

            {isAdminLoggedIn ? (
              <button onClick={() => { navigateToView('admin-edit'); setIsAuthMode(false); setSelectedVolForPage(null); }} className={`flex w-full h-12 group-hover:h-auto items-center justify-center group-hover:justify-start px-4 py-3 rounded-2xl text-xs font-black transition-all duration-200 text-right ${currentView === 'admin-edit' && !isAuthMode ? 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg scale-105' : 'text-slate-500 hover:bg-black/5 font-black'}`}>
                <Settings className={`w-5 h-5 shrink-0 ${currentView === 'admin-edit' && !isAuthMode ? 'text-white' : 'text-red-400'}`} />
                  <span className="absolute group-hover:static opacity-0 group-hover:opacity-100 transition-opacity duration-[240ms] group-hover:delay-100 whitespace-nowrap mr-3 text-xs font-black">ویرایش اطلاعات ادمین</span>
              </button>
            ) : (
              <button onClick={() => { navigateToView('volunteer'); setIsAuthMode(false); setSelectedVolForPage(null); }} className={`flex w-full h-12 group-hover:h-auto items-center justify-center group-hover:justify-start px-4 py-3 rounded-2xl text-xs font-black transition-all duration-200 text-right ${currentView === 'volunteer' && !isAuthMode ? 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg scale-105' : 'text-slate-500 hover:bg-black/5 font-black'}`}>
                <Users className={`w-6 h-6 shrink-0 ${currentView === 'volunteer' && !isAuthMode ? 'text-white' : 'text-red-500'}`} />
                  <span className="absolute group-hover:static opacity-0 group-hover:opacity-100 transition-opacity duration-[240ms] group-hover:delay-100 whitespace-nowrap mr-3 text-xs font-black">درخواست عضویت داوطلبان</span>
              </button>
            )}

            <button onClick={() => { setSelectedVolForPage(null); if (isAdminLoggedIn || isHamyarLoggedIn) { navigateToView('admin'); setIsAuthMode(false); } else { setIsAuthMode(true); } }} className={`flex w-full h-12 group-hover:h-auto items-center justify-center group-hover:justify-start px-4 py-3 rounded-2xl text-xs font-black transition-all duration-200 text-right ${currentView === 'admin' || isAuthMode ? 'bg-red-500 text-white scale-105' : 'text-slate-500 hover:bg-black/5 font-black'}`}>
              <LayoutDashboard className={`w-6 h-6 shrink-0 ${currentView === 'admin' || isAuthMode ? 'text-white' : 'text-red-500'}`} />
                <span className="absolute group-hover:static opacity-0 group-hover:opacity-100 transition-opacity duration-[240ms] group-hover:delay-100 whitespace-nowrap mr-3 text-xs font-black">کارتابل همیاران رسمی</span>
            </button>

            <button onClick={() => { navigateToView('support'); setIsAuthMode(false); setSelectedVolForPage(null); }} className={`flex w-full h-12 group-hover:h-auto items-center justify-center group-hover:justify-start px-4 py-3 rounded-2xl text-xs font-black transition-all duration-200 text-right ${currentView === 'support' && !isAuthMode ? 'bg-red-500 text-white scale-105' : 'text-slate-500 hover:bg-black/5 font-black'}`}>
              <PhoneCall className={`w-6 h-6 shrink-0 ${currentView === 'support' && !isAuthMode ? 'text-white' : 'text-red-500'}`} />
                <span className="absolute group-hover:static opacity-0 group-hover:opacity-100 transition-opacity duration-[240ms] group-hover:delay-100 whitespace-nowrap mr-3 text-xs font-black">خطوط پشتیبانی فنی</span>
            </button>

            <button onClick={() => { navigateToView('support-ai'); setIsAuthMode(false); setSelectedVolForPage(null); }} className={`flex w-full h-12 group-hover:h-auto items-center justify-center group-hover:justify-start px-4 py-3 rounded-2xl text-xs font-black transition-all duration-200 text-right ${currentView === 'support-ai' && !isAuthMode ? 'bg-gradient-to-r from-cyan-700 to-cyan-600 text-white shadow-lg scale-105' : 'text-slate-500 hover:bg-black/5 font-black'}`}>
              <Bot className={`w-6 h-6 shrink-0 ${currentView === 'support-ai' && !isAuthMode ? 'text-white' : 'text-cyan-500'}`} />
                <span className="absolute group-hover:static opacity-0 group-hover:opacity-100 transition-opacity duration-[240ms] group-hover:delay-100 whitespace-nowrap mr-3 text-xs font-black">چت‌بات هوشمند</span>
            </button>
          </nav>
        </div>
        <div className="p-4 bg-black/5 border-t border-black/10 flex flex-col gap-2 min-w-[250px]">
          <div className="text-xs font-bold flex items-center gap-3"><span className="w-2 h-2 rounded-full bg-red-400"></span><span className="opacity-0 group-hover:opacity-100 transition-opacity duration-[240ms] group-hover:delay-100 font-black">شبکه مدیریت بحران</span></div>
        </div>
      </aside>

      {/* 📱 ناوبری پایینی موبایل */}
      <div className={`md:hidden fixed bottom-0 left-0 right-0 h-16 border-t z-[490] flex items-center justify-around px-1 shadow-[0_-4px_20px_rgba(0,0,0,0.4)] ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 text-slate-800'}`}>
        <button onClick={() => { navigateToView('home'); setIsAuthMode(false); setSelectedVolForPage(null); }} className={`flex flex-col items-center justify-center p-1 rounded-xl transition ${currentView === 'home' && !isAuthMode ? 'text-red-600 scale-110 font-bold' : 'text-slate-400'}`}>
          <Home className="w-5 h-5" /><span className="text-[8px] mt-0.5 font-black">خانه</span>
        </button>
        
        <button onClick={() => { navigateToView('report'); setIsAuthMode(false); setSelectedVolForPage(null); }} className={`flex flex-col items-center justify-center p-1 rounded-xl transition ${currentView === 'report' && !isAuthMode ? 'text-red-500 scale-110 font-bold' : 'text-slate-400'}`}>
          <Shield className="w-5 h-5" /><span className="text-[8px] mt-0.5 font-black">ثبت حادثه</span>
        </button>

        {isAdminLoggedIn ? (
          <>
            <button onClick={() => { navigateToView('analytics'); setIsAuthMode(false); setSelectedVolForPage(null); }} className={`flex flex-col items-center justify-center p-1 rounded-xl transition ${currentView === 'analytics' && !isAuthMode ? 'text-red-400 scale-110 font-bold' : 'text-slate-400'}`}>
              <BarChart3 className="w-5 h-5" /><span className="text-[8px] mt-0.5 font-black">آمار</span>
            </button>
            <button onClick={() => { navigateToView('admin-edit'); setIsAuthMode(false); setSelectedVolForPage(null); }} className={`flex flex-col items-center justify-center p-1 rounded-xl transition ${currentView === 'admin-edit' && !isAuthMode ? 'text-red-400 scale-110 font-bold' : 'text-slate-400'}`}>
              <Settings className="w-5 h-5" /><span className="text-[8px] mt-0.5 font-black">پروفایل</span>
            </button>
          </>
        ) : (
          <button onClick={() => { navigateToView('volunteer'); setIsAuthMode(false); setSelectedVolForPage(null); }} className={`flex flex-col items-center justify-center p-1 rounded-xl transition ${currentView === 'volunteer' && !isAuthMode ? 'text-red-400 scale-110 font-bold' : 'text-slate-400'}`}>
            <Users className="w-5 h-5" /><span className="text-[8px] mt-0.5 font-black">عضویت</span>
          </button>
        )}

        <button onClick={() => { setSelectedVolForPage(null); if (isAdminLoggedIn || isHamyarLoggedIn) { navigateToView('admin'); setIsAuthMode(false); } else { setIsAuthMode(true); } }} className={`flex flex-col items-center justify-center p-1 rounded-xl transition ${currentView === 'admin' || isAuthMode ? 'text-red-400 scale-110 font-bold' : 'text-slate-400'}`}>
          <LayoutDashboard className="w-5 h-5" /><span className="text-[8px] mt-0.5 font-black">کارتابل</span>
        </button>

        <button onClick={() => { navigateToView('support'); setIsAuthMode(false); setSelectedVolForPage(null); }} className={`flex flex-col items-center justify-center p-1 rounded-xl transition ${currentView === 'support' && !isAuthMode ? 'text-red-400 scale-110 font-bold' : 'text-slate-400'}`}>
          <PhoneCall className="w-5 h-5" /><span className="text-[8px] mt-0.5 font-black">پشتیبانی</span>
        </button>

        <button onClick={() => { navigateToView('support-ai'); setIsAuthMode(false); setSelectedVolForPage(null); }} className={`flex flex-col items-center justify-center p-1 rounded-xl transition ${currentView === 'support-ai' && !isAuthMode ? 'text-cyan-500 scale-110 font-bold' : 'text-slate-400'}`}>
          <Bot className="w-5 h-5" /><span className="text-[8px] mt-0.5 font-black">چت‌بات هوشمند</span>
        </button>
      </div>

      {/* 🖥️ بدنه اصلی لایه‌های سیستم */}
      <section className="flex-1 h-full relative flex flex-col overflow-hidden pb-20 md:pb-0 md:pr-24">
        
        {/* 🏠 نمای واحد خانه */}
        {currentView === 'home' && !isAuthMode && (
          <div className={`w-full h-full overflow-y-auto animate-fadeIn font-sans ${darkMode ? 'bg-slate-950' : 'bg-[#EEF2F7]'}`}>
            <div className="max-w-7xl mx-auto p-4 md:p-7 space-y-6 md:space-y-7">
              <section className={`relative overflow-hidden border rounded-3xl ${
                darkMode
                  ? 'bg-gradient-to-bl from-slate-900 via-slate-900 to-[#0a1733] border-slate-700/70 shadow-[0_20px_60px_rgba(0,0,0,.28)]'
                  : 'bg-gradient-to-bl from-slate-50 via-white to-blue-50/60 border-slate-200 shadow-[0_18px_50px_rgba(15,23,42,.09)]'
              }`}>
                <div className="absolute -top-28 -left-20 w-72 h-72 rounded-full bg-blue-700/10 blur-3xl pointer-events-none" />
                <div className="absolute -bottom-32 right-1/3 w-80 h-80 rounded-full bg-slate-600/10 blur-3xl pointer-events-none" />
                <div className="relative grid lg:grid-cols-[1.2fr_0.8fr] gap-6 items-stretch p-5 sm:p-7 md:p-9">
                  <div className="flex flex-col justify-center">
                    <div className={`w-fit flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] md:text-xs font-black ${
                      darkMode ? 'bg-red-500/10 border-red-500/25 text-red-300' : 'bg-white border-red-200 text-red-700 shadow-sm'
                    }`}>
                      <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-red-600" /></span>
                      شبکه یکپارچه واکنش و امدادرسانی
                    </div>
                    <h1 className={`mt-5 text-xl sm:text-2xl md:text-[36px] leading-[1.35] font-black tracking-[-0.02em] ${darkMode ? 'text-white' : 'text-[#0F172A]'}`}>
                      در لحظه بحران،
                      <span className="block text-[#2563EB] dark:text-blue-400">هر ثانیه برای نجات مهم است.</span>
                    </h1>
                    <p className={`mt-4 max-w-2xl text-sm md:text-base leading-8 font-medium ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                      همیار بحران، شهروندان، داوطلبان متخصص و اتاق فرمان را روی یک نقشه عملیاتی به هم متصل می‌کند؛ از ثبت موقعیت دقیق حادثه تا تأیید و اعزام نیروی امدادی.
                    </p>
                    <div className="mt-6 flex flex-col sm:flex-row gap-3">
                      <button type="button" onClick={() => navigateToView('report')} className="flex-1 inline-flex cursor-pointer items-center justify-center gap-2.5 bg-[#C2414A] hover:bg-[#B53640] text-white font-black text-xs px-4 py-3.5 rounded-xl shadow-[0_7px_18px_rgba(194,65,74,.2)] transition-all duration-300 ease-out hover:scale-[1.03] hover:shadow-[0_10px_24px_rgba(194,65,74,.28)] active:scale-95">
                        <AlertTriangle className="w-5 h-5" />
                        ثبت فوری حادثه روی نقشه
                      </button>
                      <button type="button" onClick={() => navigateToView('support-ai')} className="flex-1 inline-flex cursor-pointer items-center justify-center gap-2.5 bg-[#3B6FC4] hover:bg-[#2F5FAE] text-white font-black text-xs px-4 py-3.5 rounded-xl shadow-[0_7px_18px_rgba(59,111,196,.2)] transition-all duration-300 ease-out hover:scale-[1.03] hover:shadow-[0_10px_24px_rgba(59,111,196,.28)] active:scale-95">
                        <Bot className="w-5 h-5" />
                        گفتگو با هوش مصنوعی پشتیبان
                      </button>
                      <button type="button" onClick={() => navigateToView('volunteer')} className="flex-1 inline-flex cursor-pointer items-center justify-center gap-2.5 bg-[#2F8F68] hover:bg-[#267A59] text-white font-black text-xs px-4 py-3.5 rounded-xl shadow-[0_7px_18px_rgba(47,143,104,.2)] transition-all duration-300 ease-out hover:scale-[1.03] hover:shadow-[0_10px_24px_rgba(47,143,104,.28)] active:scale-95">
                        <UserPlus className="w-5 h-5" />
                        درخواست عضویت در سامانه همیاران
                      </button>
                    </div>
                    <div className={`mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[10px] md:text-xs font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> ثبت موقعیت روی نقشه نشان</span>
                      <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> پایش و راستی‌آزمایی</span>
                      <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> اعزام نیروهای تأییدشده</span>
                    </div>
                  </div>

                  <div className={`relative min-h-[260px] rounded-2xl border p-4 md:p-5 overflow-hidden ${
                    darkMode ? 'bg-[#071226] border-slate-700/70' : 'bg-[#F8FAFC] border-slate-300 shadow-[0_16px_36px_rgba(15,23,42,.12)]'
                  }`}>
                    <div className={`absolute inset-0 ${darkMode ? 'opacity-30' : 'opacity-70'}`} style={{ backgroundImage: darkMode ? 'linear-gradient(rgba(59,130,246,.18) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,.18) 1px, transparent 1px)' : 'linear-gradient(rgba(37,99,235,.09) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,.09) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
                    <div className={`relative flex items-center justify-between ${darkMode ? 'text-white' : 'text-[#0F172A]'}`}>
                      <div>
                        <p className={`text-[10px] font-bold ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>مرکز عملیات جغرافیایی</p>
                        <p className="mt-1 text-sm font-black">پایش موقعیت‌محور بحران</p>
                      </div>
                      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${darkMode ? 'bg-blue-500/15 border-blue-400/20' : 'bg-blue-50 border-blue-200 shadow-sm'}`}><MapPin className={`w-5 h-5 ${darkMode ? 'text-blue-400' : 'text-[#2563EB]'}`} /></div>
                    </div>
                    <div className="relative mt-8 flex items-center justify-center">
                      <div className={`relative w-40 h-40 rounded-full border flex items-center justify-center ${darkMode ? 'border-blue-400/20' : 'border-blue-300/70 bg-white/40 shadow-[0_8px_28px_rgba(37,99,235,.08)]'}`}>
                        <div className={`absolute inset-5 rounded-full border ${darkMode ? 'border-blue-400/20' : 'border-blue-300/60'}`} />
                        <div className={`absolute inset-10 rounded-full border ${darkMode ? 'border-blue-400/30' : 'border-blue-400/60'}`} />
                        <div className={`absolute w-full h-px bg-gradient-to-r from-transparent to-transparent ${darkMode ? 'via-blue-400/40' : 'via-blue-500/30'}`} />
                        <div className={`absolute h-full w-px bg-gradient-to-b from-transparent to-transparent ${darkMode ? 'via-blue-400/40' : 'via-blue-500/30'}`} />
                        <div className="relative w-14 h-14 rounded-full bg-red-500/15 border border-red-400/30 flex items-center justify-center shadow-[0_0_35px_rgba(239,68,68,.25)]">
                          <Radio className={`w-6 h-6 animate-pulse ${darkMode ? 'text-red-400' : 'text-[#DC2626]'}`} />
                        </div>
                        <span className="radar-orbit radar-orbit-green">
                          <span className={`absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-emerald-500 border-2 shadow-[0_0_12px_#34d399] ${darkMode ? 'border-slate-900' : 'border-white'}`} />
                        </span>
                        <span className="radar-orbit radar-orbit-blue">
                          <span className={`absolute -top-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-blue-500 border-2 shadow-[0_0_12px_#60a5fa] ${darkMode ? 'border-slate-900' : 'border-white'}`} />
                        </span>
                      </div>
                    </div>
                    <button type="button" onClick={() => navigateToView('support-ai')} className={`relative mt-5 w-full flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3.5 text-right shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 ${darkMode ? 'border-blue-400/30 bg-slate-800/95 text-white shadow-black/20 hover:border-blue-400/60 hover:bg-slate-800' : 'border-blue-200 bg-white/95 text-[#0F172A] shadow-[0_8px_22px_rgba(15,23,42,.12)] hover:border-blue-400 hover:bg-blue-50/80 hover:shadow-[0_12px_28px_rgba(37,99,235,.16)]'}`}>
                      <span>
                        <span className={`block text-sm font-extrabold ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>دستیار هوشمند بحران</span>
                        <span className={`mt-1 block text-[11px] font-bold ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>راهنمایی سریع در شرایط اضطراری</span>
                      </span>
                      <span className={`w-11 h-11 shrink-0 rounded-full border flex items-center justify-center shadow-sm ${darkMode ? 'border-blue-400/30 bg-blue-500/15' : 'border-blue-200 bg-blue-50'}`}>
                        <Bot className={`w-6 h-6 ${darkMode ? 'text-blue-400' : 'text-[#2563EB]'}`} />
                      </span>
                    </button>
                  </div>
                </div>
              </section>

              <HomepageCircularStatistics statistics={homepageStatistics} loadingError={homepageStatisticsError} darkMode={darkMode} />

              <section className="space-y-4">
                <div>
                  <p className="text-[10px] md:text-xs font-black text-blue-600 dark:text-blue-400">فرآیند واکنش هماهنگ</p>
                  <h2 className={`mt-1 text-lg md:text-2xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-[#0F172A]'}`}>از گزارش شهروند تا اعزام نیروی امدادی</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { step: '1', icon: MapPin, title: 'ثبت دقیق روی نقشه', text: 'شهروند موقعیت حادثه و جزئیات ضروری را به‌صورت مستقیم روی نقشه نشان ثبت می‌کند.', color: 'text-blue-500', surface: 'bg-blue-500/10', lightSurface: 'bg-[#F8FAFC]' },
                    { step: '2', icon: ShieldCheck, title: 'بررسی در اتاق فرمان', text: 'گزارش، سطح ریسک و موقعیت مکانی توسط تیم مدیریت بحران پایش و راستی‌آزمایی می‌شود.', color: 'text-amber-500', surface: 'bg-amber-500/10', lightSurface: 'bg-[#F9FAFB]' },
                    { step: '3', icon: Truck, title: 'اعزام همیار متخصص', text: 'نیروهای تأییدشده مأموریت متناسب با تخصص خود را دریافت کرده و برای امدادرسانی اعزام می‌شوند.', color: 'text-emerald-500', surface: 'bg-emerald-500/10', lightSurface: 'bg-[#F7FAF8]' }
                  ].map(item => (
                    <article key={item.step} className={`group border rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 ${
                      darkMode ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:shadow-[0_16px_36px_rgba(0,0,0,.22)]' : `${item.lightSurface} border-emerald-200 shadow-[0_8px_24px_rgba(15,23,42,.055)] hover:border-emerald-300 hover:shadow-[0_16px_36px_rgba(15,23,42,.09)]`
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className={`${darkMode ? 'w-11 h-11' : 'w-12 h-12'} rounded-xl flex items-center justify-center ${item.surface}`}><item.icon className={`${darkMode ? 'w-5 h-5' : 'w-6 h-6'} ${item.color}`} /></div>
                        <span className={`w-9 h-9 rounded-full border flex items-center justify-center font-sans text-sm font-extrabold tabular-nums shadow-sm ${
                          darkMode ? 'bg-emerald-500/5 border-emerald-500/40 text-slate-300' : 'bg-emerald-50/70 border-emerald-300 text-[#0F172A]'
                        }`}>{item.step}</span>
                      </div>
                      <h3 className={`mt-4 text-sm md:text-base font-extrabold ${darkMode ? 'text-white' : 'text-[#0F172A]'}`}>{item.title}</h3>
                      <p className={`mt-2 text-xs md:text-sm leading-7 font-medium ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{item.text}</p>
                    </article>
                  ))}
                </div>
              </section>

              <section className={`grid md:grid-cols-2 gap-4 border rounded-3xl p-4 md:p-5 ${
                darkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-100 border-slate-200'
              }`}>
                <div className={`rounded-2xl p-5 flex gap-4 border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-[#F8FAFC] border-slate-200 shadow-[0_6px_18px_rgba(15,23,42,.04)]'}`}>
                  <div className="w-11 h-11 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0"><User className="w-5 h-5 text-blue-600" /></div>
                  <div><h3 className={`text-base font-extrabold ${darkMode ? 'text-white' : 'text-[#0F172A]'}`}>نقش شهروندان</h3><p className={`mt-2 text-sm leading-7 font-medium ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>ثبت سریع و دقیق حادثه یا پیوستن به شبکه داوطلبان برای کمک تخصصی در محله و شهر خود.</p></div>
                </div>
                <div className={`rounded-2xl p-5 flex gap-4 border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-[#F7FAF8] border-slate-200 shadow-[0_6px_18px_rgba(15,23,42,.04)]'}`}>
                  <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0"><ShieldCheck className="w-5 h-5 text-emerald-600" /></div>
                  <div><h3 className={`text-base font-extrabold ${darkMode ? 'text-white' : 'text-[#0F172A]'}`}>نقش همیاران رسمی</h3><p className={`mt-2 text-sm leading-7 font-medium ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>دریافت مأموریت، هماهنگی با اتاق فرمان و امدادرسانی ایمن و سریع به افراد نیازمند.</p></div>
                </div>
              </section>
            </div>
          </div>
        )}

        {/* 🚨 نمای اول: ثبت گزارش حادثه */}
        {/* 🚨 نمای اول: ثبت گزارش حادثه - نسخه نهایی */}
{/* 🚨 نمای اول: ثبت گزارش حادثه - نسخه نهایی (یک نقشه) */}
{currentView === 'report' && !isAuthMode && (
  <div className="w-full h-full flex flex-col">
    {/* نقشه - فقط یک بار */}
    <div className="w-full h-2/5 md:h-1/3 border-b border-black/10 relative z-0">
      {isMounted ? (
        <div className="relative w-full h-full">
          <NeshanLocationPicker 
            initialCenter={markerPos} 
            onLocationSelect={handleLocationSelect} 
            darkMode={darkMode} 
            height="100%" 
          />
        </div>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-xs text-slate-400 animate-pulse">
          در حال فراخوانی سرویس موقعیت‌یاب نشان...
        </div>
      )}
    </div>

    {/* 📍 باکس نمایش آدرس مارک‌شده (دقیقاً زیر نقشه و بیرون از آن) */}
    {(selectedAddress || isAddressResolving) && (
      <div className="w-full px-4 py-2 bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-black/5 dark:border-white/5">
        <div className="max-w-4xl mx-auto flex items-center gap-2">
          <span className="text-[10px] font-black text-slate-400">📍 موقعیت انتخاب‌شده:</span>
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300 line-clamp-2 flex-1" dir="rtl">
            {isAddressResolving ? 'در حال دریافت آدرس موقعیت انتخابشده...' : selectedAddress}
          </p>
        </div>
      </div>
    )}

    {/* فرم ثبت حادثه */}
    <div className="flex-1 p-4 md:p-6 overflow-y-auto scrollbar-thin">
      <div className={`max-w-4xl mx-auto rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-xl transition-all duration-300 ${
        darkMode 
          ? 'bg-slate-900/90 border border-slate-700/50 shadow-[0_20px_60px_rgba(0,0,0,0.5)]' 
          : 'bg-white/90 border border-slate-200/50 shadow-[0_20px_60px_rgba(0,0,0,0.08)]'
      }`}>
        
        {/* هدر فرم - اصلاح رنگ */}
        <div className="flex items-center gap-3 border-b pb-4 mb-6 border-slate-200/20">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg shadow-red-500/20">
            <AlertTriangle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className={`text-lg md:text-xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>ثبت گزارش رسمی حادثه</h2>
            <p className={`text-[10px] font-bold ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>لطفاً اطلاعات دقیق را وارد کنید</p>
          </div>
        </div>

        <form onSubmit={handleIncidentSubmit} className="space-y-5">
          {/* ردیف اول: نام و شماره همراه */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* فیلد نام */}
            <div className="space-y-1.5">
              <label className={`flex items-center gap-1.5 text-[11px] font-black ${darkMode ? 'text-slate-300' : 'text-red-600'}`}>
                <User className={`w-3.5 h-3.5 ${darkMode ? 'text-slate-300' : 'text-red-600'}`} />
                نام و نام خانوادگی (فارسی)
              </label>
              <div className={`relative rounded-xl border transition-all duration-300 focus-within:ring-2 focus-within:ring-red-500/30 ${
                darkMode 
                  ? 'border-slate-700 bg-slate-800/50 focus-within:border-red-500' 
                  : 'border-slate-200 bg-slate-50/50 focus-within:border-red-400'
              }`}>
                <input
                  type="text"
                  required
                  value={reporterName}
                  onChange={(e) => setReporterName(e.target.value)}
                  onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('لطفاً نام و نام خانوادگی خود را وارد کنید.')}
                  onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                  placeholder="مثلاً: علی محمدی"
                  className={`w-full bg-transparent px-4 py-3 text-sm font-bold focus:outline-none placeholder:opacity-40 ${
                    darkMode ? 'text-white placeholder:text-slate-400' : 'text-slate-900 placeholder:text-slate-400'
                  }`}
                />
              </div>
            </div>

            {/* فیلد شماره همراه */}
            <div className="space-y-1.5">
              <label className={`flex items-center gap-1.5 text-[11px] font-black ${darkMode ? 'text-slate-300' : 'text-red-600'}`}>
                <Smartphone className={`w-3.5 h-3.5 ${darkMode ? 'text-slate-300' : 'text-red-600'}`} />
                شماره همراه
              </label>
              <div className="flex gap-2">
                <div className={`flex-1 rounded-xl border transition-all duration-300 focus-within:ring-2 focus-within:ring-red-500/30 ${
                  darkMode 
                    ? 'border-slate-700 bg-slate-800/50 focus-within:border-red-500' 
                    : 'border-slate-200 bg-slate-50/50 focus-within:border-red-400'
                }`}>
                  <input
                    type="tel"
                    required
                    maxLength={11}
                    value={reporterPhone}
                    onChange={(e) => setReporterPhone(e.target.value)}
                    onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('لطفاً شماره تماس ۱۱ رقمی را وارد کنید.')}
                    onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                    placeholder="09xxxxxxxxx"
                    className={`w-full bg-transparent px-4 py-3 text-sm font-bold font-mono dir-ltr text-left focus:outline-none placeholder:opacity-40 ${
                      darkMode ? 'text-white placeholder:text-slate-400' : 'text-slate-900 placeholder:text-slate-400'
                    }`}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleSendReportOTP(reporterPhone, 'bale')}
                  className="shrink-0 px-4 py-3 rounded-xl text-xs font-black bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/20 hover:shadow-red-500/40 transition-all duration-300 hover:scale-105 active:scale-95"
                >
                  ارسال کد
                </button>
              </div>
              {reportOtpSent && (
          <div className="mt-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row items-center gap-2 animate-fadeIn w-full">
            <span className="text-[11px] font-black text-amber-500 whitespace-nowrap">کد ۶ رقمی را وارد کنید:</span>
            <div className="flex gap-2 w-full sm:flex-1">
              <input
                type="text"
                maxLength={6}
                value={reportOtpCode}
                onChange={(e) => setReportOtpCode(e.target.value)}
                className={`flex-1 text-center font-mono font-bold text-sm rounded-xl border px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500/30 ${
                  darkMode 
                    ? 'bg-slate-900 border-slate-700 text-white' 
                    : 'bg-white border-slate-300 text-slate-900'
                }`}
      />
      <button
        type="button"
        onClick={handleVerifyReportOTP}
        className="px-4 py-1.5 rounded-xl text-xs font-black bg-amber-500 text-white hover:bg-amber-600 transition shadow-md whitespace-nowrap"
      >
        تایید
      </button>
    </div>
  </div>
)}
              {isReportPhoneVerified && (
                <div className="flex items-center gap-1.5 text-[10px] font-black text-emerald-500 animate-fadeIn">
                  <Check className="w-3.5 h-3.5" />
                  <span>شماره همراه تأیید شد</span>
                </div>
              )}
            </div>
          </div>

          {/* آدرس (فقط ورود دستی) */}
          <div className="space-y-1.5">
            <label className={`flex items-center gap-1.5 text-[11px] font-black ${darkMode ? 'text-slate-300' : 'text-red-600'}`}>
              <MapPin className={`w-3.5 h-3.5 ${darkMode ? 'text-slate-300' : 'text-red-600'}`} />
              آدرس دقیق محل وقوع حادثه
            </label>
            <div className={`relative rounded-xl border transition-all duration-300 focus-within:ring-2 focus-within:ring-red-500/30 ${
              darkMode 
                ? 'border-slate-700 bg-slate-800/50 focus-within:border-red-500' 
                : 'border-slate-200 bg-slate-50/50 focus-within:border-red-400'
            }`}>
              <input
                type="text"
                required
                value={incidentAddress}
                onChange={(e) => setIncidentAddress(e.target.value)}
                placeholder="آدرس را دستی وارد کنید..."
                className={`w-full bg-transparent px-4 py-3 text-sm font-bold focus:outline-none placeholder:opacity-40 ${
                  darkMode ? 'text-white placeholder:text-slate-400' : 'text-slate-900 placeholder:text-slate-400'
                }`}
              />
            </div>
            
            {/* شهر تشخیص‌داده‌شده از نشانگر نقشه */}
            <div className="space-y-1.5 mt-3">
              <label className={`flex items-center gap-1.5 text-[11px] font-black ${darkMode ? 'text-slate-300' : 'text-red-600'}`}>
                <MapPin className={`w-3.5 h-3.5 ${darkMode ? 'text-slate-300' : 'text-red-600'}`} />
                شهر تشخیص‌داده‌شده از نقشه
              </label>
              <div className={`rounded-xl border px-4 py-3 text-sm font-bold ${
                incidentCity
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500'
                  : darkMode
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                    : 'border-amber-300 bg-amber-50 text-amber-700'
              }`}>
                {incidentCity || 'برای تشخیص شهر، نشانگر را روی موقعیت معتبر حادثه قرار دهید.'}
              </div>
            </div>
            <p className="text-[9px] font-black opacity-30">* برای مشاهده آدرس مارک‌شده روی نقشه، به باکس زیر نقشه نگاه کنید</p>
          </div>

          {/* ردیف دوم: نوع واقعه و شدت بحران */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* نوع واقعه */}
            <div className="space-y-1.5">
              <label className={`flex items-center gap-1.5 text-[11px] font-black ${darkMode ? 'text-slate-300' : 'text-red-600'}`}>
                <Shield className={`w-3.5 h-3.5 ${darkMode ? 'text-slate-300' : 'text-red-600'}`} />
                نوع واقعه بحرانی
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenCrisisDropdown(!openCrisisDropdown)}
                  className={`w-full rounded-xl border px-4 py-3 text-sm font-bold flex items-center justify-between transition-all duration-300 ${
                    darkMode 
                      ? 'border-slate-700 bg-slate-800/50 hover:border-slate-600 text-white' 
                      : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 text-slate-900'
                  }`}
                >
                  <span>{crisisType === 'other' ? 'سایر موارد' : crisisType}</span>
                  <ChevronDown className={`w-4 h-4 opacity-50 transition-transform duration-300 ${openCrisisDropdown ? 'rotate-180' : ''}`} />
                </button>
                {openCrisisDropdown && (
                  <div className={`absolute left-0 right-0 mt-2 rounded-xl shadow-2xl border z-50 overflow-hidden animate-fadeIn ${
                    darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                  }`}>
                    {['زلزله یا تخریب سازه', 'بمباران / آسیب جنگی', 'آتش‌سوزی گسترده', 'سیل گسترده و طغیان روان‌آب', 'other'].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => { setCrisisType(opt); setOpenCrisisDropdown(false); }}
                        className={`w-full text-right px-4 py-3 text-xs font-bold transition-all duration-200 ${
                          crisisType === opt 
                            ? 'bg-red-500/10 text-red-500' 
                            : darkMode ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        {opt === 'other' ? 'سایر موارد' : opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {crisisType === 'other' && (
                <div className="mt-2 animate-fadeIn">
                  <input
                    type="text"
                    required
                    value={customCrisis}
                    onChange={(e) => setCustomCrisis(e.target.value)}
                    placeholder="نوع واقعه را وارد کنید..."
                    className={`w-full rounded-xl border px-4 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-red-500/30 ${
                      darkMode 
                        ? 'border-slate-700 bg-slate-800/50 text-white placeholder:text-slate-400' 
                        : 'border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400'
                    }`}
                  />
                </div>
              )}
            </div>

            {/* شدت بحران */}
            {/* شدت بحران - نسخه نهایی با جهت درست (چپ=بحرانی، راست=خفیف) */}
{/* شدت بحران - نسخه نهایی با قابلیت کشیدن */}
<div className="space-y-3">
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-3">
      <div 
        className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300 cursor-pointer hover:scale-110 ${
          severityValue < 35 ? 'bg-emerald-500/20 text-emerald-500 border-2 border-emerald-500/30' :
          severityValue < 70 ? 'bg-amber-500/20 text-amber-500 border-2 border-amber-500/30' :
          'bg-red-500/20 text-red-500 border-2 border-red-500/30 animate-pulse'
        }`}
        onClick={() => {
          if (severityValue < 33) setSeverityValue(50);
          else if (severityValue < 66) setSeverityValue(85);
          else setSeverityValue(20);
        }}
        title="برای تغییر سریع کلیک کنید"
      >
        {severityValue < 35 ? <Activity className="w-6 h-6" /> :
         severityValue < 70 ? <AlertTriangle className="w-6 h-6" /> :
         <ShieldAlert className="w-6 h-6" />}
      </div>
      <div>
        <label className={`block text-[11px] font-black ${darkMode ? 'text-slate-300' : 'text-red-600'}`}>شدت بحران</label>
        <span className={`text-xs font-black block leading-tight transition-colors duration-300 ${
          severityValue < 35 ? 'text-emerald-500' :
          severityValue < 70 ? 'text-amber-500' :
          'text-red-500'
        }`}>
          {severityValue < 35 ? '🟢 خفیف' :
           severityValue < 70 ? '🟡 متوسط' :
           '🔴 بحرانی'}
        </span>
      </div>
    </div>
    <span className={`text-2xl font-black font-mono tracking-tight transition-colors duration-300 ${
      severityValue < 35 ? 'text-emerald-500' :
      severityValue < 70 ? 'text-amber-500' :
      'text-red-500'
    }`}>
      {severityValue}%
    </span>
  </div>

  {/* نوار پیشرفت با قابلیت کشیدن (Drag) */}
  <div 
    className="relative w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden shadow-inner cursor-pointer group touch-none select-none"
    onMouseDown={(e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percent = Math.min(100, Math.max(0, Math.round((x / rect.width) * 100)));
      setSeverityValue(100 - percent);
      
      const handleMouseMove = (moveEvent: MouseEvent) => {
        const newRect = e.currentTarget?.getBoundingClientRect();
        if (!newRect) return;
        const newX = moveEvent.clientX - newRect.left;
        const newPercent = Math.min(100, Math.max(0, Math.round((newX / newRect.width) * 100)));
        setSeverityValue(100 - newPercent);
      };
      
      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }}
    onTouchStart={(e) => {
      const touch = e.touches[0];
      const rect = e.currentTarget.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const percent = Math.min(100, Math.max(0, Math.round((x / rect.width) * 100)));
      setSeverityValue(100 - percent);
      
      const handleTouchMove = (moveEvent: TouchEvent) => {
        const touchMove = moveEvent.touches[0];
        const newRect = e.currentTarget?.getBoundingClientRect();
        if (!newRect) return;
        const newX = touchMove.clientX - newRect.left;
        const newPercent = Math.min(100, Math.max(0, Math.round((newX / newRect.width) * 100)));
        setSeverityValue(100 - newPercent);
      };
      
      const handleTouchEnd = () => {
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
      
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleTouchEnd);
    }}
    onClick={(e) => {
      // برای سازگاری با کلیک معمولی (در صورت عدم کشیدن)
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percent = Math.min(100, Math.max(0, Math.round((x / rect.width) * 100)));
      setSeverityValue(100 - percent);
    }}
  >
    <div 
      className="h-full rounded-full transition-all duration-500 ease-in-out relative pointer-events-none"
      style={{ 
        width: `${severityValue}%`,
        background: `linear-gradient(90deg, 
          ${severityValue < 35 ? '#10b981' : 
            severityValue < 70 ? '#f59e0b' : 
            '#ef4444'}, 
          ${severityValue < 35 ? '#34d399' : 
            severityValue < 70 ? '#fbbf24' : 
            '#f87171'}
        )`,
        boxShadow: `0 0 20px ${
          severityValue < 35 ? 'rgba(16,185,129,0.3)' :
          severityValue < 70 ? 'rgba(245,158,11,0.3)' :
          'rgba(239,68,68,0.4)'
        }`
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" style={{ width: '30%', left: '10%', borderRadius: '50%' }} />
    </div>

    <div 
      className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white border-2 shadow-lg pointer-events-none transition-all duration-500 ease-in-out"
      style={{ 
        left: `calc(${100 - severityValue}% - 10px)`,
        borderColor: severityValue < 35 ? '#10b981' : severityValue < 70 ? '#f59e0b' : '#ef4444',
        boxShadow: `0 0 12px ${
          severityValue < 35 ? 'rgba(16,185,129,0.3)' :
          severityValue < 70 ? 'rgba(245,158,11,0.3)' :
          'rgba(239,68,68,0.4)'
        }`
      }}
    />

    <div 
      className="absolute top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-red-500/10 pointer-events-none transition-all duration-300 opacity-0 group-hover:opacity-100"
      style={{ left: `calc(${100 - severityValue}% - 16px)` }}
    />
  </div>

  <div className="flex justify-between text-[9px] font-black opacity-40 px-0.5">
    <span>بحرانی</span>
    <span>متوسط</span>
    <span>خفیف</span>
  </div>
</div>
          </div>

          {/* شرح حادثه */}
          <div className="space-y-1.5">
            <label className={`flex items-center gap-1.5 text-[11px] font-black ${darkMode ? 'text-slate-300' : 'text-red-600'}`}>
              <FileText className={`w-3.5 h-3.5 ${darkMode ? 'text-slate-300' : 'text-red-600'}`} />
              شرح حادثه و وضعیت مصدومین
            </label>
            <div className={`relative rounded-xl border transition-all duration-300 focus-within:ring-2 focus-within:ring-red-500/30 ${
              darkMode 
                ? 'border-slate-700 bg-slate-800/50 focus-within:border-red-500' 
                : 'border-slate-200 bg-slate-50/50 focus-within:border-red-400'
            }`}>
              <textarea
                rows={3}
                required
                value={incidentDesc}
                onChange={(e) => setIncidentDesc(e.target.value)}
                onInvalid={(e) => {
                  if ((e.target as HTMLTextAreaElement).value.length === 0) {
                    (e.target as HTMLTextAreaElement).setCustomValidity('لطفاً شرح حادثه را کامل کنید.');
                  }
                }}
                onInput={(e) => (e.target as HTMLTextAreaElement).setCustomValidity('')}
                placeholder="توضیحات کامل درباره حادثه، تعداد مصدومین، نیازهای فوری..."
                className={`w-full bg-transparent px-4 py-3 text-sm font-semibold focus:outline-none resize-none placeholder:opacity-40 min-h-[80px] ${
                  darkMode ? 'text-white placeholder:text-slate-400' : 'text-slate-900 placeholder:text-slate-400'
                }`}
              />
            </div>
          </div>

          {/* دکمه ارسال */}
          <button
            type="submit"
            disabled={isIncidentSubmitting || (!isReportPhoneVerified && !isAdminLoggedIn)}
            className={`w-full relative overflow-hidden text-sm font-black rounded-2xl py-4 transition-all duration-300 flex items-center justify-center gap-2 ${
              (isReportPhoneVerified || isAdminLoggedIn) && !isIncidentSubmitting
                ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/30 hover:shadow-red-500/50 hover:scale-[1.02] active:scale-95 cursor-pointer'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed opacity-50'
            }`}
          >
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            <ShieldAlert className="w-5 h-5" />
            {isIncidentSubmitting
              ? 'در حال ثبت گزارش…'
              : isReportPhoneVerified || isAdminLoggedIn
                ? 'ارسال فوری گزارش به ستاد فرماندهی'
                : 'لطفاً ابتدا شماره همراه خود را احراز هویت کنید'}
          </button>

          {/* پیام وضعیت */}
          {isAdminLoggedIn && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-black">
              <ShieldCheck className="w-4 h-4" />
              <span>شما با مجوز مدیر ارشد هستید - گزارش‌ها بدون نیاز به تأیید ثبت می‌شوند</span>
            </div>
          )}
        </form>
      </div>
    </div>
  </div>
)}

        {/* 📝 نمای دوم: درخواست عضویت داوطلبان */}
        {currentView === 'volunteer' && !isAuthMode && (
          <div className="w-full h-full p-4 md:p-8 overflow-y-auto">
            <form onSubmit={handleVolunteerSubmit} className={`max-w-3xl mx-auto border rounded-3xl p-4 md:p-6 space-y-5 shadow-2xl transition-colors ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-300 text-slate-900'}`}>
              <div className="flex items-center gap-2 border-b pb-3 border-black/10"><UserPlus className="w-5 h-5 text-emerald-600" /><h2 className="text-sm md:text-base font-black">درخواست داوطلب شدن برای عضویت در شبکه همیار بحران</h2></div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-black mb-1">نام و نام خانوادگی</label>
                  <input type="text" required value={volName} onChange={(e) => setVolName(e.target.value)} onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('لطفاً نام و نام خانوادگی متقاضی را وارد کنید.')} onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')} className={volunteerFieldClass} />
                </div>
                <div className="relative">
                  <label className="block text-[11px] font-black mb-1">جنسیت</label>
                  <button type="button" onClick={() => setOpenGenderDropdown(!openGenderDropdown)} className={`${volunteerFieldClass} flex items-center justify-between text-right`}>
                    <span>{volGender === '' ? 'انتخاب کنید' : volGender}</span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openGenderDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  {openGenderDropdown && (
                    <div className={`absolute left-0 right-0 mt-1 rounded-xl shadow-2xl border z-50 overflow-hidden ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
                      {['مرد', 'زن'].map((g) => (
                        <button key={g} type="button" onClick={() => { setVolGender(g as any); setOpenGenderDropdown(false); }} className={`w-full text-right px-4 py-2 text-xs font-bold transition-colors ${darkMode ? 'hover:bg-slate-700 text-slate-100' : 'hover:bg-slate-50 text-slate-900'} ${volGender === g ? 'bg-red-500/10 text-red-500 font-black' : ''}`}>
                          {g}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-[11px] font-black mb-1">🪪 کد ملی (۱۰ رقم)</label>
                  <input type="text" required maxLength={10} minLength={10} value={volNationalId} onChange={(e) => setVolNationalId(e.target.value)} onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('لطفاً کد ملی ده رقمی معتبر را برای عضویت بنویسید.')} onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')} placeholder="" className={`${volunteerFieldClass} text-left dir-ltr font-mono`} />
                </div>
              </div>

              {/* بخش جدید: تاریخ تولد */}
              <div>
                <label className="block text-[11px] font-black mb-1">📅 تاریخ تولد (شمسی)</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { key: 'day', label: 'روز', value: volBirthDay, options: persianDays, setValue: setVolBirthDay },
                    { key: 'month', label: 'ماه', value: volBirthMonth, options: persianMonths, setValue: setVolBirthMonth },
                    { key: 'year', label: 'سال', value: volBirthYear, options: persianYears, setValue: setVolBirthYear }
                  ] as const).map(field => (
                    <div className="relative" key={field.key}>
                      <button type="button" onClick={() => setOpenBirthDropdown(openBirthDropdown === field.key ? null : field.key)} className={`${volunteerFieldClass} flex cursor-pointer items-center justify-between text-right hover:border-red-400`}>
                        <span>{field.value || field.label}</span>
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openBirthDropdown === field.key ? 'rotate-180' : ''}`} />
                      </button>
                      {openBirthDropdown === field.key && (
                        <div className={`absolute left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-xl shadow-2xl border z-50 ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
                          {field.options.map(option => (
                            <button key={option} type="button" onClick={() => { field.setValue(String(option)); setOpenBirthDropdown(null); }} className={`w-full px-4 py-2 text-center text-xs font-bold transition-colors ${String(field.value) === String(option) ? 'bg-red-500/10 text-red-500 font-black' : darkMode ? 'hover:bg-slate-700 text-slate-100' : 'hover:bg-slate-50 text-slate-900'}`}>
                              {option}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                <div>
                  <label className="block text-[11px] font-black mb-1">💼 شغل فعلی</label>
                  <input type="text" required value={volJob} onChange={(e) => setVolJob(e.target.value)} onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('لطفاً فرم مربوط به شغل فعلی خود را پر کنید.')} onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')} className={volunteerFieldClass} />
                </div>
                <div>
                  <label className="block text-[11px] font-black mb-1">🏠 آدرس دقیق</label>
                  <input type="text" required value={volAddress} onChange={(e) => setVolAddress(e.target.value)} onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('لطفاً آدرس دقیق محل سکونت خود را پر کنید.')} onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')} className={volunteerFieldClass} />
                </div>
                {/* فیلد شهر - ثبت داوطلب */}
<div className="relative">
  <label className="block text-[11px] font-black mb-1">🏙️ شهر محل سکونت</label>
  <button type="button" onClick={() => setOpenCityDropdown(!openCityDropdown)} className={`${volunteerFieldClass} flex cursor-pointer items-center justify-between text-right hover:border-red-400`}>
    <span>{volCity || 'انتخاب شهر'}</span>
    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openCityDropdown ? 'rotate-180' : ''}`} />
  </button>
  {openCityDropdown && (
    <div className={`absolute left-0 right-0 mt-1 max-h-64 overflow-y-auto rounded-xl shadow-2xl border z-50 ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
      {IRANIAN_CITIES.map(city => (
        <button key={city} type="button" onClick={() => { setVolCity(city); setOpenCityDropdown(false); }} className={`w-full text-right px-4 py-2 text-xs font-bold transition-colors ${volCity === city ? 'bg-red-500/10 text-red-500 font-black' : darkMode ? 'hover:bg-slate-700 text-slate-100' : 'hover:bg-slate-50 text-slate-900'}`}>
          {city}
        </button>
      ))}
    </div>
  )}
</div>
                <div>
                  <label className="block text-[11px] font-black mb-1">📱 شماره همراه</label>
                  <div className="flex flex-col gap-1.5">
                    <input type="tel" required placeholder="09xxxxxxxxx" maxLength={11} value={volPhone} onChange={(e) => setVolPhone(e.target.value)} onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('لطفاً شماره همراه متقاضی را برای ارسال کد وارد کنید.')} onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')} className={`${volunteerFieldClass} text-left dir-ltr font-mono`} />
                    <div className="flex gap-1.5">
                      <button type="button" onClick={() => handleSendVolOTP(volPhone, 'bale')} disabled={volCooldown} className={`flex-1 text-xs font-black py-2 rounded-xl transition shadow-sm ${volCooldown ? 'bg-gray-500 text-gray-300 cursor-not-allowed' : 'bg-red-500 text-white hover:bg-red-600'}`}>ارسال کد تایید به بله</button>
                      
                    </div>
                    {volCooldown && (
                      <div className="text-xs text-red-500 font-black mt-0.5">⏳ ارسال مجدد کد: {volCooldownSeconds} ثانیه</div>
                    )}
                  </div>
                </div>
              </div>

              {volOtpSent && (
                <div className={`border p-3 rounded-xl flex flex-col md:flex-row items-center justify-between gap-3 ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-amber-50 border-amber-200 text-slate-955'}`}>
                  <span className="text-[11px] font-black">کد تایید پیامکی را وارد کنید:</span>
                  <div className="flex gap-2 w-full md:w-auto">
                    <input type="text" maxLength={6} value={volOtpCode} onChange={(e) => setVolOtpCode(e.target.value)} className={`w-full md:w-24 border rounded-xl px-3 py-1 text-center font-mono font-bold text-xs focus:outline-none ${darkMode ? 'bg-slate-900 border-slate-600 text-white' : 'bg-white border-amber-300 text-slate-900'}`} />
                    <button type="button" onClick={handleVerifyVolOTP} className="bg-blue-600 hover:bg-blue-700 text-white font-black px-4 py-1.5 rounded-xl text-xs transition shrink-0 shadow-md">تایید</button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-black mb-2">⛑️ انتخاب تخصص‌ها و مهارت‌های فردی</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {['امدادگر / کمک‌های اولیه', 'پزشک فوریت‌های پزشکی', 'پرستار ستاد', 'آتش‌نشان عملیاتی', 'راننده ماشین‌آلات سنگین', 'other_skill'].map((skillKey) => {
                    const label = skillKey === 'other_skill' ? 'سایر تخصص‌ها (نیاز به نوشتن)' : skillKey;
                    const isChecked = selectedSkills.includes(skillKey);
                    return (
                      <button key={skillKey} type="button" 
                        onClick={() => {
                          if (isChecked) { setSelectedSkills(prev => prev.filter(s => s !== skillKey)); } 
                          else { setSelectedSkills(prev => [...prev, skillKey]); }
                        }} 
                        className={`p-3 border rounded-xl text-[11px] font-black transition-all text-right flex items-center justify-between ${isChecked ? 'border-red-600 bg-red-500/10 text-red-600 shadow-md' : darkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-black/5'}`}
                      >
                        <span>{label}</span> {isChecked && <Check className="w-4 h-4 text-red-500" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedSkills.includes('other_skill') && (
                <div>
                  <label className="block text-[11px] font-black mb-1">✍️ شرح تخصص و مهارت‌های متفرقه دیگر خود را بنویسید</label>
                  <input type="text" required value={customSkill} onChange={(e) => setCustomSkill(e.target.value)} onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('لطفاً تخصص متفرقه خود را شرح دهید.')} onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')} placeholder="" className={`w-full border rounded-xl px-4 py-2 text-xs font-bold focus:outline-none ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`} />
                </div>
              )}

              <div className="border-t pt-4 mt-4 border-black/10">
                <label className="block text-[11px] font-black mb-2 text-slate-400">📄 در صورت داشتن گواهینامه های مربوطه به تخصص خود لطفا آن را در سامانه ذکر کرده و آن را آپلود کنید:</label>
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={volDocumentUploading || Boolean(volDocument)} className="flex items-center gap-2 bg-slate-100 border border-dashed border-slate-400 p-4 rounded-xl w-full text-slate-500 font-bold text-xs justify-center hover:bg-slate-200 transition disabled:cursor-not-allowed disabled:opacity-60">
                  <Upload className={`w-4 h-4 text-slate-500 ${volDocumentUploading ? 'animate-pulse' : ''}`} />
                  {volDocumentUploading ? 'در حال آپلود و تأیید فایل...' : volDocument ? 'مدرک تخصصی آپلود شده است' : 'انتخاب و آپلود فایل مدرک تخصص'}
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                  onChange={(event) => handleVolunteerDocumentSelect(event.target.files?.[0])}
                  className="hidden"
                />
                {volDocument && (
                  <div className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[11px] font-bold text-emerald-500">
                    <span className="truncate">مدرک آپلود شد: {volDocument.originalName} ({(volDocument.size / 1024 / 1024).toFixed(2)} MB)</span>
                  </div>
                )}
                {volDocumentError && <p className="mt-2 text-[11px] font-bold text-red-500">{volDocumentError}</p>}
              </div>

              <div className="space-y-2">
                <button type="submit" disabled={volDocumentUploading} className={`w-full text-xs font-black rounded-xl py-3 transition shadow-md ${isVolPhoneVerified && !volDocumentUploading ? 'bg-gradient-to-r from-red-600 to-red-600 text-white shadow-md' : 'bg-slate-700 text-slate-500 cursor-not-allowed opacity-50'}`}><UserPlus className="w-4 h-4 inline-block ml-1" /> <span>ثبت نهایی درخواست عضویت نیروها</span></button>
                {volSubmitErrorMsg && (
                  <p className="text-red-500 font-bold text-center text-[11px] animate-pulse bg-red-500/5 p-2 rounded-xl border border-red-500/20">{volSubmitErrorMsg}</p>
                )}
              </div>
            </form>
          </div>
        )}

        {/* ⚙️ نمای ویرایش پروفایل ادمین */}
        {currentView === 'admin-edit' && isAdminLoggedIn && !isAuthMode && (
          <div className="w-full h-full p-4 md:p-8 overflow-y-auto">
            <form onSubmit={handleSaveAdminProfile} className={`max-w-xl mx-auto border rounded-3xl p-5 shadow-2xl transition-colors ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-300'}`}>
              <div className="flex items-center gap-2 border-b pb-3 border-black/10"><Settings className="w-5 h-5 text-red-600" /><h2 className="text-sm md:text-base font-black">تنظیمات و ویرایش اطلاعات مدیر ارشد</h2></div>
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-black mb-1">نام و نام خانوادگی مدیر ارشد</label>
                  <input type="text" required value={adminProfile.fullName} onChange={(e) => setAdminProfile({...adminProfile, fullName: e.target.value})} className={`w-full border rounded-xl px-4 py-2 text-xs font-black ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`} />
                </div>
                <div>
                  <label className="block text-xs font-black mb-1">ایمیل ادمین</label>
                  <input type="email" required value={adminProfile.email} onChange={(e) => setAdminProfile({...adminProfile, email: e.target.value})} className={`w-full border text-left dir-ltr font-mono rounded-xl px-4 py-2 text-xs font-black ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`} />
                </div>
                <div>
                  <label className="block text-xs font-black mb-1">شماره همراه ادمین</label>
                  <input type="text" required value={adminProfile.phone} onChange={(e) => setAdminProfile({...adminProfile, phone: e.target.value})} className={`w-full border text-left dir-ltr font-mono rounded-xl px-4 py-2 text-xs font-black ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`} />
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <button type="submit" className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs font-black py-2 rounded-xl transition shadow-md">ذخیره تغییرات</button>
                <button type="button" onClick={() => navigateToView('admin')} className="bg-slate-800 text-slate-300 border border-slate-700 text-xs font-bold px-4 rounded-xl transition">انصراف</button>
              </div>
            </form>
          </div>
        )}

        {/* 🔐 نمای سوم: کارتابل مشترک */}
        {currentView === 'admin' && (isAdminLoggedIn || isHamyarLoggedIn) && !isAuthMode && (
          <div className="w-full h-full p-4 md:p-6 overflow-y-auto space-y-6">
            
            {selectedVolForPage ? (
              <div className={`border rounded-3xl p-5 shadow-2xl space-y-4 animate-fadeIn ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-red-50 border-red-200 text-slate-900'}`}>
                <div className="flex items-center justify-between border-b pb-3 border-black/10">
                  <h3 className="text-sm font-black text-red-600 flex items-center gap-2"><User className="w-4 h-4" /> پرونده کامل و فرم اطلاعات متقاضی</h3>
                  <button type="button" onClick={() => setSelectedVolForPage(null)} className="text-slate-400 hover:text-red-500 text-xs transition font-black">📴 بازگشت به لیست</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-black mb-1">نام و نام خانوادگی:</label>
                    <input type="text" value={selectedVolForPage.fullName || ''} onChange={(e) => setSelectedVolForPage({...selectedVolForPage, fullName: e.target.value})} className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none font-bold ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'}`} />
                  </div>
                  <div>
                    <label className="block font-black mb-1">شماره همراه:</label>
                    <input type="text" value={selectedVolForPage.phone || ''} onChange={(e) => setSelectedVolForPage({...selectedVolForPage, phone: e.target.value})} className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none dir-ltr font-mono font-bold ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300'}`} />
                  </div>
                  <div>
                    <label className="block font-black mb-1">کد ملی ده‌رقمی:</label>
                    <input type="text" value={selectedVolForPage.nationalId || ''} onChange={(e) => setSelectedVolForPage({...selectedVolForPage, nationalId: e.target.value})} className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none dir-ltr font-mono font-bold ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300'}`} />
                  </div>
                  <div>
                    <label className="block font-black mb-1">شغل فعلی:</label>
                    <input type="text" value={selectedVolForPage.job || ''} onChange={(e) => setSelectedVolForPage({...selectedVolForPage, job: e.target.value})} className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none font-bold ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300'}`} />
                  </div>
                  <div>
                    <label className="block font-black mb-1">جنسیت متقاضی:</label>
                    <input type="text" readOnly value={selectedVolForPage.gender || 'ثبت نشده'} className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none font-bold opacity-80 cursor-not-allowed ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-100 border-slate-300'}`} />
                  </div>
                  <div>
                    <label className="block font-black mb-1">تاریخ تولد ثبت شده:</label>
                    <input type="text" readOnly value={selectedVolForPage.birthDate || 'ثبت نشده'} className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none font-bold opacity-80 cursor-not-allowed ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-100 border-slate-300'}`} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block font-black mb-1">آدرس محل سکونت دقیق:</label>
                    <input type="text" value={selectedVolForPage.address || ''} onChange={(e) => setSelectedVolForPage({...selectedVolForPage, address: e.target.value})} className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none font-bold ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300'}`} />
                  </div>
                  <div className="md:col-span-2 pt-2">
                    <strong>تخصص‌ها و مهارت‌های انتخابی:</strong>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {Array.isArray(selectedVolForPage.skills) ? (
                        selectedVolForPage.skills.map((s, i) => (
                          <span key={i} className="bg-red-500/10 text-red-600 px-2 py-0.5 rounded text-[10px] font-black border border-red-500/10">{s}</span>
                        ))
                      ) : selectedVolForPage.skills ? (
                        <span className="bg-red-500/10 text-red-600 px-2 py-0.5 rounded text-[10px] font-black border border-red-500/10">{String(selectedVolForPage.skills)}</span>
                      ) : (
                        <span className="text-slate-400 text-[10px]">بدون تخصص ثبت شده</span>
                      )}
                    </div>
                  </div>
                  <div className="md:col-span-2 border-t pt-3 border-black/10">
                    <strong>مدارک تخصصی:</strong>
                    {selectedVolForPage.documents?.length ? (
                      <div className="mt-2 space-y-2">
                        {selectedVolForPage.documents.map(document => (
                          <div key={document.id} className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-50'}`}>
                            <span className="min-w-0 truncate text-[11px] font-bold">
                              {document.originalName} ({(document.size / 1024 / 1024).toFixed(2)} MB)
                            </span>
                            <div className="flex shrink-0 gap-1">
                              <button type="button" onClick={() => handleViewVolunteerDocument(document.id)} className="rounded-lg bg-blue-600 px-2 py-1 text-[10px] font-black text-white">مشاهده</button>
                              <button type="button" onClick={() => handleDeleteVolunteerDocument(document.id)} className="rounded-lg bg-red-600 px-2 py-1 text-[10px] font-black text-white">حذف</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-1 text-[10px] text-slate-400">مدرکی برای این پرونده ثبت نشده است.</p>
                    )}
                  </div>
                  <div className="md:col-span-2 flex justify-between items-center border-t pt-4 border-black/10 gap-2">
                    <div className="flex gap-2 flex-wrap">
                      <button 
                        type="button" 
                        onClick={async () => {
                          const updatedData = {
                            fullName: selectedVolForPage.fullName,
                            phone: selectedVolForPage.phone,
                            nationalId: selectedVolForPage.nationalId,
                            job: selectedVolForPage.job,
                            address: selectedVolForPage.address,
                            skills: selectedVolForPage.skills,
                            gender: selectedVolForPage.gender,
                            birthDate: selectedVolForPage.birthDate,
                            status: selectedVolForPage.status
                          };
                          
                          try {
                            const res = await fetch(`/api/volunteers/${selectedVolForPage.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify(updatedData)
                            });
                            
                            if (res.ok) {
                              setVolunteers(prev => prev.map(v => v.id === selectedVolForPage.id ? selectedVolForPage : v));
                              const updated = await fetch('/api/volunteers').then(r => r.json());
                              setVolunteers(updated);
                              setSelectedVolForPage(prev => prev ? {...prev, ...updatedData} : null);
                              alert('✅ اطلاعات داوطلب با موفقیت ذخیره شد.');
                            } else {
                              alert('❌ خطا در ذخیره تغییرات');
                            }
                          } catch (e) {
                            alert('❌ خطای شبکه');
                          }
                        }} 
                        className="bg-red-600 text-white px-4 py-2 rounded-xl font-black transition shadow"
                      >
                        ذخیره تغییرات داوطلب
                      </button>

                      <button 
                        type="button" 
                        onClick={async () => {
                          try {
                            const res = await fetch(`/api/volunteers/${selectedVolForPage.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ status: 'تایید شده' })
                            });
                            const result = await res.json();
                            if (res.ok) {
                              setVolunteers(prev => prev.map(v => v.id === selectedVolForPage.id ? {...v, status: 'تایید شده', rank: 'امدادگر رسمی'} : v));
                              const updated = await fetch('/api/volunteers').then(r => r.json());
                              setVolunteers(updated);
                              setSelectedVolForPage(prev => prev ? {...prev, status: 'تایید شده', rank: 'امدادگر رسمی'} : null);
                              alert(result.warning ? `⚠️ ${result.warning}` : '✅ پرونده تأیید و رمز موقت از طریق پیامک ارسال شد.');
                            } else {
                              alert(`❌ ${result.error || 'خطا در تایید صلاحیت'}`);
                            }
                          } catch (e) {
                            alert('❌ خطای شبکه');
                          }
                        }} 
                        className="bg-red-700 text-white px-4 py-2 rounded-xl font-black transition shadow"
                      >
                        تایید صلاحیت نهایی
                      </button>
                    </div>
                    <span className="text-[11px] font-black bg-red-500/20 text-red-600 px-3 py-1 rounded-xl">وضعیت پرونده: {selectedVolForPage.status}</span>
                  </div>
                </div>
              </div>
            ) : null}

            {isHamyarLoggedIn && loggedInHamyar && !selectedVolForPage && (
              <div className={`border rounded-3xl p-4 md:p-6 shadow-2xl space-y-4 animate-fadeIn ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-red-50 border-red-200 text-slate-900'}`}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-red-500/10 border border-red-500/40 flex items-center justify-center shrink-0"><Medal className="w-5 h-5 text-red-500" /></div>
                  <div className="space-y-1 flex-1">
                    <h2 className="text-xs md:text-sm font-black flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span>👑 همیار گرامی ({loggedInHamyar.fullName}) خوش آمدید</span>
                      <span className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-lg font-black w-max">{loggedInHamyar.rank || 'امدادگر رسمی'}</span>
                    </h2>
                    <p className="text-[11px] text-red-400 font-medium leading-relaxed opacity-80">وضعیت گزارش‌های محله را پایش کنید و مسئولیت اعزام را بپذیرید.</p>
                  </div>
                </div>
                
                <div className="border-t border-slate-800/80 pt-3 space-y-3">
                  <div className="flex items-center gap-2"><Key className="w-4 h-4 text-red-500" /><h3 className="text-xs font-black">تغییر گذرواژه</h3></div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <input type="password" autoComplete="current-password" placeholder="گذرواژه فعلی" value={currentPasswordInput} onChange={(e) => setCurrentPasswordInput(e.target.value)} className={volunteerFieldClass} />
                    <input type="password" autoComplete="new-password" placeholder="گذرواژه جدید" value={newPasswordInput} onChange={(e) => setNewPasswordInput(e.target.value)} className={volunteerFieldClass} />
                    <input type="password" autoComplete="new-password" placeholder="تکرار گذرواژه جدید" value={confirmPasswordInput} onChange={(e) => setConfirmPasswordInput(e.target.value)} className={volunteerFieldClass} />
                  </div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <p className="text-[10px] text-slate-500">حداقل ۶ کاراکتر، شامل حداقل ۲ حرف و ۲ رقم انگلیسی</p>
                    <button type="button" disabled={passwordChangeLoading} onClick={handleChangeHamyarPassword} className="bg-red-600 disabled:opacity-50 text-white text-xs font-black px-5 py-2.5 rounded-xl transition shadow">{passwordChangeLoading ? 'در حال بروزرسانی...' : 'بروزرسانی گذرواژه'}</button>
                  </div>
                </div>
              </div>
            )}

            {!selectedVolForPage && (
              <>
                <div className={`flex flex-col sm:flex-row sm:items-center justify-between border-b pb-3 gap-3 ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                  <div className="flex items-center gap-2">
                    <LayoutDashboard className="w-5 h-5 text-red-500" /> 
                    <h2 className={`text-sm md:text-base font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>اتاق فرمان و مانیتورینگ متمرکز</h2>
                  </div>
                  
                  <button 
                    onClick={async () => {
                      await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null);
                      setIsAdminLoggedIn(false); setIsHamyarLoggedIn(false); setLoggedInHamyar(null); 
                      localStorage.removeItem('hamyar_admin_auth'); localStorage.removeItem('hamyar_hamyar_auth');
                      localStorage.removeItem('hamyar_logged_in_data');
                      await refreshIncidents().catch(() => null);
                      setAuthIdentifier(''); setAuthPassword(''); navigateToView('report'); 
                    }} 
                    className={`font-black px-6 py-2.5 rounded-xl text-xs transition shadow-md flex items-center justify-center gap-2 order-2 ${darkMode ? 'bg-slate-800 text-slate-200' : 'bg-gradient-to-r from-red-600 to-red-500 text-white'}`}
                  >
                    <span>برگشت به نقشه و خروج</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className={`border p-4 rounded-xl flex items-center justify-between shadow-sm ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-red-50 border-red-200 shadow text-slate-900'}`}>
                    <div><p className="text-[10px] font-black text-slate-500">کل گزارشات</p><h3 className={`text-base font-black font-mono mt-0.5 ${darkMode ? 'text-amber-400' : 'text-slate-900'}`}>{statsMemo.total}</h3></div>
                    <Radio className="w-4 h-4 text-red-500" />
                  </div>
                  <div className={`border p-4 rounded-xl flex items-center justify-between shadow-sm ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-red-50 border-red-200 shadow text-slate-900'}`}>
                    <div><p className="text-[10px] font-black text-slate-500">حوادث جاری</p><h3 className="text-base font-black text-red-500 font-mono mt-0.5">{statsMemo.pending}</h3></div>
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                  </div>
                  <div className={`border p-4 rounded-xl flex items-center justify-between shadow-sm ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-red-50 border-red-200 shadow text-slate-900'}`}>
                    <div><p className="text-[10px] font-black text-slate-500">تایید شده</p><h3 className={`text-base font-black font-mono mt-0.5 ${darkMode ? 'text-emerald-400' : 'text-slate-900'}`}>{statsMemo.approved}</h3></div>
                    <CheckCircle className="w-4 h-4 text-red-600" />
                  </div>
                  <div className={`border p-4 rounded-xl flex items-center justify-between shadow-sm ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-red-50 border-red-200 shadow text-slate-900'}`}>
                    <div><p className="text-[10px] font-black text-slate-500">ریسک بالا</p><h3 className={`text-base font-black font-mono mt-0.5 ${darkMode ? 'text-red-400' : 'text-red-700'}`}>{statsMemo.critical}</h3></div>
                    <ShieldAlert className="w-4 h-4 text-red-700" />
                  </div>
                </div>

                {isAdminLoggedIn && (
                  <div className={`flex gap-2 border-b ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                    <button type="button" onClick={() => setAdminTab('incidents')} className={`px-4 py-2 text-xs font-black transition-all ${adminTab === 'incidents' ? 'bg-red-600 text-white rounded-t-xl shadow' : 'text-slate-500'}`}>🔥 رصد حوادث</button>
                    <button type="button" onClick={() => setAdminTab('volunteers')} className={`px-4 py-2 text-xs font-black transition-all ${adminTab === 'volunteers' ? 'bg-red-600 text-white rounded-t-xl shadow' : 'text-slate-500'}`}>📝 بررسی صلاحیت داوطلبان</button>
                  </div>
                )}

                {((isAdminLoggedIn && adminTab === 'incidents') || isHamyarLoggedIn) && (
                  <div className={`border rounded-3xl p-4 shadow-2xl ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-red-50 border-red-200'}`}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-b pb-3 border-black/10 z-30">
                      <div className="relative">
                        <button type="button" onClick={() => setOpenFilterDropdown(!openFilterDropdown)} className={`w-full border rounded-xl px-3 py-1.5 text-xs font-black flex items-center justify-between transition-colors ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-red-200 text-slate-900 shadow-sm'}`}>
                          <div className="flex items-center gap-2">
                            <Filter className="w-3.5 h-3.5 text-slate-400" />
                            <span>{filterType === 'all' ? 'همه انواع بحران‌ها' : filterType}</span>
                          </div>
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        </button>
                        {openFilterDropdown && (
                          <div className={`absolute left-0 right-0 mt-1 rounded-xl shadow-2xl border z-[60] overflow-hidden animate-fadeIn ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
                            {[{ value: 'all', label: 'همه انواع بحران‌ها' }, { value: 'زلزله یا تخریب سازه', label: 'زلزله یا تخریب سازه' }, { value: 'بمباران / آسیب جنگی', label: 'بمباران / آسیب جنگی' }, { value: 'آتش‌سوزی گسترده', label: 'آتش‌سوزی گسترده' }, { value: 'سیل گسترده و طغیان روان‌آب', label: 'سیل گسترده و طغیان روان‌آب' }].map((f) => (
                              <button key={f.value} type="button" onClick={() => { setFilterType(f.value); setOpenFilterDropdown(false); }} className={`w-full text-right px-4 py-2.5 text-xs font-bold transition-colors ${darkMode ? 'hover:bg-slate-700 text-slate-100' : 'hover:bg-slate-50 text-slate-900'} ${filterType === f.value ? 'bg-red-500/10 text-red-500 font-black' : ''}`}>
                                {f.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="relative">
                        <button type="button" onClick={() => setOpenSortDropdown(!openSortDropdown)} className={`w-full border rounded-xl px-3 py-1.5 text-xs font-black flex items-center justify-between transition-colors ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-red-200 text-slate-900 shadow-sm'}`}>
                          <div className="flex items-center gap-2">
                            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                            <span>{sortBy === 'newest' ? 'جدیدترین گزارشات' : 'بحرانی‌ترین سطح ریسک'}</span>
                          </div>
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        </button>
                        {openSortDropdown && (
                          <div className={`absolute left-0 right-0 mt-1 rounded-xl shadow-2xl border z-[60] overflow-hidden animate-fadeIn ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-red-200 text-slate-900'}`}>
                            {[{ value: 'newest', label: 'جدیدترین گزارشات' }, { value: 'critical', label: 'بحرانی‌ترین سطح ریسک' }].map((s) => (
                              <button key={s.value} type="button" onClick={() => { setSortBy(s.value as any); setOpenSortDropdown(false); }} className={`w-full text-right px-4 py-2.5 text-xs font-bold transition-colors ${darkMode ? 'hover:bg-slate-700 text-slate-100' : 'hover:bg-slate-50 text-slate-900'} ${sortBy === s.value ? 'bg-red-500/10 text-red-500 font-black' : ''}`}>
                                {s.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {isHamyarLoggedIn && !incidentsLoading && !incidentsLoadError && processedIncidents.length === 0 && (
          <div className={`md:col-span-2 rounded-2xl border px-4 py-6 text-center text-xs font-bold ${
            darkMode
              ? 'border-slate-700 bg-slate-800/60 text-slate-300'
              : 'border-slate-200 bg-white text-slate-600'
          }`}>
            در حال حاضر حادثه تأییدشده‌ای در شهر شما ثبت نشده است.
          </div>
        )}
{/* 🟢 جایگزین کامل حلقه رندر کارت‌های حوادث شما: */}
{/* 🟢 جایگزین نهایی و اصلاح‌شده حلقه رندر کارت‌های حوادث در فایل page.tsx: */}
        {processedIncidents.map((inc) => {
          // بررسی محدودیت تک مأموریتی بر اساس وجود نام همیار در لیست اعزام هر حادثه
          const isAssignedToThis = inc.assignedHamyars && inc.assignedHamyars.includes(loggedInHamyar?.fullName || '');
          const hasAnyActiveMission = incidents.some(i => 
            i.assignedHamyars && 
            i.assignedHamyars.includes(loggedInHamyar?.fullName || '')
          );
          const mapUrl = getIncidentMapUrl(inc);

          return (
            <div key={inc.id} className={`border rounded-2xl p-4 flex flex-col justify-between space-y-3 relative shadow-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-red-200 text-slate-900 shadow-sm'}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {getCrisisIconComponent(inc.type, severityColor)}
                  <div>
                    <h4 className="text-xs font-black">{inc.type}</h4>
                    <p className="text-[9px] text-slate-500 font-mono mt-0.5">گزارش‌دهنده: {inc.reporterName}</p>
                  </div>
                </div>
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded text-white font-mono shrink-0" style={{ backgroundColor: severityColor }}>{inc.severityValue}%</span>
              </div>
              <p className="text-xs leading-relaxed min-h-[35px] font-bold">{inc.description}</p>
              
              <div className="flex flex-col gap-1 text-[10px] font-bold">
                <div className="text-slate-400">📍 آدرس دستی کاربر: {inc.manualAddress || 'ثبت نشده'}</div>
                <div className="text-slate-400">🗺️ موقعیت نقشه: lat: {inc.mapLat ?? inc.lat}, lng: {inc.mapLng ?? inc.lng}</div>
                {mapUrl ? (
                  <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="inline-flex w-max items-center gap-1 text-red-500 hover:text-red-400 underline underline-offset-2 font-black">
                    <MapPin className="w-3 h-3" /> مشاهده موقعیت روی نقشه
                  </a>
                ) : (
                  <span className="text-slate-500">موقعیت قابل نمایش ثبت نشده است.</span>
                )}
                <div className="text-red-600 font-sans">وضعیت فوریت: {inc.status}</div>
                <div className="text-slate-400">🏙️ شهر: {inc.city || 'ثبت نشده'}</div>
                
                {/* 🟢 نمایش اختصاصی لیست داوطلبین اعزام شده به این نقطه پدافندی */}
                <div className="mt-2 pt-2 border-t border-slate-700/40">
                  <span className="text-slate-400 block font-black mb-1">👥 لیست داوطلبین و همیاران اعزام شده:</span>
                  {inc.assignedHamyars && inc.assignedHamyars.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {inc.assignedHamyars.map((name, idx) => (
                        <span key={idx} className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-lg text-[9px] font-black">
                          💂‍♂️ {name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-slate-500 text-[9px] italic font-medium">هنوز هیچ نیرو و امدادگری به این موقعیت اعزام نشده است</span>
                  )}
                </div>
              </div>

              <div className={`flex wrap items-center justify-between border-t pt-2 gap-2 ${darkMode ? 'border-slate-700' : 'border-black/5'}`}>
                <div className="flex gap-2">
                  <button type="button" onClick={() => handleVote(inc.id, 'like')} className="flex items-center gap-1 bg-red-500/10 text-red-600 px-2 py-1 rounded-lg text-[10px]"><ThumbsUp className="w-3 h-3" /> <span>({inc.likes})</span></button>
                  <button type="button" onClick={() => handleVote(inc.id, 'dislike')} className="flex items-center gap-1 bg-red-500/10 text-red-600 px-2 py-1 rounded-lg text-[10px]"><ThumbsDown className="w-3 h-3" /> <span>({inc.dislikes})</span></button>
                </div>
                
                {isHamyarLoggedIn && (
                  <button 
                    type="button" 
                    onClick={() => {
                      if (isAssignedToThis) {
                        alert('شما قبلاً اعزام این مأموریت را تایید کرده‌اید.');
                        return;
                      }
                      if (hasAnyActiveMission) {
                        alert('🚫 محدودیت مأموریت: شما در حال حاضر یک مأموریت فعال در سیستم دارید. امکان اعزام همزمان به دو حادثه وجود ندارد.');
                        return;
                      }
                      setPendingMissionIncidentId(inc.id);
                      setMissionAgreementChecked(false);
                    }} 
                    disabled={isAssignedToThis || (hasAnyActiveMission && !isAssignedToThis)}
                    className={`px-2.5 py-1 rounded-xl text-[10px] font-black shadow-md flex items-center gap-1 transition ${
                      isAssignedToThis
                        ? 'bg-emerald-600/20 text-emerald-500 border border-emerald-500/30 cursor-not-allowed shadow-none'
                        : (hasAnyActiveMission && !isAssignedToThis)
                          ? 'bg-slate-800 text-slate-500 border border-slate-700/30 cursor-not-allowed shadow-none opacity-40'
                          : 'bg-gradient-to-r from-red-600 to-red-700 text-white hover:scale-105 active:scale-95'
                    }`}
                  >
                    <Truck className="w-3 h-3" /> 
                    <span>
                      {isAssignedToThis 
                        ? 'تحت کنترل شما' 
                        : (hasAnyActiveMission && !isAssignedToThis)
                          ? 'محدودیت تک‌مأموریتی'
                          : 'قبول مأموریت'}
                    </span>
                  </button>
                )}
              </div>

{isAdminLoggedIn && (
                <div className={`flex gap-2 pt-2 border-t ${darkMode ? 'border-slate-700' : 'border-black/5'}`}>
                  <button 
                    type="button" 
                    onClick={async () => {
                      try {
                        const res = await fetch(`/api/incidents/${inc.id}/status`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ status: 'تایید شده' })
                        });
                        if (res.ok) {
                          setIncidents(prev => prev.map(i => i.id === inc.id ? {...i, status: 'تایید شده'} : i));
                          const updated = await fetch('/api/incidents').then(r => r.json());
                          setIncidents(updated);
                        } else { alert('خطا در تایید حادثه'); }
                      } catch (e) { alert('خطای شبکه'); }
                    }} 
                    className="flex-1 bg-emerald-600 text-white text-[10px] font-black h-8 rounded-xl transition shadow"
                  >
                    تایید ستاد
                  </button>
                  <button 
                    type="button" 
                    onClick={async () => {
                      if (!confirm('آیا از حذف این گزارش اطمینان دارید؟')) return;
                      try {
                        const res = await fetch(`/api/incidents/${inc.id}`, { method: 'DELETE' });
                        if (res.ok) {
                          setIncidents(prev => prev.filter(i => i.id !== inc.id));
                          const updated = await fetch('/api/incidents').then(r => r.json());
                          setIncidents(updated);
                        } else { alert('خطا در حذف حادثه'); }
                      } catch (e) { alert('خطای شبکه'); }
                    }} 
                    className="flex-1 bg-slate-600 text-white text-[10px] font-black h-8 rounded-xl transition shadow"
                  >
                    حذف گزارش
                  </button>
                </div>
              )}
            </div>
          );
        })}
                    </div>
                  </div>
                )}

                {isAdminLoggedIn && adminTab === 'volunteers' && (
                  <div className={`border rounded-3xl p-4 shadow-2xl overflow-hidden ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-xs min-w-[500px]">
                        <thead>
                          <tr className={`border-b font-bold ${darkMode ? 'text-zinc-300 bg-slate-800/40 border-slate-700' : 'text-slate-800 bg-slate-100 border-slate-200'}`}>
                            <th className="p-3">نام متقاضی</th>
                            <th className="p-3">جنسیت</th>
                            <th className="p-3">شهر</th>
                            <th className="p-3">شماره همراه</th>
                            <th className="p-3">وضعیت</th>
                            <th className="p-3 text-center">اقدام سریع</th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y ${darkMode ? 'divide-slate-700 text-slate-200' : 'divide-slate-200 text-slate-900'}`}>
                          {volunteers.map((vol) => (
                            <tr key={vol.id} className={darkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}>
                              <td className="p-3 font-black"><button type="button" onClick={() => setSelectedVolForPage(vol)} className="text-red-600 hover:underline flex items-center gap-1 font-black"><Eye className="w-3 h-3" /> <span>{vol.fullName}</span></button></td>
                              <td className="p-3 font-bold">{vol.gender || '-'}</td>
                              <td className="p-3 font-bold">
                                {vol.city ? (
                                  <span className={`inline-flex rounded-lg border px-2 py-1 text-[10px] font-black ${
                                    darkMode
                                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                                      : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                  }`}>
                                    شهر محل سکونت: {vol.city}
                                  </span>
                                ) : (
                                  <span className={`inline-flex rounded-lg border px-2 py-1 text-[10px] font-bold ${
                                    darkMode
                                      ? 'border-slate-700 bg-slate-800 text-slate-400'
                                      : 'border-slate-200 bg-slate-100 text-slate-500'
                                  }`}>
                                    شهر ثبت نشده
                                  </span>
                                )}
                              </td>
                              <td className="p-3 font-mono font-bold">{vol.phone}</td>
                              <td className="p-3"><span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-red-500/20 text-red-700">{vol.status}</span></td>
                              <td className="p-3 flex justify-center gap-2">
                                <button 
                                  type="button" 
                                  onClick={async () => {
                                    try {
                                      const res = await fetch(`/api/volunteers/${vol.id}`, {
                                        method: 'PATCH',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ status: 'تایید شده' })
                                      });
                                      const result = await res.json();
                                      if (res.ok) {
                                        setVolunteers(prev => prev.map(v => v.id === vol.id ? {...v, status: 'تایید شده', rank: 'امدادگر رسمی'} : v));
                                        const updated = await fetch('/api/volunteers').then(r => r.json());
                                        setVolunteers(updated);
                                        if (selectedVolForPage && selectedVolForPage.id === vol.id) {
                                          setSelectedVolForPage(prev => prev ? {...prev, status: 'تایید شده', rank: 'امدادگر رسمی'} : null);
                                        }
                                        alert(result.warning ? `⚠️ ${result.warning}` : '✅ پرونده تأیید و رمز موقت از طریق پیامک ارسال شد.');
                                      } else {
                                        alert(`❌ ${result.error || 'خطا در تایید داوطلب'}`);
                                      }
                                    } catch (e) {
                                      alert('خطای شبکه');
                                    }
                                  }} 
                                  className="bg-red-600 text-white px-2 py-0.5 rounded-lg font-black text-[10px] shadow"
                                >
                                  تایید
                                </button>
                                <button 
                                  type="button" 
                                  onClick={async () => {
                                    try {
                                      const res = await fetch(`/api/volunteers/${vol.id}`, {
                                        method: 'PATCH',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ status: 'رد صلاحیت شده' })
                                      });
                                      if (res.ok) {
                                        setVolunteers(prev => prev.map(v => v.id === vol.id ? {...v, status: 'رد صلاحیت شده'} : v));
                                        const updated = await fetch('/api/volunteers').then(r => r.json());
                                        setVolunteers(updated);
                                        if (selectedVolForPage && selectedVolForPage.id === vol.id) {
                                          setSelectedVolForPage(prev => prev ? {...prev, status: 'رد صلاحیت شده'} : null);
                                        }
                                        alert('✅ وضعیت داوطلب به «رد صلاحیت شده» تغییر یافت.');
                                      } else {
                                        alert('خطا در رد داوطلب');
                                      }
                                    } catch (e) {
                                      alert('خطای شبکه');
                                    }
                                  }} 
                                  className="bg-slate-600 text-white px-2 py-0.5 rounded-lg font-black text-[10px] shadow"
                                >
                                  رد
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* 📊 لایه مانیتورینگ آمار ترافیک */}
        {currentView === 'analytics' && isAdminLoggedIn && !isAuthMode && (
          <div className="w-full h-full p-4 md:p-8 overflow-y-auto space-y-6 animate-fadeIn">
            <div className={`flex flex-col md:flex-row md:items-center justify-between border-b pb-4 gap-4 ${darkMode ? 'border-slate-800' : 'border-slate-300'}`}>
              <div>
                <h2 className={`text-xl md:text-2xl font-black flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  <BarChart3 className="w-6 h-6 text-red-500" />
                  داشبورد مانیتورینگ ترافیک و پایش پدافندی
                </h2>
                <p className={`text-xs mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-900 font-bold'}`}>آمار واقعی، زنده و تفکیک‌شدهٔ کاربران متصل به سامانه همیار بحران</p>
              </div>
              <div className={`border px-4 py-2 rounded-2xl flex items-center gap-3 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-300 shadow-sm'}`}>
                <ShieldCheck className="w-5 h-5 text-red-500" />
                <div className="text-right">
                  <p className="text-[10px] text-slate-500">مدیر ارشد ستاد:</p>
                  <p className={`text-xs font-black ${darkMode ? 'text-slate-200' : 'text-slate-900'}`}>{adminProfile.fullName} ({adminProfile.studentId})</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className={`border p-5 rounded-3xl shadow-xl space-y-2 relative overflow-hidden group transition ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 hover:border-red-500'}`}>
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center"><Globe className="w-5 h-5 text-red-500" /></div>
                <p className="text-xs font-bold text-slate-400">کل بازدیدهای سایت (Hits)</p>
                <p className={`text-2xl font-black tracking-tight ${darkMode ? 'text-amber-400 font-mono' : 'text-slate-900 font-mono'}`}>{analytics.totalVisVisits} <span className="text-xs text-red-500 font-normal">بار</span></p>
              </div>
              <div className={`border p-5 rounded-3xl shadow-xl space-y-2 relative overflow-hidden group transition ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 hover:border-red-500'}`}>
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center"><Users className="w-5 h-5 text-red-500" /></div>
                <p className="text-xs font-bold text-slate-400">کاربران منحصربه‌فرد (Unique)</p>
                <p className={`text-2xl font-black tracking-tight ${darkMode ? 'text-cyan-400 font-mono' : 'text-slate-900 font-mono'}`}>{analytics.uniqueUsers} <span className="text-xs text-red-500 font-normal">نفر</span></p>
              </div>
              <div className={`border p-5 rounded-3xl shadow-xl space-y-2 relative overflow-hidden group transition ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 hover:border-red-500'}`}>
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center"><Monitor className="w-5 h-5 text-red-500" /></div>
                <p className="text-xs font-bold text-slate-400">ورودی با سیستم دسکتاپ</p>
                <p className={`text-2xl font-black tracking-tight ${darkMode ? 'text-white font-mono' : 'text-slate-900 font-mono'}`}>{analytics.desktopHits} <span className="text-xs text-red-500 font-normal">دستگاه</span></p>
              </div>
              <div className={`border p-5 rounded-3xl shadow-xl space-y-2 relative overflow-hidden group transition ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 hover:border-red-500'}`}>
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center"><Smartphone className="w-5 h-5 text-red-500" /></div>
                <p className="text-xs font-bold text-slate-400">ورودی با گوشی هوشمند</p>
                <p className={`text-2xl font-black tracking-tight ${darkMode ? 'text-emerald-400 font-mono' : 'text-slate-900 font-mono'}`}>{analytics.mobileHits} <span className="text-xs text-red-500 font-normal">همراه</span></p>
              </div>
            </div>
          </div>
        )}

        {/* 🎧 نمای پشتیبانی و خطوط لایو ستاد */}
        {currentView === 'support' && !isAuthMode && (
          <div className="w-full h-full p-4 md:p-8 flex flex-col items-center justify-center text-center my-auto overflow-y-auto animate-fadeIn">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6 shadow-2xl transition-all bg-slate-900 border border-slate-800 text-red-400"><PhoneCall className="w-10 h-10 animate-bounce" /></div>
            <h2 className={`text-base md:text-xl font-black tracking-tight mb-2 ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>خطوط اضطراری و پشتیبانی فنی شبکه همیار</h2>
            <div className={`mt-4 rounded-3xl p-6 w-full max-w-sm space-y-5 border transition-all ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-300 shadow-2xl' : 'bg-white border-slate-300 shadow-xl text-slate-900'}`}>
              <div className={`flex justify-between items-center border-b pb-4 gap-4 ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                <div className="flex items-center gap-2 text-xs font-black"><PhoneCall className="w-4 h-4 text-red-600 shrink-0" /><span>پشتیبانی:</span></div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => handleCopyToClipboardAndToast("+989226401310")} className="p-1 rounded bg-slate-500/10 text-slate-400 hover:text-slate-200 transition"><Copy className="w-3.5 h-3.5" /></button>
                  <a href={`tel:${adminProfile.phone}`} style={{ direction: 'ltr', unicodeBidi: 'bidi-override' }} className="dir-ltr inline-block text-left font-mono font-black text-sm md:text-base tracking-widest text-red-600 hover:underline">+989226401310</a>
                </div>
              </div>
              <div className="flex justify-between items-center gap-4 pt-1 font-black">
                <div className="flex items-center gap-2 text-xs"><Mail className="w-4 h-4 text-red-600 shrink-0" /><span>پست الکترونیکی:</span></div>
                <div className="flex items-center gap-2 max-w-[65%]">
                  <button type="button" onClick={() => handleCopyToClipboardAndToast("hamyarbohran@gmail.com")} className="p-1 rounded bg-slate-500/10 text-slate-400 hover:text-slate-200 transition"><Copy className="w-3.5 h-3.5" /></button>
                  <a href={`mailto:${adminProfile.email}`} className="font-mono text-[11px] md:text-xs text-red-600 tracking-wide break-all hover:underline">{adminProfile.email}</a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 🤖 نمای ششم: پورتال لایو چت و پشتیبانی آنلاین ۲۴ ساعته با هوش مصنوعی */}
        {currentView === 'support-ai' && !isAuthMode && (
          <div className="w-full h-full p-3 md:p-6 flex flex-col justify-between overflow-hidden animate-fadeIn">
            <div className={`border-b pb-3 flex items-center justify-between ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                  <MessageSquareCode className="w-5 h-5 animate-pulse" />
                </div>
                <div className="text-right">
                  <h3 className={`text-sm font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>پشتیبانی خودکار و هوشمند ستاد همیار بحران</h3>
                  <p className="text-[10px] text-cyan-400 font-bold">پاسخگویی متمرکز و آنی ۲۴ ساعته متصل به هوش مصنوعی لایو</p>
                </div>
              </div>
              <button onClick={() => navigateToView('home')} className="text-slate-400 hover:text-red-500 text-xs font-bold transition">✖ خروج از چت</button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4 px-2 scrollbar-thin">
              {chatMessages.map((msg, index) => (
                <div key={index} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
                  <div 
                    className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-2.5 text-xs font-bold leading-relaxed shadow-md ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-cyan-600 to-cyan-500 text-white rounded-br-none'
                        : darkMode
                          ? 'bg-slate-950/80 border border-slate-800 text-slate-100 rounded-bl-none'
                          : 'bg-white border border-slate-200 text-slate-900 rounded-bl-none'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div className="flex w-full justify-start animate-pulse">
                  <div className={`rounded-2xl px-4 py-3 text-xs font-black flex items-center gap-1.5 ${darkMode ? 'bg-slate-950/40 text-cyan-400 border border-slate-800' : 'bg-cyan-50 text-cyan-600 border border-cyan-100'}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce"></span>
                    <span className="mr-1">در حال پردازش داده...</span>
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            <form onSubmit={handleSendChatMessage} className={`border p-2 rounded-2xl flex items-center gap-2 backdrop-blur-xl ${darkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-white border-slate-300 shadow-lg'}`}>
              <input 
                type="text" 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={isChatLoading}
                placeholder="سوال خود را در زمینه ثبت گزارش، کمک‌های اولیه یا سیستم بپرسید..." 
                className={`w-full text-xs font-bold bg-transparent px-3 py-2.5 focus:outline-none disabled:cursor-not-allowed ${darkMode ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'}`}
              />
              <button 
                type="submit"
                disabled={!chatInput.trim() || isChatLoading}
                className={`p-2.5 rounded-xl transition shrink-0 ${
                  chatInput.trim() && !isChatLoading
                    ? 'bg-cyan-500 text-white hover:scale-105 active:scale-95'
                    : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                }`}
              >
                <Send className="w-4 h-4 rotate-180" />
              </button>
            </form>
          </div>
        )}

        {/* 🔐 لایه جدید: فرم تاکتیکال احراز هویت */}
                {/* 🔐 لایه جدید: فرم تاکتیکال احراز هویت */}
        {isAuthMode && !isAdminLoggedIn && !isHamyarLoggedIn && (
          <div className="w-full h-full p-4 md:p-8 flex flex-col items-center justify-center overflow-y-auto animate-fadeIn">
            <form onSubmit={handleAdminAuth} className={`w-full max-w-md border rounded-3xl p-6 space-y-4 shadow-2xl transition-colors ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-300 text-slate-900'}`}>
              <div className="flex items-center gap-2 border-b pb-3 border-black/10">
                <Lock className="w-5 h-5 text-red-500" />
                <h2 className="text-sm md:text-base font-black">ورود به ایستگاه فرماندهی (همیاران / مدیریت)</h2>
              </div>
              <div className="flex bg-black/10 p-1 rounded-xl gap-1">
                <button type="button" onClick={() => { setAuthMethod('password'); setAuthOtpSent(false); }} className={`flex-1 py-1.5 text-xs font-black rounded-lg transition-all ${authMethod === 'password' ? 'bg-red-500 text-white shadow' : 'text-slate-400'}`}>گذرواژه ثابت</button>
                <button type="button" onClick={() => setAuthMethod('otp')} className={`flex-1 py-1.5 text-xs font-black rounded-lg transition-all ${authMethod === 'otp' ? 'bg-red-500 text-white shadow' : 'text-slate-400'}`}>رمز یکبار مصرف (بله)</button>
              </div>
              <div>
                <label className="block text-[11px] font-black mb-1">شناسه کاربری (شماره همراه / ایمیل / کد ملی)</label>
                <input type="text" required value={authIdentifier} onChange={(e) => setAuthIdentifier(e.target.value)} placeholder="09xxxxxxxxx" className={`w-full border rounded-xl px-4 py-2 text-xs font-bold focus:outline-none ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`} />
              </div>
              {authMethod === 'password' ? (
                <div>
                  <label className="block text-[11px] font-black mb-1">گذرواژه امنیتی</label>
                  <input type="password" required value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} placeholder="••••••••" className={`w-full border rounded-xl px-4 py-2 text-xs font-bold focus:outline-none ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`} />
                </div>
              ) : (
                <div className="space-y-3">
                  {!authOtpSent ? (
                    <div className="flex gap-2 w-full">
                      <button type="button" onClick={handleSendAuthOTP} className="flex-1 bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-black py-2 rounded-xl hover:bg-red-500/20 transition">ارسال کد تایید به بله</button>
                      
                    </div>
                  ) : (
                    <div className="space-y-2 animate-fadeIn">
                      <label className="block text-[11px] font-black mb-1">کد تایید ۶ رقمی</label>
                      <input type="text" maxLength={6} required value={authOtpCode} onChange={(e) => setAuthOtpCode(e.target.value)} placeholder="xxxxxx" className={`w-full border text-center font-mono rounded-xl px-4 py-2 text-xs font-bold focus:outline-none ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`} />
                    </div>
                  )}
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 text-xs font-black bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl py-2.5 transition shadow-md">تایید و ورود به کارتابل</button>
                <button type="button" onClick={() => setIsAuthMode(false)} className="bg-slate-800 text-slate-300 border border-slate-700 text-xs font-bold px-4 rounded-xl transition">انصراف</button>
              </div>
            </form>
          </div>
        )}
        </section>
        {/* 🟢 این بلوک مودال تعهدنامه را دقیقاً قبل از تگ پایانی </main> قرار بده: */}
{/* 🟢 جایگزین نهایی و اصولی مودال تعهدنامه مأموریت در انتهای فایل page.tsx قبل از </main> : */}
      {/* 🟢 مودال تعهدنامه - نسخه اصلاح‌شده */}
{pendingMissionIncidentId !== null && (
  (() => {
    const inc = incidents.find(i => i.id === pendingMissionIncidentId);
    if (!inc) return null;

    // ✅ فقط از localStorage بخون، نه از state
    const currentHamyar = (() => {
      if (typeof window === 'undefined') return null;
      try {
        const saved = localStorage.getItem('hamyar_logged_in_data');
        if (saved) {
          const parsed = JSON.parse(saved);
          // اگه دیتا وجود داره ولی کامل نیست، از state استفاده کن
          if (parsed && parsed.fullName) return parsed;
        }
      } catch (e) {
        console.error('Error parsing hamyar data:', e);
      }
      // اگر localStorage خالی بود، از state استفاده کن
      return loggedInHamyar || null;
    })();

    // اگه همیار پیدا نشد، پیام خطا
    if (!currentHamyar) {
      return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="max-w-lg w-full rounded-3xl p-6 bg-red-500/10 border border-red-500/30 text-center">
            <p className="text-red-400 font-black text-sm">❌ اطلاعات همیار یافت نشد</p>
            <p className="text-slate-400 text-xs mt-2">لطفاً دوباره وارد شوید</p>
            <button 
              onClick={() => { setPendingMissionIncidentId(null); setMissionAgreementChecked(false); }}
              className="mt-4 bg-red-500 text-white px-6 py-2.5 rounded-xl text-xs font-black hover:bg-red-600 transition"
            >
              بازگشت
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div className={`max-w-lg w-full rounded-3xl p-6 md:p-8 shadow-2xl border ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
          <div className="flex items-center gap-3 border-b pb-4 mb-4 border-slate-700/30">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg shadow-red-500/20">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-black">تعهدنامه رسمی پذیرش مأموریت اضطراری</h3>
              <p className="text-[10px] opacity-60">شبکه واکنش سریع همیاران ستاد مدیریت بحران</p>
            </div>
          </div>

          <div className="space-y-4 text-xs font-bold leading-relaxed">
            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 space-y-1 text-slate-300">
              <p className="text-red-400">💂‍♂️ مشخصات هویتی امدادگر همیار:</p>
              <div className="grid grid-cols-2 gap-2 text-[11px] mt-1 font-sans text-white">
                <div>نام همیار: {currentHamyar.fullName || 'نامشخص'}</div>
                <div>کد ملی: {currentHamyar.nationalId || 'نامشخص'}</div>
                <div>شماره تماس: {currentHamyar.phone || 'نامشخص'}</div>
                <div>رتبه امدادی: {currentHamyar.rank || 'امدادگر رسمی'}</div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
              <p className="font-black">📋 مشخصات حادثه هدف:</p>
              <p className="text-[11px] mt-1">نوع بحران: {inc.type}</p>
              <p className="text-[11px] truncate">موقعیت آدرس: {inc.manualAddress || inc.description}</p>
              {getIncidentMapUrl(inc) ? (
                <a href={getIncidentMapUrl(inc)!} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-2 text-[11px] font-black underline underline-offset-2">
                  <MapPin className="w-3 h-3" /> باز کردن در نقشه
                </a>
              ) : (
                <p className="text-[10px] mt-2 opacity-70">موقعیت قابل نمایش ثبت نشده است.</p>
              )}
            </div>

            <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 text-amber-500 text-[11px] space-y-1">
              <p className="font-black">⚖️ مفاد و بندهای تعهدنامه عملیاتی:</p>
              <p>۱. اینجانب صحت کلیه اطلاعات هویتی فوق را تایید نموده و مسئولیت آن را می‌پذیرم.</p>
              <p>۲. متعهد می‌شوم در اسرع وقت و بدون فوت وقت به محل دقیق حادثه اعزام شوم.</p>
              <p>۳. تایید می‌نمایم که در حال حاضر هیچ مأموریت فعال دیگری در سامانه پدافند ندارم.</p>
            </div>

            <label className="flex items-start gap-2 cursor-pointer p-2 rounded-xl hover:bg-slate-800/50 transition">
              <input
                type="checkbox"
                checked={missionAgreementChecked}
                onChange={(e) => setMissionAgreementChecked(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-red-500 cursor-pointer"
              />
              <span className="text-[11px] font-black">
                اینجانب {currentHamyar.fullName}، کلیه مفاد تعهدنامه فوق را مطالعه کرده و با آگاهی کامل مسئولیت آن را می‌پذیرم.
              </span>
            </label>
          </div>

          <div className="flex gap-3 mt-6 pt-4 border-t border-slate-700/30">
            <button
              type="button"
              onClick={() => { setPendingMissionIncidentId(null); setMissionAgreementChecked(false); }}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white text-xs font-black py-2.5 rounded-xl transition"
            >
              انصراف و لغو اعزام
            </button>
            <button
  type="button"
  disabled={!missionAgreementChecked || missionLoading}
  onClick={async () => {
    setMissionLoading(true);
    try {
      // ✅ اطلاعات همیار رو از localStorage بگیر
      const hamyarData = localStorage.getItem('hamyar_logged_in_data');
      const hamyar = hamyarData ? JSON.parse(hamyarData) : null;
      
      if (!hamyar) {
        alert('❌ اطلاعات همیار یافت نشد. لطفاً دوباره وارد شوید.');
        setMissionLoading(false);
        return;
      }

      const res = await fetch(`/api/incidents/${inc.id}/assign`, { method: 'POST' });
      const result = await res.json();
      
      if (res.ok) {
        // ✅ آپدیت محلی incidents
        setIncidents(prev => prev.map(i => {
          if (i.id === inc.id) {
            const currentAssigned = i.assignedHamyars || [];
            if (!currentAssigned.includes(hamyar.fullName)) {
              return {
                ...i,
                status: 'تحت کنترل همیار (اعزام نیرو)',
                assignedHamyars: [...currentAssigned, hamyar.fullName]
              };
            }
          }
          return i;
        }));
        
        alert(result.warning ? `✅ مأموریت ثبت شد. ${result.warning}` : `✅ مأموریت با موفقیت به نام ${hamyar.fullName} ثبت و پیامک آن ارسال شد.`);
        
        await refreshIncidents();
        
        setPendingMissionIncidentId(null);
        setMissionAgreementChecked(false);
      } else {
        alert(`❌ خطای ستاد: ${result.error || 'خطا در ثبت مأموریت'}`);
      }
    } catch (e) { 
      alert('❌ خطای شبکه ارتباطی سرور ستاد'); 
    } finally { 
      setMissionLoading(false); 
    }
  }}
  className={`flex-1 text-xs font-black py-2.5 rounded-xl transition shadow-md flex items-center justify-center gap-1 ${
    missionAgreementChecked && !missionLoading ? 'bg-gradient-to-r from-red-600 to-red-700 text-white' : 'bg-slate-800 text-slate-500 cursor-not-allowed'
  }`}
>
  {missionLoading ? '⏳ در حال ثبت...' : '🚀 تایید و اعزام به محل'}
</button>
            
          </div>
        </div>
      </div>
    );
  })()
)}
    </main>
  );
}

'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Shield, Users, Radio, ShieldAlert, AlertTriangle, UserPlus, Navigation, Medal, Activity, Check, X, PhoneCall, LayoutDashboard, Lock, Unlock, User, Smartphone, Ban, ThumbsUp, ThumbsDown, Filter, ArrowUpDown, Flame, Bomb, Wind, Sun, Moon, Eye, CheckCircle, Key, Send, Settings, Truck, Mail, ArrowRight, BarChart3, Globe, Monitor, ShieldCheck } from 'lucide-react';
import NeshanLocationPicker from '@/components/NeshanLocationPicker';

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
}

interface Volunteer {
  id: number;
  fullName: string;
  phone: string;
  nationalId: string;
  skills: string[];
  job: string;
  address: string;
  status: 'در انتظار تایید' | 'تایید شده' | 'رد صلاحیت شده';
  fixedPassword?: string; 
  rank?: 'امدادگر مبتدی' | 'امدادگر ارشد' | 'امدادگر متخصص';
}

interface SiteAnalytics {
  totalVisVisits: number;
  uniqueUsers: number;
  mobileHits: number;
  desktopHits: number;
  lastActiveTime: string;
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

export default function CrisisManagementSystem() {
  const [isMounted, setIsMounted] = useState(false);
  const [currentView, setCurrentView] = useState<'report' | 'volunteer' | 'admin' | 'support' | 'admin-edit' | 'analytics'>('report');
  const [severityValue, setSeverityValue] = useState<number>(20);
  const [markerPos, setMarkerPos] = useState(TEHRAN_FALLBACK);
  
  const [darkMode, setDarkMode] = useState(true);
  const [adminTab, setAdminTab] = useState<'incidents' | 'volunteers'>('incidents');
  const [selectedVolForModal, setSelectedVolForModal] = useState<Volunteer | null>(null);

  const [isHamyaatLoggedIn, setIsHamyaatLoggedIn] = useState(false); 
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
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [idempotencyLog, setIdempotencyLog] = useState('');

  const [pendingMissionIncidentId, setPendingMissionIncidentId] = useState<number | null>(null);
  const [volSubmitErrorMsg, setVolSubmitErrorErrorMsg] = useState('');

  const [adminProfile, setAdminProfile] = useState({
    fullName: 'امیررضا دلوی',
    email: 'dalvi82bk@gmail.com',
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

  // ========== VOLUNTEERS – now loaded from API ==========
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);

  const [crisisType, setCrisisType] = useState('زلزله یا تخریب سازه');
  const [customCrisis, setCustomCrisis] = useState('');
  const [incidentDesc, setIncidentDesc] = useState('');
  const [incidentAddress, setIncidentAddress] = useState('');
  const [reporterName, setReporterName] = useState('');
  const [reporterPhone, setReporterPhone] = useState('');

  const [volName, setVolName] = useState('');
  const [volPhone, setVolPhone] = useState('');
  const [volNationalId, setVolNationalId] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [customSkill, setCustomSkill] = useState('');
  const [volJob, setVolJob] = useState('');
  const [volAddress, setVolAddress] = useState('');

  const [reportOtpSent, setReportOtpSent] = useState(false);
  const [reportOtpCode, setReportOtpCode] = useState('');
  const [isReportPhoneVerified, setIsReportPhoneVerified] = useState(false);
  const [reportVerificationId, setReportVerificationId] = useState('');

  const [volOtpSent, setVolOtpSent] = useState(false);
  const [volOtpCode, setVolOtpCode] = useState('');
  const [isVolPhoneVerified, setIsVolPhoneVerified] = useState(false);
  const [volVerificationId, setVolVerificationId] = useState('');

  const analyticsFired = useRef(false);

  // 🛡️ بازیابی و حفظ وضعیت لایگین، صفحه فعلی و تم شب/روز کاربر پس از رفرش
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedAdminAuth = localStorage.getItem('hamyar_admin_auth') === 'true';
      const savedHamyarAuth = localStorage.getItem('hamyar_hamyar_auth') === 'true';
      const savedView = localStorage.getItem('hamyar_current_view');
      const savedTheme = localStorage.getItem('hamyar_theme');
      
      if (savedAdminAuth) setIsAdminLoggedIn(true);
      if (savedHamyarAuth) setIsHamyaatLoggedIn(true);
      if (savedView) setCurrentView(savedView as any);
      if (savedTheme !== null) setDarkMode(savedTheme === 'dark');

      // ========== ANALYTICS – fetch from API and update ==========
      if (analyticsFired.current) return;
      analyticsFired.current = true;

      const userIsMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent);
      const isNewUnique = !localStorage.getItem('real_unique_user');

      // 1) Fetch current analytics
      fetch('/api/analytics')
        .then(res => res.json())
        .then(data => {
          // Prepare updated values
          const updated = {
            totalVisVisits: data.totalVisVisits + 1,
            uniqueUsers: isNewUnique ? data.uniqueUsers + 1 : data.uniqueUsers,
            mobileHits: userIsMobile ? data.mobileHits + 1 : data.mobileHits,
            desktopHits: !userIsMobile ? data.desktopHits + 1 : data.desktopHits,
            lastActiveTime: new Date().toLocaleTimeString('fa-IR')
          };

          // 2) POST updated analytics
          return fetch('/api/analytics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updated)
          }).then(res => res.json());
        })
        .then(updatedAnalytics => {
          setAnalytics(updatedAnalytics);
          // mark unique user
          if (isNewUnique) localStorage.setItem('real_unique_user', 'true');
        })
        .catch(err => {
          console.error('Analytics sync failed:', err);
          // fallback: keep local state as is (zeros) – no localStorage anymore
        });
    }
  }, []);

  // ========== VOLUNTEERS – fetch from API on mount ==========
  useEffect(() => {
    fetch('/api/volunteers')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch volunteers');
        return res.json();
      })
      .then(data => setVolunteers(data))
      .catch(err => console.error('Error loading volunteers:', err));
  }, []);

  // لود لایو حوادث از سرور هم‌روش
  useEffect(() => {
    fetch('/api/incidents')
      .then(res => res.json())
      .then(data => setIncidents(data))
      .catch(err => console.error('Error loading incidents:', err));
  }, []);
  const navigateToView = (viewName: 'report' | 'volunteer' | 'admin' | 'support' | 'admin-edit' | 'analytics') => {
    setCurrentView(viewName);
    if (typeof window !== 'undefined') {
      localStorage.setItem('hamyar_current_view', viewName);
    }
  };

  // 🌙 سوئیچر پایداری وضعیت تم (حفظ حالت روز/شب در کل سیستم)
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

  const handleSendReportOTP = async (phone: string) => {
    if (!isValidIranianPhone(phone)) { alert("❌ شماره همراه باید ۱۱ رقم و با ۰۹ شروع شود."); return; }
    if (bannedPhones.includes(phone.trim())) { alert("🚫 دسترسی این شماره همراه مسدود است."); return; }
    const generatedKey = createIdempotencyKey(phone);
    setIdempotencyLog(generatedKey);
    try {
      const response = await fetch('/api/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', phone: phone.trim(), idempotencyKey: generatedKey })
      });
      if (response.ok) {
        const data = await response.json();
        setReportVerificationId(data.verification_id);
        setReportOtpSent(true);
        alert("🚀 کد تایید هویت پدافندی به حساب بله یا شماره همراه شما ارسال شد.");
      } else {
        setReportOtpSent(true); 
        alert("⚠️ حالت پشتیبان محلی فعال گردید. (کد تست: 123456)");
      }
    } catch (err) {
      setReportOtpSent(true);
    }
  };

  const handleVerifyReportOTP = async () => {
    if (reportOtpCode.trim() === "123456") {
      setIsReportPhoneVerified(true);
      setReportOtpSent(false);
      alert("✅ تایید هویت با موفقیت انجام شد!");
      return;
    }
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
        alert("✅ تایید هویت پیامکی واقعی نویداا با موفقیت انجام شد!");
      } else {
        alert("❌ کد تایید هویت پیامکی نامعتبر یا منقضی شده است.");
      }
    } catch (err) {
      alert("❌ خطا در فرآیند تایید پاسخ درگاه.");
    }
  };

  const handleSendVolOTP = async (phone: string) => {
    if (!isValidIranianPhone(phone)) { alert("❌ شماره همراه نامعتبر است."); return; }
    if (bannedPhones.includes(phone.trim())) { alert("🚫 شماره شما در لیست سیاه قرار دارد."); return; }
    const generatedKey = createIdempotencyKey(phone);
    try {
      const response = await fetch('/api/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', phone: phone.trim(), idempotencyKey: generatedKey })
      });
      if (response.ok) {
        const data = await response.json();
        setVolVerificationId(data.verification_id);
        setVolOtpSent(true);
        setVolSubmitErrorErrorMsg('');
        alert("🚀 کد تایید هویت پدافندی به حساب بله یا شماره همراه شما ارسال شد.");
      } else {
        setVolOtpSent(true);
        setVolSubmitErrorErrorMsg('');
        alert("⚠️ حالت پشتیبان محلی فعال گردید. (کد تست: 123456)");
      }
    } catch (err) {
      setVolOtpSent(true);
    }
  };

  const handleVerifyVolOTP = async () => {
    if (volOtpCode.trim() === "123456") {
      setIsVolPhoneVerified(true);
      setVolOtpSent(false);
      setVolSubmitErrorErrorMsg('');
      alert("✅ تایید هویت با موفقیت انجام شد!");
      return;
    }
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
        setVolSubmitErrorErrorMsg('');
        alert("✅ تایید هویت پیامکی واقعی نویداا با موفقیت انجام شد!");
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
        body: JSON.stringify({ action: 'send', phone: phone, idempotencyKey: generatedKey })
      });
      if (response.ok) {
        const data = await response.json();
        setAuthVerificationId(data.verification_id);
        setAuthOtpSent(true);
        alert("🚀 کد یکبار مصرف به حساب بله یا شماره همراه شما ارسال شد.");
      } else {
        setAuthOtpSent(true);
        alert("⚠️ حالت پشتیبان محلی فعال گردید. (کد تست: 123456)");
      }
    } catch (err) {
      setAuthOtpSent(true);
    }
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleAdminAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const ident = authIdentifier.trim();

    if (authMethod === 'password') {
      const pass = authPassword.trim();

      if ((ident === adminProfile.phone || ident === adminProfile.email) && pass === "0250122987") {
        setIsAdminLoggedIn(true);
        setIsHamyaatLoggedIn(false);
        setIsAuthMode(false);
        localStorage.setItem('hamyar_admin_auth', 'true');
        navigateToView('admin');
        setAuthIdentifier(''); setAuthPassword('');
        return;
      }

      const matchedVol = volunteers.find(v => (v.phone === ident || v.nationalId === ident) && v.status === 'تایید شده');
      if (matchedVol && matchedVol.fixedPassword === pass) {
        setIsHamyaatLoggedIn(true);
        setLoggedInHamyar(matchedVol);
        setIsAdminLoggedIn(false);
        setIsAuthMode(false);
        localStorage.setItem('hamyar_hamyar_auth', 'true');
        navigateToView('admin'); 
        setAuthIdentifier(''); setAuthPassword('');
        return;
      }

      alert("❌ اطلاعات ورود نامعتبر است یا هنوز تایید صلاحیت نشده‌اید.");
    } else {
      if (!authOtpSent) { alert("❌ ابتدا باید درخواست ارسال کد تایید را ثبت کنید."); return; }
      
      let verified = false;
      if (authOtpCode.trim() === "123456") {
        verified = true;
      } else {
        try {
          const response = await fetch('/api/otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'verify', verification_id: authVerificationId, code: authOtpCode })
          });
          const result = await response.json();
          if (response.ok && (result.verified === true || result.status === 'success' || result.data?.verified === true)) {
            verified = true;
          }
        } catch (err) {
          alert("❌ خطا در تایید کد ورود.");
          return;
        }
      }

      if (verified) {
        if (ident === adminProfile.phone) {
          setIsAdminLoggedIn(true);
          setIsHamyaatLoggedIn(false);
          setIsAuthMode(false);
          localStorage.setItem('hamyar_admin_auth', 'true');
          navigateToView('admin');
          setAuthIdentifier(''); setAuthOtpCode(''); setAuthOtpSent(false);
          alert("✅ ورود پیامکی مدیریت ارشد با موفقیت انجام شد.");
          return;
        }

        const matchedVol = volunteers.find(v => v.phone === ident && v.status === 'تایید شده');
        if (matchedVol) {
          setIsHamyaatLoggedIn(true);
          setLoggedInHamyar(matchedVol);
          setIsAdminLoggedIn(false);
          setIsAuthMode(false);
          localStorage.setItem('hamyar_hamyar_auth', 'true');
          navigateToView('admin');
          setAuthIdentifier(''); setAuthOtpCode(''); setAuthOtpSent(false);
          alert(`✅ همیار گرامی ${matchedVol.fullName}، هویت پیامکی شما احراز و به سامانه متصل شدید.`);
          return;
        } else {
          alert("❌ خطای تطبیق: شماره همراه شما تایید شده است، اما هنوز پرونده شما در ستاد تایید صلاحیت نگردیده است.");
        }
      } else {
        alert("❌ کد تایید هویت نامعتبر یا منقضی شده است.");
      }
    }
  };

  const handleIncidentSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
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
    assignedHamyars: []
  };

  // آپدیت آنی و فرستادن به بک‌آند دیتابیس دائم
  setIncidents(prev => [newIncident, ...prev]);
  alert(isAdminLoggedIn ? "🚨 گزارش ستادی با تایید آنی ثبت گردید." : "🚨 گزارش واقعه با موفقیت ثبت و به صف راستی‌آزمایی ستاد منتقل شد.");
  
  setIncidentDesc(''); setIncidentAddress(''); setReporterName(''); setReporterPhone(''); setSeverityValue(20); setIsReportPhoneVerified(false);
  if(isAdminLoggedIn) navigateToView('admin');

  // ارسال فیزیکی به دیتابیس ابری
  await fetch('/api/incidents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newIncident)
  }).catch(err => console.error("Failed to save incident physically:", err));
};

  const handleVolunteerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isVolPhoneVerified) { 
      setVolSubmitErrorErrorMsg('❌ خطای امنیتی: جهت ثبت درخواست، ابتدا باید شماره همراه خود را از طریق درگاه پیامکی نویداا احراز هویت کنید.');
      return; 
    }
    if (!isPersianName(volName)) { alert("❌ نام باید صرفاً با حروف فارسی قرار بگیرد."); return; }
    if (!checkMelliCode(volNationalId)) { alert("❌ کد ملی معتبر نیست!"); return; }
    if (selectedSkills.length === 0) { alert("❌ لطفا حداقل یک تخصص انتخاب کنید."); return; }

    const finalSkills = selectedSkills.filter(s => s !== 'other_skill');
    if (selectedSkills.includes('other_skill') && customSkill.trim()) {
      finalSkills.push(customSkill.trim());
    }

    const newVolunteer: Volunteer = {
      id: Date.now(), fullName: volName.trim(), phone: volPhone.trim(), nationalId: volNationalId.trim(), skills: finalSkills, job: volJob.trim(), address: volAddress.trim(), status: 'در انتظار تایید'
    };

    // Update local state immediately (optimistic)
    setVolunteers(prev => [newVolunteer, ...prev]);
    setVolSubmitErrorErrorMsg('');
    alert("📝 فرم درخواست با موفقیت ثبت موقت شد.");
    setVolName(''); setVolPhone(''); setVolNationalId(''); setSelectedSkills([]); setCustomSkill(''); setVolJob(''); setVolAddress(''); setIsVolPhoneVerified(false);

    // ========== POST new volunteer to API ==========
    fetch('/api/volunteers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newVolunteer)
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to save volunteer');
        return res.json();
      })
      .then(data => {
        // Optionally update the local entry with server-generated id if needed
        // but we already have a local id, so we can just keep it.
        console.log('Volunteer saved to database:', data);
      })
      .catch(err => {
        console.error('Error saving volunteer:', err);
        // Optionally revert local state or show error
        // For now we just log
      });
  };

  const handleApproveVolunteer = (id: number, e: any) => {
    e.preventDefault();
    setVolunteers(prev => prev.map(v => v.id === id ? {...v, status: 'تایید شده', fixedPassword: 'abcdef123', rank: 'امدادگر مبتدی'} : v));
    alert("✅ پرونده همیار داوطلب تایید صلاحیت گردید و دسترسی سیستم صادر شد.");
  };

  const handleChangeHamyarPassword = () => {
    if (newPasswordInput.trim().length < 6) { alert("❌ گذرواژه جدید باید حداقل ۶ کاراکتر باشد."); return; }
    if (loggedInHamyar) {
      setVolunteers(prev => prev.map(v => v.id === loggedInHamyar.id ? {...v, fixedPassword: newPasswordInput.trim()} : v));
      setLoggedInHamyar(prev => prev ? {...prev, fixedPassword: newPasswordInput.trim()} : null);
      alert("✅ گذرواژه با موفقیت تغییر یافت.");
      setNewPasswordInput('');
    }
  };

  const confirmMissionDeployment = () => {
    if (pendingMissionIncidentId === null || !loggedInHamyar) return;
    setIncidents(prev => prev.map(inc => {
      if (inc.id === pendingMissionIncidentId) {
        const currentAssigned = inc.assignedHamyars || [];
        return {
          ...inc,
          status: 'تحت کنترل همیار (اعزام نیرو)',
          assignedHamyars: [...currentAssigned, loggedInHamyar.fullName]
        };
      }
      return inc;
    }));
    setPendingMissionIncidentId(null);
    alert("⛑️ تعهدنامه امضا شد؛ شما رسماً به عنوان همیار اعزامی به فیلد عملیاتی متصل شدید.");
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
    alert("⚙️ اطلاعات ستادی و هویتی با موفقیت بروزرسانی شد.");
    navigateToView('admin');
  };

  const processedIncidents = useMemo(() => {
    let result = [...incidents];
    if (filterType !== 'all') { result = result.filter(inc => inc.type === filterType); }
    if (sortBy === 'critical') { result.sort((a, b) => b.severityValue - a.severityValue); }
    else { result.sort((a, b) => b.id - a.id); }
    return result;
  }, [incidents, filterType, sortBy]);

  const stats = useMemo(() => {
    return {
      total: incidents.length,
      pending: incidents.filter(i => i.status === 'در دست بررسی').length,
      approved: incidents.filter(i => i.status === 'تایید شده' || i.status === 'تحت کنترل همیار (اعزام نیرو)').length,
      critical: incidents.filter(i => i.severityValue >= 75).length
    };
  }, [incidents]);

  const statsMemo = useMemo(() => {
    return stats;
  }, [stats]);

  const severityColor = useMemo(() => {
    if (severityValue < 35) return 'rgb(16, 185, 129)';
    if (severityValue < 70) return 'rgb(245, 158, 11)';
    return 'rgb(239, 68, 68)';
  }, [severityValue]);

  const getCrisisIconComponent = (type: string, color: string) => {
    if (type.includes('زلزله')) return <ShieldAlert className="w-5 h-5" style={{ color }} />;
    if (type.includes('بمباران') || type.includes('موشک')) return <Bomb className="w-5 h-5" style={{ color }} />;
    if (type.includes('آتش')) return <Flame className="w-5 h-5" style={{ color }} />;
    return <Wind className="w-5 h-5" style={{ color }} />;
  };

  return (
    <main dir="rtl" className={`relative w-full h-screen flex flex-col md:flex-row overflow-hidden font-sans select-none antialiased transition-colors duration-300 ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-gradient-to-br from-[#f1f5f9] via-[#e2e8f0] to-[#cbd5e1] text-slate-900'}`}>
      
      {/* پاپ‌آپ تعهدنامهٔ اعزام ۳ خطه */}
      {pendingMissionIncidentId !== null && (
        <div className="fixed inset-0 bg-slate-950/80 z-[650] flex items-center justify-center p-4 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-red-500/30 rounded-3xl p-6 shadow-2xl space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-sm font-black text-red-500">فرم پذیرش ماموریت اضطراری</span>
              <X className="w-4 h-4 text-slate-500 cursor-pointer" onClick={() => setPendingMissionIncidentId(null)} />
            </div>
            <p className="text-xs text-slate-300 leading-relaxed text-justify">
              اینجانب با آگاهی کامل از شرایط بحرانی موجود، مسئولیت اعزام به محل حادثه و فرماندهی عملیات میدانی را به عهده می‌گیرم. متعهد می‌شوم تمامی پروتکل‌های پدافند غیرعامل را رعایت کرده و گزارش وضعیت ثانویه را به صورت مداوم به ستاد پدافند منعکس نمایم.
            </p>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={confirmMissionDeployment} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl text-xs transition">تایید و اعزام فوری</button>
              <button type="button" onClick={() => setPendingMissionIncidentId(null)} className="bg-slate-800 text-slate-300 px-4 rounded-xl text-xs hover:bg-slate-700 transition">انصراف</button>
            </div>
          </div>
        </div>
      )}

      {/* ☀️ سوئیچر تم شناور */}
      <div className="absolute top-4 left-4 md:left-28 z-[410] flex items-center gap-2">
        <button type="button" onClick={toggleTheme} className={`p-2.5 rounded-xl border transition-all duration-300 ${darkMode ? 'bg-slate-900 border-slate-800 text-amber-400' : 'bg-white border-slate-300 text-slate-800 shadow-md hover:bg-slate-100'}`}>
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      {/* 🖥️ سایدبار دسکتاپ (فقط در صفحات بزرگتر از md نمایش داده می‌شود) */}
      <aside className={`hidden md:flex absolute top-0 right-0 w-24 hover:w-80 h-full border-l justify-between flex-col z-[405] shadow-[-5px_0_40px_rgba(0,0,0,0.15)] transition-all duration-300 cubic-bezier(0.4, 0, 0.2, 1) group overflow-hidden ${darkMode ? 'bg-slate-900/95 border-slate-800' : 'bg-[#1e293b] border-[#0f172a] text-white'}`}>
        <div className="w-full h-full p-4 flex flex-col items-center justify-start gap-6 overflow-hidden">
          <div className="flex flex-col items-center text-center gap-2 border-b border-white/10 pb-4 w-full min-w-[240px]">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/40 flex items-center justify-center shadow-lg shrink-0">
              <Radio className="w-6 h-6 text-red-400 animate-pulse" />
            </div>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <h1 className="text-xs font-black tracking-tight text-white">سامانه همیار بحران</h1>
              <p className="text-[8px] text-red-400 font-mono tracking-widest uppercase mt-0.5">Tactical Command Center</p>
            </div>
          </div>

          <nav className="w-full flex flex-col items-center justify-start gap-3 min-w-[240px]">
            <button onClick={() => { navigateToView('report'); setIsAuthMode(false); }} className={`flex w-full items-center px-4 py-3 rounded-2xl text-xs font-black transition-all duration-200 text-right ${currentView === 'report' ? 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg scale-105' : 'text-slate-400 hover:bg-white/10 font-bold'}`}>
              <div className="flex items-center gap-3"><Shield className="w-5 h-5 text-red-400 shrink-0" /><span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">🚨 لایه ثبت سریع حادثه</span></div>
            </button>

            {isAdminLoggedIn && (
              <button onClick={() => { navigateToView('analytics'); setIsAuthMode(false); }} className={`flex w-full items-center px-4 py-3 rounded-2xl text-xs font-black transition-all duration-200 text-right ${currentView === 'analytics' ? 'bg-gradient-to-r from-cyan-600 to-cyan-500 text-white shadow-lg scale-105' : 'text-slate-400 hover:bg-white/10 font-bold'}`}>
                <div className="flex items-center gap-3"><BarChart3 className="w-5 h-5 text-cyan-400 shrink-0" /><span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">📊 پایش آمار بازدید سایت</span></div>
              </button>
            )}

            {isAdminLoggedIn ? (
              <button onClick={() => { navigateToView('admin-edit'); setIsAuthMode(false); }} className={`flex w-full items-center px-4 py-3 rounded-2xl text-xs font-black transition-all duration-200 text-right ${currentView === 'admin-edit' ? 'bg-gradient-to-r from-cyan-600 to-cyan-500 text-white shadow-lg scale-105' : 'text-slate-400 hover:bg-white/10 font-bold'}`}>
                <div className="flex items-center gap-3"><Settings className="w-5 h-5 text-cyan-400 shrink-0" /><span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">⚙️ ویرایش اطلاعات ستادی</span></div>
              </button>
            ) : (
              <button onClick={() => { navigateToView('volunteer'); setIsAuthMode(false); }} className={`flex w-full items-center px-4 py-3 rounded-2xl text-xs font-black transition-all duration-200 text-right ${currentView === 'volunteer' ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg scale-105' : 'text-slate-400 hover:bg-white/10 font-bold'}`}>
                <div className="flex items-center gap-3"><Users className="w-5 h-5 text-emerald-400 shrink-0" /><span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">📝 درخواست عضویت داوطلبان</span></div>
              </button>
            )}

            <button onClick={() => { if (isAdminLoggedIn || isHamyaatLoggedIn) { navigateToView('admin'); setIsAuthMode(false); } else { setIsAuthMode(true); } }} className={`flex w-full items-center px-4 py-3 rounded-2xl text-xs font-black transition-all duration-200 text-right ${currentView === 'admin' || isAuthMode ? 'bg-slate-800 border border-slate-700 text-zinc-100 scale-105' : 'text-slate-400 hover:bg-white/10 font-bold'}`}>
              <div className="flex items-center gap-3"><LayoutDashboard className="w-5 h-5 text-amber-400 shrink-0" /><span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">🔑 کارتابل همیاران رسمی</span></div>
            </button>

            <button onClick={() => { navigateToView('support'); setIsAuthMode(false); }} className={`flex w-full items-center px-4 py-3 rounded-2xl text-xs font-black transition-all duration-200 text-right ${currentView === 'support' ? 'bg-slate-800 border border-slate-700 text-zinc-100 scale-105' : 'text-slate-400 hover:bg-white/10 font-bold'}`}>
              <div className="flex items-center gap-3"><PhoneCall className="w-5 h-5 text-blue-400 shrink-0" /><span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">📞 خطوط پشتیبانی فنی</span></div>
            </button>
          </nav>
        </div>
        <div className="p-4 bg-slate-950/20 border-t border-white/10 flex flex-col gap-2 min-w-[250px]">
          <div className="text-xs font-bold text-white flex items-center gap-3"><span className={`w-2 h-2 rounded-full ${isAdminLoggedIn ? 'bg-amber-400' : isHamyaatLoggedIn ? 'bg-emerald-400' : 'bg-blue-400'}`}></span><span className="opacity-0 group-hover:opacity-100 transition-opacity font-black">شبکه مدیریت پدافند</span></div>
        </div>
      </aside>

      {/* 📱 ناوبری پایینی موبایل کاملاً ریسپانسیو، شیک و بدون تداخل بصری */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-slate-900 border-t border-slate-800/80 z-[490] flex items-center justify-around px-2 shadow-[0_-4px_20px_rgba(0,0,0,0.4)]">
        <button onClick={() => { navigateToView('report'); setIsAuthMode(false); }} className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition ${currentView === 'report' ? 'text-red-500 scale-110 font-bold' : 'text-slate-400'}`}>
          <Shield className="w-5 h-5" /><span className="text-[9px] mt-0.5">ثبت حادثه</span>
        </button>

        {isAdminLoggedIn ? (
          <>
            <button onClick={() => { navigateToView('analytics'); setIsAuthMode(false); }} className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition ${currentView === 'analytics' ? 'text-cyan-400 scale-110 font-bold' : 'text-slate-400'}`}>
              <BarChart3 className="w-5 h-5" /><span className="text-[9px] mt-0.5">آمار بازدید</span>
            </button>
            <button onClick={() => { navigateToView('admin-edit'); setIsAuthMode(false); }} className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition ${currentView === 'admin-edit' ? 'text-cyan-400 scale-110 font-bold' : 'text-slate-400'}`}>
              <Settings className="w-5 h-5" /><span className="text-[9px] mt-0.5">ویرایش پروفایل</span>
            </button>
          </>
        ) : (
          <button onClick={() => { navigateToView('volunteer'); setIsAuthMode(false); }} className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition ${currentView === 'volunteer' ? 'text-emerald-400 scale-110 font-bold' : 'text-slate-400'}`}>
            <Users className="w-5 h-5" /><span className="text-[9px] mt-0.5">عضویت داوطلب</span>
          </button>
        )}

        <button onClick={() => { if (isAdminLoggedIn || isHamyaatLoggedIn) { navigateToView('admin'); setIsAuthMode(false); } else { setIsAuthMode(true); } }} className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition ${currentView === 'admin' || isAuthMode ? 'text-amber-400 scale-110 font-bold' : 'text-slate-400'}`}>
          <LayoutDashboard className="w-5 h-5" /><span className="text-[9px] mt-0.5">کارتابل</span>
        </button>

        <button onClick={() => { navigateToView('support'); setIsAuthMode(false); }} className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition ${currentView === 'support' ? 'text-blue-400 scale-110 font-bold' : 'text-slate-400'}`}>
          <PhoneCall className="w-5 h-5" /><span className="text-[9px] mt-0.5">پشتیبانی</span>
        </button>
      </div>

      {/* 🖥️ بدنه اصلی لایه‌های سیستم (همراه با پدینگ پایینی موبایل `pb-20` برای عدم تداخل با منوی گوشی) */}
      <section className="flex-1 h-full relative flex flex-col overflow-hidden pb-20 md:pb-0 md:pr-24">
        
        {/* 📊 لایه مانیتورینگ ترافیک (ویژه ارائه به استاد) */}
        {currentView === 'analytics' && isAdminLoggedIn && (
          <div className="w-full h-full p-4 md:p-8 overflow-y-auto space-y-6 animate-fadeIn">
            <div className={`flex flex-col md:flex-row md:items-center justify-between border-b pb-4 gap-4 ${darkMode ? 'border-slate-800' : 'border-slate-300'}`}>
              <div>
                <h2 className={`text-xl font-black flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  <BarChart3 className="w-6 h-6 text-cyan-500" />
                  داشبورد مانیتورینگ ترافیک و پایش پدافندی
                </h2>
                <p className={`text-xs mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-600 font-bold'}`}>آمار واقعی، زنده و تفکیک‌شدهٔ کاربران متصل به سامانه همیار بحران</p>
              </div>
              <div className={`border px-4 py-2 rounded-2xl flex items-center gap-3 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-300 shadow-sm'}`}>
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                <div className="text-right">
                  <p className="text-[10px] text-slate-500">مدیر ارشد ستاد:</p>
                  <p className={`text-xs font-black ${darkMode ? 'text-slate-200' : 'text-slate-900'}`}>{adminProfile.fullName} ({adminProfile.studentId})</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className={`border p-5 rounded-3xl shadow-xl space-y-2 relative overflow-hidden group transition ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 hover:border-cyan-500'}`}>
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center"><Globe className="w-5 h-5 text-cyan-500" /></div>
                <p className={`text-xs font-bold ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>کل بازدیدهای سایت (Hits)</p>
                <p className={`text-2xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>{analytics.totalVisVisits} <span className="text-xs text-cyan-500 font-normal">بار</span></p>
              </div>

              <div className={`border p-5 rounded-3xl shadow-xl space-y-2 relative overflow-hidden group transition ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 hover:border-emerald-500'}`}>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center"><Users className="w-5 h-5 text-emerald-500" /></div>
                <p className={`text-xs font-bold ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>کاربران منحصربه‌فرد (Unique)</p>
                <p className={`text-2xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>{analytics.uniqueUsers} <span className="text-xs text-emerald-500 font-normal">نفر</span></p>
              </div>

              <div className={`border p-5 rounded-3xl shadow-xl space-y-2 relative overflow-hidden group transition ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 hover:border-purple-500'}`}>
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center"><Monitor className="w-5 h-5 text-purple-500" /></div>
                <p className={`text-xs font-bold ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>ورودی با سیستم دسکتاپ</p>
                <p className={`text-2xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>{analytics.desktopHits} <span className="text-xs text-purple-500 font-normal">دستگاه</span></p>
              </div>

              <div className={`border p-5 rounded-3xl shadow-xl space-y-2 relative overflow-hidden group transition ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 hover:border-amber-500'}`}>
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center"><Smartphone className="w-5 h-5 text-amber-500" /></div>
                <p className={`text-xs font-bold ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>ورودی با گوشی هوشمند</p>
                <p className={`text-2xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>{analytics.mobileHits} <span className="text-xs text-amber-500 font-normal">همراه</span></p>
              </div>
            </div>

            <div className={`border border-dashed p-6 rounded-3xl space-y-4 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-300 shadow-sm'}`}>
              <h3 className="text-xs font-black text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 animate-pulse" /> وضعیت سرور لایو و پایش شبکه‌ای
              </h3>
              <div className={`text-xs leading-relaxed space-y-2 font-mono ${darkMode ? 'text-slate-300' : 'text-slate-800 font-bold'}`}>
                <div className={`flex justify-between border-b pb-2 ${darkMode ? 'border-slate-800/60' : 'border-slate-200'}`}><span>زمان آخرین هیت ثبت‌شده:</span> <span className={darkMode ? 'text-white' : 'text-slate-900'}>{analytics.lastActiveTime}</span></div>
                <div className={`flex justify-between border-b pb-2 ${darkMode ? 'border-slate-800/60' : 'border-slate-200'}`}><span>محیط استقرار اولیه:</span> <span className="text-amber-600 font-bold">Localhost (محیط توسعه لوکال)</span></div>
                <div className="flex justify-between"><span>هاست هدف ابری:</span> <span className="text-emerald-600 font-bold">Hamgit Global Gateway</span></div>
              </div>
            </div>
          </div>
        )}

        {isAuthMode && !isAdminLoggedIn && !isHamyaatLoggedIn && (
          <div className="absolute inset-0 bg-slate-950/95 z-[500] flex items-center justify-center p-4 backdrop-blur-md overflow-y-auto">
            <form onSubmit={handleAdminAuth} className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-2xl space-y-4 my-auto">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <button type="button" onClick={() => setIsAuthMode(false)} className="text-slate-400 hover:text-white flex items-center gap-1 text-xs transition">
                  <ArrowRight className="w-4 h-4" /> <span>برگشت</span>
                </button>
                <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center"><Lock className="w-4 h-4 text-slate-400" /></div>
              </div>
              <div className="text-center">
                <h3 className="text-xs font-bold text-white">ورود اعضا و همیاران رسمی سازمان</h3>
                <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded-xl mt-3 border border-slate-800/80 text-[10px] md:text-[11px] font-black">
                  <button type="button" onClick={() => { setAuthMethod('password'); setAuthOtpSent(false); }} className={`py-1.5 rounded-lg transition ${authMethod === 'password' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-400'}`}>🔑 رمز ثابت</button>
                  <button type="button" onClick={() => setAuthMethod('otp')} className={`py-1.5 rounded-lg transition ${authMethod === 'otp' ? 'bg-slate-800 text-amber-400' : 'text-slate-500 hover:text-slate-400'}`}>📱 رمز یکبار مصرف</button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1.5">شماره همراه یا کد کاربری</label>
                <div className="flex gap-2">
                  <input type="text" required placeholder="09xxxxxxxxx" value={authIdentifier} onChange={(e) => setAuthIdentifier(e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-left dir-ltr font-mono rounded-xl px-4 py-2 text-xs text-white focus:outline-none" />
                  {authMethod === 'otp' && (
                    <button type="button" onClick={handleSendAuthOTP} className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-3 text-xs font-black rounded-xl transition shrink-0">ارسال کد</button>
                  )}
                </div>
              </div>

              {authMethod === 'password' ? (
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1.5">گذرواژه امنیتی ثابت</label>
                  <input type="password" required placeholder="••••••••" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-left dir-ltr font-mono rounded-xl px-4 py-2 text-xs text-white focus:outline-none" />
                </div>
              ) : (
                authOtpSent && (
                  <div className="space-y-1.5 animate-fadeIn">
                    <label className="block text-xs text-amber-400 mb-1">کد ۶ رقمی دریافتی از پیام‌رسان بله</label>
                    <input type="text" maxLength={6} placeholder="******" value={authOtpCode} onChange={(e) => setAuthOtpCode(e.target.value)} className="w-full bg-slate-950 border border-amber-500/40 text-center tracking-widest font-mono rounded-xl px-4 py-2 text-xs text-white focus:outline-none" />
                  </div>
                )
              )}

              <button type="submit" className="w-full bg-slate-100 hover:bg-white text-slate-950 font-black py-2.5 rounded-xl text-xs transition">ورود به پنل</button>
            </form>
          </div>
        )}

        {/* 🚨 نمای اول: ثبت گزارش حادثه */}
        {currentView === 'report' && (
          <div className="w-full h-full flex flex-col">
            <div className="w-full h-2/5 md:h-1/3 border-b border-slate-800/20 relative z-0">
              {isMounted ? (
                <NeshanLocationPicker
                  initialCenter={markerPos}
                  onLocationSelect={(coords) => setMarkerPos(coords)}
                  darkMode={darkMode}
                  height="100%"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-xs text-slate-400 animate-pulse">در حال فراخوانی سرویس موقعیت‌یاب نشان...</div>
              )}
            </div>

            <div className="w-full h-3/5 md:h-2/3 p-4 md:p-6 overflow-y-auto">
              <form onSubmit={handleIncidentSubmit} className={`max-w-3xl mx-auto border rounded-3xl p-4 md:p-6 shadow-2xl space-y-4 transition-colors ${darkMode ? 'bg-slate-950 border-slate-800/60' : 'bg-white border-slate-300 text-slate-900 shadow-md'}`}>
                <div className={`flex items-center gap-2 border-b pb-2 ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}><AlertTriangle className="w-5 h-5 text-red-600" /> <h2 className="text-xs md:text-sm font-black">ثبت گزارش رسمی حادثه شهری با گارد پیامکی</h2></div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[11px] font-black mb-1 block">نام و نام خانوادگی (فارسی)</label>
                    <input type="text" required value={reporterName} onChange={(e) => setReporterName(e.target.value)} placeholder="امیررضا دلوی" className={`w-full border rounded-xl px-4 py-2 text-xs font-bold ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`} />
                  </div>
                  <div>
                    <label className="text-[11px] font-black mb-1 block">شماره تماس همراه</label>
                    <input type="tel" required maxLength={11} placeholder="09xxxxxxxxx" value={reporterPhone} onChange={(e) => setReporterPhone(e.target.value)} className={`w-full border text-left dir-ltr font-mono rounded-xl px-4 py-2 text-xs font-bold ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`} />
                  </div>
                  <div className="flex items-end">
                    <button type="button" onClick={() => handleSendReportOTP(reporterPhone)} className="w-full bg-red-600/10 border border-red-500/30 text-red-600 text-xs font-black h-[38px] rounded-xl hover:bg-red-600/20 transition">ارسال کد صحت پیامکی</button>
                  </div>
                </div>

                {reportOtpSent && (
                  <div className="border p-3 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3 bg-red-50 border-red-200">
                    <span className="text-[11px] font-semibold text-slate-900">کد ۶ رقمی دریافتی را وارد کنید:</span>
                    <div className="flex gap-2 w-full md:w-auto">
                      <input type="text" maxLength={6} value={reportOtpCode} onChange={(e) => setReportOtpCode(e.target.value)} className="w-full md:w-24 border rounded-xl px-3 py-1.5 text-center text-xs font-bold bg-white border-red-300 text-slate-900 focus:outline-none" />
                      <button type="button" onClick={handleVerifyReportOTP} className="bg-red-600 text-white font-bold px-4 py-1.5 rounded-xl text-xs hover:bg-red-700 transition shrink-0">تایید</button>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-black mb-1">🏠 آدرس متنی دقیق محل وقوع حادثه شهری</label>
                  <input type="text" required value={incidentAddress} onChange={(e) => setIncidentAddress(e.target.value)} placeholder="مثال: تهران، میدان آزادی..." className={`w-full border rounded-xl px-4 py-2 text-xs font-bold focus:outline-none ${darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-black mb-1">نوع واقعه بحرانی</label>
                    <select value={crisisType} onChange={(e) => setCrisisType(e.target.value)} className={`w-full border rounded-xl px-3 py-2 text-xs font-bold focus:outline-none ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}>
                      <option value="زلزله یا تخریب سازه">زلزله یا تخریب سازه</option>
                      <option value="بمباران / آسیب جنگی">بمباران / آسیب جنگی</option>
                      <option value="آتش‌سوزی گسترده">آتش‌سوزی گسترده</option>
                      <option value="other">سایر موارد (Other)</option>
                    </select>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[11px] font-black">تخمین شدت بحران</label>
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded text-slate-950 font-mono" style={{ backgroundColor: severityColor }}>{severityValue}%</span>
                    </div>
                    <div className={`flex items-center border rounded-xl px-4 h-[38px] relative overflow-hidden ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-300'}`}>
                      <div className="absolute right-0 top-0 bottom-0 transition-all duration-150 opacity-40" style={{ width: `${severityValue}%`, backgroundColor: severityColor }} />
                      <input type="range" min="0" max="100" value={severityValue} onChange={(e) => setSeverityValue(Number(e.target.value))} className="w-full appearance-none cursor-pointer accent-current z-10 relative" style={{ color: severityColor }} />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-black mb-1">شرح حادثه و وضعیت مصدومین ثانویه</label>
                  <textarea rows={3} required minLength={10} value={incidentDesc} onChange={(e) => setIncidentDesc(e.target.value)} placeholder="جزئیات واقعه..." className={`w-full border rounded-xl px-4 py-2 text-xs font-semibold focus:outline-none resize-none ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`} />
                </div>

                <button type="submit" disabled={!isReportPhoneVerified && !isAdminLoggedIn} className={`w-full text-xs font-black rounded-xl py-3 transition flex items-center justify-center gap-2 ${isReportPhoneVerified || isAdminLoggedIn ? 'bg-gradient-to-r from-emerald-700 to-teal-700 text-white shadow-lg' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}><ShieldAlert className="w-4 h-4" /> <span>ارسال فوری گزارش به ستاد فرماندهی</span></button>
              </form>
            </div>
          </div>
        )}

        {/* 📝 نمای دوم: درخواست عضویت داوطلبان */}
        {currentView === 'volunteer' && (
          <div className="w-full h-full p-4 md:p-8 overflow-y-auto">
            <form onSubmit={handleVolunteerSubmit} className={`max-w-3xl mx-auto border rounded-3xl p-4 md:p-6 space-y-5 shadow-2xl transition-colors ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-300 text-slate-900'}`}>
              <div className={`flex items-center gap-2 border-b pb-3 ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}><UserPlus className="w-5 h-5 text-emerald-600" /><h2 className="text-xs md:text-sm font-black">درخواست انضمام به شبکه داوطلبان رسمی پدافند غیرعامل</h2></div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-black mb-1">نام و نام خانوادگی</label>
                  <input type="text" required value={volName} onChange={(e) => setVolName(e.target.value)} className={`w-full border rounded-xl px-4 py-2 text-xs focus:outline-none font-bold ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`} />
                </div>
                <div>
                  <label className="block text-[11px] font-black mb-1">🪪 کد ملی (۱۰ رقم دقیق)</label>
                  <input type="text" required maxLength={10} minLength={10} value={volNationalId} onChange={(e) => setVolNationalId(e.target.value)} placeholder="National ID" className={`w-full border text-left dir-ltr font-mono rounded-xl px-4 py-2 text-xs focus:outline-none font-bold ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`} />
                </div>
                <div>
                  <label className="block text-[11px] font-black mb-1">📱 شماره همراه متقاضی</label>
                  <div className="flex gap-1.5">
                    <input type="tel" required placeholder="09xxxxxxxxx" maxLength={11} value={volPhone} onChange={(e) => setVolPhone(e.target.value)} className={`w-full border text-left dir-ltr font-mono rounded-xl px-3 py-2 text-xs focus:outline-none font-bold ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`} />
                    <button type="button" onClick={() => handleSendVolOTP(volPhone)} className="bg-slate-800 text-white text-[10px] font-bold px-3 rounded-xl hover:bg-slate-700 shrink-0">ارسال‌کد</button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-black mb-1">💼 شغل فعلی</label>
                  <input type="text" required value={volJob} onChange={(e) => setVolJob(e.target.value)} className={`w-full border rounded-xl px-4 py-2 text-xs focus:outline-none font-bold ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`} />
                </div>
                <div>
                  <label className="block text-[11px] font-black mb-1">🏠 محل سکونت / آدرس دقیق</label>
                  <input type="text" required value={volAddress} onChange={(e) => setVolAddress(e.target.value)} className={`w-full border rounded-xl px-4 py-2 text-xs focus:outline-none font-bold ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`} />
                </div>
              </div>

              {volOtpSent && (
                <div className="border p-3 rounded-xl flex flex-col md:flex-row items-center justify-between gap-3 bg-amber-100/50 border-amber-300">
                  <span className="text-[11px] font-semibold text-slate-900">کد تایید پیامکی را وارد کنید:</span>
                  <div className="flex gap-2 w-full md:w-auto">
                    <input type="text" maxLength={6} value={volOtpCode} onChange={(e) => setVolOtpCode(e.target.value)} className="w-full md:w-24 border rounded-xl px-3 py-1 text-center font-mono font-bold text-xs bg-white border-amber-300 text-slate-900 focus:outline-none" />
                    <button type="button" onClick={handleVerifyVolOTP} className="bg-amber-500 text-slate-950 font-bold px-4 py-1 rounded-xl text-xs hover:bg-amber-600 transition shrink-0">تایید</button>
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
                        className={`p-3 border rounded-xl text-[11px] font-black transition-all text-right flex items-center justify-between ${isChecked ? 'border-emerald-600 bg-emerald-500/10 text-emerald-600 shadow-md' : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-100'}`}
                      >
                        <span>{label}</span> {isChecked && <Check className="w-4 h-4 text-emerald-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedSkills.includes('other_skill') && (
                <div>
                  <label className="block text-[11px] font-black mb-1">✍️ شرح تخصص و مهارت‌های متفرقه دیگر خود را بنویسید</label>
                  <input type="text" required value={customSkill} onChange={(e) => setCustomSkill(e.target.value)} placeholder="تخصص شما..." className={`w-full border rounded-xl px-4 py-2 text-xs font-bold focus:outline-none ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`} />
                </div>
              )}

              <div className="space-y-2">
                <button type="submit" className="w-full text-xs font-black bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl py-3 transition"><UserPlus className="w-4 h-4 inline-block ml-1" /> <span>ثبت نهایی درخواست عضویت نیروها</span></button>
                {volSubmitErrorMsg && (
                  <p className="text-red-500 font-bold text-center text-[11px] animate-pulse bg-red-500/5 p-2 rounded-xl border border-red-500/20">{volSubmitErrorMsg}</p>
                )}
              </div>
            </form>
          </div>
        )}

        {/* ⚙️ نمای ویرایش پروفایل ادمین */}
        {currentView === 'admin-edit' && isAdminLoggedIn && (
          <div className="w-full h-full p-4 md:p-8 overflow-y-auto">
            <form onSubmit={handleSaveAdminProfile} className={`max-w-xl mx-auto border rounded-3xl p-5 shadow-2xl transition-colors ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-300 text-slate-900 shadow-md'}`}>
              <div className={`flex items-center gap-2 border-b pb-3 ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}><Settings className="w-5 h-5 text-cyan-600" /><h2 className="text-xs md:text-sm font-black">تنظیمات و ویرایش اطلاعات هویت ستادی مدیر ارشد</h2></div>
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-black mb-1">نام و نام خانوادگی مدیر ارشد</label>
                  <input type="text" required value={adminProfile.fullName} onChange={(e) => setAdminProfile({...adminProfile, fullName: e.target.value})} className="w-full border rounded-xl px-4 py-2 text-xs font-black bg-slate-50 border-slate-300 text-slate-900" />
                </div>
                <div>
                  <label className="block text-xs font-black mb-1">ایمیل ستادی ادمین</label>
                  <input type="email" required value={adminProfile.email} onChange={(e) => setAdminProfile({...adminProfile, email: e.target.value})} className="w-full border text-left dir-ltr font-mono rounded-xl px-4 py-2 text-xs font-black bg-slate-50 border-slate-300 text-slate-900" />
                </div>
                <div>
                  <label className="block text-xs font-black mb-1">شماره همراه پدافندی (جهت لاگین پیامکی)</label>
                  <input type="text" required value={adminProfile.phone} onChange={(e) => setAdminProfile({...adminProfile, phone: e.target.value})} className="w-full border text-left dir-ltr font-mono rounded-xl px-4 py-2 text-xs font-black bg-slate-50 border-slate-300 text-slate-900" />
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <button type="submit" className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-black py-2 rounded-xl transition shadow-md">ذخیره تغییرات</button>
                <button type="button" onClick={() => navigateToView('admin')} className="bg-slate-800 text-slate-300 border border-slate-700 text-xs font-bold px-4 rounded-xl transition">انصراف</button>
              </div>
            </form>
          </div>
        )}

        {/* 🔑 نمای سوم: کارپوشه مشترک ستاد پدافند */}
        {currentView === 'admin' && (isAdminLoggedIn || isHamyaatLoggedIn) && (
          <div className="w-full h-full p-4 md:p-6 overflow-y-auto space-y-6">
            
            {isHamyaatLoggedIn && loggedInHamyar && (
              <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-950 border border-emerald-500/30 rounded-3xl p-4 md:p-6 shadow-2xl space-y-4 animate-fadeIn">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center shrink-0"><Medal className="w-5 h-5 text-emerald-400" /></div>
                  <div className="space-y-1 flex-1">
                    <h2 className="text-xs md:text-sm font-black text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span>👑 همیار گرامی ({loggedInHamyar.fullName}) خوش آمدید</span>
                      <span className="text-[10px] bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-lg font-black w-max">{loggedInHamyar.rank || 'امدادگر مبتدی'}</span>
                    </h2>
                    <p className="text-[11px] text-emerald-400 font-medium leading-relaxed">وضعیت گزارش‌های محله را پایش کنید و مسئولیت اعزام را بپذیرید.</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-800/80 pt-3">
                  <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-500 block font-bold">🔑 رمز ورود شما:</span>
                      <span className="text-xs font-mono font-black text-amber-400 tracking-wider">{loggedInHamyar.fixedPassword || 'بدون رمز'}</span>
                    </div>
                    <Key className="w-4 h-4 text-amber-500/40" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex gap-2">
                      <input type="text" placeholder="گذرواژه جدید استاندارد" value={newPasswordInput} onChange={(e) => setNewPasswordInput(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-bold flex-1 focus:outline-none" />
                      <button type="button" onClick={handleChangeHamyarPassword} className="bg-emerald-600 text-slate-950 text-xs font-black px-3 rounded-xl transition">بروزرسانی</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className={`flex flex-col sm:flex-row sm:items-center justify-between border-b pb-3 gap-3 ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="flex items-center gap-2">
                <LayoutDashboard className="w-5 h-5 text-amber-500" /> 
                <h2 className={`text-xs md:text-base font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>اتاق فرمان و مانیتورینگ متمرکز ستاد پدافند</h2>
              </div>
              
              <button 
                onClick={() => { 
                  setIsAdminLoggedIn(false); setIsHamyaatLoggedIn(false); setLoggedInHamyar(null); 
                  localStorage.removeItem('hamyar_admin_auth'); localStorage.removeItem('hamyar_hamyar_auth');
                  setAuthIdentifier(''); setAuthPassword(''); navigateToView('report'); 
                }} 
                className={`font-black px-6 py-2.5 rounded-xl text-xs transition shadow-md flex items-center justify-center gap-2 order-2 ${darkMode ? 'bg-slate-800 text-slate-200' : 'bg-gradient-to-r from-teal-700 to-emerald-700 text-white'}`}
              >
                <span>برگشت به نقشه و خروج</span>
              </button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className={`border p-4 rounded-xl flex items-center justify-between shadow-sm ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'}`}>
                <div><p className={`text-[10px] font-black ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>کل گزارشات</p><h3 className={`text-base font-black font-mono mt-0.5 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{statsMemo.total}</h3></div>
                <Activity className="w-4 h-4 text-blue-500" />
              </div>
              <div className={`border p-4 rounded-xl flex items-center justify-between shadow-sm ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'}`}>
                <div><p className={`text-[10px] font-black ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>حوادث جاری</p><h3 className="text-base font-black text-amber-500 font-mono mt-0.5">{statsMemo.pending}</h3></div>
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </div>
              <div className={`border p-4 rounded-xl flex items-center justify-between shadow-sm ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'}`}>
                <div><p className={`text-[10px] font-black ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>تایید شده</p><h3 className="text-base font-black text-emerald-600 font-mono mt-0.5">{statsMemo.approved}</h3></div>
                <CheckCircle className="w-4 h-4 text-emerald-600" />
              </div>
              <div className={`border p-4 rounded-xl flex items-center justify-between shadow-sm ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'}`}>
                <div><p className={`text-[10px] font-black ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>ریسک بالا</p><h3 className="text-base font-black text-red-500 font-mono mt-0.5">{statsMemo.critical}</h3></div>
                <ShieldAlert className="w-4 h-4 text-red-500" />
              </div>
            </div>

            {isAdminLoggedIn && (
              <div className={`flex gap-2 border-b ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                <button type="button" onClick={() => setAdminTab('incidents')} className={`px-4 py-2 text-xs font-black transition-all ${adminTab === 'incidents' ? 'bg-emerald-600 text-white rounded-t-xl' : 'text-slate-500'}`}>🔥 رصد حوادث پدافندی</button>
                <button type="button" onClick={() => setAdminTab('volunteers')} className={`px-4 py-2 text-xs font-black transition-all ${adminTab === 'volunteers' ? 'bg-emerald-600 text-white rounded-t-xl' : 'text-slate-500'}`}>📝 بررسی صلاحیت داوطلبان</button>
              </div>
            )}

            {((isAdminLoggedIn && adminTab === 'incidents') || isHamyaatLoggedIn) && (
              <div className={`border rounded-3xl p-4 shadow-2xl space-y-4 ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-white/90 backdrop-blur-md border-slate-200'}`}>
                <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 border-b pb-3 ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                  <div className={`flex items-center gap-2 border px-3 py-1.5 rounded-xl ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-300 text-slate-900'}`}>
                    <Filter className="w-3.5 h-3.5 text-slate-500" />
                    <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="bg-transparent focus:outline-none font-black text-xs w-full">
                      <option value="all">همه انواع بحران‌ها</option>
                      <option value="زلزله یا تخریب سازه">زلزله یا تخریب سازه</option>
                      <option value="بمباران / آسیب جنگی">بمباران / آسیب جنگی</option>
                      <option value="آتش‌سوزی گسترده">آتش‌سوزی گسترده</option>
                    </select>
                  </div>
                  <div className={`flex items-center gap-2 border px-3 py-1.5 rounded-xl ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-300 text-slate-900'}`}>
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="bg-transparent focus:outline-none font-black text-xs w-full">
                      <option value="newest">جدیدترین گزارشات</option>
                      <option value="critical">بحرانی‌ترین سطح ریسک</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {processedIncidents.map((inc) => (
                    <div key={inc.id} className={`border rounded-2xl p-4 flex flex-col justify-between space-y-3 relative shadow-sm ${darkMode ? 'bg-slate-900/60 border-slate-800/80' : 'bg-white border-slate-200'}`}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {getCrisisIconComponent(inc.type, severityColor)}
                          <div>
                            <h4 className={`text-xs font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>{inc.type}</h4>
                            <p className="text-[9px] text-slate-500 font-mono mt-0.5">گزارش‌دهنده: {inc.reporterName}</p>
                          </div>
                        </div>
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded text-slate-950 font-mono shrink-0" style={{ backgroundColor: severityColor }}>{inc.severityValue}%</span>
                      </div>
                      <p className={`text-xs leading-relaxed min-h-[35px] font-black ${darkMode ? 'text-slate-300' : 'text-slate-800'}`}>{inc.description}</p>
                      
                      <div className="flex flex-col gap-1 text-[10px] font-bold">
                        <div className="text-amber-600 font-sans">وضعیت: {inc.status}</div>
                        {inc.assignedHamyars && inc.assignedHamyars.length > 0 && (
                          <div className="text-teal-700 font-sans">💂‍♂️ اعزام شده: ({inc.assignedHamyars.join(' ، ')})</div>
                        )}
                      </div>

                      <div className={`flex wrap items-center justify-between border-t pt-2 gap-2 ${darkMode ? 'border-slate-800/60' : 'border-slate-100'}`}>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => handleVote(inc.id, 'like')} className="flex items-center gap-1 bg-emerald-500/10 text-emerald-600 px-2 py-1 rounded-lg text-[10px]"><ThumbsUp className="w-3 h-3" /> <span>({inc.likes})</span></button>
                          <button type="button" onClick={() => handleVote(inc.id, 'dislike')} className="flex items-center gap-1 bg-red-500/10 text-red-600 px-2 py-1 rounded-lg text-[10px]"><ThumbsDown className="w-3 h-3" /> <span>({inc.dislikes})</span></button>
                        </div>
                        {isHamyaatLoggedIn && (
                          <button type="button" onClick={() => setPendingMissionIncidentId(inc.id)} className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-2.5 py-1 rounded-xl text-[10px] font-black shadow-md flex items-center gap-1 transition"><Truck className="w-3 h-3" /> <span>قبول ماموریت</span></button>
                        )}
                      </div>

                      {isAdminLoggedIn && (
                        <div className={`flex gap-2 pt-2 border-t ${darkMode ? 'border-slate-800/60' : 'border-slate-100'}`}>
                          <button type="button" onClick={() => setIncidents(prev => prev.map(i => i.id === inc.id ? {...i, status: 'تایید شده'} : i))} className="flex-1 bg-emerald-600 text-white text-[10px] font-black h-8 rounded-xl transition">تایید ستاد</button>
                          <button type="button" onClick={() => setIncidents(prev => prev.filter(i => i.id !== inc.id))} className="flex-1 bg-red-600 text-white text-[10px] font-black h-8 rounded-xl transition">حذف گزارش</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isAdminLoggedIn && adminTab === 'volunteers' && (
              <div className="border rounded-3xl p-4 shadow-2xl overflow-hidden bg-white border-slate-200">
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs min-w-[500px]">
                    <thead>
                      <tr className="border-b font-bold text-teal-950 bg-slate-100">
                        <th className="p-3">نام متقاضی</th>
                        <th className="p-3">شماره همراه</th>
                        <th className="p-3">وضعیت</th>
                        <th className="p-3 text-center">اقدام سریع</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-900">
                      {volunteers.map((vol) => (
                        <tr key={vol.id} className="hover:bg-slate-50">
                          <td className="p-3 font-black"><button type="button" onClick={() => setSelectedVolForModal(vol)} className="text-emerald-600 hover:underline flex items-center gap-1"><Eye className="w-3 h-3" /> <span>{vol.fullName}</span></button></td>
                          <td className="p-3 font-mono font-bold">{vol.phone}</td>
                          <td className="p-3"><span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-500/20 text-amber-700">{vol.status}</span></td>
                          <td className="p-3 flex justify-center gap-2">
                            <button onClick={(e) => handleApproveVolunteer(vol.id, e)} className="bg-emerald-600 text-white px-2 py-0.5 rounded-lg font-black text-[10px]">تایید</button>
                            <button onClick={() => setVolunteers(prev => prev.map(v => v.id === vol.id ? {...v, status: 'رد صلاحیت شده'} : v))} className="bg-red-600 text-white px-2 py-0.5 rounded-lg font-black text-[10px]">رد</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 📞 نمای چهارم: پشتیبانی فنی */}
        {currentView === 'support' && (
          <div className="w-full h-full p-4 md:p-8 flex flex-col items-center justify-center text-center my-auto overflow-y-auto animate-fadeIn">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6 shadow-2xl transition-all bg-slate-900 border border-slate-800 text-teal-400"><PhoneCall className="w-10 h-10 animate-bounce" /></div>
            <h2 className={`text-base md:text-xl font-black tracking-tight mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>خطوط اضطراری و پشتیبانی فنی شبکه همیار</h2>
            
            <div className={`mt-4 rounded-3xl p-6 w-full max-w-sm space-y-5 border transition-all ${darkMode ? 'bg-slate-950 border-slate-800 text-slate-300 shadow-2xl' : 'bg-white border-slate-300 shadow-xl text-slate-900'}`}>
              <div className="flex justify-between items-center border-b pb-4 gap-4 ${darkMode ? 'border-teal-600/20' : 'border-slate-200'}">
                <div className="flex items-center gap-2 text-xs font-black">
                  <PhoneCall className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>پشتیبانی:</span>
                </div>
                <div className="dir-ltr inline-block text-left font-mono font-black text-sm md:text-base tracking-widest text-cyan-600">
                  +989912201633
                </div>
              </div>
              <div className="flex justify-between items-center gap-4 pt-1 font-black">
                <div className="flex items-center gap-2 text-xs">
                  <Mail className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>پست الکترونیکی:</span>
                </div>
                <span className="font-mono text-[11px] md:text-xs text-emerald-600 tracking-wide break-all">{adminProfile.email}</span>
              </div>
            </div>
          </div>
        )}

      </section>
    </main>
  );
}
'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Shield, Users, Radio, ShieldAlert, AlertTriangle, UserPlus, Medal, Activity, Check, PhoneCall, LayoutDashboard, Lock, User, Smartphone, ThumbsUp, ThumbsDown, Filter, ArrowUpDown, Flame, Bomb, Wind, Sun, Moon, Eye, CheckCircle, Key, Settings, Truck, Mail, ArrowRight, BarChart3, Globe, Monitor, ShieldCheck, Copy, ChevronDown, Home, Headphones, Upload, Send, MessageSquareCode } from 'lucide-react';
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
  gender: 'زن' | 'مرد' | '';
  skills: string[];
  job: string;
  address: string;
  status: 'در انتظار تایید' | 'تایید شده' | 'رد صلاحیت شده';
  fixedPassword?: string; 
  rank?: 'امدادگر رسمی' | 'امدادگر ارشد' | 'امدادگر متخصص';
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

export default function CrisisManagementSystem() {
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
  const [newPasswordInput, setNewPasswordInput] = useState('');

  const [pendingMissionIncidentId, setPendingMissionIncidentId] = useState<number | null>(null);
  const [volSubmitErrorMsg, setVolSubmitErrorMsg] = useState('');

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
  const [volGender, setVolGender] = useState<'زن' | 'مرد' | ''>('');
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

  const [volCooldown, setVolCooldown] = useState(false);
  const [volCooldownSeconds, setVolCooldownSeconds] = useState(0);

  const [openCrisisDropdown, setOpenCrisisDropdown] = useState(false);
  const [openGenderDropdown, setOpenGenderDropdown] = useState(false);
  const [openFilterDropdown, setOpenFilterDropdown] = useState(false);
  const [openSortDropdown, setOpenSortDropdown] = useState(false);

  // استیت‌های لایه هوش مصنوعی
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'model', content: 'سلام! من دستیار هوشمند سامانه همیار بحران هستم. چطور می‌توانم در زمینه ثبت فوریت‌های اضطراری، کمک‌های اولیه یا عضویت داوطلبان راهنمایی‌تان کنم؟' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const analyticsFired = useRef(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

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
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isChatLoading]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedAdminAuth = localStorage.getItem('hamyar_admin_auth') === 'true';
      const savedHamyarAuth = localStorage.getItem('hamyar_hamyar_auth') === 'true';
      const savedView = localStorage.getItem('hamyar_current_view');
      const savedTheme = localStorage.getItem('hamyar_theme');
      
      if (savedAdminAuth) setIsAdminLoggedIn(true);
      if (savedHamyarAuth) setIsHamyarLoggedIn(true);
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
    fetch('/api/volunteers')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch volunteers');
        return res.json();
      })
      .then(data => setVolunteers(data))
      .catch(err => console.error('Error loading volunteers:', err));
  }, []);

  useEffect(() => {
    fetch('/api/incidents')
      .then(res => res.json())
      .then(data => setIncidents(data))
      .catch(err => console.error('Error loading incidents:', err));
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
        body: JSON.stringify({ action: 'send', phone: phone.trim(), idempotencyKey: generatedKey, provider })
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
        body: JSON.stringify({ action: 'send', phone: phone.trim(), idempotencyKey: generatedKey, provider })
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
        body: JSON.stringify({ action: 'send', phone: phone, idempotencyKey: generatedKey, provider: authMethod === 'otp' ? 'bale' : 'sms' })
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

      if ((ident === adminProfile.phone || ident === adminProfile.email) && pass === "0250122987") {
        setIsAdminLoggedIn(true);
        setIsHamyarLoggedIn(false);
        setIsAuthMode(false);
        localStorage.setItem('hamyar_admin_auth', 'true');
        navigateToView('admin');
        setAuthIdentifier(''); setAuthPassword('');
        return;
      }

      const matchedVol = volunteers.find(v => (v.phone === ident || v.nationalId === ident) && v.status === 'تایید شده');
      if (matchedVol && matchedVol.fixedPassword === pass) {
        setIsHamyarLoggedIn(true);
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

      if (verified) {
        if (ident === adminProfile.phone) {
          setIsAdminLoggedIn(true);
          setIsHamyarLoggedIn(false);
          setIsAuthMode(false);
          localStorage.setItem('hamyar_admin_auth', 'true');
          navigateToView('admin');
          setAuthIdentifier(''); setAuthOtpCode(''); setAuthOtpSent(false);
          alert("✅ ورود پیامکی با موفقیت انجام شد.");
          return;
        }

        const matchedVol = volunteers.find(v => v.phone === ident && v.status === 'تایید شده');
        if (matchedVol) {
          setIsHamyarLoggedIn(true);
          setLoggedInHamyar(matchedVol);
          setIsAdminLoggedIn(false);
          setIsAuthMode(false);
          localStorage.setItem('hamyar_hamyar_auth', 'true');
          navigateToView('admin');
          setAuthIdentifier(''); setAuthOtpCode(''); setAuthOtpSent(false);
          alert(`✅ همیار گرامی ${matchedVol.fullName}، هویت پیامکی شما احراز و به سامانه متصل شدید.`);
          return;
        } else {
          alert("❌ درگاه تطبیق: شماره همراه شما تایید شده است، اما هنوز پرونده شما در ستاد تایید صلاحیت نگردیده است.");
        }
      } else {
        alert("❌ کد تایید هویت نامعتبر یا منقضی شده است.");
      }
    }
  };

  const handleIncidentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
      assignedHamyars: []
    };

    setIncidents(prev => [newIncident, ...prev]);
    alert(isAdminLoggedIn ? "🚨 گزارش با تایید آنی ثبت گردید." : "🚨 گزارش واقعه با موفقیت ثبت و به صف راستی‌آزمایی منتقل شد.");
    
    setIncidentDesc(''); setIncidentAddress(''); setReporterName(''); setReporterPhone(''); setSeverityValue(20); setIsReportPhoneVerified(false);
    setMarkerPos(TEHRAN_FALLBACK);
    if(isAdminLoggedIn) navigateToView('admin');

    await fetch('/api/incidents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newIncident)
    }).catch(err => console.error("Failed to save incident physically:", err));
  };

  const handleVolunteerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isVolPhoneVerified) { 
      alert('❌ خطا: جهت ثبت درخواست ابتدا باید شماره همراه خود را احراز هویت کنید.');
      return; 
    }
    if (!isPersianName(volName)) { alert("❌ نام باید صرفاً با حروف فارسی قرار بگیرد."); return; }
    if (!checkMelliCode(volNationalId)) { alert("❌ کد ملی معتبر نیست!"); return; }
    if (volGender === '') { alert("❌ لطفا جنسیت خود را انتخاب کنید."); return; }
    if (selectedSkills.length === 0) { alert("❌ لطفا حداقل یک تخصص انتخاب کنید."); return; }

    const finalSkills = selectedSkills.filter(s => s !== 'other_skill');
    if (selectedSkills.includes('other_skill') && customSkill.trim()) {
      finalSkills.push(customSkill.trim());
    }

    const newVolunteer: Volunteer = {
      id: Date.now(), fullName: volName.trim(), phone: volPhone.trim(), nationalId: volNationalId.trim(), gender: volGender, skills: finalSkills, job: volJob.trim(), address: volAddress.trim(), status: 'در انتظار تایید'
    };

    setVolunteers(prev => [newVolunteer, ...prev]);
    setVolSubmitErrorMsg('');
    alert("📝 فرم درخواست با موفقیت ثبت موقت شد.");
    setVolName(''); setVolPhone(''); setVolNationalId(''); setVolGender(''); setSelectedSkills([]); setCustomSkill(''); setVolJob(''); setVolAddress(''); setIsVolPhoneVerified(false);

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
        console.log('Volunteer saved to database:', data);
      })
      .catch(err => {
        console.error('Error saving volunteer:', err);
      });
  };

  const handleUpdateVolunteerInPage = (e: React.FormEvent | React.MouseEvent) => {
    e.preventDefault();
    if (!selectedVolForPage) return;
    setVolunteers(prev => prev.map(v => v.id === selectedVolForPage.id ? selectedVolForPage : v));
    alert("⚙️ اطلاعات پرونده متقاضی با موفقیت اصلاح و ثبت پایداری شد.");
  };

  const handleApproveVolunteer = (id: number, e: any) => {
    e.preventDefault();
    setVolunteers(prev => prev.map(v => v.id === id ? {...v, status: 'تایید شده', fixedPassword: 'hamyar456', rank: 'امدادگر رسمی'} : v));
    alert("✅ پرونده همیار داوطلب تایید صلاحیت گردید و دسترسی سیستم صادر شد.");
    if (selectedVolForPage && selectedVolForPage.id === id) {
      setSelectedVolForPage(prev => prev ? { ...prev, status: 'تایید شده', fixedPassword: 'hamyar456', rank: 'امدادگر رسمی' } : null);
    }
  };

  const handleChangeHamyarPassword = () => {
    const passRegex = /^[a-zA-Z]{6}\d{3}$/;
    if (!passRegex.test(newPasswordInput.trim())) { 
      alert("❌ گذرواژه جدید باید دقیقاً شامل ۶ حرف انگلیسی و به دنبال آن ۳ رقم باشد."); 
      return; 
    }
    if (loggedInHamyar) {
      setVolunteers(prev => prev.map(v => v.id === loggedInHamyar.id ? {...v, fixedPassword: newPasswordInput.trim()} : v));
      setLoggedInHamyar(prev => prev ? {...prev, fixedPassword: newPasswordInput.trim()} : null);
      alert("✅ گذرواژه با موفقیت تغییر یافت.");
      setNewPasswordInput('');
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
    if (filterType !== 'all') { result = result.filter(inc => inc.type === filterType); }
    if (sortBy === 'critical') { result.sort((a, b) => b.severityValue - a.severityValue); }
    else { result.sort((a, b) => b.id - a.id); }
    return result;
  }, [incidents, filterType, sortBy]);

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
            <MessageSquareCode className={`w-5 h-5 md:w-6 md:h-6 ${currentView === 'home' ? 'animate-bounce' : 'animate-pulse'}`} />
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
        <button type="button" onClick={toggleTheme} className={`p-2.5 rounded-xl border transition-all duration-300 ${darkMode ? 'bg-slate-900 border-slate-800 text-amber-400' : 'bg-white border-slate-300 text-slate-800 shadow-md hover:bg-slate-100'}`}>
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      {/* 🖥️ سایدبار دسکتاپ */}
      <aside className={`hidden md:flex absolute top-0 right-0 w-24 hover:w-80 h-full border-l justify-between flex-col z-[405] shadow-[-5px_0_40px_rgba(0,0,0,0.15)] transition-all duration-300 cubic-bezier(0.4, 0, 0.2, 1) group overflow-hidden ${darkMode ? 'bg-slate-900/95 border-slate-800' : 'bg-gradient-to-b from-pink-50 to-blue-50 border-slate-300 text-slate-900 shadow-xl'}`}>
        <div className="w-full h-full p-4 flex flex-col items-center justify-start gap-6 overflow-hidden">
          <div className="flex flex-col items-center text-center gap-2 border-b border-black/5 w-full min-w-[240px] pb-4">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/40 flex items-center justify-center shadow-lg shrink-0">
              <Radio className="w-7 h-7 text-red-500 animate-pulse" />
            </div>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <h1 className="text-base font-black tracking-tight">سامانه همیار بحران</h1>
              <p className="text-[9px] text-red-500 font-mono tracking-widest uppercase mt-0.5 font-black">Tactical Command Center</p>
            </div>
          </div>

          <nav className="w-full flex flex-col items-center justify-start gap-3 min-w-[240px]">
            <button onClick={() => { navigateToView('home'); setIsAuthMode(false); setSelectedVolForPage(null); }} className={`flex w-full items-center px-4 py-3 rounded-2xl text-xs font-black transition-all duration-200 text-right ${currentView === 'home' && !isAuthMode ? 'bg-gradient-to-r from-red-700 to-red-600 text-white shadow-lg scale-105' : 'text-slate-500 hover:bg-black/5 font-black'}`}>
              <Home className="w-6 h-6 text-red-600 shrink-0" />
              <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap mr-3 text-xs font-black">🏠 خانه</span>
            </button>

            <button onClick={() => { navigateToView('report'); setIsAuthMode(false); setSelectedVolForPage(null); }} className={`flex w-full items-center px-4 py-3 rounded-2xl text-xs font-black transition-all duration-200 text-right ${currentView === 'report' && !isAuthMode ? 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg scale-105' : 'text-slate-500 hover:bg-black/5 font-black'}`}>
              <Shield className="w-6 h-6 text-red-500 shrink-0" />
              <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap mr-3 text-xs font-black">🚨 لایه ثبت سریع حادثه</span>
            </button>

            {isAdminLoggedIn && (
              <button onClick={() => { navigateToView('analytics'); setIsAuthMode(false); setSelectedVolForPage(null); }} className={`flex w-full items-center px-4 py-3 rounded-2xl text-xs font-black transition-all duration-200 text-right ${currentView === 'analytics' && !isAuthMode ? 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg scale-105' : 'text-slate-500 hover:bg-black/5 font-black'}`}>
                <BarChart3 className="w-5 h-5 text-red-500 shrink-0" />
                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap mr-3 text-xs font-black">📊 پایش آمار بازدید سایت</span>
              </button>
            )}

            {isAdminLoggedIn ? (
              <button onClick={() => { navigateToView('admin-edit'); setIsAuthMode(false); setSelectedVolForPage(null); }} className={`flex w-full items-center px-4 py-3 rounded-2xl text-xs font-black transition-all duration-200 text-right ${currentView === 'admin-edit' && !isAuthMode ? 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg scale-105' : 'text-slate-500 hover:bg-black/5 font-black'}`}>
                <Settings className="w-5 h-5 text-red-400 shrink-0" />
                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap mr-3 text-xs font-black">⚙️ ویرایش اطلاعات ادمین</span>
              </button>
            ) : (
              <button onClick={() => { navigateToView('volunteer'); setIsAuthMode(false); setSelectedVolForPage(null); }} className={`flex w-full items-center px-4 py-3 rounded-2xl text-xs font-black transition-all duration-200 text-right ${currentView === 'volunteer' && !isAuthMode ? 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg scale-105' : 'text-slate-500 hover:bg-black/5 font-black'}`}>
                <Users className="w-6 h-6 text-red-500 shrink-0" />
                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap mr-3 text-xs font-black">📝 درخواست عضویت داوطلبان</span>
              </button>
            )}

            <button onClick={() => { setSelectedVolForPage(null); if (isAdminLoggedIn || isHamyarLoggedIn) { navigateToView('admin'); setIsAuthMode(false); } else { setIsAuthMode(true); } }} className={`flex w-full items-center px-4 py-3 rounded-2xl text-xs font-black transition-all duration-200 text-right ${currentView === 'admin' || isAuthMode ? 'bg-red-500 text-white scale-105' : 'text-slate-500 hover:bg-black/5 font-black'}`}>
              <LayoutDashboard className="w-6 h-6 text-red-500 shrink-0" />
              <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap mr-3 text-xs font-black">🔑 کارتابل همیاران رسمی</span>
            </button>

            <button onClick={() => { navigateToView('support'); setIsAuthMode(false); setSelectedVolForPage(null); }} className={`flex w-full items-center px-4 py-3 rounded-2xl text-xs font-black transition-all duration-200 text-right ${currentView === 'support' && !isAuthMode ? 'bg-red-500 text-white scale-105' : 'text-slate-500 hover:bg-black/5 font-black'}`}>
              <PhoneCall className="w-6 h-6 text-red-500 shrink-0" />
              <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap mr-3 text-xs font-black">📞 خطوط پشتیبانی فنی</span>
            </button>

            <button onClick={() => { navigateToView('support-ai'); setIsAuthMode(false); setSelectedVolForPage(null); }} className={`flex w-full items-center px-4 py-3 rounded-2xl text-xs font-black transition-all duration-200 text-right ${currentView === 'support-ai' && !isAuthMode ? 'bg-gradient-to-r from-cyan-700 to-cyan-600 text-white shadow-lg scale-105' : 'text-slate-500 hover:bg-black/5 font-black'}`}>
              <MessageSquareCode className="w-6 h-6 text-cyan-500 shrink-0" />
              <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap mr-3 text-xs font-black">🤖 چت‌بات هوشمند</span>
            </button>
          </nav>
        </div>
        <div className="p-4 bg-black/5 border-t border-black/10 flex flex-col gap-2 min-w-[250px]">
          <div className="text-xs font-bold flex items-center gap-3"><span className="w-2 h-2 rounded-full bg-red-400"></span><span className="opacity-0 group-hover:opacity-100 transition-opacity font-black">شبکه مدیریت بحران</span></div>
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
          <MessageSquareCode className="w-5 h-5" /><span className="text-[8px] mt-0.5 font-black">چت‌بات هوشمند</span>
        </button>
      </div>

      {/* 🖥️ بدنه اصلی لایه‌های سیستم */}
      <section className="flex-1 h-full relative flex flex-col overflow-hidden pb-20 md:pb-0 md:pr-24">
        
        {/* 🏠 نمای واحد خانه */}
        {currentView === 'home' && !isAuthMode && (
          <div className="w-full h-full p-4 md:p-8 overflow-y-auto space-y-8 animate-fadeIn">
            <div className={`border rounded-3xl p-6 md:p-10 text-center transition-all duration-300 ${
              darkMode 
                ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-[#1e1111] border-red-900/60 shadow-[0_0_40px_rgba(220,38,38,0.12)]' 
                : 'bg-gradient-to-br from-white via-slate-50 to-red-50/40 border-slate-200/80 shadow-[0_15px_35px_rgba(0,0,0,0.04)]'
            }`}>
              <div className="w-16 h-14 rounded-2xl bg-red-500/10 border border-red-500/40 flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Radio className="w-7 h-7 text-red-500 animate-pulse" />
              </div>
              <h1 className={`text-xl md:text-3xl font-black tracking-tight mb-4 ${darkMode ? 'text-red-400' : 'text-slate-955'}`}>ستاد دیجیتال فرماندهی و مدیریت همیار بحران</h1>
              <p className={`text-sm md:text-base max-w-2xl mx-auto leading-relaxed ${darkMode ? 'text-slate-300' : 'text-slate-700 font-medium'}`}>
                ما اینجا هستیم تا در زمان وقوع حوادث ناگهانی، مردم و نیروهای امدادی رو خیلی سریع و بدون فوت وقت به همدیگه متصل کنیم. اگر توی موقعیت اضطراری قرار گرفتید و به کمک نیاز دارید، یا اینکه خودتون تخصص دارید و مایلید به عنوان نیروی داوطلب به مردم محله‌تون خدمت کنید، این سامانه دقیقاً برای همین کار ساخته شده.
              </p>
              <div className="flex flex-wrap justify-center gap-3 mt-6">
                <button type="button" onClick={() => navigateToView('report')} className="bg-gradient-to-r from-red-600 to-red-500 text-white font-black text-xs px-6 py-2.5 rounded-xl shadow-lg transition transform hover:scale-105 active:scale-95">🚨 ثبت فوری گزارش واقعه</button>
                <button type="button" onClick={() => navigateToView('support-ai')} className="bg-gradient-to-r from-cyan-600 to-cyan-500 text-white font-black text-xs px-6 py-2.5 rounded-xl shadow-lg transition transform hover:scale-105 active:scale-95">🤖 گفتگو با هوش مصنوعی پشتیبان</button>
                <button type="button" onClick={() => navigateToView('volunteer')} className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-black text-xs px-6 py-2.5 rounded-xl shadow-lg transition transform hover:scale-105 active:scale-95">📝 درخواست عضویت در سامانه همیاری</button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl mx-auto">
              <div className={`border rounded-3xl p-5 md:p-6 flex flex-col sm:flex-row items-center gap-4 transition-all duration-300 ${
                darkMode 
                  ? 'bg-slate-950/70 backdrop-blur-xl border-emerald-500/20 shadow-[0_0_25px_rgba(16,185,129,0.08)]' 
                  : 'bg-gradient-to-br from-white via-emerald-50/10 to-emerald-50/30 border-emerald-200 shadow-[0_10px_25px_rgba(0,0,0,0.03)]'
              }`}>
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shrink-0 shadow-inner">
                  <UserPlus className="w-6 h-6 animate-pulse" />
                </div>
                <div className="text-center sm:text-right flex-1 space-y-1">
                  <p className={`text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>آمار پدافند مردمی</p>
                  <p className={`text-xs md:text-sm font-semibold leading-relaxed ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                    تا این لحظه تعداد{' '}
                    <span className={`text-xl md:text-2xl font-black font-mono px-1.5 align-middle text-shadow-sm animate-[pulse_2.5s_infinite] ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                      {volunteers.length.toLocaleString('en-US')}
                    </span>{' '}
                    داوطلب برای کمک به شما عزیزان در سامانه ثبت‌نام کرده‌اند.
                    <button onClick={() => navigateToView('volunteer')} className="inline-block font-black text-emerald-500 hover:text-emerald-400 transition-colors mr-1.5 focus:outline-none focus:underline">( فرم داوطلبی )</button>
                  </p>
                </div>
              </div>

              <div className={`border rounded-3xl p-5 md:p-6 flex flex-col sm:flex-row items-center gap-4 transition-all duration-300 ${
                darkMode 
                  ? 'bg-slate-950/70 backdrop-blur-xl border-red-500/20 shadow-[0_0_25px_rgba(239,68,68,0.08)]' 
                  : 'bg-gradient-to-br from-white via-red-50/10 to-red-50/30 border-red-200 shadow-[0_10px_25px_rgba(0,0,0,0.03)]'
              }`}>
                <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/40 flex items-center justify-center text-red-500 shrink-0 shadow-inner">
                  <ShieldAlert className="w-6 h-6 animate-pulse" />
                </div>
                <div className="text-center sm:text-right flex-1 space-y-1">
                  <p className={`text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>وضعیت زنده پایش حوادث</p>
                  <p className={`text-xs md:text-sm font-semibold leading-relaxed ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                    تاکنون آمار زنده و رسمی{' '}
                    <span className={`text-xl md:text-2xl font-black font-mono px-1.5 align-middle text-shadow-sm animate-[pulse_2.5s_infinite] ${darkMode ? 'text-red-400' : 'text-red-500'}`}>
                      {incidents.length.toLocaleString('en-US')}
                    </span>{' '}
                    حادثه اضطراری و جدی در ساختار شبکه مدیریت ثبت گردیده است.
                    <button onClick={() => navigateToView('report')} className="inline-block font-black text-red-500 hover:text-red-400 transition-colors mr-1.5 focus:outline-none focus:underline">( فرم ثبت حادثه )</button>
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className={`text-base md:text-xl font-bold flex items-center gap-2 ${darkMode ? 'text-slate-100' : 'text-slate-955 font-black'}`}><Activity className="w-5 h-5 text-red-600" /> چرخه گردش اطلاعات و عملکرد فنی سامانه:</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={`border p-6 rounded-2xl space-y-3 transition shadow-md ${darkMode ? 'bg-slate-950 border-slate-800 text-red-50' : 'bg-pink-50 border-pink-200 text-slate-900 shadow-xl'}`}>
                  <div className={`w-11 h-11 rounded-xl font-mono text-lg font-black flex items-center justify-center ${darkMode ? 'bg-red-900 text-red-400 border border-red-700' : 'bg-pink-100 text-red-700 shadow'}`}>1</div>
                  <h3 className="text-sm md:text-base font-black">۱. گزارش زنده شهروندان</h3>
                  <p className="text-xs md:text-sm leading-relaxed font-semibold opacity-90">مردم و ناظران عینی حادثه را روی نقشه ماهواره‌ای «نشان» علامت‌گذاری کرده و پس از دریافت رمز تایید پیامکی بله یا کاوه‌نگار، عمق فاجعه را به سامانه همیار بحران گزارش می دهند.</p>
                </div>
                <div className={`border p-6 rounded-2xl space-y-3 transition shadow-md ${darkMode ? 'bg-slate-950 border-slate-800 text-red-50' : 'bg-blue-50 border-blue-200 text-slate-900 shadow-xl'}`}>
                  <div className={`w-11 h-11 rounded-xl font-mono text-lg font-black flex items-center justify-center ${darkMode ? 'bg-red-900 text-red-400 border border-red-700' : 'bg-blue-100 text-blue-700 shadow'}`}>2</div>
                  <h3 className="text-sm md:text-base font-black">۲. پایش و راستی‌آزمایی ستاد</h3>
                  <p className="text-xs md:text-sm leading-relaxed font-semibold opacity-90">در اتاق فرمان سامانه مدیریت بحران صحت گزارش‌ها، میزان ریسک و موقعیت دقیق ماهواره‌ای حوادث زلزله, بمباران، آتش‌سوزی، سیل و غیره را پایش و تایید میکنند.</p>
                </div>
                <div className={`border p-6 rounded-2xl space-y-3 transition shadow-md ${darkMode ? 'bg-slate-950 border-slate-800 text-red-50' : 'bg-pink-50 border-pink-200 text-slate-900 shadow-xl'}`}>
                  <div className={`w-11 h-11 rounded-xl font-mono text-lg font-black flex items-center justify-center ${darkMode ? 'bg-red-900 text-red-400 border border-red-700' : 'bg-pink-100 text-red-700 shadow'}`}>3</div>
                  <h3 className="text-sm md:text-base font-black">۳. اعزام تاکتیکی امدادگران</h3>
                  <p className="text-xs md:text-sm leading-relaxed font-semibold opacity-90">امدادگران و همیاران رسمی که تخصص پرونده آنها تایید شده، ماموریت را در کارتابل خود قبول کرده و به عنوان واحدهای واکنش سریع اعزام می‌شوند.</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className={`border p-5 rounded-3xl space-y-3 shadow-md ${darkMode ? 'bg-gradient-to-br from-slate-950 to-slate-900 border-red-900/40' : 'bg-white border-red-200'}`}>
                <h3 className="text-xs md:text-sm font-black text-red-600 flex items-center gap-1.5"><User className="w-4 h-4" /> شما به عنوان شهروند داوطلب چه کار می‌توانید بکنید؟</h3>
                <ul className={`text-[11px] space-y-2.5 font-bold list-disc list-inside pr-1 ${darkMode ? 'text-slate-300' : 'text-slate-800'}`}>
                  <li>ثبت دقیق هرگونه شرایط بحرانی، هرگونه درخواست کمک و غیره مانند تخریب سازه، در شرایط جنگی، سیلاب و غیره با مختصات GPS</li>
                  <li>داوطلب شدن برای کمک در شرایط بحرانی به افراد نیازمند در سامانه با تکمیل فرم احراز هویت.</li>
                </ul>
              </div>
              <div className={`border p-5 rounded-3xl space-y-3 shadow-md ${darkMode ? 'bg-gradient-to-br from-slate-950 to-slate-900 border-red-900/40' : 'bg-white border-red-200'}`}>
                <h3 className="text-xs md:text-sm font-black text-red-500 flex items-center gap-1.5"><ShieldCheck className="w-4 h-4" /> وظایف همیاران رسمی و کادر مدیریت بحران چیست؟</h3>
                <ul className={`text-[11px] space-y-2.5 font-bold list-disc list-inside pr-1 ${darkMode ? 'text-slate-300' : 'text-slate-800'}`}>
                  <li>کمک رسانی به مردم نیازمند در شرایط بحران و شرایط اضطراری, اطلاع رسانی به هلال احمر و پلیس ۱۲۵ یا غیره در صورت نیاز.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* 🚨 نمای اول: ثبت گزارش حادثه */}
        {currentView === 'report' && !isAuthMode && (
          <div className="w-full h-full flex flex-col">
            <div className="w-full h-2/5 md:h-1/3 border-b border-black/10 relative z-0">
              {isMounted ? (
                <NeshanLocationPicker initialCenter={markerPos} onLocationSelect={(coords) => setMarkerPos(coords)} darkMode={darkMode} height="100%" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-xs text-slate-400 animate-pulse">در حال فراخوانی سرویش موقعیت‌یاب نشان...</div>
              )}
            </div>

            <div className="w-full h-3/5 md:h-2/3 p-4 md:p-6 overflow-y-auto">
              <form onSubmit={handleIncidentSubmit} className={`max-w-3xl mx-auto border rounded-3xl p-4 md:p-6 shadow-2xl space-y-4 transition-colors ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-300 text-slate-900'}`}>
                <div className="flex items-center gap-2 border-b pb-2 border-black/10"><AlertTriangle className="w-5 h-5 text-red-600" /> <h2 className="text-sm md:text-base font-black">ثبت گزارش رسمی حادثه</h2></div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[11px] font-black mb-1 block">نام و نام خانوادگی (فارسی)</label>
                    <input type="text" required value={reporterName} onChange={(e) => setReporterName(e.target.value)} onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('لطفاً نام و نام خانوادگی خود را برای ثبت حادثه وارد کنید.')} onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')} placeholder="" className={`w-full border rounded-xl px-4 py-2 text-xs font-bold focus:outline-none ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`} />
                  </div>
                  <div>
                    <label className="text-[11px] font-black mb-1 block">شماره همراه</label>
                    <input type="tel" required maxLength={11} placeholder="" value={reporterPhone} onChange={(e) => setReporterPhone(e.target.value)} onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('لطفاً شماره تماس همراه ۱۱ رقمی خود را وارد کنید.')} onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')} className={`w-full border text-left dir-ltr font-mono rounded-xl px-4 py-2 text-xs font-bold focus:outline-none ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`} />
                  </div>
                  <div className="flex items-end gap-2">
                    <button type="button" onClick={() => handleSendReportOTP(reporterPhone, 'bale')} className="flex-1 bg-red-600/10 border border-red-500/30 text-red-600 text-xs font-black h-[38px] rounded-xl hover:bg-red-600/20 transition shadow-sm">ارسال از بله</button>
                    <button type="button" onClick={() => handleSendReportOTP(reporterPhone, 'sms')} className="flex-1 bg-amber-600/10 border border-amber-500/30 text-amber-500 text-xs font-black h-[38px] rounded-xl hover:bg-amber-600/20 transition shadow-sm">ارسال از SMS</button>
                  </div>
                </div>

                {reportOtpSent && (
                  <div className={`border p-3 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3 ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-100 border-slate-200 text-slate-900'}`}>
                    <span className="text-[11px] font-black">کد ۶ رقمی دریافتی را وارد کنید:</span>
                    <div className="flex gap-2 w-full md:w-auto">
                      <input type="text" maxLength={6} value={reportOtpCode} onChange={(e) => setReportOtpCode(e.target.value)} className={`w-full md:w-24 border rounded-xl px-3 py-1.5 text-center text-xs font-bold focus:outline-none ${darkMode ? 'bg-slate-900 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-900'}`} />
                      <button type="button" onClick={handleVerifyReportOTP} className="bg-red-600 text-white font-bold px-4 py-1.5 rounded-xl text-xs hover:bg-red-600 transition shrink-0 shadow-sm">تایید</button>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-black mb-1">🏠 آدرس دقیق محل وقوع حادثه</label>
                  <input type="text" required value={incidentAddress} onChange={(e) => setIncidentAddress(e.target.value)} placeholder="تهران، میدان آزادی، ..." className={`w-full border rounded-xl px-4 py-2 text-xs font-bold focus:outline-none ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative">
                    <label className="block text-[11px] font-black mb-1">نوع واقعه بحرانی</label>
                    <button type="button" onClick={() => setOpenCrisisDropdown(!openCrisisDropdown)} className={`w-full border rounded-xl px-3 py-2 text-xs font-bold focus:outline-none flex items-center justify-between transition-colors ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}>
                      <span>{crisisType === 'other' ? 'سایر موارد (Other)' : crisisType}</span>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openCrisisDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    {openCrisisDropdown && (
                      <div className={`absolute left-0 right-0 mt-1 rounded-xl shadow-2xl border z-50 overflow-hidden ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
                        {['زلزله یا تخریب سازه', 'بمباران / آسیب جنگی', 'آتش‌سوزی گسترده', 'سیل گسترده و طغیان روان‌آب', 'other'].map((opt) => (
                          <button key={opt} type="button" onClick={() => { setCrisisType(opt); setOpenCrisisDropdown(false); }} className={`w-full text-right px-4 py-2.5 text-xs font-bold transition-colors ${darkMode ? 'hover:bg-slate-700 text-slate-100' : 'hover:bg-slate-50 text-slate-900'} ${crisisType === opt ? 'bg-red-500/10 text-red-500 font-black' : ''}`}>
                            {opt === 'other' ? 'سایر موارد (Other)' : opt}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[11px] font-black">تخمین شدت بحران</label>
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded text-white font-mono" style={{ backgroundColor: severityColor }}>{severityValue}%</span>
                    </div>
                    <div className={`flex items-center border rounded-xl px-4 h-[38px] relative overflow-hidden ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`}>
                      <div className="absolute right-0 top-0 bottom-0 transition-all duration-150 opacity-40" style={{ width: `${severityValue}%`, backgroundColor: severityColor }} />
                      <input type="range" min="0" max="100" value={severityValue} onChange={(e) => setSeverityValue(Number(e.target.value))} className="w-full appearance-none cursor-pointer accent-current z-10 relative" style={{ color: severityColor }} />
                    </div>
                  </div>
                </div>

                {crisisType === 'other' && (
                  <div>
                    <label className="block text-[11px] font-black mb-1">✍️ نوع واقعه بحرانی متفرقه را بنویسید</label>
                    <input type="text" required value={customCrisis} onChange={(e) => setCustomCrisis(e.target.value)} placeholder="مثلاً: طوفان شن" className={`w-full border rounded-xl px-4 py-2 text-xs font-bold focus:outline-none ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`} />
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-black mb-1">شرح حادثه و وضعیت مصدومین ثانویه</label>
                  <textarea rows={3} required value={incidentDesc} onChange={(e) => setIncidentDesc(e.target.value)} onInvalid={(e) => { if ((e.target as HTMLTextAreaElement).value.length === 0) { (e.target as HTMLTextAreaElement).setCustomValidity('لطفاً شرح حادثه و وضعیت مصدومین را پر کنید.'); } }} placeholder="" className={`w-full border rounded-xl px-4 py-2 text-xs font-semibold focus:outline-none resize-none ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`} />
                </div>

                <button type="submit" disabled={!isReportPhoneVerified && !isAdminLoggedIn} className={`w-full text-xs font-black rounded-xl py-3 transition shadow-md flex items-center justify-center gap-2 ${isReportPhoneVerified || isAdminLoggedIn ? 'bg-gradient-to-r from-red-600 to-red-500 text-white cursor-pointer' : 'bg-slate-700 text-slate-500 cursor-not-allowed opacity-50'}`}>
                  <ShieldAlert className="w-4 h-4" /> <span>{isReportPhoneVerified || isAdminLoggedIn ? 'ارسال فوری گزارش به ستاد فرماندهی' : 'لطفاً ابتدا شماره همراه خود را احراز هویت کنید'}</span>
                </button>
              </form>
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
                  <input type="text" required value={volName} onChange={(e) => setVolName(e.target.value)} onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('لطفاً نام و نام خانوادگی متقاضی را وارد کنید.')} onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')} className={`w-full border rounded-xl px-4 py-2 text-xs focus:outline-none font-bold ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`} />
                </div>
                <div className="relative">
                  <label className="block text-[11px] font-black mb-1">جنسیت</label>
                  <button type="button" onClick={() => setOpenGenderDropdown(!openGenderDropdown)} className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none font-bold flex items-center justify-between transition-colors ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}>
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
                  <input type="text" required maxLength={10} minLength={10} value={volNationalId} onChange={(e) => setVolNationalId(e.target.value)} onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('لطفاً کد ملی ده رقمی معتبر را برای عضویت بنویسید.')} onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')} placeholder="" className={`w-full border text-left dir-ltr font-mono rounded-xl px-4 py-2 text-xs focus:outline-none font-bold ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-black mb-1">📱 شماره همراه</label>
                  <div className="flex flex-col gap-1.5">
                    <input type="tel" required placeholder="09xxxxxxxxx" maxLength={11} value={volPhone} onChange={(e) => setVolPhone(e.target.value)} onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('لطفاً شماره همراه متقاضی را برای ارسال کد وارد کنید.')} onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')} className={`w-full border text-left dir-ltr font-mono rounded-xl px-3 py-2 text-xs focus:outline-none font-bold ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`} />
                    <div className="flex gap-1.5">
                      <button type="button" onClick={() => handleSendVolOTP(volPhone, 'bale')} disabled={volCooldown} className={`flex-1 text-xs font-black py-2 rounded-xl transition shadow-sm ${volCooldown ? 'bg-gray-500 text-gray-300 cursor-not-allowed' : 'bg-red-500 text-white hover:bg-red-600'}`}>ارسال با بله</button>
                      <button type="button" onClick={() => handleSendVolOTP(volPhone, 'sms')} disabled={volCooldown} className={`flex-1 text-xs font-black py-2 rounded-xl transition shadow-sm ${volCooldown ? 'bg-gray-500 text-gray-300 cursor-not-allowed' : 'bg-slate-600 text-white hover:bg-slate-700'}`}>ارسال با SMS</button>
                    </div>
                    {volCooldown && (
                      <div className="text-xs text-red-500 font-black mt-0.5">⏳ ارسال مجدد کد: {volCooldownSeconds} ثانیه</div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-black mb-1">💼 شغل فعلی</label>
                  <input type="text" required value={volJob} onChange={(e) => setVolJob(e.target.value)} onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('لطفاً فرم مربوط به شغل فعلی خود را پر کنید.')} onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')} className={`w-full border rounded-xl px-4 py-2 text-xs focus:outline-none font-bold ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`} />
                </div>
                <div>
                  <label className="block text-[11px] font-black mb-1">🏠 محل سکونت / آدرس دقیق</label>
                  <input type="text" required value={volAddress} onChange={(e) => setVolAddress(e.target.value)} onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('لطفاً آدرس دقیق محل سکونت خود را پر کنید.')} onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')} className={`w-full border rounded-xl px-4 py-2 text-xs focus:outline-none font-bold ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`} />
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
                <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 bg-slate-100 border border-dashed border-slate-400 p-4 rounded-xl w-full text-slate-500 font-bold text-xs justify-center hover:bg-slate-200 transition">
                  <Upload className="w-4 h-4 text-slate-500" /> انتخاب و آپلود فایل مدرک تخصص
                </button>
                <input type="file" ref={fileInputRef} className="hidden" />
              </div>

              <div className="space-y-2">
                <button type="submit" className={`w-full text-xs font-black rounded-xl py-3 transition shadow-md ${isVolPhoneVerified ? 'bg-gradient-to-r from-red-600 to-red-600 text-white shadow-md' : 'bg-slate-700 text-slate-500 cursor-not-allowed opacity-50'}`}><UserPlus className="w-4 h-4 inline-block ml-1" /> <span>ثبت نهایی درخواست عضویت نیروها</span></button>
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
                  <div className="md:col-span-2 flex justify-between items-center border-t pt-4 border-black/10 gap-2">
                    <div className="flex gap-2">
                      <button type="button" onClick={(e) => handleUpdateVolunteerInPage(e)} className="bg-red-600 text-white px-4 py-2 rounded-xl font-black transition shadow">ذخیره تغییرات داوطلب</button>
                      <button type="button" onClick={(e) => handleApproveVolunteer(selectedVolForPage.id, e)} className="bg-red-700 text-white px-4 py-2 rounded-xl font-black transition shadow">تایید صلاحیت نهایی</button>
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
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-800/80 pt-3">
                  <div className={`border p-3 rounded-xl flex items-center justify-between ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                    <div>
                      <span className="text-[10px] text-slate-500 block font-bold">🔑 رمز ورود شما:</span>
                      <span className="text-xs font-mono font-black text-red-400 tracking-wider">{loggedInHamyar.fixedPassword || 'بدون رمز'}</span>
                    </div>
                    <Key className="w-4 h-4 text-red-500/40" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex gap-2">
                      <input type="text" placeholder="گذرواژه جدید استاندارد" value={newPasswordInput} onChange={(e) => setNewPasswordInput(e.target.value)} className={`border rounded-xl px-3 py-1.5 text-xs font-bold flex-1 focus:outline-none ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-red-200'}`} />
                      <button type="button" onClick={handleChangeHamyarPassword} className="bg-red-600 text-white text-xs font-black px-3 rounded-xl transition shadow">بروزرسانی</button>
                    </div>
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
                    onClick={() => { 
                      setIsAdminLoggedIn(false); setIsHamyarLoggedIn(false); setLoggedInHamyar(null); 
                      localStorage.removeItem('hamyar_admin_auth'); localStorage.removeItem('hamyar_hamyar_auth');
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
                      {processedIncidents.map((inc) => (
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
                            <div className="text-red-600 font-sans">وضعیت: {inc.status}</div>
                            {inc.assignedHamyars && inc.assignedHamyars.length > 0 && (
                              <div className="text-red-700 font-sans">💂‍♂️ اعزام شده: ({inc.assignedHamyars.join(' ، ')})</div>
                            )}
                          </div>

                          <div className={`flex wrap items-center justify-between border-t pt-2 gap-2 ${darkMode ? 'border-slate-700' : 'border-black/5'}`}>
                            <div className="flex gap-2">
                              <button type="button" onClick={() => handleVote(inc.id, 'like')} className="flex items-center gap-1 bg-red-500/10 text-red-600 px-2 py-1 rounded-lg text-[10px]"><ThumbsUp className="w-3 h-3" /> <span>({inc.likes})</span></button>
                              <button type="button" onClick={() => handleVote(inc.id, 'dislike')} className="flex items-center gap-1 bg-red-500/10 text-red-600 px-2 py-1 rounded-lg text-[10px]"><ThumbsDown className="w-3 h-3" /> <span>({inc.dislikes})</span></button>
                            </div>
                            {isHamyarLoggedIn && (
                              <button type="button" onClick={() => setPendingMissionIncidentId(inc.id)} className="bg-gradient-to-r from-red-600 to-red-700 text-white px-2.5 py-1 rounded-xl text-[10px] font-black shadow-md flex items-center gap-1 transition"><Truck className="w-3 h-3" /> <span>قبول ماموریت</span></button>
                            )}
                          </div>

                          {isAdminLoggedIn && (
                            <div className={`flex gap-2 pt-2 border-t ${darkMode ? 'border-slate-700' : 'border-black/5'}`}>
                              <button type="button" onClick={() => setIncidents(prev => prev.map(i => i.id === inc.id ? {...i, status: 'تایید شده'} : i))} className="flex-1 bg-red-600 text-white text-[10px] font-black h-8 rounded-xl transition shadow">تایید ستاد</button>
                              <button type="button" onClick={() => setIncidents(prev => prev.filter(i => i.id !== inc.id))} className="flex-1 bg-slate-600 text-white text-[10px] font-black h-8 rounded-xl transition shadow">حذف گزارش</button>
                            </div>
                          )}
                        </div>
                      ))}
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
                              <td className="p-3 font-mono font-bold">{vol.phone}</td>
                              <td className="p-3"><span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-red-500/20 text-red-700">{vol.status}</span></td>
                              <td className="p-3 flex justify-center gap-2">
                                <button type="button" onClick={(e) => handleApproveVolunteer(vol.id, e)} className="bg-red-600 text-white px-2 py-0.5 rounded-lg font-black text-[10px] shadow">تایید</button>
                                <button type="button" onClick={() => setVolunteers(prev => prev.map(v => v.id === vol.id ? {...v, status: 'رد صلاحیت شده'} : v))} className="bg-slate-600 text-white px-2 py-0.5 rounded-lg font-black text-[10px] shadow">رد</button>
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
                  <button type="button" onClick={() => handleCopyToClipboardAndToast("+989912201633")} className="p-1 rounded bg-slate-500/10 text-slate-400 hover:text-slate-200 transition"><Copy className="w-3.5 h-3.5" /></button>
                  <a href={`tel:${adminProfile.phone}`} style={{ direction: 'ltr', unicodeBidi: 'bidi-override' }} className="dir-ltr inline-block text-left font-mono font-black text-sm md:text-base tracking-widest text-red-600 hover:underline">+989912201633</a>
                </div>
              </div>
              <div className="flex justify-between items-center gap-4 pt-1 font-black">
                <div className="flex items-center gap-2 text-xs"><Mail className="w-4 h-4 text-red-600 shrink-0" /><span>پست الکترونیکی:</span></div>
                <div className="flex items-center gap-2 max-w-[65%]">
                  <button type="button" onClick={() => handleCopyToClipboardAndToast(adminProfile.email)} className="p-1 rounded bg-slate-500/10 text-slate-400 hover:text-slate-200 transition"><Copy className="w-3.5 h-3.5" /></button>
                  <a href={`mailto:${adminProfile.email}`} className="font-mono text-[11px] md:text-xs text-red-600 tracking-wide break-all hover:underline">{adminProfile.email}</a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 🤖 نمای ششم: پورتال لایو چت و پشتیبانی آنلاین ۲۴ ساعته با هوش مصنوعی */}
        {currentView === 'support-ai' && !isAuthMode && (
          <div className="w-full h-full p-3 md:p-6 flex flex-col justify-between overflow-hidden animate-fadeIn">
            {/* هدر چت‌بات */}
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

            {/* بدنه و تاریخچه مسیج‌ها */}
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

              {/* انیمیشن لودینگ و فکری هوش مصنوعی */}
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

            {/* ورودی متنی چت */}
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
                      <button type="button" onClick={handleSendAuthOTP} className="flex-1 bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-black py-2 rounded-xl hover:bg-red-500/20 transition">ارسال کد از طریق بله</button>
                      <button type="button" onClick={() => alert('به‌زودی فعال می‌شود')} className="flex-1 bg-slate-700/10 border border-slate-500/30 text-slate-400 text-xs font-black py-2 rounded-xl hover:bg-slate-700/20 transition">ارسال کد از طریق SMS</button>
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
    </main>
  );
}
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, CheckCircle, Globe2, ShieldAlert, Users } from 'lucide-react';

export interface HomepageStatistics {
  registeredVolunteers: number;
  approvedVolunteers: number;
  rejectedVolunteers: number;
  registeredIncidents: number;
  approvedIncidents: number;
  rejectedIncidents: number;
  coveredCities: number;
}

interface Props {
  statistics: HomepageStatistics | null;
  loadingError: boolean;
  darkMode: boolean;
}

type Segment = { label: string; value: number; color: string };
type DonutData = { title: string; total: number; segments: Segment[] };

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
let hasAnimatedDuringThisPageVisit = false;

export default function HomepageCircularStatistics({ statistics, loadingError, darkMode }: Props) {
  const sectionRef = useRef<HTMLElement>(null);
  const hasEnteredViewport = useRef(false);
  const hasAnimated = useRef(false);
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState([0, 0]);

  const donuts = useMemo<DonutData[]>(() => {
    if (!statistics) return [];
    const pendingVolunteers = Math.max(
      0,
      statistics.registeredVolunteers - statistics.approvedVolunteers - statistics.rejectedVolunteers
    );
    const pendingIncidents = Math.max(
      0,
      statistics.registeredIncidents - statistics.approvedIncidents - statistics.rejectedIncidents
    );
    return [
      {
        title: 'کل داوطلبان',
        total: statistics.registeredVolunteers,
        segments: [
          { label: 'داوطلبان تایید شده', value: statistics.approvedVolunteers, color: '#22c55e' },
          { label: 'داوطلبان رد شده', value: statistics.rejectedVolunteers, color: '#ef4444' },
          ...(pendingVolunteers > 0
            ? [{ label: 'داوطلبان در حال بررسی', value: pendingVolunteers, color: '#94a3b8' }]
            : [])
        ]
      },
      {
        title: 'کل حوادث ثبت شده',
        total: statistics.registeredIncidents,
        segments: [
          { label: 'حوادث تایید شده', value: statistics.approvedIncidents, color: '#22c55e' },
          { label: 'حوادث رد شده', value: statistics.rejectedIncidents, color: '#ef4444' },
          ...(pendingIncidents > 0
            ? [{ label: 'حوادث در حال بررسی', value: pendingIncidents, color: '#3b82f6' }]
            : [])
        ]
      }
    ];
  }, [statistics]);

  useEffect(() => {
    const element = sectionRef.current;
    if (!element || hasEnteredViewport.current) return;
    const observer = new IntersectionObserver(entries => {
      if (!entries[0]?.isIntersecting) return;
      hasEnteredViewport.current = true;
      setIsVisible(true);
      observer.disconnect();
    }, { threshold: 0.2 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible || !statistics || hasAnimated.current) return;
    hasAnimated.current = true;
    if (
      hasAnimatedDuringThisPageVisit ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      hasAnimatedDuringThisPageVisit = true;
      setProgress([1, 1]);
      return;
    }
    hasAnimatedDuringThisPageVisit = true;
    const duration = 1700;
    const stagger = 160;
    let frame = 0;
    let startedAt: number | null = null;
    const animate = (now: number) => {
      if (startedAt === null) startedAt = now;
      const elapsed = now - startedAt;
      const next = [0, 1].map(index => {
        const linear = Math.min(1, Math.max(0, (elapsed - index * stagger) / duration));
        return 1 - Math.pow(1 - linear, 3);
      });
      setProgress(next);
      if (next.some(value => value < 1)) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [isVisible, statistics]);

  const activeIncidents = statistics
    ? Math.max(0, statistics.registeredIncidents - statistics.approvedIncidents - statistics.rejectedIncidents)
    : 0;
  const responseRate = statistics && statistics.registeredIncidents > 0
    ? Math.round((statistics.approvedIncidents / statistics.registeredIncidents) * 100)
    : 0;
  const kpis = [
    { label: 'کل حوادث ثبت‌شده', value: statistics?.registeredIncidents, icon: ShieldAlert, accent: darkMode ? 'text-slate-100' : 'text-[#020617]', iconSurface: 'bg-slate-200 border-slate-400 dark:bg-slate-500/10 dark:border-current/10', edge: 'border-t-[#0F172A]', labelAccent: darkMode ? 'text-slate-400' : 'text-[#0F172A]' },
    { label: 'حوادث در حال بررسی', value: statistics ? activeIncidents : undefined, icon: Activity, accent: 'text-[#DC2626] dark:text-red-400', iconSurface: 'bg-red-50 border-current/10 dark:bg-red-500/10', edge: 'border-t-[#DC2626]' },
    { label: 'داوطلبان ثبت‌شده', value: statistics?.registeredVolunteers, icon: Users, accent: 'text-[#2563EB] dark:text-blue-400', iconSurface: 'bg-blue-50 border-current/10 dark:bg-blue-500/10', edge: 'border-t-[#2563EB]' },
    { label: 'شهرهای تحت پوشش', value: statistics?.coveredCities, icon: Globe2, accent: 'text-[#2563EB] dark:text-slate-300', iconSurface: 'bg-blue-50 border-current/10 dark:bg-slate-500/10', edge: 'border-t-[#2563EB]' },
    { label: 'نرخ پاسخ تأییدشده', value: statistics ? responseRate : undefined, suffix: '%', icon: CheckCircle, accent: 'text-[#16A34A] dark:text-emerald-400', iconSurface: 'bg-green-50 border-current/10 dark:bg-emerald-500/10', edge: 'border-t-[#16A34A]' }
  ];

  return (
    <section ref={sectionRef} aria-labelledby="homepage-statistics-title" className="space-y-4 md:space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <p className="text-[10px] md:text-xs font-black text-blue-600 dark:text-blue-400">نمای لحظه‌ای شبکه</p>
          <h2 id="homepage-statistics-title" className={`mt-1 text-lg md:text-2xl font-black tracking-tight ${darkMode ? 'text-slate-100' : 'text-[#0F172A]'}`}>
            شاخص‌های کلیدی عملیات
          </h2>
        </div>
        <span className={`w-fit inline-flex items-center gap-2.5 rounded-full border px-4 py-2 text-[11px] font-bold shadow-sm ${
          darkMode ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300' : 'bg-emerald-50 border-emerald-300 text-emerald-700'
        }`}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          داده‌های زنده سامانه
        </span>
      </div>

      {loadingError ? (
        <div className={`rounded-2xl border p-5 text-center text-xs font-bold ${darkMode ? 'border-red-900/50 bg-slate-950 text-red-300' : 'border-red-200 bg-red-50 text-red-700'}`}>
          دریافت آمار فعلی ممکن نیست.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4" dir="rtl">
            {kpis.map(kpi => (
              <article key={kpi.label} className={`rounded-2xl border p-4 md:p-5 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 ${
                darkMode
                  ? 'min-h-[142px] border-slate-800 bg-slate-900/90 shadow-[0_10px_28px_rgba(0,0,0,.22)] hover:border-slate-700 hover:shadow-[0_16px_36px_rgba(0,0,0,.3)]'
                  : `min-h-[150px] border-slate-200 border-t-[3px] ${kpi.edge} bg-white shadow-[0_10px_26px_rgba(15,23,42,.075)] hover:border-slate-300 hover:shadow-[0_18px_40px_rgba(15,23,42,.13)]`
              }`}>
                <div className={`${darkMode ? 'w-10 h-10' : 'w-11 h-11'} rounded-xl border flex items-center justify-center ${kpi.iconSurface}`}>
                  <kpi.icon className={`${darkMode ? 'w-5 h-5' : 'w-6 h-6'} ${kpi.accent}`} />
                </div>
                <div className="mt-3">
                  <div className={`font-sans leading-none tracking-tight tabular-nums ${darkMode ? 'text-[35px] md:text-[36px] font-black' : 'text-[30px] md:text-[32px] font-extrabold'} ${kpi.accent}`}>
                    {statistics ? (kpi.value ?? 0).toLocaleString('en-US') : '…'}{statistics && kpi.suffix}
                  </div>
                  <p className={`mt-2.5 text-[10px] md:text-[11px] font-semibold leading-5 ${('labelAccent' in kpi ? kpi.labelAccent : undefined) ?? (darkMode ? 'text-slate-400' : 'text-slate-500')}`}>{kpi.label}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" dir="rtl">
            {(statistics ? donuts : [
              { title: 'کل داوطلبان', total: 0, segments: [] },
              { title: 'کل حوادث ثبت شده', total: 0, segments: [] }
            ]).map((donut, chartIndex) => {
              let cumulative = 0;
              return (
                <article
                  key={donut.title}
                  className={`rounded-2xl border p-4 md:p-5 flex flex-col sm:flex-row items-center gap-4 md:gap-6 ${
                    darkMode
                      ? 'border-slate-800 bg-slate-900/70'
                      : 'border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,.045)]'
                  }`}
                >
                  <div className="relative shrink-0 h-32 w-32 md:h-36 md:w-36">
                    <svg viewBox="0 0 120 120" className="-rotate-90 h-full w-full" aria-hidden="true">
                      <circle cx="60" cy="60" r={RADIUS} fill="none" stroke={darkMode ? '#1e293b' : '#e2e8f0'} strokeWidth={darkMode ? 9 : 11} />
                      {donut.segments.map(segment => {
                        const fraction = donut.total > 0 ? segment.value / donut.total : 0;
                        const start = cumulative;
                        cumulative += fraction;
                        return (
                          <circle
                            key={segment.label}
                            cx="60"
                            cy="60"
                            r={RADIUS}
                            fill="none"
                            stroke={segment.color}
                            strokeWidth={darkMode ? 9 : 11}
                            strokeDasharray={`${CIRCUMFERENCE * fraction * progress[chartIndex]} ${CIRCUMFERENCE}`}
                            strokeDashoffset={-CIRCUMFERENCE * start}
                            strokeLinecap={darkMode ? 'butt' : 'round'}
                          />
                        );
                      })}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className={`font-sans tabular-nums ${darkMode ? 'text-xl md:text-2xl font-black text-white' : 'text-2xl md:text-[28px] font-extrabold text-[#0F172A]'}`}>
                        {statistics
                          ? Math.round(donut.total * progress[chartIndex]).toLocaleString('en-US')
                          : '…'}
                      </span>
                      <span className={`mt-1 text-[10px] font-extrabold ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        {donut.title}
                      </span>
                    </div>
                  </div>

                  <div className="w-full flex-1 space-y-2">
                    <h3 className={`mb-3 text-sm font-extrabold ${darkMode ? 'text-white' : 'text-[#0F172A]'}`}>ترکیب وضعیت {donut.title}</h3>
                    {donut.segments.map(segment => (
                      <div key={segment.label} className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-[11px] font-bold ${darkMode ? 'border-transparent bg-slate-800/70 text-slate-200' : 'border-slate-100 bg-white text-slate-700 shadow-[0_2px_8px_rgba(15,23,42,.035)]'}`}>
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: segment.color }} />
                          <span className="truncate">{segment.label}</span>
                        </span>
                        <span className="shrink-0 font-sans font-extrabold tabular-nums">{segment.value.toLocaleString('en-US')}</span>
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>

        </>
      )}
    </section>
  );
}

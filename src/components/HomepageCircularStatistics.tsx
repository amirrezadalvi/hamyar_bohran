'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

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

  return (
    <section ref={sectionRef} aria-labelledby="homepage-statistics-title" className="max-w-5xl mx-auto space-y-4">
      <div className="text-center space-y-1">
        <h2 id="homepage-statistics-title" className={`text-base md:text-xl font-black ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
          آمار زنده شبکه همیار بحران
        </h2>
      </div>

      {loadingError ? (
        <div className={`rounded-2xl border p-5 text-center text-xs font-bold ${darkMode ? 'border-red-900/50 bg-slate-950 text-red-300' : 'border-red-200 bg-red-50 text-red-700'}`}>
          دریافت آمار فعلی ممکن نیست.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6" dir="rtl">
            {(statistics ? donuts : [
              { title: 'کل داوطلبان', total: 0, segments: [] },
              { title: 'کل حوادث ثبت شده', total: 0, segments: [] }
            ]).map((donut, chartIndex) => {
              let cumulative = 0;
              return (
                <article
                  key={donut.title}
                  className={`rounded-3xl border p-4 md:p-6 transition-transform duration-300 hover:-translate-y-1 ${
                    darkMode
                      ? 'border-slate-700/70 bg-gradient-to-br from-slate-950 to-slate-900 shadow-[0_16px_35px_rgba(0,0,0,0.28)]'
                      : 'border-slate-200 bg-white shadow-[0_14px_30px_rgba(15,23,42,0.08)]'
                  }`}
                >
                  <div className="relative mx-auto h-40 w-40 md:h-48 md:w-48">
                    <svg viewBox="0 0 120 120" className="-rotate-90 h-full w-full" aria-hidden="true">
                      <circle cx="60" cy="60" r={RADIUS} fill="none" stroke={darkMode ? '#1e293b' : '#e2e8f0'} strokeWidth="11" />
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
                            strokeWidth="11"
                            strokeDasharray={`${CIRCUMFERENCE * fraction * progress[chartIndex]} ${CIRCUMFERENCE}`}
                            strokeDashoffset={-CIRCUMFERENCE * start}
                            strokeLinecap="butt"
                          />
                        );
                      })}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className={`font-mono text-2xl md:text-3xl font-black tabular-nums ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                        {statistics
                          ? Math.round(donut.total * progress[chartIndex]).toLocaleString('fa-IR')
                          : '…'}
                      </span>
                      <span className={`mt-1 text-[10px] font-bold ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        {donut.title}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 space-y-2">
                    {donut.segments.map(segment => (
                      <div key={segment.label} className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-[11px] font-bold ${darkMode ? 'bg-slate-800/70 text-slate-200' : 'bg-slate-50 text-slate-700'}`}>
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: segment.color }} />
                          <span className="truncate">{segment.label}</span>
                        </span>
                        <span className="shrink-0 font-mono font-black">{segment.value.toLocaleString('fa-IR')}</span>
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>

          {statistics && (
            <div className={`mx-auto w-fit rounded-2xl border px-4 py-2 text-[11px] font-bold ${darkMode ? 'border-purple-500/30 bg-purple-500/10 text-purple-200' : 'border-purple-200 bg-purple-50 text-purple-800'}`}>
              شهرهای دارای داوطلب تأییدشده: <span className="font-mono font-black">{statistics.coveredCities.toLocaleString('fa-IR')}</span>
            </div>
          )}
        </>
      )}
    </section>
  );
}

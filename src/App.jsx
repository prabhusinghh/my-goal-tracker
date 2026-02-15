import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';



// Imports from other files
import ThemeToggle from './components/ThemeToggle';
import DayEventsEditor from './components/DayEventsEditor';
import TaskHistoryModal from './components/TaskHistoryModal';
import { 
  hoverCardVariants, hoverDayCell, checkboxVisualVariants, 
  progressVariants, checkmarkVariants 
} from './utils/animations';
import { 
  monthNames, daysInMonth, dateString, weekdayShort, 
  getStorageKey, loadInitialActivities, loadInitialEvents, 
  dayBadgeColor, getGradientStyle, calculateGlobalStats 
} from './utils/helpers';

export default function DailyGoalTracker() {

  


  const today = new Date();
  
  // --- STATE ---
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [activities, setActivities] = useState(() => loadInitialActivities(today.getFullYear(), today.getMonth()));
  const [events, setEvents] = useState(() => loadInitialEvents(today.getFullYear(), today.getMonth()));
  
  const [isDataLoaded, setIsDataLoaded] = useState(true);
  const isFirstRender = useRef(true);

  const [newActivityName, setNewActivityName] = useState('');
  const [lastRemoved, setLastRemoved] = useState(null);
  
  // Modal State
  const [showHistory, setShowHistory] = useState(false);

  // Span inputs
  const [pendingFrom, setPendingFrom] = useState('1');
  const [pendingTo, setPendingTo] = useState('1');
  const [dayFrom, setDayFrom] = useState(1);
  const [dayTo, setDayTo] = useState(1);
  const [spanError, setSpanError] = useState('');

  // UI state
  const [selectedDay, setSelectedDay] = useState(null);
  const scrollRef = useRef(null);
  const [darkMode, setDarkMode] = useState(() => {
    try { return localStorage.getItem('dg-dark-mode') === '1'; } catch (e) { return false; }
  });

  // --- EFFECTS ---
  useEffect(() => {
    document.title = "Goal Ledger";
    const link = document.querySelector("link[rel*='icon']") || document.createElement('link');
    link.type = 'image/svg+xml'; link.rel = 'icon'; link.href = '/favicon.svg';
    document.getElementsByTagName('head')[0].appendChild(link);
  }, []);

  useEffect(() => {
    try { localStorage.setItem('dg-dark-mode', darkMode ? '1' : '0'); } catch (e) {}
    if (typeof document !== 'undefined') {
      if (darkMode) document.documentElement.classList.add('dark'); else document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      const mt = daysInMonth(year, month);
      setDayFrom(1); setDayTo(mt); setPendingFrom('1'); setPendingTo(String(mt));
      return;
    }
    const mt = daysInMonth(year, month);
    setDayFrom(1); setDayTo(mt); setPendingFrom('1'); setPendingTo(String(mt));
    setSelectedDay(null); 
    setActivities(loadInitialActivities(year, month));
    setEvents(loadInitialEvents(year, month));
    setIsDataLoaded(true);
  }, [year, month]);

  // --- UPDATED: AUTO-SCROLL & AUTO-SELECT TODAY ON LOAD ---
  useEffect(() => {
    const timer = setTimeout(() => {
      const t = new Date();
      // Check if we are viewing the actual current month/year
      if (year === t.getFullYear() && month === t.getMonth()) {
        const d = t.getDate();
        
        // 1. Select Today (Highlights the column & Opens the Editor)
        setSelectedDay(d); 

        // 2. Scroll to Today
        if (scrollRef.current) {
          const container = scrollRef.current;
          const element = document.getElementById(`day-header-${d}`);
          
          if (element) {
            // Center the element in the container
            const scrollPos = element.offsetLeft - (container.clientWidth / 2) + (element.clientWidth / 2);
            container.scrollTo({ left: scrollPos, behavior: 'smooth' });
          }
        }
      }
    }, 500); // 500ms delay ensures the UI is painted before scrolling

    return () => clearTimeout(timer);
  }, [year, month, isDataLoaded]);

  useEffect(() => {
    if (!isDataLoaded) return;
    const actKey = getStorageKey('activities', year, month);
    const evKey = getStorageKey('events', year, month);
    try { localStorage.setItem(actKey, JSON.stringify(activities)); } catch (e) { console.warn(e); }
    try { localStorage.setItem(evKey, JSON.stringify(events)); } catch (e) { console.warn(e); }
  }, [activities, events, year, month, isDataLoaded]);

  useEffect(() => {
    if (!lastRemoved) return;
    const t = setTimeout(() => setLastRemoved(null), 7000);
    return () => clearTimeout(t);
  }, [lastRemoved]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    function update() { }
    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => { el.removeEventListener('scroll', update); window.removeEventListener('resize', update); };
  }, [month, year]);

  // --- LOGIC ---
  function id() { return Math.random().toString(36).slice(2,9); }

  function addActivity() {
    const name = newActivityName.trim();
    if (!name) return;
    setActivities(prev => [...prev, { id: id(), name, checks: {} }]);
    setNewActivityName('');
  }

  function removeActivity(aid) {
    setActivities(prev => {
      const idx = prev.findIndex(p => p.id === aid);
      if (idx === -1) return prev;
      const copy = [...prev];
      const [removed] = copy.splice(idx, 1);
      setLastRemoved({ activity: removed, index: idx });
      return copy;
    });
  }

  function undoRemove() {
    if (!lastRemoved) return;
    setActivities(prev => {
      const copy = [...prev];
      const i = Math.min(Math.max(0, lastRemoved.index), copy.length);
      copy.splice(i, 0, lastRemoved.activity);
      return copy;
    });
    setLastRemoved(null);
  }

  function isDayLocked(d) {
    const cellDate = new Date(year, month, d);
    cellDate.setHours(0, 0, 0, 0); 
    const today = new Date();
    today.setHours(0, 0, 0, 0); 

    if (cellDate > today) return true;
    const diffTime = today.getTime() - cellDate.getTime();
    const diffDays = diffTime / (1000 * 3600 * 24);
    if (diffDays > 1) return true;
    return false;
  }

  function toggleCheck(activityId, day) {
    if (isDayLocked(day)) return; 

    setActivities(prev => prev.map(act => {
      if (act.id !== activityId) return act;
      const copy = { ...act.checks };
      const k = dateString(year, month, day);
      const isChecking = !copy[k]; 
      if (copy[k]) delete copy[k]; else copy[k] = true;

      if (isChecking) {
         const mt = daysInMonth(year, month);
         const start = Math.max(1, Math.min(dayFrom, mt));
         const end = Math.max(1, Math.min(dayTo, mt));
         const s = Math.min(start, end);
         const effectiveEnd = (year === today.getFullYear() && month === today.getMonth()) 
            ? Math.min(Math.max(start, end), today.getDate()) 
            : Math.max(start, end);

         let checkedCount = 0;
         const totalDays = effectiveEnd - s + 1;
         for (let d = s; d <= effectiveEnd; d++) {
            if (copy[dateString(year, month, d)]) checkedCount++;
         }
         if (totalDays > 0 && checkedCount === totalDays) {
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#6366f1', '#10b981', '#f59e0b'] });
         }
      }
      return { ...act, checks: copy };
    }));
  }

  function getEfficiencyData(act) {
    const mt = daysInMonth(year, month);
    const start = Math.max(1, Math.min(dayFrom, mt));
    const end = Math.max(1, Math.min(dayTo, mt));
    const s = Math.min(start, end);
    const e = Math.max(start, end);

    let effectiveEnd = e;
    if (year === today.getFullYear() && month === today.getMonth()) {
      effectiveEnd = Math.min(e, today.getDate());
    }
    if (s > effectiveEnd) return { checkedCount: 0, totalDays: 0, percent: 0 };

    const totalDays = effectiveEnd - s + 1;
    let checked = 0;
    for (let d = s; d <= effectiveEnd; d++) {
      if (act.checks[dateString(year, month, d)]) checked++;
    }
    const percent = totalDays <= 0 ? 0 : Math.round((checked / totalDays) * 100);
    return { checkedCount: checked, totalDays, percent };
  }

  const monthTotal = daysInMonth(year, month);
  const canApply = (() => {
    const a = Number(pendingFrom), b = Number(pendingTo);
    if (!Number.isInteger(a) || !Number.isInteger(b)) return false;
    if (a < 1 || b < 1 || a > monthTotal || b > monthTotal) return false;
    return a <= b;
   })();

  function applySpan() {
    setSpanError('');
    const a = Number(pendingFrom), b = Number(pendingTo);
    if (!Number.isInteger(a) || !Number.isInteger(b)) { setSpanError('Use whole numbers'); return; }
    if (a < 1 || b < 1 || a > monthTotal || b > monthTotal) { setSpanError(`Values must be 1..${monthTotal}`); return; }
    if (a > b) { setSpanError('From must be <= To'); return; }
    setDayFrom(a); setDayTo(b); setSelectedDay(null);
  }

  const spanStart = Math.min(dayFrom, dayTo);
  const spanEnd = Math.max(dayFrom, dayTo);
  const shownDays = Array.from({ length: Math.max(0, spanEnd - spanStart + 1) }, (_, i) => spanStart + i);

  function getEventsForDay(d) { return events[dateString(year, month, d)] || []; }
  
  function addEvent(d, ev) {
    const k = dateString(year, month, d);
    setEvents(prev => { const copy = { ...prev }; const arr = (copy[k] || []).slice(); arr.push({ id: id(), ...ev }); copy[k] = arr; return copy; });
  }
  function updateEvent(d, eventId, patch) {
    const k = dateString(year, month, d);
    setEvents(prev => { const copy = { ...prev }; const arr = (copy[k] || []).map(it => it.id === eventId ? { ...it, ...patch } : it); if (arr.length) copy[k] = arr; else delete copy[k]; return copy; });
  }
  function removeEvent(d, eventId) {
    const k = dateString(year, month, d);
    setEvents(prev => { const copy = { ...prev }; const arr = (copy[k] || []).filter(it => it.id !== eventId); if (arr.length) copy[k] = arr; else delete copy[k]; return copy; });
  }

  function goToTodayAndHighlight() {
    const td = new Date();
    const d = td.getDate();
    const m = td.getMonth();
    const y = td.getFullYear();
    if (year !== y || month !== m) { setYear(y); setMonth(m); }
    const mt = daysInMonth(y, m);
    setDayFrom(1); setDayTo(mt); setPendingFrom('1'); setPendingTo(String(mt));
    setSelectedDay(d);
    setTimeout(() => setSelectedDay(null), 2000); 
    setTimeout(() => {
        if(scrollRef.current) {
            const container = scrollRef.current;
            const element = document.getElementById(`day-header-${d}`);
            if (element) {
                const scrollPos = element.offsetLeft - (container.clientWidth / 2) + (element.clientWidth / 2);
                container.scrollTo({ left: scrollPos, behavior: 'smooth' });
            }
        }
    }, 100);
  }

  function handleMonthChange(e) { setMonth(Number(e.target.value)); }
  function handleYearChange(e) { setYear(Number(e.target.value || today.getFullYear())); }

  function exportMonth() {
    const payload = { year, month, activities, events };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `daily-goals-${year}-${String(month+1).padStart(2,'0')}.json`; a.click(); URL.revokeObjectURL(url);
  }

  function importMonth(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data && typeof data.year === 'number' && typeof data.month === 'number' && Array.isArray(data.activities)) {
          setYear(data.year); setMonth(data.month); setActivities(data.activities); setEvents(data.events || {}); alert('Imported');
        } else alert('Invalid file format');
      } catch (err) { alert('Failed to import'); }
    };
    reader.readAsText(file);
  }


  return (
    <div className={`relative w-full min-h-screen p-2 md:p-8 transition-colors duration-500 ${darkMode ? 'bg-slate-900 text-gray-100' : 'bg-gradient-to-br from-indigo-50 via-purple-50 to-teal-50 text-gray-900'}`}>

    <style>{`
      .custom-scrollbar::-webkit-scrollbar { height: 12px; }
      .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
      .custom-scrollbar::-webkit-scrollbar-thumb { 
        background-color: #cbd5e1; 
        border-radius: 20px; 
        border: 3px solid transparent; 
        background-clip: content-box; 
      }
      .dark .custom-scrollbar::-webkit-scrollbar-track { background-color: #1e293b; border-bottom-left-radius: 1rem; border-bottom-right-radius: 1rem;}
      .dark .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #475569; border: 3px solid #1e293b; }
      .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #64748b; }
    `}</style>
      
      <motion.div 
        variants={hoverCardVariants}
        initial="initial"
        whileHover="hover"
        className={`relative max-w-7xl mx-auto backdrop-blur-xl rounded-2xl md:rounded-3xl border border-white/20 p-4 md:p-8 transition-colors duration-500 ${darkMode ? 'bg-slate-900/70' : 'bg-white/60'}`}
      >
        
        <div className="absolute top-4 right-4 md:hidden z-50">
            <ThemeToggle darkMode={darkMode} setDarkMode={setDarkMode} />
        </div>

        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 md:mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
              GOAL LEDGER 
              <span className="block md:inline md:ml-2 text-lg md:text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
                - A Daily Goal Tracker
              </span>
            </h1>
            <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">Your personal growth companion.</div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 md:gap-3 bg-white/50 dark:bg-slate-800/50 p-2 rounded-2xl border border-white/20 shadow-sm self-start md:self-auto w-full md:w-auto">
            <select 
              value={month} 
              onChange={handleMonthChange} 
              className="flex-1 md:flex-none bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-200 font-medium rounded-lg shadow-sm px-3 py-1.5 outline-none cursor-pointer focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
            >
              {monthNames.map((m, i) => (<option key={m} value={i}>{m}</option>))}
            </select>

            <input 
              type="number" 
              value={year} 
              onChange={handleYearChange} 
              className="w-16 md:w-20 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-600 text-center text-gray-700 dark:text-gray-200 font-medium rounded-lg shadow-sm px-1 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm" 
            />

            {/* TODAY BUTTON: Sky Blue Theme */}
            <motion.button 
                whileHover={{ scale: 1.05, y: -1 }}
                whileTap={{ scale: 0.95 }}
                onClick={goToTodayAndHighlight} 
                className="
                  px-4 py-2 rounded-xl text-xs md:text-sm font-bold shadow-sm transition-all
                  bg-sky-100 text-sky-700 border border-sky-200
                  hover:bg-sky-200 hover:shadow-md
                  dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-800
                "
            >
                Today
            </motion.button>
            
            <div className="hidden md:flex">
                <ThemeToggle darkMode={darkMode} setDarkMode={setDarkMode} />
            </div>

          </div>
        </div>

        {/* INPUT AREA */}
        <div className="mb-6 flex flex-col md:flex-row gap-3">
          <div className="flex-1 w-full relative group">
            <input 
              className="w-full pl-4 pr-12 py-3 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm group-hover:shadow-md text-gray-900 dark:text-white placeholder-gray-400" 
              placeholder="Add a new habit..." 
              value={newActivityName} 
              onChange={e => setNewActivityName(e.target.value)} 
              onKeyDown={e => { if (e.key === 'Enter') addActivity(); }} 
            />
            
            {/* ADD BUTTON: Indigo/Purple Gradient */}
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.9 }}
              onClick={addActivity} 
              className="
                absolute right-2 top-2 p-2 rounded-lg shadow-lg text-white transition-all
                bg-gradient-to-r from-indigo-600 to-violet-600
                hover:shadow-indigo-500/30 hover:from-indigo-500 hover:to-violet-500
              "
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </motion.button>
          </div>

          <div className="flex gap-2 w-full md:w-auto overflow-x-auto md:overflow-visible pb-1 md:pb-0">
             
             {/* HISTORY BUTTON: Amber Theme */}
             <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowHistory(true)}
                className="
                  flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold shadow-sm transition-all whitespace-nowrap
                  bg-amber-50 text-amber-700 border border-amber-200
                  hover:bg-amber-100 hover:border-amber-300 hover:shadow-md
                  dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800
                "
              >
                <span>📜 History</span>
              </motion.button>

             {/* EXPORT BUTTON: Slate Theme */}
             <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={exportMonth} 
                className="
                  px-4 py-3 rounded-xl text-sm font-bold shadow-sm transition-all
                  bg-slate-100 text-slate-700 border border-slate-200
                  hover:bg-slate-200 hover:text-slate-900
                  dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700
                "
             >
                Export
             </motion.button>

             {/* IMPORT BUTTON: Outline Theme */}
             <motion.label 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="
                  px-4 py-3 rounded-xl text-sm font-bold shadow-sm transition-all cursor-pointer whitespace-nowrap
                  bg-white text-slate-600 border-2 border-slate-100
                  hover:border-indigo-200 hover:text-indigo-600
                  dark:bg-slate-900 dark:text-slate-400 dark:border-slate-700 dark:hover:border-slate-600
                "
             >
               Import <input type="file" accept="application/json" className="hidden" onChange={e => e.target.files?.[0] && importMonth(e.target.files[0])} />
             </motion.label>
          </div>
        </div>

        {/* RANGE CONTROLS */}
        <div className={`mb-6 p-3 md:p-4 rounded-2xl border border-gray-100 dark:border-slate-700 flex flex-wrap items-center gap-2 md:gap-3 transition-colors ${darkMode ? 'bg-slate-800/50' : 'bg-gray-50/50'}`}>
          <div className="text-xs md:text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-full md:w-auto">View Range</div>
          <div className="flex items-center gap-2">
            <input value={pendingFrom} onChange={e => { setPendingFrom(e.target.value); setSpanError(''); }} className="w-12 md:w-14 text-center p-1.5 rounded-lg bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 focus:border-indigo-500 outline-none text-sm" />
            <span className="text-gray-400">-</span>
            <input value={pendingTo} onChange={e => { setPendingTo(e.target.value); setSpanError(''); }} className="w-12 md:w-14 text-center p-1.5 rounded-lg bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 focus:border-indigo-500 outline-none text-sm" />
          </div>
          
          {/* SET VIEW: Teal Theme */}
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            disabled={!canApply} 
            onClick={applySpan} 
            className={`
              px-4 py-1.5 rounded-lg font-bold text-xs md:text-sm transition-all shadow-sm
              ${canApply 
                ? 'bg-teal-500 text-white shadow-teal-200 hover:bg-teal-600 hover:shadow-md dark:shadow-none' 
                : 'bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-slate-800 dark:text-slate-600'
              }
            `}
          >
            Set View
          </motion.button>

          {/* RESET: Rose Outline */}
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { 
              setDayFrom(1); setDayTo(daysInMonth(year, month)); setPendingFrom('1'); setPendingTo(String(daysInMonth(year, month))); 
            }} 
            className="
              px-4 py-1.5 rounded-lg font-bold text-xs md:text-sm transition-all
              bg-white border border-gray-200 text-gray-500
              hover:border-rose-200 hover:text-rose-500 hover:bg-rose-50
              dark:bg-slate-800 dark:border-slate-600 dark:text-slate-400 dark:hover:text-rose-400
            "
          >
            Reset
          </motion.button>
          <div className="w-full md:w-auto text-xs font-medium text-rose-500">{spanError}</div>
        </div>

        <div ref={scrollRef} className="custom-scrollbar overflow-x-auto rounded-2xl border border-gray-100 dark:border-slate-700/50 shadow-sm bg-white dark:bg-slate-800 relative">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="hidden md:table-cell p-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-r border-gray-100 dark:border-slate-700 sticky left-0 bg-gray-100 dark:bg-slate-900 z-30 w-16 min-w-[4rem] shadow-sm">#</th>
                
                <th className="p-2 md:p-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-r border-gray-100 dark:border-slate-700 sticky left-0 md:left-16 bg-gray-100 dark:bg-slate-900 z-30 min-w-[120px] md:min-w-[110px] shadow-sm">ACTIVITY</th>
                
                {shownDays.map(d => {
                  const evs = getEventsForDay(d);
                  const badge = dayBadgeColor(evs);
                  const isSelected = selectedDay === d;

                  return (
                    <motion.th 
                      key={d} 
                      id={`day-header-${d}`} 
                      variants={hoverDayCell}
                      initial="initial"
                      whileHover="hover"
                      whileTap="tap"
                      onClick={() => setSelectedDay(prev => prev === d ? null : d)} 
                      className="p-1 md:p-2 border-b border-r border-gray-100 dark:border-slate-700 min-w-[56px] md:min-w-[64px] cursor-pointer group"
                    >
                      <div className={`
                        flex flex-col items-center justify-center rounded-xl py-2 transition-all duration-200 border border-transparent
                        ${isSelected 
                          ? 'bg-indigo-600 text-white shadow-md transform scale-105 z-10' 
                          : badge.bg !== 'bg-transparent'
                            ? `${badge.bg} ${badge.text}` 
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700/50'
                        }
                      `}>
                        <div className="font-bold text-base md:text-lg">{d}</div>
                        <div className={`text-[9px] md:text-[10px] uppercase font-semibold ${isSelected ? 'opacity-90' : 'opacity-60'}`}>{weekdayShort(year, month, d)}</div>
                      </div>
                    </motion.th>
                  );
                })}

                <th className="p-2 md:p-4 text-center text-xs font-extrabold text-gray-500 uppercase tracking-wider border-b border-l border-gray-100 dark:border-slate-700 min-w-[100px] md:min-w-[150px] sticky right-0 z-30 bg-gray-100 dark:bg-slate-900 shadow-sm">
                  PROGRESS %
                </th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout">
                {activities.map((a, idx) => {
                  const { checkedCount, totalDays, percent } = getEfficiencyData(a);
                  const { current: currentStreak, max: maxStreak } = calculateGlobalStats(a, year, month);
                  const gradientBg = getGradientStyle(percent);

                  return (
                    <motion.tr 
                      key={a.id} 
                      layout
                      exit={{ opacity: 0, x: -50, transition: { duration: 0.2 } }}
                      className="group bg-white dark:bg-slate-800"
                      variants={hoverCardVariants}
                      initial="initial"
                      whileHover="hover"
                      whileTap="tap"
                      role="group"
                      tabIndex={0}
                    >
                      <td className="hidden md:table-cell p-4 border-b border-r border-gray-100 dark:border-slate-700 font-medium text-gray-400 text-center sticky left-0 z-20 group-hover:z-50 shadow-sm transition-colors bg-gray-100 dark:bg-slate-900 group-hover:bg-gray-200 dark:group-hover:bg-black">
                        {idx + 1}
                      </td>
                      
                      <td className="p-2 md:p-4 border-b border-r border-gray-100 dark:border-slate-700 sticky left-0 md:left-16 z-20 group-hover:z-50 shadow-sm transition-colors align-top bg-gray-100 dark:bg-slate-900 group-hover:bg-gray-200 dark:group-hover:bg-black">
                        <div className="font-bold text-gray-800 dark:text-gray-100 text-sm md:text-lg break-words max-w-[110px] md:max-w-none">{a.name}</div>
                        
                        <div className="flex flex-col items-start gap-1 mt-1 md:mt-2">
                          <div className="flex items-center gap-1">
                            <div className="text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 md:py-1 rounded-md bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 font-medium flex items-center gap-1">🔥 {currentStreak}</div>
                            <div className="text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 md:py-1 rounded-md bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-medium flex items-center gap-1">🏆 {maxStreak}</div>
                          </div>

                          <motion.button 
                            whileHover={{ scale: 1.05, backgroundColor: "rgba(244, 63, 94, 0.1)", color: "#f43f5e" }} 
                            whileTap={{ scale: 0.95 }}
                            onClick={(e) => { e.stopPropagation(); removeActivity(a.id); }}
                            className="
                              relative group/btn flex items-center justify-center gap-1.5 mt-2 
                              px-3 py-1.5 rounded-lg 
                              text-gray-400 transition-all duration-200 
                              border border-transparent hover:border-rose-200 dark:hover:border-rose-900/30
                              cursor-pointer z-50
                            "
                            aria-label="Delete activity"
                          >
                            <span className="pointer-events-none flex items-center gap-1.5">
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                              </svg>
                              <span className="text-[11px] font-semibold">Delete</span>
                            </span>
                          </motion.button>

                        </div>
                      </td>

                      {shownDays.map(d => {
                        const checked = !!a.checks[dateString(year, month, d)];
                        const locked = isDayLocked(d); 
                        const isFuture = new Date(year, month, d) > new Date();
                        const isMissed = locked && !checked && !isFuture;

                        return (
                          <td key={d} className={`p-0 border-b border-r border-gray-100 dark:border-slate-700 text-center group-hover:bg-gray-50 dark:group-hover:bg-slate-700 transition-colors ${selectedDay === d ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}>
                            <motion.button 
                              initial="initial"
                              whileHover={!locked ? "hover" : undefined}
                              whileTap={!locked ? "tap" : undefined}
                              disabled={locked} 
                              onClick={() => toggleCheck(a.id, d)}
                              className={`w-full h-12 md:h-16 flex items-center justify-center focus:outline-none ${locked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                            >
                                <motion.div
                                  variants={!locked ? checkboxVisualVariants : {}}
                                  className={`w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${checked ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200 dark:shadow-none' : isMissed ? 'bg-rose-50 border-2 border-rose-100 dark:bg-slate-800 dark:border-slate-700 opacity-50' : 'bg-gray-100 border-2 border-gray-200 dark:bg-slate-900 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500'}`}
                                >
                                    <AnimatePresence mode="wait">
                                      {checked ? (
                                          <motion.span key="check" variants={checkmarkVariants} initial="hidden" animate="visible" exit="hidden" className="flex items-center justify-center">
                                              <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                          </motion.span>
                                      ) : isMissed ? <span className="text-rose-300 dark:text-slate-600 text-xs font-bold">−</span> : null}
                                    </AnimatePresence>
                                </motion.div>
                            </motion.button>
                          </td>
                        );
                      })}
                      
                      <td className="p-2 md:p-4 border-b border-l border-gray-100 dark:border-slate-700 bg-gray-100 dark:bg-slate-900 group-hover:bg-gray-200 dark:group-hover:bg-black transition-colors sticky right-0 z-20">
                        <motion.div className="progress-card rounded-md p-2" variants={progressVariants} initial="initial" whileHover="hover">
                            <div className="text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400 text-right mb-1">{checkedCount}/{totalDays}</div>
                            <div className="flex items-center gap-2 md:gap-3">
                              <div className="flex-1 h-2 md:h-2.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden shadow-inner">
                                <motion.div initial={{ width: 0 }} animate={{ width: `${percent}%`, backgroundPosition: ["0% 50%", "100% 50%"] }} transition={{ width: { type: "spring", stiffness: 50, damping: 15 }, backgroundPosition: { duration: 2, repeat: Infinity, ease: "linear" } }} style={{ backgroundImage: gradientBg, backgroundSize: "200% 100%" }} className="h-full rounded-full" />
                              </div>
                              <div className="text-xs md:text-base font-extrabold w-8 md:w-12 text-right text-gray-800 dark:text-gray-100">{percent}%</div>
                            </div>
                        </motion.div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
              {activities.length === 0 && (
                <tr><td colSpan={shownDays.length + 3} className="p-8 md:p-12 text-center text-gray-400"><div className="mb-2 text-3xl md:text-4xl">✨</div>Add a habit above to start your journey!</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Modals */}
        <AnimatePresence>
          {selectedDay && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mt-4">
              <DayEventsEditor
                key={`${year}-${month}-${selectedDay}`}
                dateKey={dateString(year, month, selectedDay)}
                day={selectedDay}
                events={getEventsForDay(selectedDay)}
                onAdd={ev => addEvent(selectedDay, ev)}
                onUpdate={(id, patch) => updateEvent(selectedDay, id, patch)}
                onRemove={id => removeEvent(selectedDay, id)}
                onClose={() => setSelectedDay(null)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showHistory && (
            <TaskHistoryModal 
              onClose={() => setShowHistory(false)} 
              onDataChange={() => {
                setEvents(loadInitialEvents(year, month));
              }}
            />
          )}
        </AnimatePresence>
        
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-slate-700 text-center">
            <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                Developed by <span className="text-indigo-600 dark:text-indigo-400">PRABHU SINGH</span>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                &copy; {new Date().getFullYear()} GOAL LEDGER. All rights reserved.
            </div>
        </div>

        {lastRemoved && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="fixed bottom-4 right-4 md:bottom-8 md:right-8 bg-gray-900 text-white px-4 py-3 md:px-6 md:py-3 rounded-xl shadow-2xl flex items-center gap-4 z-50 text-sm md:text-base max-w-[90vw]">
            <span className="truncate max-w-[200px]">Deleted "{lastRemoved.activity.name}"</span>
            <button onClick={undoRemove} className="text-indigo-400 font-bold hover:underline shrink-0">Undo</button>
          </motion.div>
        )}

      </motion.div>
    </div>
  );
}
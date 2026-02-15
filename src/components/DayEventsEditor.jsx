import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// --- ANIMATION VARIANTS ---
const itemVariants = {
  hidden: { opacity: 0, y: 5 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } }
};

const checkmarkVariants = {
  hidden: { scale: 0, opacity: 0 },
  visible: { scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 500, damping: 25 } }
};

// --- HELPER: Time Conversion ---
const parseTime = (timeStr) => {
  if (!timeStr) return { hour: '12', minute: '00', period: 'AM' };
  const [h, m] = timeStr.split(':');
  let hourInt = parseInt(h, 10);
  const period = hourInt >= 12 ? 'PM' : 'AM';
  hourInt = hourInt % 12;
  if (hourInt === 0) hourInt = 12;
  return { hour: String(hourInt).padStart(2, '0'), minute: m, period };
};

const stringifyTime = (h, m, p) => {
  let hourInt = parseInt(h, 10);
  if (p === 'PM' && hourInt < 12) hourInt += 12;
  if (p === 'AM' && hourInt === 12) hourInt = 0;
  return `${String(hourInt).padStart(2, '0')}:${m}`;
};

// --- COMPONENT: Time Picker ---
const TimePicker = ({ label, value, onChange }) => {
  const { hour, minute, period } = parseTime(value);
  const handleChange = (field, newVal) => {
    let newH = field === 'hour' ? newVal : hour;
    let newM = field === 'minute' ? newVal : minute;
    let newP = field === 'period' ? newVal : period;
    onChange(stringifyTime(newH, newM, newP));
  };
  const hours = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
  const minutes = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));
  const optionClass = "bg-white text-gray-900 dark:bg-slate-800 dark:text-white";

  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</label>
      <div className="flex items-center gap-1 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg p-1 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 transition-all">
        <select value={hour} onChange={(e) => handleChange('hour', e.target.value)} className="bg-transparent text-sm font-bold text-gray-700 dark:text-white outline-none text-center w-10 appearance-none cursor-pointer hover:text-indigo-600">
          {hours.map(h => <option key={h} value={h} className={optionClass}>{h}</option>)}
        </select>
        <span className="text-gray-400 text-xs font-bold">:</span>
        <select value={minute} onChange={(e) => handleChange('minute', e.target.value)} className="bg-transparent text-sm font-bold text-gray-700 dark:text-white outline-none text-center w-10 appearance-none cursor-pointer hover:text-indigo-600">
          {minutes.map(m => <option key={m} value={m} className={optionClass}>{m}</option>)}
        </select>
        <button type="button" onClick={() => handleChange('period', period === 'AM' ? 'PM' : 'AM')} className={`ml-1 text-[10px] font-bold px-1.5 py-1 rounded-md transition-colors ${period === 'AM' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
          {period}
        </button>
      </div>
    </div>
  );
};

export default function DayEventsEditor({ dateKey, events = [], onAdd, onUpdate, onRemove, onClose }) {
  const [activeTab, setActiveTab] = useState('schedule'); 
  const [title, setTitle] = useState('');
  const [fromTime, setFromTime] = useState('09:00'); 
  const [toTime, setToTime] = useState('10:00');
  const [type, setType] = useState('Work');
  const [priority, setPriority] = useState('Normal');
  const [notifyBefore, setNotifyBefore] = useState(5);


  // --- NEW: CALCULATE IF DAY IS PAST ---
  const today = new Date();
  today.setHours(0,0,0,0);
  
  // Parse dateKey (YYYY-MM-DD) to local date object
  const [y, m, d] = dateKey.split('-').map(Number);
  const currentViewDate = new Date(y, m - 1, d);
  
  const isPast = currentViewDate < today;
  // -------------------------------------

  // Filter Lists
  const scheduleItems = events.filter(e => e.fromTime).sort((a, b) => a.fromTime.localeCompare(b.fromTime));
  const eventItems = events.filter(e => !e.fromTime);

  // Calculate Efficiency
  const totalSchedule = scheduleItems.length;
  const completedSchedule = scheduleItems.filter(e => e.isCompleted).length;
  const progressPercent = totalSchedule === 0 ? 0 : Math.round((completedSchedule / totalSchedule) * 100);

  const getGradient = (p) => {
    if (p >= 75) return 'linear-gradient(90deg, #10b981, #34d399)'; 
    if (p >= 40) return 'linear-gradient(90deg, #f59e0b, #fbbf24)';
    return 'linear-gradient(90deg, #6366f1, #818cf8)';
  };

  function handleAdd(e) {
    e?.preventDefault();
    
    // Guard Clause: Prevent adding schedule in past
    if (activeTab === 'schedule' && isPast) return;

    const t = title.trim();
    if (!t) return;

    if (activeTab === 'schedule') {
      if (!fromTime) { alert('Please select a start time.'); return; }
      if (toTime && toTime < fromTime) { alert('End time cannot be before start time.'); return; }
    }

    const newEvent = {
       title: t,
  type,
  priority,
  isCompleted: false,
  fromTime: activeTab === 'schedule' ? fromTime : null,
  toTime: activeTab === 'schedule' ? toTime : null,
  notifyBefore: activeTab === 'schedule' ? notifyBefore : null,
  reminderScheduled: false
    };

    onAdd && onAdd(newEvent);
    setTitle('');
  }

  function toggleTaskCompletion(ev) {
    onUpdate && onUpdate(ev.id, { isCompleted: !ev.isCompleted });
  }

  const formatTimeDisplay = (timeStr) => {
    if (!timeStr) return '';
    const { hour, minute, period } = parseTime(timeStr);
    return `${hour}:${minute} ${period}`;
  };

  const ModalCheckbox = ({ checked, onClick }) => (
    <motion.button
      whileTap={{ scale: 0.8 }}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`
        flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200
        ${checked 
          ? 'bg-emerald-500 border-emerald-500 shadow-sm shadow-emerald-200 dark:shadow-none' 
          : 'bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 hover:border-indigo-400'
        }
      `}
    >
      <AnimatePresence>
        {checked && (
          <motion.svg variants={checkmarkVariants} initial="hidden" animate="visible" exit="hidden" className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </motion.svg>
        )}
      </AnimatePresence>
    </motion.button>
  );

  return (
    <div className="flex flex-col h-[600px] md:h-[550px] w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden">
      
      {/* HEADER */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span>📅</span> {dateKey} {isPast && <span className="text-[10px] px-2 py-0.5 bg-gray-200 text-gray-500 rounded-full dark:bg-slate-700 dark:text-gray-400">Past</span>}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">Plan & Track your day</p>
        </div>
        <button onClick={onClose} className="p-2 bg-white dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full text-gray-400 transition-colors shadow-sm border border-gray-100 dark:border-slate-700">✕</button>
      </div>

      <div className="flex flex-col md:flex-row h-full overflow-hidden">
        
        {/* LEFT COLUMN: INPUT */}
        <div className="w-full md:w-1/3 p-5 border-r border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col z-10">
          <div className="flex p-1 bg-gray-100 dark:bg-slate-800 rounded-lg mb-5">
            <button onClick={() => setActiveTab('schedule')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'schedule' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-gray-500 dark:text-slate-400'}`}>Schedule</button>
            <button onClick={() => setActiveTab('event')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'event' ? 'bg-white dark:bg-slate-700 text-amber-600 shadow-sm' : 'text-gray-500 dark:text-slate-400'}`}>Event</button>
          </div>

          {/* --- CONDITIONAL RENDERING: HIDE FORM IF PAST & SCHEDULE TAB --- */}
          {isPast && activeTab === 'schedule' ? (
            <div className="flex flex-col items-center justify-center h-40 text-center p-4 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-gray-200 dark:border-slate-700">
               <div className="text-3xl mb-2 grayscale opacity-50">⏳</div>
               <div className="text-sm font-bold text-gray-500 dark:text-gray-400">Scheduling Locked</div>
               <div className="text-[10px] text-gray-400 mt-1">You cannot plan schedule items for past dates.</div>
            </div>
          ) : (
            <form onSubmit={handleAdd} className="flex flex-col gap-4">
              {activeTab === 'schedule' && (
  <>
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      className="grid grid-cols-2 gap-3"
    >
      <TimePicker label="Start" value={fromTime} onChange={setFromTime} />
      <TimePicker label="End" value={toTime} onChange={setToTime} />
    </motion.div>

    <div>
      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">
        Notify Before (minutes)
      </label>
      <input
        type="number"
        min="1"
        max="120"
        value={notifyBefore}
        onChange={(e) => setNotifyBefore(Number(e.target.value))}
        className="w-full p-2.5 text-sm rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none dark:text-white transition-all"
      />
    </div>
  </>
)}


              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">{activeTab === 'schedule' ? 'Task Name' : 'Event Title'}</label>
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder={activeTab === 'schedule' ? "e.g., Team Meeting" : "e.g., Birthday Party"} className="w-full p-2.5 text-sm rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none dark:text-white transition-all" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Category</label>
                  <select value={type} onChange={e => setType(e.target.value)} className="w-full p-2 text-xs font-medium rounded-lg bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 outline-none dark:text-white cursor-pointer">
                    <option className="bg-white text-gray-900 dark:bg-slate-800 dark:text-white">Work</option>
                    <option className="bg-white text-gray-900 dark:bg-slate-800 dark:text-white">Personal</option>
                    <option className="bg-white text-gray-900 dark:bg-slate-800 dark:text-white">Exam</option>
                    <option className="bg-white text-gray-900 dark:bg-slate-800 dark:text-white">Health</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Priority</label>
                  <select value={priority} onChange={e => setPriority(e.target.value)} className="w-full p-2 text-xs font-medium rounded-lg bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 outline-none dark:text-white cursor-pointer">
                    <option className="bg-white text-gray-900 dark:bg-slate-800 dark:text-white">Normal</option>
                    <option className="bg-white text-gray-900 dark:bg-slate-800 dark:text-white">Important</option>
                  </select>
                </div>
              </div>

              <button type="submit" className={`mt-2 py-2.5 rounded-xl text-white text-sm font-bold shadow-lg shadow-indigo-200 dark:shadow-none transition-transform active:scale-95 ${activeTab === 'schedule' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500' : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400'}`}>
                {activeTab === 'schedule' ? '+ Add to Schedule' : '+ Add Event'}
              </button>
            </form>
          )}
        </div>

        {/* RIGHT COLUMN: DISPLAY */}
        <div className="flex-1 bg-gray-50/30 dark:bg-black/20 p-5 overflow-y-auto custom-scrollbar grid grid-cols-1 gap-6 content-start relative">
          
          {/* === SCHEDULE TAB === */}
          {activeTab === 'schedule' && (
            <>
                {totalSchedule > 0 && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 mb-2">
                        <div className="flex justify-between items-end mb-2">
                            <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Daily Efficiency</div>
                            <div className="text-lg font-black text-gray-800 dark:text-white">{progressPercent}%</div>
                        </div>
                        <div className="h-3 w-full bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden shadow-inner">
                            <motion.div 
                                initial={{ width: 0 }} 
                                animate={{ width: `${progressPercent}%` }} 
                                transition={{ type: 'spring', stiffness: 50, damping: 15 }}
                                style={{ background: getGradient(progressPercent) }}
                                className="h-full rounded-full relative"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent w-full animate-[shimmer_2s_infinite]"></div>
                            </motion.div>
                        </div>
                        <div className="text-[10px] text-gray-400 mt-1.5 text-right">{completedSchedule} of {totalSchedule} completed</div>
                    </motion.div>
                )}

                {scheduleItems.length > 0 ? (
                    <div>
                        <h3 className="text-xs font-extrabold text-indigo-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-indigo-500"></span> Schedule
                        </h3>
                        <div className="space-y-3 relative pl-4 border-l-2 border-indigo-100 dark:border-slate-700 ml-1">
                            <AnimatePresence mode="popLayout">
                            {scheduleItems.map((ev) => (
                                <motion.div key={ev.id} layout variants={itemVariants} initial="hidden" animate="visible" exit="exit" className="relative">
                                <div className={`absolute -left-[21px] top-3.5 w-3 h-3 rounded-full border-2 z-20 ${ev.isCompleted ? 'bg-emerald-500 border-emerald-500' : 'bg-white dark:bg-slate-800 border-indigo-400'}`}></div>
                                
                                <div className={`p-3 rounded-xl border shadow-sm group hover:shadow-md transition-all 
                                    ${ev.isCompleted ? 'bg-gray-50 border-gray-100 opacity-60 grayscale-[0.5] dark:bg-slate-800/50 dark:border-slate-700' : 
                                    ev.priority === 'Important' ? 'bg-amber-50 border-amber-100 dark:bg-amber-900/10 dark:border-amber-800' : 'bg-white border-gray-100 dark:bg-slate-800 dark:border-slate-700'
                                    }
                                `}>
                                    <div className="flex items-start gap-3">
                                    <div className="pt-1">
                                        <ModalCheckbox checked={ev.isCompleted} onClick={() => toggleTaskCompletion(ev)} />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className={`text-xs font-bold font-mono px-1.5 py-0.5 rounded ${ev.isCompleted ? 'text-gray-400 bg-gray-100 dark:bg-slate-700' : 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30'}`}>
                                                {formatTimeDisplay(ev.fromTime)}
                                            </div>
                                            {ev.toTime && <span className="text-[10px] text-gray-400 font-mono">- {formatTimeDisplay(ev.toTime)}</span>}
                                        </div>
                                        <div className={`font-semibold text-sm ${ev.isCompleted ? 'text-gray-400 line-through decoration-2 decoration-gray-300' : 'text-gray-800 dark:text-gray-200'}`}>
                                            {ev.title}
                                        </div>
                                    </div>

                                    <button onClick={() => onRemove(ev.id)} className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded transition-all">
                                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"></path></svg>
                                    </button>
                                    </div>
                                </div>
                                </motion.div>
                            ))}
                            </AnimatePresence>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-300 dark:text-slate-600 pt-10">
                        <div className="text-5xl mb-4 opacity-50">🕰️</div>
                        <div className="text-sm font-medium">No schedule yet.</div>
                        <div className="text-xs opacity-70 mt-1">Add a timed task to see it here.</div>
                    </div>
                )}
            </>
          )}

          {/* === EVENT TAB VIEW === */}
          {activeTab === 'event' && (
            <>
                {eventItems.length > 0 ? (
                    <div>
                        <h3 className="text-xs font-extrabold text-amber-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-500"></span> Events
                        </h3>
                        <div className="grid grid-cols-1 gap-2">
                            <AnimatePresence mode="popLayout">
                            {eventItems.map((ev) => (
                                <motion.div key={ev.id} layout variants={itemVariants} initial="hidden" animate="visible" exit="exit"
                                className={`p-3 rounded-xl border-l-4 flex justify-between items-center shadow-sm group hover:shadow-md transition-all
                                    ${ev.priority === 'Important' 
                                            ? 'bg-amber-50 border-l-amber-500 dark:bg-amber-900/10' 
                                            : 'bg-white dark:bg-slate-800 border-l-gray-300 dark:border-l-slate-600'
                                    }`}
                                >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="text-sm font-medium truncate text-gray-700 dark:text-gray-300">
                                        {ev.title}
                                    </div>
                                </div>

                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                    <button onClick={() => onRemove(ev.id)} className="p-1 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded">
                                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"></path></svg>
                                    </button>
                                </div>
                                </motion.div>
                            ))}
                            </AnimatePresence>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-300 dark:text-slate-600 pt-10">
                        <div className="text-5xl mb-4 opacity-50">📝</div>
                        <div className="text-sm font-medium">No events yet.</div>
                        <div className="text-xs opacity-70 mt-1">Add a note or untimed event.</div>
                    </div>
                )}
            </>
          )}

        </div>
      </div>
    </div>
  );
}
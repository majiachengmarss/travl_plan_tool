import { useState } from 'react';
import type { DayPlan } from '../types';
import { TimelineEditor } from './TimelineEditor';
import { MapRenderer } from './MapRenderer';
import { SpotModal } from './SpotModal';
import { Lightbulb, Loader2 } from 'lucide-react';
import { autoSchedule } from '../utils/scheduleEngine';

interface DayViewProps {
  day: DayPlan;
  allLocations: Record<string, [number, number]>;
  allSpots: Record<string, any>;
  onChange: (updatedDay: DayPlan) => void;
  onLocationAdd: (name: string, coords: [number, number]) => void;
}

export function DayView({ day, allLocations, allSpots, onChange, onLocationAdd }: DayViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [selectedSpot, setSelectedSpot] = useState<string | null>(null);

  const handleTimelineChange = async (newTimeline: any[]) => {
    setIsScheduling(true);
    const updatedDay = { ...day, timeline: newTimeline };
    try {
        const scheduledDay = await autoSchedule(updatedDay, allLocations, allSpots);
        onChange(scheduledDay);
    } catch (e) {
        console.error("Auto scheduling failed", e);
        onChange(updatedDay);
    } finally {
        setIsScheduling(false);
    }
  };

  return (
    <div className="slide-up animate-in fade-in duration-500 relative">
      {isScheduling && (
         <div className="absolute inset-0 z-50 bg-white/50 backdrop-blur-[2px] rounded-3xl flex flex-col items-center justify-center">
            <Loader2 className="animate-spin text-accent mb-2" size={32} />
            <span className="text-sm font-bold text-stone">正在由高德大脑智能规划全新路线与时间...</span>
         </div>
      )}

      {selectedSpot && allSpots[selectedSpot] && (
        <SpotModal 
           spotName={selectedSpot} 
           spotData={allSpots[selectedSpot]} 
           onClose={() => setSelectedSpot(null)} 
        />
      )}

      <div className="mb-4 flex items-baseline gap-4 flex-wrap">
        <h2 className="text-xl font-semibold text-ink">Day 0{day.id.replace('day', '')} · {day.dateStr}</h2>
        <span className="text-sm text-stone bg-cream px-3 py-1 rounded-md flex items-center gap-2">
          <Lightbulb size={14} className="text-gold" />
          {day.tips}
        </span>
        <div className="ml-auto">
           <button 
             onClick={() => setIsEditing(!isEditing)}
             className="px-4 py-1.5 bg-accent text-white text-sm font-medium rounded shadow-sm hover:bg-rose-700 transition"
           >
             {isEditing ? '退出编辑' : '编辑行程'}
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 mb-12">
         {/* Left Column: Map & Transports */}
         <div className="flex flex-col gap-6 overflow-hidden">
            {/* AMap Real Rendering */}
            <MapRenderer day={day} allLocations={allLocations} />

            {/* Transports (Horizontal Scroll) */}
            {day.transports && day.transports.length > 0 && (
               <div className="bg-white rounded-2xl p-6 shadow-sm border border-border">
                  <div className="text-xs font-bold tracking-widest uppercase text-stone mb-4">
                     路线与交通指南
                  </div>
                  <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
                     {day.transports.map((t: any, i: number) => {
                         const best = t.options.find((o:any) => o.recommended) || t.options[0];
                         const alternatives = t.options.filter((o:any) => o !== best);

                         return (
                            <div key={i} className="flex-none w-[300px] flex flex-col gap-3 p-4 bg-cream rounded-xl border border-border">
                               <div className="font-bold text-ink text-sm truncate">{t.title}</div>
                               
                               <div className="flex flex-col gap-1.5">
                                 <div className="text-[10px] text-stone font-bold tracking-wider uppercase">最优方案</div>
                                 <div className="flex items-start gap-2 bg-white p-2.5 rounded-lg border border-accent/20 shadow-sm">
                                     <span className="text-lg leading-none mt-0.5">{best.type === 'subway' ? '🚇' : (best.type==='walk' ? '🚶' : '🚗')}</span>
                                     <div className="flex flex-col flex-1 min-w-0">
                                        <span className="text-sm font-medium text-ink truncate">{best.desc}</span>
                                        <div className="flex flex-wrap gap-1 mt-1.5">
                                            {best.details.map((d: string, idx: number) => (
                                                <span key={idx} className="text-[10px] text-stone bg-paper px-1.5 py-0.5 rounded border border-border/50">{d}</span>
                                            ))}
                                        </div>
                                     </div>
                                 </div>
                               </div>

                               {alternatives.length > 0 && (
                                 <div className="flex flex-col gap-1.5 mt-auto pt-3 border-t border-border/50">
                                   <div className="text-[10px] text-stone font-bold tracking-wider uppercase">次选方案</div>
                                   {alternatives.map((alt: any, altIdx: number) => (
                                     <div key={altIdx} className="flex items-center justify-between text-xs bg-white/50 p-2 rounded border border-border/50">
                                         <span className="flex items-center gap-1.5 font-medium text-ink truncate mr-2">
                                            {alt.type === 'subway' ? '🚇' : (alt.type==='walk' ? '🚶' : '🚗')} {alt.desc}
                                         </span>
                                         <span className="text-stone whitespace-nowrap">{alt.details[0]?.replace('⏱️', '').trim()}</span>
                                     </div>
                                   ))}
                                 </div>
                               )}
                            </div>
                         );
                     })}
                  </div>
               </div>
            )}
         </div>

         {/* Sidebar: Timeline & Tickets */}
         <div className="flex flex-col gap-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-border">
               <div className="text-xs font-bold tracking-widest uppercase text-stone mb-4">
                  行程安排 (Timeline)
               </div>
               <TimelineEditor 
                  items={day.timeline} 
                  isEditing={isEditing} 
                  onSpotClick={(spotName) => setSelectedSpot(spotName)}
                  onChange={handleTimelineChange}
                  onLocationAdd={onLocationAdd}
               />
            </div>

            {day.tickets && day.tickets.length > 0 && (
               <div className="bg-white rounded-2xl p-6 shadow-sm border border-border">
                  <div className="text-xs font-bold tracking-widest uppercase text-stone mb-4">
                     门票信息
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                     {day.tickets.map((ticket: any, i: number) => (
                        <div key={i} className="flex flex-col gap-1 p-3 bg-cream rounded-xl">
                           <span className="text-xs text-stone">{ticket.name}</span>
                           <span className={`text-sm font-semibold ${ticket.isBooked ? 'text-accent' : (ticket.price.includes('免费') ? 'text-teal-600' : 'text-ink')}`}>
                              {ticket.price}
                           </span>
                        </div>
                     ))}
                  </div>
               </div>
            )}
         </div>
      </div>
    </div>
  );
}
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
         {/* AMap Real Rendering */}
         <MapRenderer day={day} allLocations={allLocations} />

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

            {day.transports && day.transports.length > 0 && (
               <div className="bg-white rounded-2xl p-6 shadow-sm border border-border">
                  <div className="text-xs font-bold tracking-widest uppercase text-stone mb-4">
                     交通建议 (Auto-Routed)
                  </div>
                  <div className="flex flex-col gap-4">
                     {day.transports.map((t: any, i: number) => {
                         const best = t.options.find((o:any) => o.recommended) || t.options[0];
                         return (
                            <div key={i} className="flex flex-col gap-2 p-3 bg-cream rounded-xl border border-border">
                               <div className="text-xs font-bold text-stone">{t.title}</div>
                               <div className="flex items-center gap-2 text-sm">
                                  <span className="px-2 py-0.5 bg-white rounded border border-border">{best.type === 'subway' ? '🚇' : (best.type==='walk' ? '🚶' : '🚗')} {best.desc}</span>
                               </div>
                               <div className="flex flex-wrap gap-2 text-xs text-stone mt-1">
                                  {best.details.map((d: string, idx: number) => (
                                      <span key={idx}>{d}</span>
                                  ))}
                               </div>
                            </div>
                         );
                     })}
                  </div>
               </div>
            )}

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
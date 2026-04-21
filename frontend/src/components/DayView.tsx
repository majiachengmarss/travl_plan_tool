import { useState } from 'react';
import type { DayPlan } from '../types';
import { TimelineEditor } from './TimelineEditor';
import { MapRenderer } from './MapRenderer';
import { SpotModal } from './SpotModal';
import { Lightbulb } from 'lucide-react';

interface DayViewProps {
  day: DayPlan;
  allLocations: Record<string, [number, number]>;
  allSpots: Record<string, any>;
  onChange: (updatedDay: DayPlan) => void;
  onLocationAdd: (name: string, coords: [number, number]) => void;
}

export function DayView({ day, allLocations, allSpots, onChange, onLocationAdd }: DayViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedSpot, setSelectedSpot] = useState<string | null>(null);

  return (
    <div className="slide-up animate-in fade-in duration-500">
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
             {isEditing ? '保存修改' : '编辑行程'}
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
                  onChange={(newTimeline) => onChange({ ...day, timeline: newTimeline })}
                  onLocationAdd={onLocationAdd}
               />
            </div>

            {day.tickets && day.tickets.length > 0 && (
               <div className="bg-white rounded-2xl p-6 shadow-sm border border-border">
                  <div className="text-xs font-bold tracking-widest uppercase text-stone mb-4">
                     门票信息
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                     {day.tickets.map((ticket, i) => (
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
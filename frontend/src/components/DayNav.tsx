import type { DayPlan } from '../types';
import clsx from 'clsx';

interface DayNavProps {
  days: DayPlan[];
  activeIdx: number;
  onChange: (idx: number) => void;
}

export function DayNav({ days, activeIdx, onChange }: DayNavProps) {
  return (
    <nav className="sticky top-0 z-50 bg-paper/95 backdrop-blur-md border-b border-border px-8">
      <div className="max-w-[1400px] mx-auto flex items-center gap-2 overflow-x-auto py-2 hide-scrollbar">
        {days.map((day, i) => (
          <button
            key={day.id}
            onClick={() => onChange(i)}
            className={clsx(
              "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
              i === activeIdx 
                ? "bg-ink text-white" 
                : "text-stone hover:bg-black/5 hover:text-ink"
            )}
          >
            {day.shortTitle}
          </button>
        ))}
      </div>
    </nav>
  );
}
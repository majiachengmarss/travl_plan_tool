import { useState, useEffect } from 'react';
import { Cloud, Wind, Thermometer } from 'lucide-react';
import type { TripMeta } from '../types';

export function Header({ meta }: { meta: TripMeta }) {
  const [weather, setWeather] = useState<any>(null);

  useEffect(() => {
    fetch('/api/weather')
      .then(res => res.json())
      .then(data => {
        if (data.status === '1' && data.lives?.length > 0) {
          setWeather(data.lives[0]);
        }
      })
      .catch(err => console.warn('Weather fetch failed', err));
  }, []);

  return (
    <header className="relative bg-ink px-8 py-6 overflow-hidden hero-gradient">
      <div className="relative max-w-[1400px] mx-auto">
        <h1 className="font-serif text-3xl md:text-5xl font-semibold text-white leading-tight mb-2">
          {meta.title}
        </h1>
        <p className="text-sm text-white/50 mb-3">{meta.subtitle}</p>
        
        {weather && (
          <div className="flex gap-4 items-center text-sm text-white/40 mb-3">
            <span className="flex items-center gap-1"><Cloud size={14}/> {weather.weather}</span>
            <span className="flex items-center gap-1"><Thermometer size={14}/> {weather.temperature}°C</span>
            <span className="flex items-center gap-1"><Wind size={14}/> {weather.winddirection}风 {weather.windpower}级</span>
          </div>
        )}
      </div>
    </header>
  );
}

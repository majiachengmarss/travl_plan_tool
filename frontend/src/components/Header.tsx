import { useState, useEffect } from 'react';
import { Cloud, Wind, Thermometer, FileDown, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { TripMeta } from '../types';
import { loadSettings } from './SettingsModal';

export function Header({ meta }: { meta: TripMeta }) {
  const navigate = useNavigate();
  const [weather, setWeather] = useState<any>(null);

  useEffect(() => {
    const settings = loadSettings();
    const amapParam = settings.amapWebKey ? `?amap_key=${settings.amapWebKey}` : '';
    fetch(`/api/weather${amapParam}`)
      .then(res => res.json())
      .then(data => {
        if (data.status === '1' && data.lives?.length > 0) {
          setWeather(data.lives[0]);
        }
      })
      .catch(err => console.warn('Weather fetch failed', err));
  }, []);

  const handlePrint = () => {
    window.print();
  };

  return (
    <header className="relative bg-ink px-8 py-6 overflow-hidden hero-gradient group">
      <div className="relative max-w-[1400px] mx-auto flex justify-between items-start">
        <div className="flex-1">
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

        <div className="flex gap-3 no-print">
            <button 
                onClick={() => navigate('/')}
                className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition shadow-lg flex items-center gap-2 text-sm font-bold pr-4"
            >
                <Home size={18} /> 返回主页
            </button>
            <button 
                onClick={handlePrint}
                className="p-2.5 bg-accent hover:bg-rose-700 text-white rounded-full transition shadow-lg flex items-center gap-2 text-sm font-bold pr-4"
            >
                <FileDown size={18} /> 导出 PDF
            </button>
        </div>
      </div>
    </header>
  );
}

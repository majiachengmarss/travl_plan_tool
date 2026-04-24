import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Calendar, Compass, Plus, Trash2, ArrowRight, Loader2, Settings, FileText, ArrowRightCircle } from 'lucide-react';
import clsx from 'clsx';
import { loadSettings, SettingsModal } from './SettingsModal';
import { getSavedTripsIndex, saveTripData, deleteTrip } from '../utils/storage';
import type { SavedTrip } from '../utils/storage';

export function CreateTripForm() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0); // 0 is dashboard, 1,2,3 is wizard
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [savedTrips, setSavedTrips] = useState<SavedTrip[]>([]);

  // Form Data
  const [city, setCity] = useState('');
  const [days, setDays] = useState(3);
  const [vibe, setVibe] = useState('特种兵打卡');
  
  // Constraints
  const [hotels, setHotels] = useState([{ day: 1, name: '' }]);
  const [events, setEvents] = useState([{ day: 1, time: '14:00', name: '' }]);

  useEffect(() => {
    setSavedTrips(getSavedTripsIndex());
  }, []);

  const handleDeleteTrip = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('确认删除这条旅行计划吗？')) {
        deleteTrip(id);
        setSavedTrips(getSavedTripsIndex());
    }
  };

  useEffect(() => {
    if (window.AMap) {
        if (step === 1) {
            const cityInputId = 'city-input';
            if (document.getElementById(cityInputId)) {
                const auto = new window.AMap.AutoComplete({ input: cityInputId });
                auto.on("select", (e: any) => {
                    let name = e.poi.name;
                    setCity(name);
                });
            }
        } else if (step === 2) {
            // init autocomplete for all hotel inputs
            hotels.forEach((_, i) => {
                const inputId = `hotel-input-${i}`;
                if (document.getElementById(inputId)) {
                    const auto = new window.AMap.AutoComplete({ input: inputId });
                    auto.on("select", (e: any) => {
                        const newH = [...hotels];
                        newH[i].name = e.poi.name;
                        setHotels(newH);
                    });
                }
            });
            // init autocomplete for all event inputs
            events.forEach((_, i) => {
                const inputId = `event-input-${i}`;
                if (document.getElementById(inputId)) {
                    const auto = new window.AMap.AutoComplete({ input: inputId });
                    auto.on("select", (e: any) => {
                        const newEv = [...events];
                        newEv[i].name = e.poi.name;
                        setEvents(newEv);
                    });
                }
            });
        }
    }
  }, [step, hotels.length, events.length]);

  const handleGenerate = async () => {
    const settings = loadSettings();
    if (!city || !settings.llmApiKey) {
        alert("请在全局配置中填写大模型 API Key 并输入目的地城市");
        if (!settings.llmApiKey) setShowSettings(true);
        return;
    }
    
    setIsGenerating(true);

    try {
        const { generateItinerary } = await import('../utils/llmService');
        const rawTripData = await generateItinerary({ 
            city, days, vibe, hotels, events, 
            apiKey: settings.llmApiKey, 
            model: settings.llmModel 
        });

        // Phase 4: Geocoding Pipeline
        const locationNames = new Set<string>();
        rawTripData.days.forEach(d => {
            d.timeline.forEach(item => {
                if (item.spot) locationNames.add(item.spot);
                if (item.event) locationNames.add(item.event);
            });
        });

        const locationsDict: Record<string, [number, number]> = {};
        const amapWebKeyParam = settings.amapWebKey ? `&amap_key=${settings.amapWebKey}` : '';
        const geocodePromises = Array.from(locationNames).map(async (name) => {
            try {
                const res = await fetch(`/api/geocode?address=${encodeURIComponent(name)}&city=${encodeURIComponent(city)}${amapWebKeyParam}`);
                const geoData = await res.json();
                if (geoData.location) {
                    locationsDict[name] = geoData.location;
                }
            } catch(e) {
                console.warn(`Geocode failed for ${name}`);
            }
        });

        await Promise.all(geocodePromises);
        rawTripData.locations = locationsDict;

        // Set map centers based on found locations
        const foundCoords = Object.values(locationsDict);
        if (foundCoords.length > 0) {
            const firstCoord = foundCoords[0];
            rawTripData.days.forEach(d => {
                d.mapCenter = firstCoord;
            });
        }

        // Run Auto-Scheduling Engine to calculate routes and timings
        const { autoSchedule } = await import('../utils/scheduleEngine');
        // temporarily set settings for map engine inside autoSchedule
        (window as any).__AMAP_WEB_KEY__ = settings.amapWebKey;

        for (let i = 0; i < rawTripData.days.length; i++) {
            rawTripData.days[i] = await autoSchedule(rawTripData.days[i], rawTripData.locations, rawTripData.spots || {}, city);
        }

        // Persist using unique ID
        const newTripId = `trip_${Date.now()}`;
        saveTripData(newTripId, rawTripData);

        // Navigate to the newly generated trip
        navigate(`/itinerary?id=${newTripId}`);

    } catch (error: any) {
        alert("生成失败：" + error.message);
        setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col font-sans relative">
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      {/* Hero Header */}
      <header className="bg-ink text-white py-12 px-8 hero-gradient relative overflow-hidden">
         <div className="absolute top-6 right-8 z-20">
            <button onClick={() => setShowSettings(true)} className="p-3 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md transition shadow-lg">
                <Settings size={24} className="text-white" />
            </button>
         </div>
         <div className="max-w-3xl mx-auto text-center relative z-10">
            <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">AI 旅行副驾 (Copilot)</h1>
            <p className="text-white/60 text-lg">基于您的硬性约束，由大语言模型智能补全并优化您的全球旅行线路。</p>
         </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-6 md:p-12 -mt-8 relative z-10">
        <div className="bg-white rounded-3xl shadow-xl border border-border p-8 relative slide-up min-h-[500px]">
            
            {/* Loading Overlay */}
            {isGenerating && (
                <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center slide-up">
                    <Loader2 className="animate-spin text-accent mb-4" size={48} />
                    <h3 className="text-xl font-bold text-ink mb-2">大模型正在思考中...</h3>
                    <p className="text-stone text-sm text-center max-w-sm">正在结合高德地图 API 为您编织 {city} {days}日游的最佳路线，这可能需要几十秒钟时间。</p>
                </div>
            )}

            {/* Dashboard Step (Step 0) */}
            {step === 0 && (
                <div className="animate-in fade-in duration-300">
                    <div className="flex justify-between items-center mb-8 border-b border-border pb-4">
                        <h2 className="text-2xl font-bold flex items-center gap-2"><MapPin className="text-accent" /> 我的行程库</h2>
                        <button onClick={() => setStep(1)} className="px-5 py-2.5 bg-accent hover:bg-rose-700 text-white font-bold rounded-xl flex items-center gap-2 transition shadow-md">
                            新建行程 <Plus size={18} />
                        </button>
                    </div>

                    {/* Pre-built Demo */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                        <div 
                            onClick={() => navigate('/itinerary?id=beijing')}
                            className="p-5 bg-gradient-to-br from-cream to-white border border-border rounded-2xl cursor-pointer hover:border-accent hover:shadow-md transition group"
                        >
                            <div className="flex justify-between items-start mb-2">
                               <h3 className="font-bold text-lg text-ink">北京 4天3晚 精华游</h3>
                               <span className="text-[10px] bg-accent/10 text-accent px-2 py-1 rounded font-bold uppercase tracking-wider">Demo样例</span>
                            </div>
                            <p className="text-sm text-stone mb-4">包含故宫、天坛、颐和园、鸟巢演唱会，演示硬约束与双地图引擎的智能规划能力。</p>
                            <div className="flex items-center text-accent text-sm font-bold opacity-80 group-hover:opacity-100 transition">
                                查看详情 <ArrowRightCircle size={16} className="ml-1"/>
                            </div>
                        </div>

                        {/* Saved Trips */}
                        {savedTrips.map(trip => (
                            <div 
                                key={trip.id}
                                onClick={() => navigate(`/itinerary?id=${trip.id}`)}
                                className="p-5 bg-white border border-border rounded-2xl cursor-pointer hover:border-accent hover:shadow-md transition group relative"
                            >
                                <button 
                                    onClick={(e) => handleDeleteTrip(e, trip.id)}
                                    className="absolute top-4 right-4 p-1.5 text-stone/50 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                >
                                    <Trash2 size={16} />
                                </button>
                                <div className="flex justify-between items-start mb-2 pr-8">
                                   <h3 className="font-bold text-lg text-ink truncate">{trip.meta.title}</h3>
                                </div>
                                <p className="text-sm text-stone mb-4 truncate">{trip.meta.subtitle}</p>
                                <div className="flex items-center text-accent text-sm font-bold opacity-80 group-hover:opacity-100 transition">
                                    继续编辑 <ArrowRightCircle size={16} className="ml-1"/>
                                </div>
                            </div>
                        ))}
                    </div>

                    {savedTrips.length === 0 && (
                        <div className="text-center py-12 bg-cream/50 rounded-2xl border border-dashed border-border flex flex-col items-center">
                            <FileText size={48} className="text-stone/30 mb-4" />
                            <p className="text-stone font-medium mb-4">您还没有生成过自己的专属行程</p>
                            <button onClick={() => setStep(1)} className="text-accent font-bold hover:underline">立即体验 AI 副驾规划</button>
                        </div>
                    )}
                </div>
            )}

            {/* Wizard Wrapper */}
            {step > 0 && (
                <>
                    {/* Steps Progress */}
                    <div className="flex items-center justify-between mb-10 relative">
                       <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-[2px] bg-cream -z-10"></div>
                       <div className="absolute left-0 top-1/2 -translate-y-1/2 h-[2px] bg-accent transition-all duration-500 -z-10" style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }}></div>
                       
                       {[1, 2, 3].map(s => (
                           <div key={s} className={clsx(
                               "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-4 border-white transition-colors duration-500",
                               step >= s ? "bg-accent text-white" : "bg-cream text-stone"
                           )}>
                               {s}
                           </div>
                       ))}
                    </div>

                    {/* Step 1: Basic Info */}
                    {step === 1 && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><MapPin className="text-accent" /> 基础信息</h2>
                            
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-stone mb-2 uppercase tracking-wider">目的地城市</label>
                                    <div className="relative">
                                        <input id="city-input" type="text" value={city} onChange={e => setCity(e.target.value)} placeholder="如：成都、上海、东京" className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-accent/50 focus:outline-none transition-shadow text-lg" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-bold text-stone mb-2 uppercase tracking-wider">游玩天数</label>
                                        <div className="flex items-center border border-border rounded-xl overflow-hidden">
                                            <button onClick={() => setDays(Math.max(1, days - 1))} className="px-4 py-3 bg-cream hover:bg-black/5 transition text-stone font-bold">-</button>
                                            <div className="flex-1 text-center font-bold text-lg">{days} 天</div>
                                            <button onClick={() => setDays(days + 1)} className="px-4 py-3 bg-cream hover:bg-black/5 transition text-stone font-bold">+</button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-stone mb-2 uppercase tracking-wider">旅行风格偏好</label>
                                        <select value={vibe} onChange={e => setVibe(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-accent/50 focus:outline-none transition-shadow text-lg appearance-none bg-white">
                                            <option>特种兵打卡 (高强度)</option>
                                            <option>休闲躺平 (自然醒)</option>
                                            <option>深度人文探索</option>
                                            <option>纯吃货路线</option>
                                            <option>带父母/小孩出行</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="mt-10 flex justify-between">
                                <button onClick={() => setStep(0)} className="px-6 py-3 text-stone font-bold rounded-xl transition hover:bg-cream">取消返回</button>
                                <button disabled={!city} onClick={() => setStep(2)} className="px-6 py-3 bg-ink hover:bg-black text-white font-bold rounded-xl flex items-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed">
                                    下一步 <ArrowRight size={18} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Constraints */}
                    {step === 2 && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                            <h2 className="text-2xl font-bold mb-2 flex items-center gap-2"><Calendar className="text-accent" /> 强制约束条件</h2>
                            <p className="text-stone text-sm mb-6">您可以在这里设定已经预定好的住宿或演唱会，大模型会围绕这些节点为您填补剩余的游玩时间。</p>

                            <div className="space-y-8">
                                {/* Hotels */}
                                <div className="bg-cream/50 p-5 rounded-2xl border border-border">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-bold text-ink">🏨 住宿安排</h3>
                                        <button onClick={() => setHotels([...hotels, { day: 1, name: '' }])} className="text-accent text-sm font-bold flex items-center gap-1 hover:underline">
                                            <Plus size={16} /> 添加住宿
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        {hotels.map((h, i) => (
                                            <div key={i} className="flex items-center gap-3">
                                                <span className="text-sm text-stone whitespace-nowrap">第</span>
                                                <select value={h.day} onChange={e => { const newH = [...hotels]; newH[i].day = Number(e.target.value); setHotels(newH); }} className="px-2 py-1.5 rounded border border-border text-sm bg-white">
                                                    {Array.from({length: days}).map((_, idx) => <option key={idx+1} value={idx+1}>{idx+1}</option>)}
                                                </select>
                                                <span className="text-sm text-stone whitespace-nowrap">晚住:</span>
                                                <div className="flex-1 relative">
                                            <input id={`hotel-input-${i}`} type="text" value={h.name} onChange={e => { const newH = [...hotels]; newH[i].name = e.target.value; setHotels(newH); }} placeholder="酒店名称 (可选)" className="w-full px-3 py-1.5 rounded border border-border text-sm" />
                                        </div>
                                                <button onClick={() => setHotels(hotels.filter((_, idx) => idx !== i))} className="text-stone hover:text-rose-600"><Trash2 size={16}/></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Fixed Events */}
                                <div className="bg-cream/50 p-5 rounded-2xl border border-border">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-bold text-ink">📌 必须打卡的事件</h3>
                                        <button onClick={() => setEvents([...events, { day: 1, time: '14:00', name: '' }])} className="text-accent text-sm font-bold flex items-center gap-1 hover:underline">
                                            <Plus size={16} /> 添加事件
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        {events.map((ev, i) => (
                                            <div key={i} className="flex items-center gap-3">
                                                <span className="text-sm text-stone whitespace-nowrap">Day</span>
                                                <select value={ev.day} onChange={e => { const newEv = [...events]; newEv[i].day = Number(e.target.value); setEvents(newEv); }} className="px-2 py-1.5 rounded border border-border text-sm bg-white">
                                                    {Array.from({length: days}).map((_, idx) => <option key={idx+1} value={idx+1}>{idx+1}</option>)}
                                                </select>
                                                <input type="time" value={ev.time} onChange={e => { const newEv = [...events]; newEv[i].time = e.target.value; setEvents(newEv); }} className="px-2 py-1.5 rounded border border-border text-sm bg-white" />
                                                <div className="flex-1 relative">
                                            <input id={`event-input-${i}`} type="text" value={ev.name} onChange={e => { const newEv = [...events]; newEv[i].name = e.target.value; setEvents(newEv); }} placeholder="事件/景点 (可选)" className="w-full px-3 py-1.5 rounded border border-border text-sm" />
                                        </div>
                                                <button onClick={() => setEvents(events.filter((_, idx) => idx !== i))} className="text-stone hover:text-rose-600"><Trash2 size={16}/></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-10 flex justify-between">
                                <button onClick={() => setStep(1)} className="px-6 py-3 text-stone font-bold rounded-xl transition hover:bg-cream">返回</button>
                                <button onClick={() => setStep(3)} className="px-6 py-3 bg-ink hover:bg-black text-white font-bold rounded-xl flex items-center gap-2 transition">
                                    下一步 <ArrowRight size={18} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Final Launch */}
                    {step === 3 && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                            <h2 className="text-2xl font-bold mb-2 flex items-center gap-2"><Compass className="text-accent" /> 准备就绪</h2>
                            <p className="text-stone text-sm mb-6">点击下方按钮，开始生成专属行程。</p>

                            <div className="p-6 bg-cream border border-border rounded-2xl flex flex-col items-center justify-center text-center">
                               <MapPin size={48} className="text-accent mb-4" />
                               <h3 className="font-bold text-xl mb-1">{city} {days}日游</h3>
                               <p className="text-stone mb-4">{vibe}</p>
                               <div className="text-xs text-stone/80 bg-white px-3 py-2 rounded border border-border">
                                   将由全局配置中设定的 <strong className="text-ink">大模型 (LLM)</strong> 驱动生成
                               </div>
                            </div>

                            <div className="mt-10 flex justify-between">
                                <button onClick={() => setStep(2)} className="px-6 py-3 text-stone font-bold rounded-xl transition hover:bg-cream">返回</button>
                                <button onClick={handleGenerate} className="px-8 py-3 bg-accent hover:bg-rose-700 text-white font-bold rounded-xl flex items-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-accent/20">
                                    开始智能生成 <Compass size={18} />
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
      </main>
    </div>
  );
}
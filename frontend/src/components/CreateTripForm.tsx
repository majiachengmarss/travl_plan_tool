import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Calendar, Compass, Key, Plus, Trash2, ArrowRight, Loader2 } from 'lucide-react';
import clsx from 'clsx';

export function CreateTripForm() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);

  // Form Data
  const [city, setCity] = useState('');
  const [days, setDays] = useState(3);
  const [vibe, setVibe] = useState('特种兵打卡');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gpt-4o-mini');
  
  // Constraints
  const [hotels, setHotels] = useState([{ day: 1, name: '' }]);
  const [events, setEvents] = useState([{ day: 1, time: '14:00', name: '' }]);

  useEffect(() => {
    const savedKey = localStorage.getItem('ai_travel_api_key');
    if (savedKey) setApiKey(savedKey);
  }, []);

  const handleGenerate = async () => {
    if (!city || !apiKey) {
        alert("请填写必填项 (城市和 API Key)");
        return;
    }
    
    localStorage.setItem('ai_travel_api_key', apiKey);
    setIsGenerating(true);

    try {
        const { generateItinerary } = await import('../utils/llmService');
        const rawTripData = await generateItinerary({ city, days, vibe, hotels, events, apiKey, model });

        // Phase 4: Geocoding Pipeline
        // Collect all spots and events that need coordinates
        const locationNames = new Set<string>();
        rawTripData.days.forEach(d => {
            d.timeline.forEach(item => {
                if (item.spot) locationNames.add(item.spot);
                if (item.event) locationNames.add(item.event);
            });
        });

        // Fetch coordinates for each unique location
        const locationsDict: Record<string, [number, number]> = {};
        const geocodePromises = Array.from(locationNames).map(async (name) => {
            try {
                const res = await fetch(`/api/geocode?address=${encodeURIComponent(name)}&city=${encodeURIComponent(city)}`);
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

        // Save generated itinerary to sessionStorage for ItineraryPage to pick up
        sessionStorage.setItem('local_trip_data', JSON.stringify(rawTripData));

        // Navigate to the newly generated trip
        navigate('/itinerary?id=local');

    } catch (error: any) {
        alert("生成失败：" + error.message);
        setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col font-sans">
      {/* Hero Header */}
      <header className="bg-ink text-white py-12 px-8 hero-gradient relative overflow-hidden">
         <div className="max-w-3xl mx-auto text-center relative z-10">
            <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">AI 旅行副驾 (Copilot)</h1>
            <p className="text-white/60 text-lg">基于您的硬性约束，由大语言模型智能补全并优化您的全球旅行线路。</p>
         </div>
      </header>

      {/* Main Wizard */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-6 md:p-12 -mt-8">
        <div className="bg-white rounded-3xl shadow-xl border border-border p-8 relative slide-up">
            {isGenerating && (
                <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center">
                    <Loader2 className="animate-spin text-accent mb-4" size={48} />
                    <h3 className="text-xl font-bold text-ink mb-2">大模型正在思考中...</h3>
                    <p className="text-stone text-sm text-center max-w-sm">正在结合高德地图 API 为您编织 {city} {days}日游的最佳路线，这可能需要几十秒钟时间。</p>
                </div>
            )}

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
                            <input type="text" value={city} onChange={e => setCity(e.target.value)} placeholder="如：成都、上海、东京" className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-accent/50 focus:outline-none transition-shadow text-lg" />
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
                    
                    <div className="mt-10 flex justify-end">
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
                                        <input type="text" value={h.name} onChange={e => { const newH = [...hotels]; newH[i].name = e.target.value; setHotels(newH); }} placeholder="酒店名称 (可选)" className="flex-1 px-3 py-1.5 rounded border border-border text-sm" />
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
                                        <input type="text" value={ev.name} onChange={e => { const newEv = [...events]; newEv[i].name = e.target.value; setEvents(newEv); }} placeholder="事件/景点 (可选)" className="flex-1 px-3 py-1.5 rounded border border-border text-sm" />
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

            {/* Step 3: API Config */}
            {step === 3 && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                    <h2 className="text-2xl font-bold mb-2 flex items-center gap-2"><Key className="text-accent" /> 模型配置</h2>
                    <p className="text-stone text-sm mb-6">需要您提供兼容 OpenAI 接口规范的 API Key 以驱动智能规划。Key 仅保存在您的浏览器本地，不会上传至服务器。</p>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-stone mb-2 uppercase tracking-wider">大语言模型提供商</label>
                            <select value={model} onChange={e => setModel(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-accent/50 focus:outline-none transition-shadow text-lg appearance-none bg-white">
                                <option value="gpt-4o-mini">OpenAI (gpt-4o-mini)</option>
                                <option value="deepseek-chat">DeepSeek (deepseek-chat)</option>
                                <option value="glm-4">智谱清言 (glm-4)</option>
                                <option value="moonshot-v1-8k">Kimi (moonshot-v1-8k)</option>
                                <option value="mimo-v2-pro">小米 MiMo (mimo-v2-pro)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-stone mb-2 uppercase tracking-wider">API Key <span className="text-rose-600">*</span></label>
                            <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="sk-..." className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-accent/50 focus:outline-none transition-shadow text-lg font-mono" />
                        </div>
                    </div>

                    <div className="mt-10 flex justify-between">
                        <button onClick={() => setStep(2)} className="px-6 py-3 text-stone font-bold rounded-xl transition hover:bg-cream">返回</button>
                        <button disabled={!apiKey} onClick={handleGenerate} className="px-8 py-3 bg-accent hover:bg-rose-700 text-white font-bold rounded-xl flex items-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-accent/20">
                            开始智能生成 <Compass size={18} />
                        </button>
                    </div>
                </div>
            )}
        </div>
      </main>
    </div>
  );
}
import { useEffect, useRef } from 'react';
import { X, MapPin } from 'lucide-react';

interface SpotModalProps {
  spotName: string;
  spotData: any;
  spotCenter?: [number, number];
  onClose: () => void;
}

export function SpotModal({ spotName, spotData, spotCenter, onClose }: SpotModalProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);

  useEffect(() => {
    if (!mapContainer.current || !spotData || !window.AMap) return;

    let isCancelled = false;
    let map: any = null;

    if (spotData.coords) {
      const coords = spotData.coords;

      map = new window.AMap.Map(mapContainer.current, {
        center: coords.center,
        zoom: coords.zoom,
        zooms: [14, 18],
        viewMode: '2D',
        resizeEnable: true,
        mapStyle: 'amap://styles/light'
      });

      if (coords.bounds && coords.bounds.length === 2) {
          map.setLimitBounds(new window.AMap.Bounds(
            coords.bounds[0],
            coords.bounds[1]
          ));
      }

      mapInstance.current = map;

      // Draw route
      if (coords.route && coords.route.length > 1) {
        const initialPath = coords.route.map((p: any) => new window.AMap.LngLat(p[0], p[1]));
        const spotMapRoute = new window.AMap.Polyline({
            path: initialPath,
            strokeColor: '#c2410c',
            strokeWeight: 5,
            strokeOpacity: 0.85,
            strokeDasharray: [8, 4],
            lineJoin: 'round',
            lineCap: 'round',
            borderWeight: 2,
            borderColor: 'rgba(255,255,255,0.8)',
            borderOpacity: 0.9,
            zIndex: 10
        });
        map.add(spotMapRoute);

        const fetchInnerRoute = async () => {
          let fullPath: any[] = [];
          for (let i = 0; i < coords.route.length - 1; i++) {
              if (isCancelled) return;

              let from = coords.route[i];
              let to = coords.route[i+1];
              let originStr = `${from[0].toFixed(6)},${from[1].toFixed(6)}`;
              let destStr = `${to[0].toFixed(6)},${to[1].toFixed(6)}`;
              let url = `/api/direction/walk?origin=${originStr}&destination=${destStr}`;
              
              let segmentPath: any[] = [];
              try {
                  const response = await fetch(url);
                  const data = await response.json();
                  if (data.status === '1' && data.route && data.route.paths && data.route.paths.length > 0) {
                      const bestPath = data.route.paths[0];
                      if (bestPath.steps) {
                          bestPath.steps.forEach((step: any) => {
                              step.polyline.split(';').forEach((point: string) => {
                                  let pts = point.split(',');
                                  if (pts.length === 2) {
                                      let lng = parseFloat(pts[0]);
                                      let lat = parseFloat(pts[1]);
                                      if (!isNaN(lng) && !isNaN(lat)) {
                                          segmentPath.push(new window.AMap.LngLat(lng, lat));
                                      }
                                  }
                              });
                          });
                      }
                  }
              } catch (e) {
                  console.warn(`Spot API failed for segment ${i}:`, e);
              }

              if (segmentPath.length < 2) {
                  segmentPath = [new window.AMap.LngLat(from[0], from[1]), new window.AMap.LngLat(to[0], to[1])];
              }

              if (i === 0) fullPath = segmentPath;
              else fullPath = fullPath.concat(segmentPath.slice(1));
              
              const currentDisplayPath = fullPath.concat(
                  coords.route.slice(i + 1).map((p: any) => new window.AMap.LngLat(p[0], p[1]))
              );
              
              if (spotMapRoute && currentDisplayPath.length > 0) {
                  spotMapRoute.setPath(currentDisplayPath);
              }
          }
        };
        
        fetchInnerRoute();

        // Add markers
        const getPointAtFraction = (route: any[], fraction: number) => {
          if (route.length === 0) return null;
          if (route.length === 1 || fraction <= 0) return route[0];
          if (fraction >= 1) return route[route.length - 1];

          let totalLength = 0;
          const segments = [];
          for (let i = 0; i < route.length - 1; i++) {
              const p1 = route[i];
              const p2 = route[i+1];
              const dx = p1[0] - p2[0];
              const dy = p1[1] - p2[1];
              const len = Math.sqrt(dx*dx + dy*dy);
              segments.push({ length: len, p1, p2 });
              totalLength += len;
          }

          const targetLength = totalLength * fraction;
          let currentLength = 0;

          for (const seg of segments) {
              if (currentLength + seg.length >= targetLength) {
                  const ratio = (targetLength - currentLength) / seg.length;
                  return [
                      seg.p1[0] + (seg.p2[0] - seg.p1[0]) * ratio,
                      seg.p1[1] + (seg.p2[1] - seg.p1[1]) * ratio
                  ];
              }
              currentLength += seg.length;
          }
          return route[route.length - 1];
        };

        const routeSteps = spotData.route || [];
        if (routeSteps.length >= 2) {
          for (let i = 0; i < routeSteps.length; i++) {
              const fraction = routeSteps.length === 1 ? 0 : i / (routeSteps.length - 1);
              const point = getPointAtFraction(coords.route, fraction);
              if (!point) continue;
              const step = routeSteps[i];
              
              const markerDiv = document.createElement('div');
              markerDiv.style.cssText = `
                  width: 26px; height: 26px; border-radius: 50%;
                  background: linear-gradient(135deg, #ea580c, #c2410c);
                  border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                  display: flex; align-items: center; justify-content: center;
                  font-size: 12px; font-weight: 800; color: white;
              `;
              markerDiv.textContent = (i + 1).toString();

              const marker = new window.AMap.Marker({
                  position: new window.AMap.LngLat(point[0], point[1]),
                  content: markerDiv,
                  offset: new window.AMap.Pixel(-13, -13),
                  zIndex: 100
              });
              map.add(marker);
              
              const labelDiv = document.createElement('div');
              labelDiv.style.cssText = `
                  background: white; padding: 4px 10px; border-radius: 8px;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.15); font-size: 12px; font-weight: 600;
                  color: #1c1917; border: 1px solid #f5f2ed;
              `;
              labelDiv.innerHTML = `<div>${step.name}</div><div style="font-size:10px;color:#78716c;font-weight:400;margin-top:2px;">${step.desc}</div>`;
              
              const labelMarker = new window.AMap.Marker({
                  position: new window.AMap.LngLat(point[0], point[1]),
                  content: labelDiv,
                  offset: new window.AMap.Pixel(15, -13),
                  zIndex: 90
              });
              map.add(labelMarker);
          }
        }
      }
    } else if (spotCenter) {
      // Basic fallback map for AI generated spots
      map = new window.AMap.Map(mapContainer.current, {
        center: spotCenter,
        zoom: 15,
        viewMode: '2D',
        mapStyle: 'amap://styles/light'
      });
      const marker = new window.AMap.Marker({
        position: new window.AMap.LngLat(spotCenter[0], spotCenter[1]),
        title: spotName
      });
      map.add(marker);
      mapInstance.current = map;
    }

    return () => {
      isCancelled = true;
      if (map) map.destroy();
    };
  }, [spotData, spotCenter]);

  if (!spotData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm slide-up">
      <div className="bg-paper w-full max-w-5xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-white shrink-0">
          <h3 className="text-xl font-bold text-ink flex items-center gap-2">
             <MapPin className="text-accent" /> {spotName} 游览攻略
          </h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-cream text-stone hover:text-ink transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 hide-scrollbar flex flex-col lg:flex-row gap-8">
          {/* Info Side */}
          <div className="flex-[1.2] flex flex-col gap-6">
             {spotData.tips && (
                <div>
                  <div className="text-sm font-bold text-stone mb-2 uppercase tracking-wider">避坑指南与注意事项</div>
                  <div className="p-4 bg-rose-50 text-rose-800 rounded-xl text-sm leading-relaxed border border-rose-100">
                     {spotData.tips}
                  </div>
                </div>
             )}

             {spotData.ticket && (
                <div>
                  <div className="text-sm font-bold text-stone mb-2 uppercase tracking-wider">门票信息</div>
                  <div className="p-4 bg-white rounded-xl text-sm text-ink border border-border">
                     {spotData.ticket}
                  </div>
                </div>
             )}

             {spotData.hours && (
                <div>
                  <div className="text-sm font-bold text-stone mb-2 uppercase tracking-wider">开放时间</div>
                  <div className="p-4 bg-white rounded-xl text-sm text-ink border border-border">
                     {spotData.hours}
                  </div>
                </div>
             )}

             {(spotData.entrance || spotData.exit) && (
                <div>
                  <div className="text-sm font-bold text-stone mb-2 uppercase tracking-wider">入口与出口</div>
                  <div className="p-4 bg-white rounded-xl text-sm border border-border flex flex-col gap-2">
                     {spotData.entrance && <div className="flex gap-2"><span className="text-teal-600">📥 进：</span><span className="text-ink">{spotData.entrance}</span></div>}
                     {spotData.exit && <div className="flex gap-2"><span className="text-rose-600">📤 出：</span><span className="text-ink">{spotData.exit}</span></div>}
                  </div>
                </div>
             )}

             {/* Textual Route Representation for AI generated spots */}
             {spotData.route && Array.isArray(spotData.route) && spotData.route.length > 0 && (
                <div>
                  <div className="text-sm font-bold text-stone mb-4 uppercase tracking-wider">
                     {spotData.routeTitle || '推荐游览路线'}
                  </div>
                  <div className="relative pl-4 space-y-4">
                     <div className="absolute left-[23px] top-4 bottom-4 w-0.5 bg-border -z-10"></div>
                     {spotData.route.map((step: any, idx: number) => (
                        <div key={idx} className="relative flex items-start gap-4">
                           <div className="w-5 h-5 mt-0.5 rounded-full bg-accent text-white flex items-center justify-center text-[10px] font-bold z-10 shrink-0 ring-4 ring-paper shadow-sm">
                              {idx + 1}
                           </div>
                           <div className="flex-1 bg-white p-3 rounded-xl shadow-sm border border-border">
                              <h4 className="font-bold text-ink text-sm mb-1">{step.name}</h4>
                              <p className="text-xs text-stone leading-relaxed">{step.desc}</p>
                           </div>
                        </div>
                     ))}
                  </div>
                </div>
             )}
          </div>

          {/* Map & Highlights Side */}
          <div className="flex-1 flex flex-col min-h-[400px] lg:min-h-[auto] sticky top-0">
            <div className="text-sm font-bold text-stone mb-2 uppercase tracking-wider">
               地理位置
            </div>
            <div ref={mapContainer} className="flex-1 bg-cream rounded-2xl border border-border overflow-hidden min-h-[300px]"></div>
            {spotData.highlights && (
                <div className="mt-4 text-xs text-stone leading-relaxed bg-white p-4 rounded-xl border border-border shadow-sm">
                   <span className="font-bold text-accent text-sm block mb-1">✨ 必看亮点</span> 
                   <p className="text-stone">{spotData.highlights}</p>
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
import { useEffect, useRef } from 'react';
import type { DayPlan } from '../types';
import { fetchRoutePoints } from '../utils/amap';

interface MapRendererProps {
  day: DayPlan;
  allLocations: Record<string, [number, number]>;
  activeTransportIndex?: number | null;
}

const routeColors: Record<string, string> = {
  subway: '#3b82f6',
  taxi: '#f59e0b',
  walk: '#10b981',
  cruise: '#3b82f6'
};

const routeDashArrays: Record<string, number[]> = {
  subway: [],
  taxi: [],
  walk: [8, 4],
  cruise: [8, 4]
};

export function MapRenderer({ day, allLocations, activeTransportIndex }: MapRendererProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);

  useEffect(() => {
    if (!mapContainer.current || !window.AMap) return;

    // Initialize Map
    const map = new window.AMap.Map(mapContainer.current, {
      zoom: day.mapZoom || 13,
      center: day.mapCenter || [116.40, 39.90],
      zooms: [9, 18],
      mapStyle: 'amap://styles/light'
    });

    mapInstance.current = map;

    return () => {
      map.destroy();
    };
  }, [day.id]); // Re-initialize when switching days to avoid stale state

  useEffect(() => {
    if (!mapInstance.current || !day.transports) return;

    const map = mapInstance.current;
    
    // Clear existing overlays
    map.clearMap();

    // Draw Locations from transports
    const drawnLocations = new Set<string>();
    
    const drawMarker = (name: string) => {
      if (drawnLocations.has(name)) return;
      const coords = allLocations[name];
      if (coords) {
        const marker = new window.AMap.Marker({
          position: coords,
          title: name,
        });
        map.add(marker);
        drawnLocations.add(name);
      }
    };

    // Determine ordered locations from timeline
    const timelineLocs: string[] = [];
    day.timeline.forEach(item => {
      let locName = item.spot;
      if (!locName) {
        for (const key of Object.keys(allLocations)) {
          if (item.event.includes(key)) {
            locName = key;
            break;
          }
        }
      }
      if (locName && allLocations[locName]) {
        if (timelineLocs.length === 0 || timelineLocs[timelineLocs.length - 1] !== locName) {
          timelineLocs.push(locName);
        }
      }
    });

    timelineLocs.forEach(loc => drawMarker(loc));

    // Draw routes directly from day.transports which are now pre-calculated by scheduleEngine
    // If path is missing (like on initial load from static JSON), we fetch it on the fly
    let isCancelled = false;
    const drawRoutes = async () => {
      if (!day.transports) return;

      for (let i = 0; i < day.transports.length; i++) {
         if (isCancelled) return;
         if (activeTransportIndex !== null && activeTransportIndex !== undefined && activeTransportIndex !== i) continue;

         const transport = day.transports[i];
         const bestOption = transport.options.find((o: any) => o.recommended) || transport.options[0];
         if (!bestOption) continue;

         let pathCoords = bestOption.path;

         if (!pathCoords) {
             const fromCoords = allLocations[bestOption.from];
             const toCoords = allLocations[bestOption.to];
             if (fromCoords && toCoords) {
                 const res = await fetchRoutePoints(fromCoords, toCoords, bestOption.type);
                 pathCoords = res.path;
                 await new Promise(r => setTimeout(r, 150)); // rate limiting
             }
         }

         if (!pathCoords || pathCoords.length === 0) continue;

         const amapPath = pathCoords.map((p: any) => new window.AMap.LngLat(p[0], p[1]));
         const color = routeColors[bestOption.type] || '#f59e0b';
         const dashArray = routeDashArrays[bestOption.type] || [];

         const polyline = new window.AMap.Polyline({
             path: amapPath,
             strokeColor: color,
             strokeWeight: bestOption.type === 'walk' ? 3 : 5,
             strokeOpacity: 0.8,
             strokeDasharray: dashArray,
             lineJoin: 'round',
             lineCap: 'round',
             borderWeight: 2,
             borderColor: 'white',
             borderOpacity: 0.8
         });

         map.add(polyline);
      }
      if (!isCancelled) {
          map.setFitView();
      }
    };

    drawRoutes();

    return () => {
      isCancelled = true;
    };
  }, [day.transports, allLocations, activeTransportIndex]); // Re-draw when transports or active state change

  return (
    <div className="relative bg-cream rounded-2xl overflow-hidden shadow-lg border border-border h-[550px]">
       <div className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur px-3 py-2 rounded-lg shadow-sm border border-border text-xs flex flex-col gap-2">
           <div className="flex items-center gap-2"><div className="w-4 h-1 bg-subway"></div>公交/地铁</div>
           <div className="flex items-center gap-2"><div className="w-4 h-1 bg-taxi"></div>打车</div>
           <div className="flex items-center gap-2"><div className="w-4 h-1 bg-walk border-b-2 border-dotted border-walk bg-transparent"></div>步行</div>
       </div>
       <div ref={mapContainer} className="w-full h-full" />
    </div>
  );
}
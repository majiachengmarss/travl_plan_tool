import { useEffect, useRef } from 'react';
import type { DayPlan } from '../types';
import { fetchRoutePoints } from '../utils/amap';

interface MapRendererProps {
  day: DayPlan;
  allLocations: Record<string, [number, number]>;
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

export function MapRenderer({ day, allLocations }: MapRendererProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);

  useEffect(() => {
    if (!mapContainer.current || !window.AMap) return;

    // Initialize Map
    const map = new window.AMap.Map(mapContainer.current, {
      zoom: day.mapZoom || 13,
      center: day.mapCenter || [116.40, 39.90],
      zooms: [11, 15],
      mapStyle: 'amap://styles/light'
    });

    map.setLimitBounds(new window.AMap.Bounds(
      [115.4, 39.4],
      [117.5, 41.1]
    ));

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
            break; // Find the first matching location
          }
        }
      }
      if (locName && allLocations[locName]) {
        // Prevent consecutive duplicates
        if (timelineLocs.length === 0 || timelineLocs[timelineLocs.length - 1] !== locName) {
          timelineLocs.push(locName);
        }
      }
    });

    // Draw all extracted timeline markers
    timelineLocs.forEach(loc => drawMarker(loc));

    // Sequentially fetch and draw routes between the ordered timeline locations
    let isCancelled = false;
    const drawRoutes = async () => {
      for (let i = 0; i < timelineLocs.length - 1; i++) {
        if (isCancelled) return;
        const fromName = timelineLocs[i];
        const toName = timelineLocs[i+1];

        let bestOption: any = null;
        if (day.transports) {
          const transport = day.transports.find((t: any) => 
            t.options.some((o: any) => o.from === fromName && o.to === toName)
          );
          if (transport) {
            bestOption = transport.options.find((o: any) => o.recommended) || transport.options[0];
          }
        }

        // Auto-plan for newly added spots: default to driving, or walk if very close
        if (!bestOption) {
          bestOption = { type: 'taxi', from: fromName, to: toName };
        }

        const fromCoords = allLocations[bestOption.from];
        const toCoords = allLocations[bestOption.to];

        if (fromCoords && toCoords) {
           const { path } = await fetchRoutePoints(fromCoords, toCoords, bestOption.type);
           if (isCancelled) return;

           const amapPath = path.map(p => new window.AMap.LngLat(p[0], p[1]));
           const color = routeColors[bestOption.type] || '#f59e0b'; // default taxi color
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
           await new Promise(r => setTimeout(r, 150)); // small delay for QPS
        }
      }
      if (!isCancelled) {
          map.setFitView();
      }
    };

    drawRoutes();

    return () => {
      isCancelled = true;
    };
  }, [day.transports, allLocations]); // Re-draw when transports change

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
declare global {
  interface Window {
    AMap: any;
  }
}

export function generateBezierCurve(start: [number, number], end: [number, number], curveAmount = 0.2) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const dist = Math.sqrt(dx * dx + dy * dy);

  const midX = (start[0] + end[0]) / 2;
  const midY = (start[1] + end[1]) / 2;

  const perpX = -dy / dist * dist * curveAmount;
  const perpY = dx / dist * dist * curveAmount;

  const controlX = midX + perpX;
  const controlY = midY + perpY;

  const points: [number, number][] = [];
  const steps = 50;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = Math.pow(1 - t, 2) * start[0] + 2 * (1 - t) * t * controlX + Math.pow(t, 2) * end[0];
    const y = Math.pow(1 - t, 2) * start[1] + 2 * (1 - t) * t * controlY + Math.pow(t, 2) * end[1];
    points.push([x, y]);
  }
  return points;
}
export async function fetchRoutePoints(
  from: [number, number],
  to: [number, number],
  type: string,
  cityStr?: string
): Promise<{ path: [number, number][]; distanceText: string; durationText: string; durationMinutes: number; priceText?: string; desc?: string; useBezier: boolean }> {
  let path: [number, number][] = [];
  let distText = '';
  let durText = '';
  let durationMinutes = 0;
  let priceText = '';
  let desc = '';
  let useBezier = false;

  // Dynamically load settings to get user's custom AMap Web Key
  const getSettings = () => {
    try {
        const saved = localStorage.getItem('app_settings');
        return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  };
  const settings = getSettings();
  let amapParam = settings.amapWebKey ? `&amap_key=${settings.amapWebKey}` : '';
  if (cityStr) {
      amapParam += `&city=${encodeURIComponent(cityStr)}`;
  }

  if (type === 'cruise') {
    useBezier = true;
    durationMinutes = 30;
  } else {
    try {
      const originStr = `${from[0]},${from[1]}`;
      const destStr = `${to[0]},${to[1]}`;
      let apiType = type === 'walk' ? 'walking' : type === 'subway' ? 'transit/integrated' : 'driving';
      const url = `/api/direction/${type}?origin=${originStr}&destination=${destStr}${amapParam}`;

      const res = await fetch(url);
      const data = await res.json();

      if (data.status === '1' && data.route && ((data.route.paths && data.route.paths.length > 0) || (data.route.transits && data.route.transits.length > 0))) {
        if (apiType === 'transit/integrated' && data.route.transits && data.route.transits.length > 0) {
          const transit = data.route.transits[0];
          const distance = parseInt(transit.distance || '0');
          const duration = parseInt(transit.duration || '0');
          durationMinutes = Math.ceil(duration / 60);
          distText = distance >= 1000 ? (distance / 1000).toFixed(1) + '公里' : distance + '米';
          durText = durationMinutes + '分钟';
          priceText = (transit.cost || '4') + '元';
          
          let segmentsNames: string[] = [];
          if (transit.segments) {
            transit.segments.forEach((segment: any) => {
              if (segment.walking && segment.walking.steps) {
                segment.walking.steps.forEach((step: any) => {
                  if (step.polyline) {
                    step.polyline.split(';').forEach((point: string) => {
                      const pts = point.split(',');
                      path.push([parseFloat(pts[0]), parseFloat(pts[1])]);
                    });
                  }
                });
              }
              if (segment.bus && segment.bus.buslines && segment.bus.buslines.length > 0) {
                const busline = segment.bus.buslines[0];
                segmentsNames.push(busline.name.split('(')[0]);
                if (busline.polyline) {
                  busline.polyline.split(';').forEach((point: string) => {
                    const pts = point.split(',');
                    path.push([parseFloat(pts[0]), parseFloat(pts[1])]);
                  });
                }
              }
            });
          }
          desc = segmentsNames.join('→') || '公交/地铁路线';
        } else if (data.route.paths && data.route.paths.length > 0) {
          const bestPath = data.route.paths[0];
          const distance = parseInt(bestPath.distance || '0');
          const duration = parseInt(bestPath.duration || '0');
          durationMinutes = Math.ceil(duration / 60);
          distText = distance >= 1000 ? (distance / 1000).toFixed(1) + '公里' : distance + '米';
          durText = durationMinutes + '分钟';
          if (type === 'taxi') {
             priceText = '约' + Math.max(13, Math.ceil(distance/1000 * 3)) + '元';
          }

          if (bestPath.steps) {
            bestPath.steps.forEach((step: any) => {
              if (step.polyline) {
                step.polyline.split(';').forEach((point: string) => {
                  const pts = point.split(',');
                  path.push([parseFloat(pts[0]), parseFloat(pts[1])]);
                });
              }
            });
          }
        }
      } else {
        // Fallback for transit if no route found
        if (apiType === 'transit/integrated') {
          const fallbackUrl = `/api/direction/walk?origin=${originStr}&destination=${destStr}`;
          const fallbackRes = await fetch(fallbackUrl);
          const fallbackData = await fallbackRes.json();
          if (fallbackData.status === '1' && fallbackData.route && fallbackData.route.paths && fallbackData.route.paths.length > 0) {
            const bestPath = fallbackData.route.paths[0];
            const duration = parseInt(bestPath.duration || '0');
            durationMinutes = Math.ceil(duration / 60);
            durText = durationMinutes + '分钟';
            desc = '距离较近，建议步行';
            if (bestPath.steps) {
              bestPath.steps.forEach((step: any) => {
                if (step.polyline) {
                  step.polyline.split(';').forEach((point: string) => {
                    const pts = point.split(',');
                    path.push([parseFloat(pts[0]), parseFloat(pts[1])]);
                  });
                }
              });
            }
          } else {
            useBezier = true;
          }
        } else {
          useBezier = true;
        }
      }
    } catch (e) {
      console.warn(`Route API failed, using fallback:`, e);
      useBezier = true;
    }
  }

  if (useBezier || path.length === 0) {
    path = generateBezierCurve(from, to, type === 'walk' || type === 'cruise' ? 0.2 : 0.3);
    if (!durationMinutes) durationMinutes = 20; // Default fallback duration
    durText = durText || (durationMinutes + '分钟');
  }

  return { path, distanceText: distText, durationText: durText, durationMinutes, priceText, desc, useBezier };
}

export async function fetchTransportOptions(fromName: string, toName: string, fromCoords: [number, number], toCoords: [number, number], cityStr?: string) {
    const idPrefix = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    const options = [];
    
    // Default: try fetching taxi and subway concurrently
    const [subwayRes, taxiRes] = await Promise.all([
       fetchRoutePoints(fromCoords, toCoords, 'subway', cityStr),
       fetchRoutePoints(fromCoords, toCoords, 'taxi', cityStr)
    ]);
    
    // Construct Subway Option
    if (subwayRes.durationMinutes > 0) {
        options.push({
           id: idPrefix + '-subway',
           type: subwayRes.desc?.includes('步行') ? 'walk' : 'subway',
           from: fromName,
           to: toName,
           desc: subwayRes.desc || '公交/地铁',
           details: [
              `⏱️ ${subwayRes.durationText}`,
              subwayRes.priceText ? `💰 ${subwayRes.priceText}` : '',
              subwayRes.distanceText ? `📍 ${subwayRes.distanceText}` : ''
           ].filter(Boolean),
           recommended: subwayRes.durationMinutes <= taxiRes.durationMinutes + 10, // Recommend subway if it's not much slower than taxi
           path: subwayRes.path
        });
    }
    
    // Construct Taxi Option
    if (taxiRes.durationMinutes > 0) {
        options.push({
           id: idPrefix + '-taxi',
           type: 'taxi',
           from: fromName,
           to: toName,
           desc: taxiRes.distanceText ? `约${taxiRes.distanceText}` : '打车',
           details: [
              `⏱️ 约${taxiRes.durationText}`,
              taxiRes.priceText ? `💰 ${taxiRes.priceText}` : ''
           ].filter(Boolean),
           recommended: options.length === 0 || taxiRes.durationMinutes < subwayRes.durationMinutes - 10,
           path: taxiRes.path
        });
    }
    
    // If both failed, add a fallback walk
    if (options.length === 0) {
        const walkRes = await fetchRoutePoints(fromCoords, toCoords, 'walk');
        options.push({
            id: idPrefix + '-walk',
            type: 'walk',
            from: fromName,
            to: toName,
            desc: '步行或骑行',
            details: [`⏱️ 约${walkRes.durationText}`],
            recommended: true,
            path: walkRes.path
        });
    }
    
    return options;
}
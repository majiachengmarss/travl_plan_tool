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
  type: string
): Promise<{ path: [number, number][]; distanceText: string; durationText: string; useBezier: boolean }> {
  let path: [number, number][] = [];
  let distText = '';
  let durText = '';
  let useBezier = false;

  if (type === 'cruise') {
    useBezier = true;
  } else {
    try {
      const originStr = `${from[0]},${from[1]}`;
      const destStr = `${to[0]},${to[1]}`;
      let apiType = type === 'walk' ? 'walking' : type === 'subway' ? 'transit/integrated' : 'driving';
      const url = `/api/direction/${type}?origin=${originStr}&destination=${destStr}`;

      const res = await fetch(url);
      const data = await res.json();

      if (data.status === '1' && data.route && ((data.route.paths && data.route.paths.length > 0) || (data.route.transits && data.route.transits.length > 0))) {
        if (apiType === 'transit/integrated' && data.route.transits && data.route.transits.length > 0) {
          const transit = data.route.transits[0];
          const distance = parseInt(transit.distance || '0');
          const duration = parseInt(transit.duration || '0');
          distText = distance >= 1000 ? (distance / 1000).toFixed(1) + '公里' : distance + '米';
          durText = Math.ceil(duration / 60) + '分钟';

          transit.segments.forEach((segment: any) => {
            if (segment.walking && segment.walking.steps) {
              segment.walking.steps.forEach((step: any) => {
                step.polyline.split(';').forEach((point: string) => {
                  const pts = point.split(',');
                  path.push([parseFloat(pts[0]), parseFloat(pts[1])]);
                });
              });
            }
            if (segment.bus && segment.bus.buslines && segment.bus.buslines.length > 0) {
              segment.bus.buslines[0].polyline.split(';').forEach((point: string) => {
                const pts = point.split(',');
                path.push([parseFloat(pts[0]), parseFloat(pts[1])]);
              });
            }
          });
        } else if (data.route.paths && data.route.paths.length > 0) {
          const bestPath = data.route.paths[0];
          const distance = parseInt(bestPath.distance || '0');
          const duration = parseInt(bestPath.duration || '0');
          distText = distance >= 1000 ? (distance / 1000).toFixed(1) + '公里' : distance + '米';
          durText = Math.ceil(duration / 60) + '分钟';

          bestPath.steps.forEach((step: any) => {
            step.polyline.split(';').forEach((point: string) => {
              const pts = point.split(',');
              path.push([parseFloat(pts[0]), parseFloat(pts[1])]);
            });
          });
        }
      } else {
        // Fallback for transit if no route found
        if (apiType === 'transit/integrated') {
          const fallbackUrl = `/api/direction/walk?origin=${originStr}&destination=${destStr}`;
          const fallbackRes = await fetch(fallbackUrl);
          const fallbackData = await fallbackRes.json();
          if (fallbackData.status === '1' && fallbackData.route && fallbackData.route.paths && fallbackData.route.paths.length > 0) {
            const bestPath = fallbackData.route.paths[0];
            bestPath.steps.forEach((step: any) => {
              step.polyline.split(';').forEach((point: string) => {
                const pts = point.split(',');
                path.push([parseFloat(pts[0]), parseFloat(pts[1])]);
              });
            });
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
  }

  return { path, distanceText: distText, durationText: durText, useBezier };
}
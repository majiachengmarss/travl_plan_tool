import type { DayPlan } from '../types';
import { fetchTransportOptions } from './amap';

function parseTime(timeStr: string): number {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
}

function formatTime(mins: number): string {
    const h = Math.floor(mins / 60) % 24;
    const m = mins % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export async function autoSchedule(
    day: DayPlan,
    allLocations: Record<string, [number, number]>,
    allSpots: Record<string, any>,
    cityStr?: string
): Promise<DayPlan> {
    if (day.timeline.length === 0) return day;

    const newTimeline = [...day.timeline];
    const newTransports: any[] = [];
    
    // Determine ordered locations from timeline
    const timelineLocs: { name: string, event: string, index: number }[] = [];
    newTimeline.forEach((item, index) => {
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
            if (timelineLocs.length === 0 || timelineLocs[timelineLocs.length - 1].name !== locName) {
                timelineLocs.push({ name: locName, event: item.event, index });
            }
        }
    });

    let currentMinutes = parseTime(newTimeline[0].time); // Start time based on the first item

    for (let i = 0; i < timelineLocs.length - 1; i++) {
        const fromLoc = timelineLocs[i];
        const toLoc = timelineLocs[i+1];
        
        const fromCoords = allLocations[fromLoc.name];
        const toCoords = allLocations[toLoc.name];

        // Ensure current start time is set
        newTimeline[fromLoc.index].time = formatTime(currentMinutes);
        
        // Add visit duration for the current spot (fromLoc)
        // Default to 120 mins if it's a known spot, else 30 mins
        let visitDuration = 30; 
        if (allSpots[fromLoc.name] || newTimeline[fromLoc.index].spot) {
            visitDuration = 120; 
        }
        if (fromLoc.event.includes('午餐') || fromLoc.event.includes('晚餐')) {
            visitDuration = 60;
        }

        currentMinutes += visitDuration;

        // Fetch transport options
        try {
            const options = await fetchTransportOptions(fromLoc.name, toLoc.name, fromCoords, toCoords, cityStr);
            if (options.length > 0) {
                const bestOption = options.find(o => o.recommended) || options[0];
                // Extract duration from detail string (e.g. "⏱️ 20分钟" or "⏱️ 约20分钟")
                const durationStr = bestOption.details[0];
                const match = durationStr.match(/(\d+)分钟/);
                let transportMinutes = 20; // fallback
                if (match && match[1]) {
                    transportMinutes = parseInt(match[1], 10);
                }
                
                currentMinutes += transportMinutes;

                newTransports.push({
                    title: `${fromLoc.name} → ${toLoc.name}`,
                    options: options
                });
            } else {
                currentMinutes += 20; // fallback
            }
        } catch (e) {
            console.warn(`Failed to schedule route from ${fromLoc.name} to ${toLoc.name}`);
            currentMinutes += 20;
        }

        // Update the next location's time
        newTimeline[toLoc.index].time = formatTime(currentMinutes);
    }
    
    // Update the last location's time if not updated
    if (timelineLocs.length > 0) {
        const lastLoc = timelineLocs[timelineLocs.length - 1];
        newTimeline[lastLoc.index].time = formatTime(currentMinutes);
    }

    return {
        ...day,
        timeline: newTimeline,
        transports: newTransports
    };
}

export interface TripMeta {
  title: string;
  subtitle: string;
  city: string;
  cityCode: string;
}

export interface TimelineItem {
  id: string;
  time: string;
  event: string;
  spot?: string;
  location?: [number, number]; // Extracted from spots/locations for easy routing
}

export interface DayPlan {
  id: string;
  dateStr: string;
  shortTitle: string;
  tips: string;
  mapCenter: [number, number];
  mapZoom: number;
  timeline: TimelineItem[];
  tipsBox: string;
  concert?: any;
  tickets?: any[];
  transports?: any[];
}

export interface TripData {
  meta: TripMeta;
  locations: Record<string, [number, number]>;
  days: DayPlan[];
  spots: Record<string, any>;
}

import type { TripData } from '../types';

export interface SavedTrip {
  id: string;
  meta: TripData['meta'];
  createdAt: number;
}

export function saveTripData(id: string, tripData: TripData) {
  sessionStorage.setItem(`trip_data_${id}`, JSON.stringify(tripData)); // Also keep it in session for current active
  
  // Persist to local storage
  localStorage.setItem(`trip_data_${id}`, JSON.stringify(tripData));

  // Update index
  const savedTrips: SavedTrip[] = JSON.parse(localStorage.getItem('saved_trips') || '[]');
  const existingIdx = savedTrips.findIndex(t => t.id === id);
  if (existingIdx !== -1) {
      savedTrips[existingIdx].meta = tripData.meta;
      savedTrips[existingIdx].createdAt = Date.now();
  } else {
      savedTrips.push({
          id,
          meta: tripData.meta,
          createdAt: Date.now()
      });
  }
  
  // Sort by newest first
  savedTrips.sort((a, b) => b.createdAt - a.createdAt);
  localStorage.setItem('saved_trips', JSON.stringify(savedTrips));
}

export function loadTripData(id: string): TripData | null {
  if (id === 'beijing') {
      // Beijing is served by the backend data/beijing.json
      return null; 
  }
  
  try {
      // Check session first, then local
      const sessionStr = sessionStorage.getItem(`trip_data_${id}`);
      if (sessionStr) return JSON.parse(sessionStr);

      const localStr = localStorage.getItem(`trip_data_${id}`);
      if (localStr) return JSON.parse(localStr);

      // Legacy fallback for the generic "local" id we used previously
      if (id === 'local') {
         const legacyData = sessionStorage.getItem('local_trip_data');
         if (legacyData) return JSON.parse(legacyData);
      }
  } catch (e) {
      console.warn(`Failed to load trip data for ${id}`);
  }
  return null;
}

export function getSavedTripsIndex(): SavedTrip[] {
    try {
        return JSON.parse(localStorage.getItem('saved_trips') || '[]');
    } catch {
        return [];
    }
}

export function deleteTrip(id: string) {
    localStorage.removeItem(`trip_data_${id}`);
    sessionStorage.removeItem(`trip_data_${id}`);
    
    let savedTrips: SavedTrip[] = JSON.parse(localStorage.getItem('saved_trips') || '[]');
    savedTrips = savedTrips.filter(t => t.id !== id);
    localStorage.setItem('saved_trips', JSON.stringify(savedTrips));
}
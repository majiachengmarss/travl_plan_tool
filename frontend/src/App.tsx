import { useState, useEffect } from 'react'
import type { TripData } from './types'
import { Header } from './components/Header'
import { DayNav } from './components/DayNav'
import { DayView } from './components/DayView'

function App() {
  const [tripData, setTripData] = useState<TripData | null>(null)
  const [activeDayIdx, setActiveDayIdx] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/itinerary/beijing')
        const data = await res.json()
        
        // Add unique IDs to timeline items for drag-and-drop
        data.days.forEach((day: any) => {
          day.timeline.forEach((item: any, idx: number) => {
             item.id = `${day.id}-item-${idx}`;
          });
        });
        
        setTripData(data)
      } catch (err) {
        console.error('Failed to load trip data', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return <div className="flex h-screen items-center justify-center"><div className="loading-spinner">加载行程中...</div></div>
  }

  if (!tripData) {
    return <div className="flex h-screen items-center justify-center text-rose-600 font-bold">加载失败，请检查后端服务</div>
  }

  return (
    <div className="min-h-screen bg-paper text-ink pb-20">
      <Header meta={tripData.meta} />
      <DayNav days={tripData.days} activeIdx={activeDayIdx} onChange={setActiveDayIdx} />
      
      <main className="max-w-[1400px] mx-auto p-8">
         <DayView 
            day={tripData.days[activeDayIdx]} 
            allLocations={tripData.locations}
            allSpots={tripData.spots}
            onChange={(updatedDay) => {
               const newData = { ...tripData };
               newData.days[activeDayIdx] = updatedDay;
               setTripData(newData);
            }}
            onLocationAdd={(name, coords) => {
               const newData = { ...tripData };
               newData.locations = { ...newData.locations, [name]: coords };
               setTripData(newData);
            }}
         />
      </main>
    </div>
  )
}

export default App

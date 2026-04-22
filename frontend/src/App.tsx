import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CreateTripForm } from './components/CreateTripForm';
import { ItineraryPage } from './pages/ItineraryPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<CreateTripForm />} />
        <Route path="/itinerary" element={<ItineraryPage />} />
      </Routes>
    </Router>
  );
}

export default App;

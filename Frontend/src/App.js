import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomeDashboard from "./pages/HomeDashboard";
import AnalyticsDashboard from "./pages/AnalyticsDashboard";
import SystemSettings from "./pages/SystemSettings";
import "./App.css";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomeDashboard />} />
        <Route path="/analytics" element={<AnalyticsDashboard />} />
        <Route path="/settings" element={<SystemSettings />} />
      </Routes>
    </Router>
  );
}

export default App;

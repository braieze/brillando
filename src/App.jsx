// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Importamos las vistas
import Landing from './pages/public/Landing';
import Login from './pages/admin/Login';
import Dashboard from './pages/admin/Dashboard';
import Juego from './pages/public/Juego'; // Ajustá la ruta según tu estructura
import DashboardMaster from './pages/public/DashboardMaster';

function App() {
  return (
    <Router>
      <Routes>
        {/* 🌐 La cara visible: Landing Page Brutalista */}
        <Route path="/pantalla-gigante" element={<DashboardMaster />} />
        <Route path="/" element={<Landing />} />
        <Route path="/juego" element={<Juego />} />
        

        {/* 🔒 El Backstage: Acceso y Panel de Líderes */}
        <Route path="/admin/login" element={<Login />} />
        <Route path="/admin" element={<Dashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
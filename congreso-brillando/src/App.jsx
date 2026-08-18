// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Importamos las vistas
import Landing from './pages/public/Landing';
import Login from './pages/admin/Login';
import Dashboard from './pages/admin/Dashboard';

function App() {
  return (
    <Router>
      <Routes>
        {/* 🌐 La cara visible: Landing Page Brutalista */}
        <Route path="/" element={<Landing />} />

        {/* 🔒 El Backstage: Acceso y Panel de Líderes */}
        <Route path="/admin/login" element={<Login />} />
        <Route path="/admin" element={<Dashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
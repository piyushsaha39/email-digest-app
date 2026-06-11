import { Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import Landing from './pages/Landing.jsx';
import Dashboard from './pages/Dashboard.jsx';
import { getToken, setToken } from './services/api.js';

function PrivateRoute({ children }) {
  const [searchParams] = useSearchParams();

  // OAuth redirect lands here with ?token= before localStorage is set
  const tokenFromUrl = searchParams.get('token');
  if (tokenFromUrl) {
    setToken(tokenFromUrl);
  }

  if (!getToken()) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

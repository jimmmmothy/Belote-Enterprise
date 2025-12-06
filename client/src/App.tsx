import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useCallback, useEffect } from "react";
import LobbyPage from "./pages/Lobby";
import AuthPage from "./pages/Auth";
import GamePage from "./pages/Game";
import ProfilePage from "./pages/ProfilePage";
import Navbar from "./components/Navbar";
import "./App.css";
import { clearAuthSession, isTokenExpired } from "./utils/auth";

function ProtectedLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = typeof window !== "undefined" ? sessionStorage.getItem("token") : null;
  const expired = isTokenExpired(token);

  const handleLogout = useCallback(() => {
    clearAuthSession();
    navigate("/", { replace: true });
  }, [navigate]);

  useEffect(() => {
    if (!token || expired) {
      handleLogout();
      return;
    }

    const interval = setInterval(() => {
      const currentToken = sessionStorage.getItem("token");
      if (!currentToken || isTokenExpired(currentToken)) {
        handleLogout();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [token, expired, handleLogout]);

  if (!token || expired) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  return (
    <>
      <Navbar onLogout={handleLogout} />
      <div className="page-shell">
        <Outlet />
      </div>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AuthPage />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/lobby" element={<LobbyPage />} />
          <Route path="/game" element={<GamePage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

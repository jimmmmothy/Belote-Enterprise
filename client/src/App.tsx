import { BrowserRouter, Routes, Route } from "react-router-dom";
import LobbyPage from "./pages/Lobby";
import AuthPage from "./pages/Auth";
import GamePage from "./pages/Game";
import ProfilePage from "./pages/ProfilePage";
import "./App.css";
import { Navigate } from "react-router-dom";
import type { ReactElement } from "react";

function RequireAuth({ children }: { children: ReactElement }) {
  const token = typeof window !== "undefined" ? sessionStorage.getItem("token") : null;
  if (!token) return <Navigate to="/" replace />;
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AuthPage />} />
        <Route path="/lobby" element={<LobbyPage />} />
        <Route path="/game" element={<GamePage />} />
        <Route
          path="/profile"
          element={
            <RequireAuth>
              <ProfilePage />
            </RequireAuth>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

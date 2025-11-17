import { BrowserRouter, Routes, Route } from "react-router-dom";
import LobbyPage from "./pages/Lobby";
import AuthPage from "./pages/Auth";
import GamePage from "./pages/Game";
import "./App.css"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AuthPage />} />
        <Route path="/lobby" element={<LobbyPage />} />
        <Route path="/game" element={<GamePage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
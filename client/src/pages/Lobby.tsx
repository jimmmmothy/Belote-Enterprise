import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { loadConfig } from "../config";
import { runLobbySaga } from "../utils/authSaga";
import "./Lobby.css";

type Lobby = { id: string; name: string; status: string };

export default function LobbyPage() {
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [lobbyName, setLobbyName] = useState("");
  const [username, setUsername] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const fetchLobbies = useCallback(async () => {
    const SERVER_URL = await loadConfig().then((config) => config?.serverUrl || "");
    const res = await axios.get(`${SERVER_URL}/lobbies`);
    setLobbies(res.data);
  }, []);

  useEffect(() => {
    const storedUsername = sessionStorage.getItem("username");
    setUsername(storedUsername);
    fetchLobbies();
    const interval = setInterval(fetchLobbies, 5000);
    return () => clearInterval(interval);
  }, [fetchLobbies, navigate]);

  const createLobby = async () => {
    if (!username || !lobbyName.trim()) return;
    setBusy(true);
    try {
      const data = await runLobbySaga({ kind: "create", lobbyName });
      sessionStorage.setItem("lobbyId", data.lobbyId);
      sessionStorage.setItem("playerId", data.playerId);
      sessionStorage.setItem("playerName", username);
      navigate("/game");
    } catch (err: any) {
      alert(err.message || "Could not create lobby");
    } finally {
      setBusy(false);
    }
  };

  const joinLobby = async (lobbyId: string) => {
    if (!username) return;
    setBusy(true);
    try {
      const data = await runLobbySaga({ kind: "join", lobbyId });
      sessionStorage.setItem("lobbyId", lobbyId);
      sessionStorage.setItem("playerId", data.playerId);
      sessionStorage.setItem("playerName", username);
      navigate("/game");
    } catch (err: any) {
      alert(err.message || "Could not join lobby");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <div className="create-lobby">
        <input
          type="text"
          placeholder="Lobby name"
          onChange={(e) => setLobbyName(e.target.value)}
          disabled={busy}
        />
        <button onClick={createLobby} disabled={busy}>
          {busy ? "Working..." : "Create Lobby"}
        </button>
      </div>

      <div className="lobby-list">
        {lobbies.length > 0 ? (
          lobbies.map((l) => (
            <div key={l.id} className="lobby-item" onClick={() => joinLobby(l.id)}>
              <span>{l.name}</span>
              <span>{l.status}</span>
            </div>
          ))
        ) : (
          <p>It's empty here...</p>
        )}
      </div>
    </div>
  );
}

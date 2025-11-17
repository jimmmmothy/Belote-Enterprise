import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SERVER_URL } from "../config";
import axios from "axios";
import "./Lobby.css";

export default function LobbyPage() {
  const [lobbies, setLobbies] = useState<{ id: string; name: string; status: string }[]>([]);
  const [lobbyName, setLobbyName] = useState("");
  const [playerName] = useState("temp");
  const navigate = useNavigate();

  async function fetchLobbies() {
    const res = await axios.get(`${SERVER_URL}/lobbies`);
    const data = res.data;
    console.log("Fetched lobbies:", data);
    setLobbies(data);
  }

  async function createLobby() {
    const res = await axios.post(`${SERVER_URL}/lobbies`, { lobbyName, playerName });
    const data = res.data;

    sessionStorage.setItem("lobbyId", data.lobbyId);
    sessionStorage.setItem("playerId", data.playerId);
    navigate("/game");
  }

  async function joinLobby(lobbyId: string) {
    const res = await axios.post(`${SERVER_URL}/lobbies/${lobbyId}/join`, { playerName });
    const data = res.data;
    
    if (data.error) alert(data.error);
    else {
      sessionStorage.setItem("lobbyId", lobbyId);
      sessionStorage.setItem("playerId", data.playerId);
      navigate("/game");
    }
  }

  useEffect(() => {
    fetchLobbies();
    const interval = setInterval(fetchLobbies, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="page">
      <div className="create-lobby">
        <input type="text" placeholder="Lobby name" onChange={(e) => setLobbyName(e.target.value)} />
        <button onClick={createLobby}>Create Lobby</button>
      </div>

      <div className="lobby-list">
        {lobbies.length > 0 ? lobbies.map(l =>
          <div className="lobby-item" onClick={() => joinLobby(l.id)}>
            <span>{l.name}</span>
            <span>{l.status}</span>
          </div>
        ) : (
          <p>It's empty here...</p>
        )}
      </div>
    </div>
  );
}

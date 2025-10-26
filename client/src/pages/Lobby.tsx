import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SERVER_URL } from "../config";
import axios from "axios";
import "./Lobby.css";

export default function Lobby() {
  const [lobbies, setLobbies] = useState<{ id: string; name: string }[]>([]);
  const [lobbyName, setLobbyName] = useState("");
  const [playerName, setPlayerName] = useState("");
  const navigate = useNavigate();

  async function fetchLobbies() {
    // const res = await fetch(`${SERVER_URL}/lobbies`);
    const res = await axios.get(`${SERVER_URL}/lobbies`);
    const data = res.data;
    console.log("Fetched lobbies:", data);
    setLobbies(data);
  }

  async function createLobby() {
    const playerId = sessionStorage.getItem("playerId") ?? crypto.randomUUID();
    sessionStorage.setItem("playerId", playerId);

    // const res = await fetch(`${SERVER_URL}/lobbies`, {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({ lobbyName, playerName, playerId }),
    // });

    const res = await axios.post(`${SERVER_URL}/lobbies`, { lobbyName, playerName, playerId });
    const data = res.data;

    sessionStorage.setItem("lobbyId", data.id);
    navigate("/game");
  }

  async function joinLobby(lobbyId: string) {
    const playerId = sessionStorage.getItem("playerId") ?? crypto.randomUUID();
    sessionStorage.setItem("playerId", playerId);

    const res = await fetch(`${SERVER_URL}/lobbies/${lobbyId}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerName, playerId }),
    });

    const data = await res.json();
    if (data.error) alert(data.error);
    else {
      sessionStorage.setItem("lobbyId", lobbyId);
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
        <input type="text" placeholder="Your name" onChange={(e) => setPlayerName(e.target.value)} />
        <input type="text" placeholder="Lobby name" onChange={(e) => setLobbyName(e.target.value)} />
        <button onClick={createLobby}>Create Lobby</button>
      </div>

      <div className="lobby-list">
        {lobbies ? lobbies.map(l =>
          <div className="lobby-item" onClick={() => joinLobby(l.id)}>
            <span>{l.name}</span>
          </div>
        ) : (
          <p>It's empty here...</p>
        )}
      </div>
    </div>
  );
}

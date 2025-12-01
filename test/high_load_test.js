import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: 1000, // virtual users
  duration: "45s",
};

export default function () {
  const url1 = "http://api.belote.local/lobbies"; 
  const payload1 = JSON.stringify({ lobbyName: "StressTest", playerName: `User ${Math.random()}` }); 
  const headers = { "Content-Type": "application/json" }; 
  
  const res1 = http.post(url1, payload1, { headers }); 
  check(res1, { "create 201": (r) => r.status === 201 });

  if (res1.status === 201) {
    const body1 = JSON.parse(res1.body);
    const url2 = `http://api.belote.local/lobbies/${body1.lobbyId}/join`;

    for (let i = 0; i < 3; i++) {
      const payload2 = JSON.stringify({ playerName: `User ${Math.random()}` });
      const res2 = http.post(url2, payload2, { headers });
      check(res2, { "join 200": (r) => r.status === 200 });
    }

    const payload3 = JSON.stringify({ playerName: `User ${Math.random()}`})
    const res3 = http.post(url2, payload3, { headers });
    check(res3, { "lobby full": (r) => r.status === 400 });
  }

  sleep(0.1);
}
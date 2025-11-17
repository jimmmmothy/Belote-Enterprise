// Updated AuthPage with loading spinner
import axios from "axios";
import { useState, useEffect, type BaseSyntheticEvent } from "react";
import { useNavigate } from "react-router-dom";
import { SERVER_URL } from "../config";
import "./Auth.css";

export default function AuthPage() {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [username, setUsername] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // Auto logout when token is expired
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const exp = payload.exp * 1000;
      if (Date.now() >= exp) {
        localStorage.removeItem("token");
      }
    } catch {}
  }, []);

  const toggleMode = () => {
    setMode(mode === "signin" ? "signup" : "signin");
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e: BaseSyntheticEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email || !password || (mode === "signup" && !username)) {
      setError("All fields must be filled in.");
      return;
    }

    if (mode === "signup" && password !== confirmPass) {
      setError("Passwords do not match.");
      return;
    }

    const payload =
      mode === "signup"
        ? { email, password, username, confirmPass }
        : { email, password };

    const endpoint = mode === "signup" ? "/auth/register" : "/auth/login";

    try {
      setLoading(true);
      const response = await axios.post(`${SERVER_URL}${endpoint}`, payload);
      const token = response.data.token;
      if (!token) {
        setError("Server did not return a token.");
        setLoading(false);
        return;
      }

      localStorage.setItem("token", token);
      setSuccess("Success! Redirecting...");
      setTimeout(() => navigate("/lobby"), 800);
    } catch (err: any) {
      if (err.response?.data?.error) setError(err.response.data.error);
      else setError("Request failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="auth-box">
        <h1>{mode === "signin" ? "Sign In" : "Sign Up"}</h1>

        {error && <div style={{ color: "red", marginBottom: 10 }}>{error}</div>}
        {success && <div style={{ color: "lime", marginBottom: 10 }}>{success}</div>}

        {loading && <div style={{ color: "aqua", marginBottom: 10 }}>Loading...</div>}

        <form className="form" onSubmit={handleSubmit}>
          {mode === "signup" && (
            <input
              className="input"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          )}
          <input
            className="input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {mode === "signup" && (
            <input
              className="input"
              type="password"
              placeholder="Confirm Password"
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
            />
          )}
          <button type="submit" disabled={loading}>
            {loading ? "Please wait..." : mode === "signin" ? "Sign In" : "Create Account"}
          </button>
        </form>

        <div className="toggle-text">
          {mode === "signin" ? "Don't have an account? " : "Already have an account?"}
          <div className="toggle-mode" onClick={toggleMode}>
            {mode === "signin" ? "Sign Up" : "Sign In"}
          </div>
        </div>
      </div>
    </div>
  );
}

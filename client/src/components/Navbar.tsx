import { NavLink } from "react-router-dom";
import "./Navbar.css";

type NavbarProps = {
  onLogout: () => void;
};

export default function Navbar({ onLogout }: NavbarProps) {
  const username = typeof window !== "undefined" ? sessionStorage.getItem("username") : null;

  return (
    <nav className="top-nav">
      <div className="nav-left">
        <div className="brand">Belote</div>
        <NavLink to="/lobby" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
          Lobbies
        </NavLink>
        <NavLink to="/profile" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
          My Profile
        </NavLink>
      </div>
      <div className="nav-right">
        {username && <span className="nav-username">{username}</span>}
        <button className="nav-logout" onClick={onLogout}>
          Log out
        </button>
      </div>
    </nav>
  );
}

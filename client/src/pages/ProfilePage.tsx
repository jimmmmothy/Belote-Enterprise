import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  changeEmail,
  changePassword,
  getMatchHistory,
  getProfile,
  requestDataExport,
  requestDeleteAccount,
  updateProfile,
  type MatchHistoryEntry,
  type Profile,
} from "../api/profile";
import { useNavigate } from "react-router-dom";

function formatDate(value?: string) {
  if (!value) return "";
  return new Date(value).toLocaleString();
}

const initialProfileState: Profile | null = null;

type StatusState = { type: "success" | "error"; message: string } | null;

type ExportState = {
  isOpen: boolean;
  data: any;
};

function sectionCard(children: ReactNode) {
  return <div className="profile-card">{children}</div>;
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(initialProfileState);
  const [profileDraft, setProfileDraft] = useState<Partial<Profile>>({});
  const [profileStatus, setProfileStatus] = useState<StatusState>(null);
  const [accountStatus, setAccountStatus] = useState<StatusState>(null);
  const [privacyStatus, setPrivacyStatus] = useState<StatusState>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyItems, setHistoryItems] = useState<MatchHistoryEntry[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [exportState, setExportState] = useState<ExportState>({ isOpen: false, data: null });

  // Account forms
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const profileChanged = useMemo(() => {
    if (!profile) return false;
    const keys: (keyof Profile)[] = [
      "username",
      "avatarUrl",
      "showInLeaderboards",
      "showPublicMatchHistory",
      "marketingEmailsOptIn",
    ];
    return keys.some((k) => profileDraft[k] !== undefined && profileDraft[k] !== (profile as any)[k]);
  }, [profile, profileDraft]);

  useEffect(() => {
    async function load() {
      try {
        setLoadingProfile(true);
        setHistoryLoading(true);
        const [p, history] = await Promise.all([getProfile(), getMatchHistory()]);
        setProfile(p);
        setHistoryItems(history.items);
        setNextCursor(history.nextCursor);
      } catch (err) {
        setProfileStatus({ type: "error", message: "Failed to load profile" });
      } finally {
        setLoadingProfile(false);
        setHistoryLoading(false);
      }
    }
    load();
  }, []);

  const handleProfileChange = async () => {
    if (!profile) return;
    setProfileStatus(null);
    try {
      const updated = await updateProfile(profileDraft);
      setProfile(updated);
      setProfileDraft({});
      setProfileStatus({ type: "success", message: "Profile updated" });
    } catch (err) {
      setProfileStatus({ type: "error", message: "Failed to update profile" });
    }
  };

  const handleChangeEmail = async () => {
    setAccountStatus(null);
    try {
      await changeEmail(newEmail);
      setAccountStatus({ type: "success", message: "Email updated" });
      setNewEmail("");
    } catch (err) {
      setAccountStatus({ type: "error", message: "Failed to change email" });
    }
  };

  const handleChangePassword = async () => {
    setAccountStatus(null);
    try {
      await changePassword(currentPassword, newPassword);
      setAccountStatus({ type: "success", message: "Password updated" });
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      setAccountStatus({ type: "error", message: "Failed to change password" });
    }
  };

  const handleRequestExport = async () => {
    setPrivacyStatus(null);
    try {
      const data = await requestDataExport();
      setExportState({ isOpen: true, data });
      setPrivacyStatus({ type: "success", message: "Export ready" });
    } catch (err) {
      setPrivacyStatus({ type: "error", message: "Failed to export data" });
    }
  };

  const handleDeleteAccount = async () => {
    const confirmDelete = window.confirm(
      "This will permanently delete your account and personal data. Are you sure?"
    );
    if (!confirmDelete) return;

    setPrivacyStatus(null);
    try {
      const res = await requestDeleteAccount();
      if (res?.status === "DELETED") {
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("username");
        setPrivacyStatus({ type: "success", message: "Account deleted" });
        navigate("/");
      } else {
        setPrivacyStatus({ type: "error", message: "Delete failed" });
      }
    } catch (err) {
      setPrivacyStatus({ type: "error", message: "Delete failed" });
    }
  };

  const handleLoadMore = async () => {
    if (!nextCursor) return;
    setIsLoadingMore(true);
    try {
      const res = await getMatchHistory(20, nextCursor);
      setHistoryItems((prev) => [...prev, ...res.items]);
      setNextCursor(res.nextCursor);
    } catch (err) {
      setPrivacyStatus({ type: "error", message: "Failed to load history" });
    } finally {
      setIsLoadingMore(false);
    }
  };

  if (loadingProfile) {
    return <div className="profile-page"><p>Loading profile…</p></div>;
  }

  if (!profile) {
    return <div className="profile-page"><p>Profile unavailable.</p></div>;
  }

  return (
    <div className="profile-page">
      <h1>Profile</h1>

      <div className="profile-grid">
        {sectionCard(
          <>
            <h2>Account settings</h2>
            {accountStatus && <p className={accountStatus.type}>{accountStatus.message}</p>}
            <div className="form-group">
              <label>New email</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="you@example.com"
              />
              <button onClick={handleChangeEmail} disabled={!newEmail}>Change email</button>
            </div>

            <div className="form-group">
              <label>Current password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
              <label>New password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <button onClick={handleChangePassword} disabled={!currentPassword || !newPassword}>
                Change password
              </button>
            </div>
          </>
        )}

        {sectionCard(
          <>
            <h2>Profile settings</h2>
            {profileStatus && <p className={profileStatus.type}>{profileStatus.message}</p>}
            <div className="form-group">
              <label>Username</label>
              <input
                value={profileDraft.username ?? profile.username}
                onChange={(e) => setProfileDraft((draft) => ({ ...draft, username: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={profileDraft.showInLeaderboards ?? profile.showInLeaderboards}
                  onChange={(e) =>
                    setProfileDraft((draft) => ({ ...draft, showInLeaderboards: e.target.checked }))
                  }
                />
                Show in leaderboards
              </label>
            </div>
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={profileDraft.showPublicMatchHistory ?? profile.showPublicMatchHistory}
                  onChange={(e) =>
                    setProfileDraft((draft) => ({ ...draft, showPublicMatchHistory: e.target.checked }))
                  }
                />
                Show public match history
              </label>
            </div>
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={profileDraft.marketingEmailsOptIn ?? profile.marketingEmailsOptIn}
                  onChange={(e) =>
                    setProfileDraft((draft) => ({ ...draft, marketingEmailsOptIn: e.target.checked }))
                  }
                />
                Marketing emails opt-in
              </label>
            </div>
            <button onClick={handleProfileChange} disabled={!profileChanged}>Save changes</button>
          </>
        )}

        {sectionCard(
          <>
            <h2>Privacy & data</h2>
            {privacyStatus && <p className={privacyStatus.type}>{privacyStatus.message}</p>}
            <div className="button-row">
              <button onClick={handleRequestExport}>Request my data</button>
              <button onClick={handleDeleteAccount} className="danger">
                Delete my account & personal data
              </button>
            </div>
            {exportState.isOpen && (
              <div className="export-view">
                <div className="export-header">
                  <h3>Export JSON</h3>
                  <button onClick={() => setExportState({ isOpen: false, data: null })}>Close</button>
                </div>
                <pre>{JSON.stringify(exportState.data, null, 2)}</pre>
              </div>
            )}
          </>
        )}

        {sectionCard(
          <>
            <h2>Match history</h2>
            {historyLoading ? (
              <p>Loading history…</p>
            ) : (
              <div className="history-list">
                {historyItems.map((entry) => (
                  <div key={entry.id} className={`history-item ${entry.result.toLowerCase()}`}>
                    <div className="history-row">
                      <strong>{entry.result}</strong>
                      <span>{formatDate(entry.createdAt)}</span>
                    </div>
                    <div className="history-row">Game: {entry.gameId}</div>
                    <div className="history-row">Lobby: {entry.lobbyId}</div>
                    <div className="history-row">Score: {entry.score ?? "-"}</div>
                    <div className="history-row">
                      Teammates: {entry.teammates.map((t) => t.username || t.userId).join(", ")}
                    </div>
                    <div className="history-row">
                      Opponents: {entry.opponents.map((o) => o.username || o.userId).join(", ")}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {nextCursor && (
              <button onClick={handleLoadMore} disabled={isLoadingMore}>
                {isLoadingMore ? "Loading…" : "Load more"}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

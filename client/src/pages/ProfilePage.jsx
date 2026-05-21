import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import {
  changeMyEmail,
  changeMyPassword,
  deleteMyAvatar,
  fetchMyProfile,
  updateMyProfile,
  uploadMyAvatar,
} from '../utils/me';
import '../styles/admin.css';
import '../styles/profile.css';

const AVATAR_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('') || '?';
}

export default function ProfilePage() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Personal info form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [notify, setNotify] = useState(true);
  const [savingInfo, setSavingInfo] = useState(false);
  const [infoError, setInfoError] = useState('');
  const [infoNotice, setInfoNotice] = useState('');

  // Email change state
  const [editingEmail, setEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailError, setEmailError] = useState('');

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordNotice, setPasswordNotice] = useState('');

  // Avatar state
  const fileInputRef = useRef(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        setLoadError('');
        setLoading(true);
        const data = await fetchMyProfile();
        setProfile(data);
        setName(data.name);
        setPhone(data.phone);
        setJobTitle(data.jobTitle);
        setNotify(data.emailNotificationsEnabled);
      } catch (err) {
        setLoadError(err.message || 'Failed to load your profile.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSaveInfo(event) {
    event.preventDefault();
    setInfoError('');
    setInfoNotice('');
    if (!name.trim()) {
      setInfoError('Name cannot be empty.');
      return;
    }
    setSavingInfo(true);
    try {
      const updated = await updateMyProfile({
        name: name.trim(),
        phone: phone.trim(),
        jobTitle: jobTitle.trim(),
        emailNotificationsEnabled: notify,
      });
      setProfile(updated);
      setInfoNotice('Saved.');
    } catch (err) {
      setInfoError(err.message || 'Could not save changes.');
    } finally {
      setSavingInfo(false);
    }
  }

  async function handleChangeEmail(event) {
    event.preventDefault();
    setEmailError('');
    if (!newEmail.trim()) {
      setEmailError('Enter a new email address.');
      return;
    }
    if (newEmail.trim().toLowerCase() === profile.email.toLowerCase()) {
      setEmailError('This is already your current email.');
      return;
    }
    setSavingEmail(true);
    try {
      const response = await changeMyEmail(newEmail.trim());
      // Server cleared the session cookie. Clear local cache too and
      // route the user to the verify-email page with the new address.
      await logout();
      navigate('/verify', {
        replace: true,
        state: { email: response.email, notice: response.message },
      });
    } catch (err) {
      setEmailError(err.message || 'Could not change email.');
    } finally {
      setSavingEmail(false);
    }
  }

  async function handleAvatarPicked(event) {
    setAvatarError('');
    const file = event.target.files?.[0];
    // Reset the input so picking the same file again still fires onChange.
    event.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setAvatarError('Please choose an image file.');
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarError('Image must be 5MB or smaller.');
      return;
    }

    setUploadingAvatar(true);
    try {
      const updated = await uploadMyAvatar(file);
      setProfile(updated);
    } catch (err) {
      setAvatarError(err.message || 'Could not upload avatar.');
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleRemoveAvatar() {
    setAvatarError('');
    if (!window.confirm('Remove your profile picture?')) return;
    setUploadingAvatar(true);
    try {
      const updated = await deleteMyAvatar();
      setProfile(updated);
    } catch (err) {
      setAvatarError(err.message || 'Could not remove avatar.');
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleChangePassword(event) {
    event.preventDefault();
    setPasswordError('');
    setPasswordNotice('');
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }
    setSavingPassword(true);
    try {
      await changeMyPassword(currentPassword, newPassword);
      setPasswordNotice('Password updated.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(err.message || 'Could not change password.');
    } finally {
      setSavingPassword(false);
    }
  }

  if (loading) {
    return (
      <div className="profile-page">
        <p className="profile-placeholder">Loading your profile…</p>
      </div>
    );
  }

  if (loadError || !profile) {
    return (
      <div className="profile-page">
        <p className="profile-error" role="alert">{loadError || 'Profile unavailable.'}</p>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-shell">
        <header className="profile-header">
          <Link to="/welcome" className="profile-back">← Back to Welcome</Link>
          <h1>My Profile</h1>
        </header>

        <section className="profile-card profile-summary">
          <div className="profile-avatar-wrap">
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt="" className="profile-avatar-img" />
            ) : (
              <div className="profile-avatar" aria-hidden="true">{getInitials(profile.name)}</div>
            )}
            <input
              type="file"
              ref={fileInputRef}
              accept={AVATAR_ACCEPT}
              style={{ display: 'none' }}
              onChange={handleAvatarPicked}
            />
            <div className="profile-avatar-actions">
              <button
                type="button"
                className="btn-secondary btn-small"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
              >
                {uploadingAvatar ? 'Uploading…' : (profile.avatarUrl ? 'Change photo' : 'Upload photo')}
              </button>
              {profile.avatarUrl && (
                <button
                  type="button"
                  className="btn-secondary btn-small btn-danger-outline"
                  onClick={handleRemoveAvatar}
                  disabled={uploadingAvatar}
                >
                  Remove
                </button>
              )}
            </div>
            {avatarError && <p className="admin-error profile-avatar-error" role="alert">{avatarError}</p>}
          </div>
          <div className="profile-summary-text">
            <h2>{profile.name}</h2>
            <p className="profile-email">{profile.email}</p>
            <div className="profile-badges">
              <span className={`admin-pill role-${profile.role}`}>{profile.role}</span>
              <span className={`admin-pill status-${profile.status}`}>{profile.status}</span>
              {!profile.emailVerified && (
                <span className="admin-pill status-pending">email unverified</span>
              )}
            </div>
          </div>
        </section>

        <section className="profile-card">
          <h3>Personal Information</h3>
          <form onSubmit={handleSaveInfo} className="profile-form">
            <label>
              <span>Full name</span>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
            </label>

            <label>
              <span>Phone</span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+40 700 000 000"
              />
            </label>

            <label>
              <span>Job title</span>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. Senior Network Engineer"
              />
            </label>

            <label className="profile-check">
              <input
                type="checkbox"
                checked={notify}
                onChange={(e) => setNotify(e.target.checked)}
              />
              <span>Email me about important events (mentions, urgent tickets, DMs)</span>
            </label>

            <div className="profile-readonly">
              <div>
                <span className="profile-label">Role</span>
                <span className={`admin-pill role-${profile.role}`}>{profile.role}</span>
                <small>Set by an administrator.</small>
              </div>
              <div>
                <span className="profile-label">Teams</span>
                {profile.teams.length === 0 ? (
                  <span className="admin-muted">No teams.</span>
                ) : (
                  <div className="admin-team-chips">
                    {profile.teams.map((t) => (
                      <span key={t.id} className="admin-chip">{t.name}</span>
                    ))}
                  </div>
                )}
                <small>Set by an administrator.</small>
              </div>
            </div>

            {infoError && <p className="admin-error" role="alert">{infoError}</p>}
            {infoNotice && <p className="admin-info" role="status">{infoNotice}</p>}

            <div className="profile-actions">
              <button type="submit" className="btn-primary" disabled={savingInfo}>
                {savingInfo ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        </section>

        <section className="profile-card">
          <h3>Email Address</h3>
          {!editingEmail ? (
            <div className="profile-row">
              <p className="profile-current-email">{profile.email}</p>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => { setEditingEmail(true); setNewEmail(profile.email); setEmailError(''); }}
              >
                Change email
              </button>
            </div>
          ) : (
            <form onSubmit={handleChangeEmail} className="profile-form">
              <label>
                <span>New email</span>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                />
                <small>
                  Changing email will sign you out. A verification code will be sent to the
                  new address — you'll enter it on the next screen.
                </small>
              </label>

              {emailError && <p className="admin-error" role="alert">{emailError}</p>}

              <div className="profile-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => { setEditingEmail(false); setEmailError(''); }}
                  disabled={savingEmail}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={savingEmail}>
                  {savingEmail ? 'Sending…' : 'Send verification code'}
                </button>
              </div>
            </form>
          )}
        </section>

        <section className="profile-card">
          <h3>Change Password</h3>
          <form onSubmit={handleChangePassword} className="profile-form">
            <label>
              <span>Current password</span>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </label>

            <label>
              <span>New password</span>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={6}
                required
              />
            </label>

            <label>
              <span>Confirm new password</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={6}
                required
              />
            </label>

            {passwordError && <p className="admin-error" role="alert">{passwordError}</p>}
            {passwordNotice && <p className="admin-info" role="status">{passwordNotice}</p>}

            <div className="profile-actions">
              <button type="submit" className="btn-primary" disabled={savingPassword}>
                {savingPassword ? 'Updating…' : 'Update password'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

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
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || '?';
}

export default function ProfilePage() {
  const { logout, updateUser } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [notify, setNotify] = useState(true);
  const [savingInfo, setSavingInfo] = useState(false);
  const [infoError, setInfoError] = useState('');
  const [infoNotice, setInfoNotice] = useState('');

  const [editingEmail, setEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailError, setEmailError] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordNotice, setPasswordNotice] = useState('');

  const fileInputRef = useRef(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const [avatarNotice, setAvatarNotice] = useState('');
  const [pendingAvatarFile, setPendingAvatarFile] = useState(null);
  const [pendingAvatarPreview, setPendingAvatarPreview] = useState('');

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

  useEffect(() => {
    if (!pendingAvatarFile) {
      setPendingAvatarPreview('');
      return undefined;
    }

    const previewUrl = URL.createObjectURL(pendingAvatarFile);
    setPendingAvatarPreview(previewUrl);

    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [pendingAvatarFile]);

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
      updateUser(updated);
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
    setAvatarNotice('');
    const file = event.target.files?.[0];
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

    setPendingAvatarFile(file);
    setAvatarNotice('Photo selected. Press Save to keep it.');
  }

  async function handleSaveAvatar() {
    if (!pendingAvatarFile) return;

    setAvatarError('');
    setAvatarNotice('');
    setUploadingAvatar(true);
    try {
      const updated = await uploadMyAvatar(pendingAvatarFile);
      setProfile(updated);
      updateUser(updated);
      setPendingAvatarFile(null);
      setAvatarNotice('Photo saved.');
    } catch (err) {
      setAvatarError(err.message || 'Could not upload avatar.');
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleRemoveAvatar() {
    setAvatarError('');
    setAvatarNotice('');
    if (pendingAvatarFile) {
      setPendingAvatarFile(null);
      return;
    }

    if (!window.confirm('Remove your profile picture?')) return;

    setUploadingAvatar(true);
    try {
      const updated = await deleteMyAvatar();
      setProfile(updated);
      updateUser(updated);
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
        <p className="profile-placeholder">Loading your profile...</p>
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
          <Link to="/welcome" className="profile-back">Back to Welcome</Link>
          <div>
            <p>Account Settings</p>
            <h1>My Profile</h1>
          </div>
        </header>

        <section className="profile-card profile-summary">
          <div className="profile-avatar-wrap">
            {pendingAvatarPreview || profile.avatarUrl ? (
              <img src={pendingAvatarPreview || profile.avatarUrl} alt="" className="profile-avatar-img" />
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
            <button
              type="button"
              className="profile-camera-button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              aria-label="Upload profile photo"
            >
              Photo
            </button>
          </div>

          <div className="profile-summary-text">
            <div className="profile-title-row">
              <h2>{profile.name}</h2>
              <div className="profile-badges">
                <span className={`admin-pill role-${profile.role}`}>{profile.role}</span>
                <span className={`admin-pill status-${profile.status}`}>{profile.status}</span>
                {!profile.emailVerified && (
                  <span className="admin-pill status-pending">email unverified</span>
                )}
              </div>
            </div>
            <p className="profile-email">{profile.email}</p>
          </div>

          <div className="profile-avatar-actions">
            <button
              type="button"
              className="btn-primary"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
            >
              {uploadingAvatar ? 'Uploading...' : (profile.avatarUrl ? 'Change photo' : 'Upload photo')}
            </button>
            {pendingAvatarFile && (
              <button
                type="button"
                className="btn-primary"
                onClick={handleSaveAvatar}
                disabled={uploadingAvatar}
              >
                Save
              </button>
            )}
            {(profile.avatarUrl || pendingAvatarFile) && (
              <button
                type="button"
                className="btn-secondary btn-danger-outline"
                onClick={handleRemoveAvatar}
                disabled={uploadingAvatar}
              >
                {pendingAvatarFile ? 'Cancel' : 'Remove'}
              </button>
            )}
            {avatarError && <p className="admin-error profile-avatar-error" role="alert">{avatarError}</p>}
            {avatarNotice && <p className="admin-info profile-avatar-error" role="status">{avatarNotice}</p>}
          </div>
        </section>

        <div className="profile-main-grid">
          <section className="profile-card profile-info-card">
            <h3>Personal Information</h3>
            <form onSubmit={handleSaveInfo} className="profile-form">
              <div className="profile-two-column">
                <label>
                  <span>Full name</span>
                  <input type="text" value={name} onChange={(event) => setName(event.target.value)} required />
                </label>

                <label>
                  <span>Phone</span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="+40 700 000 000"
                  />
                </label>
              </div>

              <label>
                <span>Job title</span>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(event) => setJobTitle(event.target.value)}
                  placeholder="e.g. Senior Network Engineer"
                />
              </label>

              <label className="profile-check">
                <input
                  type="checkbox"
                  checked={notify}
                  onChange={(event) => setNotify(event.target.checked)}
                />
                <span>Email me about important events (mentions, urgent tickets, DMs)</span>
              </label>

              {infoError && <p className="admin-error" role="alert">{infoError}</p>}
              {infoNotice && <p className="admin-info" role="status">{infoNotice}</p>}

              <div className="profile-actions">
                <button type="submit" className="btn-primary" disabled={savingInfo}>
                  {savingInfo ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </form>
          </section>

          <aside className="profile-side-stack">
            <section className="profile-card profile-mini-card">
              <h3>Role</h3>
              <div className="profile-role-box">
                <span>{profile.role}</span>
                <span className={`admin-pill role-${profile.role}`}>{profile.role}</span>
              </div>
              <small>Set by an administrator.</small>
            </section>

            <section className="profile-card profile-mini-card">
              <h3>Teams</h3>
              {profile.teams.length === 0 ? (
                <span className="profile-muted">No teams joined yet.</span>
              ) : (
                <div className="admin-team-chips">
                  {profile.teams.map((team) => (
                    <span key={team.id} className="admin-chip">{team.name}</span>
                  ))}
                </div>
              )}
            </section>
          </aside>
        </div>

        <div className="profile-bottom-grid">
          <section className="profile-card profile-email-card">
            <h3>Email Address</h3>
            {!editingEmail ? (
              <div className="profile-email-view">
                <p className="profile-current-email">{profile.email}</p>
                <span>Your primary email address for notifications and security.</span>
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
                    onChange={(event) => setNewEmail(event.target.value)}
                    required
                  />
                  <small>
                    Changing email will sign you out. A verification code will be sent to the
                    new address and you will enter it on the next screen.
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
                    {savingEmail ? 'Sending...' : 'Send verification code'}
                  </button>
                </div>
              </form>
            )}
          </section>

          <section className="profile-card profile-security-card">
            <h3>Security</h3>
            <form onSubmit={handleChangePassword} className="profile-form">
              <label>
                <span>Current password</span>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  required
                />
              </label>

              <label>
                <span>New password</span>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  minLength={6}
                  required
                />
              </label>

              <label>
                <span>Confirm new password</span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  minLength={6}
                  required
                />
              </label>

              {passwordError && <p className="admin-error" role="alert">{passwordError}</p>}
              {passwordNotice && <p className="admin-info" role="status">{passwordNotice}</p>}

              <div className="profile-actions">
                <button type="submit" className="btn-primary" disabled={savingPassword}>
                  {savingPassword ? 'Updating...' : 'Update password'}
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}

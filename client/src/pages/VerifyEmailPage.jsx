import { useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth';
import '../styles/login.css';

export default function VerifyEmailPage() {
  const { verifyEmail, resendVerification } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Email arrives via either query param (?email=) or location.state from signup.
  const initialEmail =
    location.state?.email || searchParams.get('email') || '';

  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState(location.state?.notice || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setInfo('');

    if (!email.trim()) {
      setError('Please enter the email address you signed up with.');
      return;
    }
    if (!/^\d{6}$/.test(code.trim())) {
      setError('Verification code must be exactly 6 digits.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await verifyEmail({ email: email.trim(), code: code.trim() });
      navigate('/login', {
        replace: true,
        state: { notice: response?.message || 'Email verified. You can now log in.' },
      });
    } catch (err) {
      setError(err.message || 'Verification failed.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    setError('');
    setInfo('');
    if (!email.trim()) {
      setError('Enter your email first, then click resend.');
      return;
    }

    setIsResending(true);
    try {
      const response = await resendVerification({ email: email.trim() });
      setInfo(response?.message || 'A new code has been sent if the account exists.');
    } catch (err) {
      setError(err.message || 'Could not resend the code.');
    } finally {
      setIsResending(false);
    }
  }

  return (
    <div className="login-page">
      <div className="page">
        <img src="/assets/login-welcome/Images/nokia.svg" className="logo" alt="nokia" />
        <div className="login-card">
          <h2>Verify Your Email</h2>
          <p className="divider">
            We sent a 6-digit code to your email. Enter it below to finish creating your account.
          </p>

          <form onSubmit={handleSubmit}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              placeholder="6-digit code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              required
              autoFocus
            />

            <button type="submit" className="login-btn" disabled={isSubmitting}>
              {isSubmitting ? 'Verifying...' : 'Verify'}
            </button>

            {error && <p className="error-text" role="alert">{error}</p>}
            {info && <p className="divider" role="status">{info}</p>}
          </form>

          <p className="divider">
            Didn't get it?{' '}
            <button
              type="button"
              onClick={handleResend}
              disabled={isResending}
              style={{ background: 'none', border: 'none', color: '#8fb3ff', cursor: 'pointer', padding: 0 }}
            >
              {isResending ? 'Resending...' : 'Resend code'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

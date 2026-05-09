import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import '../styles/login.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, signup } = useAuth();
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    if (!email.trim() || password.trim().length < 6) {
      setError('Please enter a valid email and a password with at least 6 characters.');
      return;
    }
    if (mode === 'signup' && !name.trim()) {
      setError('Please enter your name.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'signup') {
        await signup({ name, email, password, rememberMe });
      } else {
        await login({ email, password, rememberMe });
      }
      const redirectTarget = location.state?.from?.pathname || '/welcome';
      navigate(redirectTarget, { replace: true });
    } catch (err) {
      setError(err.message || 'Sign in failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <div className="page">
        <img src="/assets/login-welcome/Images/nokia.svg" className="logo" alt="nokia" />
        <div className="login-card">
          <div className="tabs">
            <button className={`tab ${mode === 'login' ? 'active' : ''}`} type="button" onClick={() => setMode('login')}>Sign In</button>
            <button className={`tab ${mode === 'signup' ? 'active' : ''}`} type="button" onClick={() => setMode('signup')}>Sign Up</button>
          </div>

          <h2>{mode === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
          <form onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <input
                type="text"
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            )}
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />

            <div className="options">
              <label>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />{' '}
                Remember me
              </label>
              <a href="#">Forgot password?</a>
            </div>
            <button type="submit" className="login-btn" disabled={isSubmitting}>
              {isSubmitting ? (mode === 'login' ? 'Signing in...' : 'Creating account...') : (mode === 'login' ? 'Login' : 'Sign Up')}
            </button>
            {error && <p className="error-text" role="alert">{error}</p>}
          </form>
          <p className="divider">{mode === 'signup' ? 'New accounts are created as viewer by default.' : 'Use one of the seeded demo accounts or sign up.'}</p>
        </div>
      </div>
    </div>
  );
}

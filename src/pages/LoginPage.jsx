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

   async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!email.trim() || password.trim().length < 6) {
      setError('Please enter a valid email and password.');
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
      setError(err.message || 'Something went wrong.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <img
          src="/assets/login-welcome/Images/nokia.svg"
          className="logo"
          alt="nokia"
        />
       <div className="chart-bg">
  {Array.from({ length: 12 }).map((_, i) => (
    <span key={i}></span>
  ))}
</div>
      <div className="page">
        
        <div className="login-card">

          {/* Tabs */}
          <div className="tabs">
            <button
              className={`tab ${mode === 'login' ? 'active' : ''}`}
              onClick={() => setMode('login')}
              type="button"
            >
              Sign In
            </button>

            <button
              className={`tab ${mode === 'signup' ? 'active' : ''}`}
              onClick={() => setMode('signup')}
              type="button"
            >
              Sign Up
            </button>

            {/* Indicator */}
            <div
              className="indicator"
              style={{
                transform: mode === 'signup' ? 'translateX(100%)' : 'translateX(0)'
              }}
            />
          </div>

          {/* Title */}
          <h2>{mode === 'login' ? 'Welcome Back' : 'Create Account'}</h2>

          {/* Form */}
          <form onSubmit={handleSubmit}>

            {mode === 'signup' && (
              <input
                type="text"
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            )}

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {error && <p id="errorMsg">{error}</p>}

            <div className="options">
              <label>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                Remember me
              </label>

              <a href="#">Forgot password?</a>
            </div>

            <button className="login-btn" disabled={isSubmitting}>
              {isSubmitting
                ? (mode === 'login' ? 'Signing in...' : 'Creating...')
                : (mode === 'login' ? 'Login' : 'Sign Up')}
            </button>

          </form>

          <p className="divider">OR</p>

          <button className="social apple">
            <img src="/assets/login-welcome/Images/apple.svg" alt="apple" />
          </button>

          <button className="social google">
            <img src="/assets/login-welcome/Images/search.png" alt="google" />
          </button>

        </div>
      </div>
    </div>
  );
}
import { useState } from 'react';
import { signIn, signUp, signInWithGoogle } from '../lib/db.js';

const styles = {
  container: {
    minHeight: '100vh',
    background: '#08090d',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: '"Syne", sans-serif',
    padding: 24,
  },
  card: {
    background: 'rgba(20, 22, 28, 0.9)',
    borderRadius: 12,
    padding: 40,
    width: '100%',
    maxWidth: 400,
    border: '1px solid rgba(255, 107, 53, 0.2)',
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 700,
    marginBottom: 8,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    marginBottom: 32,
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    background: '#0d0e12',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    color: '#fff',
    fontSize: 16,
    marginBottom: 16,
    boxSizing: 'border-box',
    fontFamily: '"Syne", sans-serif',
  },
  inputFocus: {
    outline: 'none',
    borderColor: '#ff6b35',
  },
  button: {
    width: '100%',
    padding: 14,
    borderRadius: 8,
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
    fontFamily: '"Syne", sans-serif',
    transition: 'opacity 0.2s, transform 0.1s',
  },
  signInBtn: {
    background: '#ff6b35',
    color: '#fff',
    marginBottom: 12,
  },
  signUpBtn: {
    background: 'transparent',
    color: '#ff6b35',
    border: '2px solid #ff6b35',
    marginBottom: 20,
  },
  googleBtn: {
    background: '#fff',
    color: '#333',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  error: {
    color: '#ff6b6b',
    fontSize: 14,
    marginBottom: 16,
  },
};

const GoogleLogo = () => (
  <svg width="20" height="20" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error: err } = await signIn(email, password);
      if (err) setError(err.message || 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error: err } = await signUp(email, password);
      if (err) setError(err.message || 'Sign up failed');
      else setError('');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const { error: err } = await signInWithGoogle();
      if (err) setError(err.message || 'Google sign in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Welcome to Luminary</h1>
        <p style={styles.subtitle}>Sign in or create an account to continue</p>

        {error && <p style={styles.error}>{error}</p>}

        <form onSubmit={handleSignIn}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
            onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
            onBlur={(e) => (e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)')}
            required
            disabled={loading}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
            onBlur={(e) => (e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)')}
            required
            disabled={loading}
          />
          <button
            type="submit"
            style={{ ...styles.button, ...styles.signInBtn }}
            disabled={loading}
          >
            {loading ? 'Please wait...' : 'Sign In'}
          </button>
        </form>

        <button
          type="button"
          onClick={handleSignUp}
          style={{ ...styles.button, ...styles.signUpBtn }}
          disabled={loading}
        >
          Sign Up
        </button>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          style={{ ...styles.button, ...styles.googleBtn }}
          disabled={loading}
        >
          <GoogleLogo />
          Sign in with Google
        </button>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';

const Login: React.FC<{ onSwitchToSignup?: () => void; onLoginSuccess: () => void }> = ({ onSwitchToSignup, onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      console.log('Attempting to sign in with:', email);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('Sign in successful:', userCredential);
      
      const token = await userCredential.user.getIdToken();
      localStorage.setItem('token', token);
      
      onLoginSuccess();
    } catch (err: any) {
      console.error('Login error:', err);
      let message = err.message || 'An unexpected error occurred.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        message = 'Email or password is incorrect.';
      } else if (err.code === 'auth/invalid-email') {
        message = 'Invalid email address.';
      } else if (err.code === 'auth/too-many-requests') {
        message = 'Too many failed login attempts. Please try again later.';
      } else if (err.code === 'auth/network-request-failed') {
        message = 'Network error. Please check your internet connection.';
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setError('');
    setResetMessage('');
    if (!email) {
      setError('Please enter your email to reset password.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      setResetMessage('Password reset email sent! Check your inbox.');
    } catch (err: any) {
      let message = err.message || 'An unexpected error occurred.';
      if (err.code === 'auth/user-not-found') {
        message = 'No user found with this email.';
      } else if (err.code === 'auth/invalid-email') {
        message = 'Invalid email address.';
      }
      setError(message);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-4">
      <div className="bg-slate-800 rounded-2xl p-8 w-full max-w-md shadow-lg border border-slate-700/50">
        <h2 className="text-3xl font-bold text-center mb-6 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
          AgentX Login
        </h2>
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1" htmlFor="email">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              placeholder="your.email@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1" htmlFor="password">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              placeholder="••••••••"
              required
            />
            <button
              type="button"
              onClick={handleResetPassword}
              className="text-xs text-blue-400 hover:underline focus:outline-none mt-2"
            >
              Forget Password?
            </button>
          </div>
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          {resetMessage && <p className="text-green-400 text-sm text-center">{resetMessage}</p>}
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl py-3 font-semibold text-white transition-all duration-200 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
          <div className="flex justify-center my-2">
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="p-2 rounded-full bg-transparent hover:bg-slate-700 transition-colors duration-200 text-xl flex items-center justify-center border border-slate-600 shadow-md"
              disabled={loading}
              aria-label="Sign in with Google"
            >
              {loading ? (
                <span className="text-base">...</span>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 48 48">
                  <g>
                    <path fill="#4285F4" d="M24 9.5c3.54 0 6.04 1.53 7.43 2.81l5.5-5.5C33.64 3.99 29.36 2 24 2 14.82 2 6.98 7.98 3.69 15.44l6.91 5.37C12.18 15.09 17.62 9.5 24 9.5z"/>
                    <path fill="#34A853" d="M46.1 24.55c0-1.64-.15-3.21-.43-4.73H24v9.18h12.4c-.54 2.9-2.18 5.36-4.66 7.02l7.19 5.59C43.98 37.01 46.1 31.27 46.1 24.55z"/>
                    <path fill="#FBBC05" d="M10.6 28.09c-1.01-2.9-1.01-6.08 0-8.98l-6.91-5.37C1.64 17.36 0 20.53 0 24s1.64 6.64 3.69 9.26l6.91-5.17z"/>
                    <path fill="#EA4335" d="M24 44c5.36 0 9.86-1.77 13.19-4.82l-7.19-5.59c-2.01 1.36-4.59 2.18-7.19 2.18-6.38 0-11.82-5.59-13.4-12.91l-6.91 5.37C6.98 40.02 14.82 46 24 46z"/>
                    <path fill="none" d="M0 0h48v48H0z"/>
                  </g>
                </svg>
              )}
            </button>
          </div>
          <p className="text-center text-sm text-slate-400">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={onSwitchToSignup}
              className="text-blue-400 hover:underline focus:outline-none"
            >
              Sign Up
            </button>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login; 
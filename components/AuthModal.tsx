
import React, { useState } from 'react';
import { useAuth } from './AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, signup } = useAuth();
  const [isLoginView, setIsLoginView] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      let success = false;
      if (isLoginView) {
        success = await login(username, password);
      } else {
        success = await signup(username, email, password);
      }

      if (success) {
        onClose();
        // Reset form
        setUsername('');
        setEmail('');
        setPassword('');
      } else {
        setError(isLoginView ? 'Invalid credentials.' : 'Username or email already exists.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-primary p-6 text-white text-center relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
             <h2 className="text-2xl font-bold relative z-10">
                {isLoginView ? 'Welcome Back' : 'Join the Archives'}
             </h2>
             <p className="text-primary/20 text-sm font-medium mt-1 relative z-10 text-white/80">
                {isLoginView ? 'Sign in to access your collection' : 'Create an account to save your decks'}
             </p>
        </div>

        {/* Body */}
        <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100 flex items-center gap-2">
                        <i className="fa-solid fa-circle-exclamation"></i>
                        {error}
                    </div>
                )}

                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Username {isLoginView && 'or Email'}</label>
                    <input 
                        type="text" 
                        required 
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        placeholder={isLoginView ? "Enter username or email" : "Choose a username"}
                    />
                </div>

                {!isLoginView && (
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email Address</label>
                        <input 
                            type="email" 
                            required 
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="Enter your email"
                        />
                    </div>
                )}

                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Password</label>
                    <input 
                        type="password" 
                        required 
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••"
                    />
                </div>

                <button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full py-3 bg-primary text-white rounded-lg font-bold shadow-lg hover:bg-primary/90 transition-all active:scale-[0.98] flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
                >
                    {isLoading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : (isLoginView ? 'Sign In' : 'Create Account')}
                </button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-100 text-center">
                <p className="text-sm text-gray-600">
                    {isLoginView ? "Don't have an account?" : "Already have an account?"}
                    <button 
                        onClick={() => { setIsLoginView(!isLoginView); setError(''); }}
                        className="ml-2 text-primary font-bold hover:underline"
                    >
                        {isLoginView ? 'Sign Up' : 'Log In'}
                    </button>
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};

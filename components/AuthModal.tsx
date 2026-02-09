
import React, { useState } from 'react';
import { User } from '../types';
import { AuthService } from '../services/auth';
import { X, Mail, Lock, ArrowRight, Loader2, User as UserIcon, LogIn, UserPlus } from 'lucide-react';

interface AuthModalProps {
    onClose: () => void;
    onLogin: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose, onLogin }) => {
    const [mode, setMode] = useState<'login' | 'signup'>('signup');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if(!email || !password) {
            setError("Please fill in all fields");
            return;
        }
        if (mode === 'signup' && !name) {
            setError("Name is required");
            return;
        }

        setIsLoading(true);
        try {
            let user;
            if (mode === 'signup') {
                user = await AuthService.signup(email, password, name);
            } else {
                user = await AuthService.login(email, password);
            }
            onLogin(user);
            onClose();
        } catch (e: any) {
            setError(e.message || "Authentication failed");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl">
                <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white"><X size={20} /></button>
                
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-white mb-2">
                        {mode === 'signup' ? 'Create Account' : 'Welcome Back'}
                    </h2>
                    <p className="text-zinc-400 text-sm">
                        {mode === 'signup' ? 'Join the creator studio to save your work.' : 'Sign in to access your gallery.'}
                    </p>
                </div>

                <div className="flex bg-zinc-950 p-1 rounded-xl mb-6 border border-zinc-800">
                    <button 
                        onClick={() => setMode('signup')}
                        className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${mode === 'signup' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        Sign Up
                    </button>
                    <button 
                        onClick={() => setMode('login')}
                        className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${mode === 'login' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        Log In
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {mode === 'signup' && (
                        <div className="space-y-2 animate-in slide-in-from-top-2">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Full Name</label>
                            <div className="relative">
                                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                                <input 
                                    type="text" 
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                    placeholder="John Doe"
                                />
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                            <input 
                                type="email" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                placeholder="name@example.com"
                                autoFocus={mode === 'login'}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                            <input 
                                type="password" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="text-red-500 text-xs text-center font-bold bg-red-500/10 p-2 rounded-lg border border-red-500/20">
                            {error}
                        </div>
                    )}
                    
                    <button 
                        type="submit" 
                        disabled={isLoading}
                        className="w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 mt-4"
                    >
                        {isLoading ? <Loader2 size={18} className="animate-spin" /> : (
                            <>
                                {mode === 'signup' ? 'Create Account' : 'Sign In'} 
                                <ArrowRight size={18} />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-6 pt-6 border-t border-zinc-800 text-center">
                    <p className="text-xs text-zinc-600">
                        Securely stored in local browser database (Demo).
                    </p>
                </div>
            </div>
        </div>
    );
};

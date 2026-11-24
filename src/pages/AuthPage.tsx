import React, { useState } from 'react';
import { Eye, EyeOff, KeyRound, Mail, ShieldCheck, UserPlus } from 'lucide-react';
import { UserRole } from '../types';

interface AuthPageProps {
  storeName: string;
  workspaceSubtitle: string;
  onLogin: (email: string, password: string) => { ok: boolean; error?: string };
  onSignUp: (payload: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    department: string;
  }) => { ok: boolean; error?: string };
}

export const AuthPage: React.FC<AuthPageProps> = ({
  storeName,
  workspaceSubtitle,
  onLogin,
  onSignUp,
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [department, setDepartment] = useState('Operations');
  const [role, setRole] = useState<UserRole>('Staff');
  const [agreedTerms, setAgreedTerms] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const switchMode = (nextMode: 'login' | 'signup') => {
    setMode(nextMode);
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'login') {
      const res = onLogin(email.trim(), password);
      if (!res.ok) {
        setError(res.error ?? 'Incorrect email address or password.');
      }
      return;
    }

    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (!agreedTerms) {
      setError('Please confirm workspace access guidelines to continue.');
      return;
    }

    const res = onSignUp({
      name: name.trim(),
      email: email.trim(),
      password,
      role,
      department: department.trim() || 'Operations',
    });
    if (!res.ok) {
      setError(res.error ?? 'Could not create account.');
    }
  };

  const fillAdminDemo = () => {
    setMode('login');
    setEmail('arb32433@imcc.edu.ph');
    setPassword('admin123');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#1F221B] text-[#F5F2EB] flex flex-col justify-between selection:bg-[#B89260]/30 selection:text-[#F5F2EB]">
      {/* Top Minimal Header */}
      <header className="flex items-center justify-between px-6 py-5 sm:px-10 sm:py-6">
        <div className="flex items-center gap-2.5 text-[#A5A89C]">
          <div className="flex h-7 w-7 items-center justify-center border border-[#3B4034] bg-[#262A21] text-[#B89260]">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path d="M3 10.5L12 3l9 7.5" />
              <path d="M5.5 9.5V20h13V9.5" />
              <path d="M10 20v-5.5h4V20" />
            </svg>
          </div>
          <span className="font-serif text-[16px] font-medium tracking-tight text-[#D7D4CA]">
            {storeName}
          </span>
        </div>

        <button
          type="button"
          onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
          className="rounded-full border border-[#B89260]/60 px-4 py-1.5 text-[10.5px] font-medium tracking-[0.16em] uppercase text-[#E6E2D8] hover:border-[#B89260] hover:bg-[#B89260]/15 transition-colors"
        >
          {mode === 'login' ? 'Sign Up' : 'Log In'}
        </button>
      </header>

      {/* Centered Two-Column Split Modal Panel */}
      <main className="flex flex-1 items-center justify-center px-4 py-6 sm:px-8">
        <div className="w-full max-w-[880px] border border-[#2D3227] bg-[#161813] px-7 py-10 sm:px-14 sm:py-14 shadow-[0_28px_72px_rgba(0,0,0,0.45)]">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-2 md:gap-14 items-start md:items-center">
            {/* Left Column — Editorial Brand & Mode Anchor */}
            <div className="flex flex-col justify-between">
              <div>
                <div className="text-[10.5px] font-medium tracking-[0.2em] uppercase text-[#7E8276]">
                  {workspaceSubtitle}
                </div>
                <h1 className="mt-3 font-serif text-[30px] sm:text-[34px] font-semibold tracking-tight text-[#F5F2EB] leading-[1.12]">
                  {storeName}
                </h1>
                <p className="mt-4 max-w-[320px] text-[13px] leading-[1.65] text-[#9A9E92]">
                  Access your financial ledger, live inventory tables, performance reports, and
                  team administration from a single unified workspace.
                </p>
              </div>

              {/* Dual Square Icon Controls matching reference layout */}
              <div className="mt-8 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  title="Switch to Log In"
                  aria-label="Log In mode"
                  className={`flex h-10 w-10 items-center justify-center border transition-colors ${
                    mode === 'login'
                      ? 'border-[#B89260] bg-[#B89260]/15 text-[#F5F2EB]'
                      : 'border-[#32372C] bg-[#1D2019] text-[#8E9285] hover:border-[#525949] hover:text-[#D7D4CA]'
                  }`}
                >
                  <ShieldCheck className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  title="Switch to Sign Up"
                  aria-label="Sign Up mode"
                  className={`flex h-10 w-10 items-center justify-center border transition-colors ${
                    mode === 'signup'
                      ? 'border-[#B89260] bg-[#B89260]/15 text-[#F5F2EB]'
                      : 'border-[#32372C] bg-[#1D2019] text-[#8E9285] hover:border-[#525949] hover:text-[#D7D4CA]'
                  }`}
                >
                  <UserPlus className="h-4 w-4" />
                </button>

                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={fillAdminDemo}
                    className="ml-1 inline-flex items-center gap-1.5 text-[11px] font-medium tracking-[0.06em] text-[#8E9285] hover:text-[#B89260] transition-colors"
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                    <span>Fill Admin Demo</span>
                  </button>
                )}
              </div>
            </div>

            {/* Right Column — Minimalist Underline Form */}
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10.5px] font-medium tracking-[0.18em] uppercase text-[#7E8276]">
                  {mode === 'login'
                    ? `Log in to ${storeName}`
                    : `Sign me up for ${storeName}`}
                </span>
              </div>

              {error && (
                <div
                  role="alert"
                  className="mt-4 border border-[#7A3832] bg-[#2D1A18] px-3 py-2 text-[12px] text-[#F1B8B3]"
                >
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                {mode === 'signup' && (
                  <div>
                    <label htmlFor="auth-name" className="sr-only">
                      Full Name
                    </label>
                    <input
                      id="auth-name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Full Name"
                      className="w-full border-0 border-b border-[#34392E] bg-transparent pb-2.5 pt-1 text-[13.5px] text-[#F5F2EB] placeholder-[#6B7064] focus:border-[#B89260] focus:outline-none transition-colors"
                    />
                  </div>
                )}

                <div className="relative">
                  <label htmlFor="auth-email" className="sr-only">
                    Email Address
                  </label>
                  <input
                    id="auth-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email Address"
                    className="w-full border-0 border-b border-[#34392E] bg-transparent pb-2.5 pt-1 pr-7 text-[13.5px] text-[#F5F2EB] placeholder-[#6B7064] focus:border-[#B89260] focus:outline-none transition-colors"
                  />
                  <Mail
                    className="pointer-events-none absolute right-0.5 top-2 h-3.5 w-3.5 text-[#6B7064]"
                    aria-hidden="true"
                  />
                </div>

                <div className="relative">
                  <label htmlFor="auth-password" className="sr-only">
                    Password
                  </label>
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={mode === 'signup' ? 6 : undefined}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === 'signup' ? 'Password (min 6 chars)' : 'Password'}
                    className="w-full border-0 border-b border-[#34392E] bg-transparent pb-2.5 pt-1 pr-7 text-[13.5px] text-[#F5F2EB] placeholder-[#6B7064] focus:border-[#B89260] focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-0 top-1.5 p-0.5 text-[#6B7064] hover:text-[#D7D4CA] transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>

                {mode === 'signup' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="auth-role" className="sr-only">
                        Role
                      </label>
                      <select
                        id="auth-role"
                        value={role}
                        onChange={(e) => setRole(e.target.value as UserRole)}
                        className="w-full border-0 border-b border-[#34392E] bg-[#161813] pb-2.5 pt-1 text-[13.5px] text-[#F5F2EB] focus:border-[#B89260] focus:outline-none transition-colors"
                      >
                        <option value="Staff">Staff</option>
                        <option value="Manager">Manager</option>
                        <option value="Admin">Admin</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="auth-dept" className="sr-only">
                        Department
                      </label>
                      <input
                        id="auth-dept"
                        type="text"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        placeholder="Department"
                        className="w-full border-0 border-b border-[#34392E] bg-transparent pb-2.5 pt-1 text-[13.5px] text-[#F5F2EB] placeholder-[#6B7064] focus:border-[#B89260] focus:outline-none transition-colors"
                      />
                    </div>
                  </div>
                )}

                {mode === 'signup' && (
                  <label className="flex items-center gap-2.5 pt-1 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={agreedTerms}
                      onChange={(e) => setAgreedTerms(e.target.checked)}
                      className="h-3.5 w-3.5 accent-[#B89260] cursor-pointer"
                    />
                    <span className="text-[11.5px] text-[#8E9285]">
                      I agree to the{' '}
                      <span className="text-[#D7D4CA]">Workspace Terms & Access Policy</span>
                    </span>
                  </label>
                )}

                <div className="pt-2 flex flex-wrap items-center justify-between gap-4">
                  <button
                    type="submit"
                    className="rounded-full border border-[#B89260] px-7 py-2.5 text-[10.5px] font-semibold tracking-[0.16em] uppercase text-[#F5F2EB] hover:bg-[#B89260] hover:text-[#161813] transition-colors"
                  >
                    {mode === 'login' ? 'Log In' : 'Create Account'}
                  </button>

                  <button
                    type="button"
                    onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
                    className="text-[11.5px] text-[#8E9285] hover:text-[#E6E2D8] transition-colors"
                  >
                    {mode === 'login' ? 'Create an account →' : 'Already registered? Log in →'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Minimal Footer */}
      <footer className="flex flex-wrap items-center justify-between gap-3 px-6 py-5 sm:px-10 sm:py-6 text-[10px] tracking-[0.16em] uppercase text-[#6D7265]">
        <div className="flex flex-wrap items-center gap-5">
          <span>{storeName}</span>
          <span>Account Access</span>
          <span>Local Workspace</span>
        </div>
        <span className="font-serif text-[13px] tracking-normal normal-case text-[#7E8276]">
          {storeName}.
        </span>
      </footer>
    </div>
  );
};

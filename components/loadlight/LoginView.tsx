'use client';

import { FormEvent, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lumi } from '@/components/loadlight/Lumi';
import { profile } from '@/lib/loadlight/demo-data';

type LoginViewProps = {
  onLogin: (email: string) => void;
};

type AuthAccount = {
  name: string;
  email: string;
  password: string;
};

const authStorageKey = 'loadlight-auth-accounts';
const demoAccount: AuthAccount = { name: profile.name, email: profile.email, password: 'demo123' };

function loadAuthAccounts() {
  if (typeof window === 'undefined') return [demoAccount];
  try {
    const raw = window.localStorage.getItem(authStorageKey);
    const accounts = raw ? (JSON.parse(raw) as AuthAccount[]) : [];
    const validAccounts = Array.isArray(accounts) ? accounts.filter((account) => account.email && account.password) : [];
    return validAccounts.some((account) => account.email.toLowerCase() === demoAccount.email.toLowerCase()) ? validAccounts : [demoAccount, ...validAccounts];
  } catch {
    return [demoAccount];
  }
}

function saveAuthAccounts(accounts: AuthAccount[]) {
  window.localStorage.setItem(authStorageKey, JSON.stringify(accounts));
}

export function LoginView({ onLogin }: LoginViewProps) {
  const [authMode, setAuthMode] = useState<'login' | 'signup' | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState(profile.email);
  const [password, setPassword] = useState('demo123');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  function chooseMode(mode: 'login' | 'signup') {
    setError('');
    setAuthMode((current) => current === mode ? null : mode);
    if (mode === 'login') {
      setEmail(profile.email);
      setPassword('demo123');
      setConfirmPassword('');
    } else {
      setPassword('');
      setConfirmPassword('');
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    if (!authMode) return;
    if (!cleanEmail || !password.trim()) { setError('Add your email and password to continue.'); return; }
    const accounts = loadAuthAccounts();

    if (authMode === 'signup') {
      if (!cleanName) { setError('Add your name to create an account.'); return; }
      if (password.length < 6) { setError('Use at least 6 characters for your password.'); return; }
      if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
      if (accounts.some((account) => account.email.toLowerCase() === cleanEmail)) { setError('This email already has an account. Try logging in.'); return; }
      saveAuthAccounts([{ name: cleanName, email: cleanEmail, password }, ...accounts]);
      onLogin(cleanEmail);
      return;
    }

    const account = accounts.find((item) => item.email.toLowerCase() === cleanEmail);
    if (!account || account.password !== password) { setError('Email or password is not correct.'); return; }
    onLogin(cleanEmail);
  }

  if (authMode) return <main className="login-page"><section className="login-panel auth-panel" aria-labelledby="auth-title">
    <div className="login-status"><div className="brand-lockup"><span className="brand-mark">✦</span><strong>LoadLight</strong></div><button type="button" className="auth-back" onClick={() => setAuthMode(null)}>Back</button></div>
    <div className="auth-intro">
      <Lumi state={authMode === 'signup' ? 'hello' : 'focused'} size="small" />
      <p className="micro-label">{authMode === 'signup' ? 'START LIGHT' : 'WELCOME BACK'}</p>
      <h1 id="auth-title">{authMode === 'signup' ? 'Make room for your day.' : 'Step back into your space.'}</h1>
      <p>{authMode === 'signup' ? 'Create your LoadLight space, then Lumi will keep your entries on this device.' : 'Use your saved account, or try the demo account below.'}</p>
    </div>
    <form onSubmit={submit} className="login-form auth-page-form" aria-label={authMode === 'signup' ? 'Sign up form' : 'Log in form'}>
      <div className="auth-form-title"><strong>{authMode === 'signup' ? 'Sign up' : 'Log in'}</strong><span>{authMode === 'signup' ? 'New account' : 'Demo password: demo123'}</span></div>
      {authMode === 'signup' && <label>Name<Input type="text" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" placeholder="Your name" /></label>}
      <label>Email<Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="you@student.edu" /></label>
      <label>Password<Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'} placeholder={authMode === 'signup' ? 'At least 6 characters' : 'Password'} /></label>
      {authMode === 'signup' && <label>Confirm password<Input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" placeholder="Repeat password" /></label>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <Button type="submit" size="lg" className="primary-action auth-submit">{authMode === 'signup' ? 'Create account' : 'Enter dashboard'} <ArrowRight /></Button>
    </form>
    <p className="prototype-note">Prototype access · your entries stay on this device.</p>
  </section></main>;

  return <main className="login-page"><section className="login-panel" aria-labelledby="login-title">
    <div className="login-status"><div className="brand-lockup"><span className="brand-mark">✦</span><strong>LoadLight</strong></div><span>Gentle load care</span></div>
    <div className="login-companion login-hello"><Lumi state="hello" size="large" /></div>
    <div className="login-copy">
      <p className="micro-label">MEET LUMI</p>
      <h1 id="login-title">Lighten your load.</h1>
      <p>Pause, see what today is carrying, and choose one calmer next step.</p>
    </div>
    <div className="login-actions">
      <Button type="button" size="lg" className="primary-action" onClick={() => chooseMode('login')}>Log in <ArrowRight /></Button>
      <Button type="button" size="lg" variant="outline" className="secondary-action" onClick={() => chooseMode('signup')}>Sign up</Button>
    </div>
    <p className="prototype-note">Prototype access · your entries stay on this device.</p>
  </section></main>;
}

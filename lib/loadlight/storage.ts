import type { StoredLoadLightState } from './types';

export const STORAGE_KEY = 'loadlight.prototype.v1';

export const defaultStoredState: StoredLoadLightState = {
  isLoggedIn: false,
  email: 'mia@student.edu',
  journalEntries: [],
};

export function loadStoredState(): StoredLoadLightState {
  if (typeof window === 'undefined') return defaultStoredState;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? { ...defaultStoredState, ...JSON.parse(raw) } : defaultStoredState;
  } catch {
    return defaultStoredState;
  }
}

export function saveStoredState(state: StoredLoadLightState): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

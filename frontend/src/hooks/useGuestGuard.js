/**
 * useGuestGuard.js
 *
 * A lightweight hook that:
 * - Detects if the user is a guest (not logged in)
 * - Shows a professional animated toast notification
 * - Redirects to /login with the current path saved as `?redirect=`
 *
 * Usage:
 *   const { requireAuth } = useGuestGuard();
 *   requireAuth(); // call on button click
 */

import { useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';

// ─── Global toast dispatcher (no external library needed) ────────────────────
let _dispatchToast = null;

export function registerToastDispatcher(fn) {
  _dispatchToast = fn;
}

export function showGuestToast(message, type = 'warning') {
  if (_dispatchToast) {
    _dispatchToast({ message, type });
  }
}

// ─── Hook ────────────────────────────────────────────────────────────────────
export default function useGuestGuard() {
  const { userInfo } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  /**
   * Call this before any action that requires authentication.
   * @param {string} message - Custom toast message (optional)
   * @returns {boolean} true if user is authenticated, false if guest (redirected)
   */
  const requireAuth = (message = 'Please log in to add products to your cart.') => {
    if (userInfo) return true; // logged in — allow

    // Show toast
    showGuestToast(message, 'warning');

    // Redirect to login, saving the current page as ?redirect=
    const redirectTo = encodeURIComponent(location.pathname + location.search);
    navigate(`/login?redirect=${redirectTo}`);

    return false; // guest — blocked
  };

  const isGuest = !userInfo;

  return { requireAuth, isGuest, userInfo };
}

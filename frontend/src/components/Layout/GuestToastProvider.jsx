/**
 * GuestToast.jsx
 *
 * A self-contained, professional toast notification system
 * for guest-user redirect messages. No external library required.
 *
 * Mount once in App.jsx:  <GuestToastProvider />
 */

import React, { useState, useEffect, useCallback } from 'react';
import { LogIn, X, ShoppingCart } from 'lucide-react';
import { registerToastDispatcher } from '../../hooks/useGuestGuard';

let toastId = 0;

const GuestToastProvider = () => {
  const [toasts, setToasts] = useState([]);

  // Register the dispatcher so useGuestGuard can fire toasts
  const dispatch = useCallback(({ message, type }) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type, visible: true }]);

    // Auto-dismiss after 3.5 s
    setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, visible: false } : t))
      );
      // Remove from DOM after fade-out
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 400);
    }, 3500);
  }, []);

  useEffect(() => {
    registerToastDispatcher(dispatch);
  }, [dispatch]);

  const dismiss = (id) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, visible: false } : t))
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 400);
  };

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 80,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
        pointerEvents: 'none',
        width: 'max-content',
        maxWidth: '92vw',
      }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          style={{
            pointerEvents: 'all',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '13px 18px',
            borderRadius: 16,
            background: 'linear-gradient(135deg, #1d4ed8, #1e40af)',
            color: '#fff',
            fontFamily: 'inherit',
            fontSize: 14,
            fontWeight: 600,
            boxShadow:
              '0 8px 32px rgba(30,64,175,0.35), 0 2px 8px rgba(0,0,0,0.15)',
            border: '1px solid rgba(255,255,255,0.15)',
            opacity: toast.visible ? 1 : 0,
            transform: toast.visible ? 'translateY(0) scale(1)' : 'translateY(-12px) scale(0.96)',
            transition: 'opacity 0.35s ease, transform 0.35s ease',
            minWidth: 280,
            maxWidth: '88vw',
          }}
        >
          {/* Icon */}
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <LogIn size={18} />
          </div>

          {/* Message */}
          <span style={{ flex: 1, lineHeight: 1.4 }}>{toast.message}</span>

          {/* Dismiss */}
          <button
            onClick={() => dismiss(toast.id)}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              borderRadius: '50%',
              width: 26,
              height: 26,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#fff',
              flexShrink: 0,
              padding: 0,
            }}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};

export default GuestToastProvider;

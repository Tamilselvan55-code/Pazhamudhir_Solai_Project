import React, { useEffect, useRef, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import useLocationStore from '../../store/useLocationStore';

const LiveLocationPanel = () => {
  const {
    userLocation, fullAddress, distanceKm, isEligible, loading, error, permissionDenied,
    requestLiveGPS, resetLiveCheck,
  } = useLocationStore();

  const [rechecking, setRechecking] = useState(false);
  const hasFiredRef = useRef(false);

  /* ── Auto-request GPS on mount (only once per checkout visit) ─────────── */
  useEffect(() => {
    if (hasFiredRef.current) return;
    hasFiredRef.current = true;

    resetLiveCheck();
    requestLiveGPS({ silent: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Manual recheck ────────────────────────────────────────────────────── */
  const handleRecheck = async () => {
    setRechecking(true);
    await requestLiveGPS({ silent: false });
    setRechecking(false);
  };

  const hasLocation = !!userLocation;
  const isLoading   = loading || rechecking;

  const displayAddress =
    isLoading && !userLocation
      ? 'Detecting your location...'
      : permissionDenied
      ? 'Location Access Denied. Please enable GPS location permission to proceed.'
      : fullAddress
      ? ( /^-?\d+\.\d+,\s*-?\d+\.\d+$/.test(fullAddress.trim()) ? 'Pinned Location' : fullAddress )
      : 'No location detected';

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
      {/* 📍 Current Delivery Location */}
      <div className="space-y-1">
        <p className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
          📍 Current Delivery Location
        </p>
        <p className="text-sm text-gray-600 leading-snug">
          {displayAddress}
        </p>
      </div>

      <div className="space-y-1.5 border-t border-gray-50 pt-3 text-sm">
        <p className="text-gray-700">
          <span className="font-semibold text-gray-500">Distance from Store:</span>{' '}
          <span className="font-bold text-gray-900">
            {hasLocation && !isLoading ? `${distanceKm} km` : '--'}
          </span>
        </p>

        <p className="text-gray-700">
          <span className="font-semibold text-gray-500">Status:</span>{' '}
          <span className="font-bold">
            {isLoading ? (
              <span className="text-gray-400 inline-flex items-center gap-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking...
              </span>
            ) : !hasLocation ? (
              <span className="text-red-600">❌ Out of Delivery Zone</span>
            ) : isEligible ? (
              <span className="text-green-600">✅ Delivery Available</span>
            ) : (
              <span className="text-red-600">❌ Out of Delivery Zone</span>
            )}
          </span>
        </p>
      </div>

      {/* Buttons */}
      <div className="mt-4 pt-3 border-t border-gray-100">
        <button
          onClick={handleRecheck}
          disabled={isLoading}
          className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Rechecking Location...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Recheck Location
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default LiveLocationPanel;

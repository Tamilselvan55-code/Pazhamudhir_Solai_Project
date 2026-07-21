import React, { useEffect, useRef, useState } from 'react';
import { Loader2, RefreshCw, Map } from 'lucide-react';
import useLocationStore, { getDeliveryRadius } from '../../store/useLocationStore';
import MapLocationPicker from './MapLocationPicker';

const LiveLocationPanel = () => {
  const {
    userLocation, fullAddress, distanceKm, isEligible, loading, error, permissionDenied,
    requestLiveGPS, resetLiveCheck, setManualLocation, saveAddressToBackend,
  } = useLocationStore();

  const [rechecking, setRechecking] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
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
  const radius      = getDeliveryRadius();
  const distNumber  = typeof distanceKm === 'number' && !isNaN(distanceKm) ? distanceKm : parseFloat(distanceKm || 0);
  // Use isEligible from store — single source of truth. Do NOT re-calculate here.
  const deliveryAvailable = hasLocation && isEligible;

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
            {hasLocation && !isLoading ? `${distNumber.toFixed(2)} km` : '--'}
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
              <span className="text-red-600">❌ Out of delivery zone</span>
            ) : deliveryAvailable ? (
              <span className="text-green-600">✅ Delivery Available • {distNumber.toFixed(2)} km away</span>
            ) : (
              <span className="text-red-600">❌ Out of delivery zone • {distNumber.toFixed(2)} km away (Max {radius} km)</span>
            )}
          </span>
        </p>
      </div>

      {/* Buttons */}
      <div className="mt-4 pt-3 border-t border-gray-100 flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleRecheck}
          disabled={isLoading}
          className="flex-1 py-3 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm font-bold border border-gray-200 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
              Checking...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 text-gray-500" />
              Recheck GPS
            </>
          )}
        </button>

        <button
          onClick={() => setIsMapOpen(true)}
          disabled={isLoading}
          className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-bold transition-all flex items-center justify-center gap-1.5"
        >
          <Map className="w-4 h-4" />
          Choose on Map
        </button>
      </div>

      {isMapOpen && (
        <MapLocationPicker
          isOpen={isMapOpen}
          onClose={() => setIsMapOpen(false)}
          onLocationSelect={async (loc) => {
            await setManualLocation(loc);
            const rawAuth = localStorage.getItem('auth-storage');
            const token = rawAuth ? JSON.parse(rawAuth)?.state?.userInfo?.token : null;
            if (token) {
              saveAddressToBackend(token);
            }
          }}
          initialLocation={userLocation}
        />
      )}
    </div>
  );
};

export default LiveLocationPanel;

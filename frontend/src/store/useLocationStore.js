import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';
import { API_BASE } from '../config/api';

// ── Store coordinates (Tiruchendur Murugan Pazhamudhir Solai) ────────────────────
export const STORE_LOCATION = { lat: 13.005865, lon: 79.995026 };
// Temporary testing value. Change back to 5 KM before production.
const MAX_RADIUS_KM = Number(import.meta.env.VITE_DELIVERY_RADIUS_KM) || 30;
const API_AUTH_BASE = `${API_BASE}/auth`;

// ── Haversine formula ─────────────────────────────────────────────────────────
export const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const BACKEND_URL = API_BASE;

// ── Server-side coordinate verification ───────────────────────────────────────
const verifyWithServer = async (lat, lon) => {
  try {
    const res = await fetch(`${BACKEND_URL}/location/verify`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ lat, lon }),
    });
    if (!res.ok) return null;
    return await res.json(); // { distanceKm, deliveryAvailable, message }
  } catch {
    return null; // Server unavailable — fall back to client calculation
  }
};

// ── Reverse geocode via OpenStreetMap Nominatim (no API key needed) ───────────
const reverseGeocodeNominatim = async (lat, lon) => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
      { headers: { 'Accept-Language': 'en', 'User-Agent': 'GroceryApp/1.0' } }
    );
    if (!res.ok) throw new Error('Nominatim failed');
    const data = await res.json();
    const addr = data.address || {};
    const city    = addr.city || addr.town || addr.village || addr.county || '';
    const state   = addr.state || '';
    const pincode = addr.postcode || '';
    const fullAddress = data.display_name || `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
    return { fullAddress, city, state, pincode };
  } catch {
    return {
      fullAddress: `${lat.toFixed(5)}, ${lon.toFixed(5)}`,
      city: '', state: '', pincode: '',
    };
  }
};

// ── Store ─────────────────────────────────────────────────────────────────────
const useLocationStore = create(
  persist(
    (set, get) => ({
      // Location data
      userLocation:  null,  // { lat, lon }
      fullAddress:   '',
      city:          '',
      state:         '',
      pincode:       '',

      // Computed
      distanceKm:  0,
      isEligible:  false,

      // Source: 'gps' | 'map' | null
      locationSource: null,

      // UI state (NOT persisted)
      loading:         false,
      error:           null,
      permissionDenied: false,  // true if user explicitly denied GPS
      liveChecked:     false,   // true once auto-check completed on this session

      // ── Set location from map picker (manual / GPS / pin) ───────────────────
      setManualLocation: ({ lat, lon, fullAddress = '', city = '', state = '', pincode = '' }) => {
        const distance  = haversineDistance(lat, lon, STORE_LOCATION.lat, STORE_LOCATION.lon);
        const distanceKm = parseFloat(distance.toFixed(2));
        set({
          userLocation: { lat, lon },
          fullAddress,
          city,
          state,
          pincode,
          distanceKm,
          isEligible:     distance <= MAX_RADIUS_KM,
          locationSource: 'map',
          error:          null,
          loading:        false,
          permissionDenied: false,
        });
      },

      // ── Live GPS with Nominatim reverse geocoding ─────────────────────────
      requestLiveGPS: (opts = {}) => {
        const { silent = false } = opts;
        if (!silent) set({ loading: true, error: null, permissionDenied: false });

        return new Promise((resolve) => {
          if (!navigator.geolocation) {
            set({
              error:   'Geolocation is not supported by your browser.',
              loading: false,
              liveChecked: true,
            });
            resolve({ success: false, reason: 'unsupported' });
            return;
          }

          navigator.geolocation.getCurrentPosition(
            async ({ coords: { latitude, longitude, accuracy } }) => {
              set({ loading: true, error: null });

              // Run reverse geocode + server verification in parallel
              const [addrInfo, serverResult] = await Promise.all([
                reverseGeocodeNominatim(latitude, longitude),
                verifyWithServer(latitude, longitude),
              ]);

              // Use server-trusted distance if available, else fallback to Haversine
              const clientDistance = haversineDistance(latitude, longitude, STORE_LOCATION.lat, STORE_LOCATION.lon);
              const distanceKm     = serverResult
                ? serverResult.distanceKm
                : parseFloat(clientDistance.toFixed(2));
              const isEligible     = serverResult
                ? serverResult.deliveryAvailable
                : clientDistance <= MAX_RADIUS_KM;

              set({
                userLocation:    { lat: latitude, lon: longitude },
                fullAddress:     addrInfo.fullAddress,
                city:            addrInfo.city,
                state:           addrInfo.state,
                pincode:         addrInfo.pincode,
                distanceKm,
                isEligible,
                locationSource:  'gps',
                loading:         false,
                error:           null,
                permissionDenied: false,
                liveChecked:     true,
                _gpsAccuracy:    accuracy,
              });

              resolve({ success: true, distanceKm, isEligible });
            },
            (err) => {
              const isDenied = err.code === err.PERMISSION_DENIED;
              set({
                error:           isDenied
                  ? 'Please enable location access to place an order.'
                  : 'Unable to detect your location. Please select manually on the map.',
                loading:         false,
                permissionDenied: isDenied,
                liveChecked:     true,
              });
              resolve({ success: false, reason: isDenied ? 'denied' : 'unavailable' });
            },
            { timeout: 12000, maximumAge: 30000, enableHighAccuracy: true }
          );
        });
      },

      // ── GPS quick-access (legacy — no reverse geocode) ────────────────────
      requestLocation: () => {
        set({ loading: true, error: null });
        if (!navigator.geolocation) {
          set({ error: 'Geolocation not supported by your browser.', loading: false });
          return;
        }
        navigator.geolocation.getCurrentPosition(
          ({ coords: { latitude, longitude } }) => {
            const distance = haversineDistance(latitude, longitude, STORE_LOCATION.lat, STORE_LOCATION.lon);
            set({
              userLocation:  { lat: latitude, lon: longitude },
              distanceKm:    parseFloat(distance.toFixed(2)),
              isEligible:    distance <= MAX_RADIUS_KM,
              locationSource: 'gps',
              loading:       false,
              error:         null,
              permissionDenied: false,
            });
          },
          (err) => {
            set({
              error:   err.code === err.PERMISSION_DENIED
                ? 'Please enable location access to place an order.'
                : 'Please select your delivery location manually on the map.',
              loading: false,
              permissionDenied: err.code === err.PERMISSION_DENIED,
            });
          },
          { timeout: 10000 }
        );
      },

      // ── Save to MongoDB (called after user confirms location, if logged in) ──
      saveAddressToBackend: async (token) => {
        const { userLocation, fullAddress, city, state, pincode, distanceKm, isEligible } = get();
        if (!userLocation || !token) return;
        try {
          await axios.put(
            `${API_AUTH_BASE}/delivery-address`,
            {
              lat:               userLocation.lat,
              lon:               userLocation.lon,
              fullAddress,
              city,
              state,
              pincode,
              distanceFromStore: distanceKm,
              deliveryAvailable: isEligible,
            },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        } catch {
          // Silent fail — location is still saved locally in Zustand persist
        }
      },

      clearError: () => set({ error: null }),

      // ── Reset live check flag (call on checkout mount) ────────────────────
      resetLiveCheck: () => set({ liveChecked: false }),
    }),

    {
      name: 'delivery-location-v2',
      partialize: (s) => ({
        userLocation:   s.userLocation,
        fullAddress:    s.fullAddress,
        city:           s.city,
        state:          s.state,
        pincode:        s.pincode,
        distanceKm:     s.distanceKm,
        isEligible:     s.isEligible,
        locationSource: s.locationSource,
      }),
    }
  )
);

export default useLocationStore;

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';
import { API_BASE } from '../config/api';
import { calculateDistance, isWithinDeliveryRadius, logDeliveryDecision } from '../utils/distance';
import useSettingsStore from './useSettingsStore';

// ── Fallback store coordinates (used ONLY if settings API has not loaded yet) ──
const FALLBACK_STORE_COORDS = { lat: 13.0606941, lon: 80.2270751 };

/**
 * Get the current store location from settings (single source of truth).
 * Falls back to hardcoded defaults only if settings haven't loaded yet.
 */
export const getStoreLocation = () => {
  const settings = useSettingsStore.getState()?.settings;
  if (settings?.location?.lat != null && settings?.location?.lon != null) {
    return {
      lat: Number(settings.location.lat),
      lon: Number(settings.location.lon),
    };
  }
  // Fallback: flat lat/lon on settings object (legacy format)
  if (settings?.lat != null && settings?.lon != null) {
    return {
      lat: Number(settings.lat),
      lon: Number(settings.lon),
    };
  }
  return FALLBACK_STORE_COORDS;
};

export const getDeliveryRadius = () => {
  const storeSettings = useSettingsStore.getState()?.settings || {};
  return Number(storeSettings.deliveryRadiusKm || import.meta.env.VITE_DELIVERY_RADIUS_KM || 30);
};

const API_AUTH_BASE = `${API_BASE}/auth`;

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

// ── Reverse geocode via Google Maps Geocoding API ─────────────────────────────
const reverseGeocodeGoogle = async (lat, lon) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${apiKey}`
    );
    if (!res.ok) throw new Error('Google geocoding failed');
    const data = await res.json();
    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      throw new Error(data.error_message || 'No results from Google Geocoding');
    }
    const result = data.results[0];
    const components = result.address_components || [];
    
    let city = '';
    let state = '';
    let pincode = '';
    
    for (const comp of components) {
      const types = comp.types || [];
      if (types.includes('postal_code')) {
        pincode = comp.long_name;
      } else if (types.includes('locality')) {
        city = comp.long_name;
      } else if (!city && types.includes('administrative_area_level_3')) {
        city = comp.long_name;
      } else if (!city && types.includes('sublocality_level_1')) {
        city = comp.long_name;
      } else if (types.includes('administrative_area_level_1')) {
        state = comp.long_name;
      }
    }
    
    return {
      fullAddress: result.formatted_address || `${lat.toFixed(5)}, ${lon.toFixed(5)}`,
      city,
      state,
      pincode
    };
  } catch (err) {
    console.error('Google reverse geocoding error:', err);
    return {
      fullAddress: `${lat.toFixed(5)}, ${lon.toFixed(5)}`,
      city: '',
      state: '',
      pincode: ''
    };
  }
};

/**
 * Internal helper: calculate distance + eligibility using current settings.
 * Full precision comparison — rounds only for the stored distanceKm display value.
 */
const computeDelivery = (userLat, userLon) => {
  const store = getStoreLocation();
  const radius = getDeliveryRadius();
  const result = isWithinDeliveryRadius(userLat, userLon, store.lat, store.lon, radius);
  logDeliveryDecision(store.lat, store.lon, userLat, userLon, result.rawDistance, radius, result.isEligible);
  return {
    distanceKm: result.distance,
    isEligible: result.isEligible,
  };
};

const fetchDeliveryData = async (lat, lon) => {
  const serverResult = await verifyWithServer(lat, lon);
  if (serverResult) {
    return {
      distanceKm: serverResult.distanceKm,
      isEligible: serverResult.deliveryAvailable,
    };
  }
  // Offline fallback
  const result = computeDelivery(lat, lon);
  return {
    distanceKm: result.distanceKm,
    isEligible: result.isEligible,
  };
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

      // Source: 'gps' | 'map' | 'address' | null
      locationSource: null,
      locationTimestamp: null,

      // UI state (NOT persisted)
      loading:         false,
      error:           null,
      permissionDenied: false,  // true if user explicitly denied GPS
      liveChecked:     false,   // true once auto-check completed on this session

      // ── Set location from map picker (manual / GPS / pin) ───────────────────
      setManualLocation: async ({ lat, lon, fullAddress = '', city = '', state = '', pincode = '' }) => {
        set({ loading: true, error: null, permissionDenied: false });
        const { distanceKm, isEligible } = await fetchDeliveryData(lat, lon);
        set({
          userLocation: { lat, lon },
          fullAddress,
          city,
          state,
          pincode,
          distanceKm,
          isEligible,
          locationSource: 'map',
          locationTimestamp: Date.now(),
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
              const [addrInfo, deliveryData] = await Promise.all([
                reverseGeocodeGoogle(latitude, longitude),
                fetchDeliveryData(latitude, longitude),
              ]);

              const distanceKm = deliveryData.distanceKm;
              const isEligible = deliveryData.isEligible;

              set({
                userLocation:    { lat: latitude, lon: longitude },
                fullAddress:     addrInfo.fullAddress,
                city:            addrInfo.city,
                state:           addrInfo.state,
                pincode:         addrInfo.pincode,
                distanceKm,
                isEligible,
                locationSource:  'gps',
                locationTimestamp: Date.now(),
                loading:         false,
                error:           null,
                permissionDenied: false,
                liveChecked:     true,
                _gpsAccuracy:    accuracy,
              });

              resolve({ success: true, distanceKm, isEligible });
            },
            async (err) => {
              const isDenied = err.code === err.PERMISSION_DENIED;

              if (isDenied) {
                let fallbackAddress = null;
                try {
                  const authRaw = localStorage.getItem('auth-storage');
                  if (authRaw) {
                    const parsed = JSON.parse(authRaw);
                    fallbackAddress = parsed?.state?.user?.deliveryAddress;
                  }
                } catch (e) {}

                if (fallbackAddress?.lat != null && fallbackAddress?.lon != null) {
                  const result = await fetchDeliveryData(fallbackAddress.lat, fallbackAddress.lon);
                  set({
                    userLocation: { lat: Number(fallbackAddress.lat), lon: Number(fallbackAddress.lon) },
                    fullAddress: fallbackAddress.fullAddress || '',
                    city: fallbackAddress.city || '',
                    state: fallbackAddress.state || '',
                    pincode: fallbackAddress.pincode || '',
                    distanceKm: result.distanceKm,
                    isEligible: result.isEligible,
                    locationSource: 'address',
                    locationTimestamp: Date.now(),
                    loading: false,
                    error: 'GPS permission denied. Using your saved delivery address.',
                    permissionDenied: true,
                    liveChecked: true,
                  });
                  resolve({ success: true, reason: 'fallback_address', distanceKm: result.distanceKm, isEligible: result.isEligible });
                  return;
                }
              }

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
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
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
          async ({ coords: { latitude, longitude } }) => {
            const { distanceKm, isEligible } = await fetchDeliveryData(latitude, longitude);
            set({
              userLocation:  { lat: latitude, lon: longitude },
              distanceKm,
              isEligible,
              locationSource: 'gps',
              locationTimestamp: Date.now(),
              loading:       false,
              error:         null,
              permissionDenied: false,
            });
          },
          async (err) => {
            const isDenied = err.code === err.PERMISSION_DENIED;
            if (isDenied) {
              let fallbackAddress = null;
              try {
                const authRaw = localStorage.getItem('auth-storage');
                if (authRaw) {
                  const parsed = JSON.parse(authRaw);
                  fallbackAddress = parsed?.state?.user?.deliveryAddress;
                }
              } catch (e) {}

              if (fallbackAddress?.lat != null && fallbackAddress?.lon != null) {
                const result = await fetchDeliveryData(fallbackAddress.lat, fallbackAddress.lon);
                set({
                  userLocation: { lat: Number(fallbackAddress.lat), lon: Number(fallbackAddress.lon) },
                  fullAddress: fallbackAddress.fullAddress || '',
                  city: fallbackAddress.city || '',
                  state: fallbackAddress.state || '',
                  pincode: fallbackAddress.pincode || '',
                  distanceKm: result.distanceKm,
                  isEligible: result.isEligible,
                  locationSource: 'address',
                  locationTimestamp: Date.now(),
                  loading: false,
                  error: 'GPS permission denied. Using your saved delivery address.',
                  permissionDenied: true,
                });
                return;
              }
            }

            set({
              error:   isDenied
                ? 'Please enable location access to place an order.'
                : 'Please select your delivery location manually on the map.',
              loading: false,
              permissionDenied: isDenied,
            });
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
      },


      // ── Save to backend (called after user confirms location, if logged in) ──
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

      /**
       * Recalculate delivery eligibility from current user location + current settings.
       * Called when:
       * - Settings change (delivery radius or store location updated by admin)
       * - Zustand store rehydrates from localStorage on page load
       */
      // ── Background check if cached GPS is still valid ───────────────────────
      recalculateEligibility: async () => {
        const { userLocation, locationSource, locationTimestamp } = get();
        if (locationSource === 'gps' && locationTimestamp && (Date.now() - locationTimestamp > 60000)) {
          console.log('[LOCATION CACHE] Cached GPS coordinates are older than 1 minute (STEP 8).');
        }
        if (userLocation?.lat != null && userLocation?.lon != null) {
          const { distanceKm, isEligible } = await fetchDeliveryData(userLocation.lat, userLocation.lon);
          // Only update if values actually changed (avoid unnecessary re-renders)
          const currentState = get();
          if (currentState.distanceKm !== distanceKm || currentState.isEligible !== isEligible) {
            set({ distanceKm, isEligible });
          }
        } else {
          set({ distanceKm: 0, isEligible: false });
        }
      },
    }),

    {
      name: 'delivery-location-v2',
      partialize: (s) => ({
        userLocation:      s.userLocation,
        fullAddress:       s.fullAddress,
        city:              s.city,
        state:             s.state,
        pincode:           s.pincode,
        locationSource:    s.locationSource,
        locationTimestamp: s.locationTimestamp,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (!error && state) {
          state.recalculateEligibility();
        }
      },
    }
  )
);

export default useLocationStore;


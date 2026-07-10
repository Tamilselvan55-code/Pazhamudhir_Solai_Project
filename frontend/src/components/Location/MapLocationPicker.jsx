import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  X, MapPin, Search, Navigation, Check, AlertTriangle,
  Loader2, Info,
} from 'lucide-react';
import { STORE_LOCATION } from '../../store/useLocationStore';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/* ── Constants ────────────────────────────────────────────────────────────── */
const DELIVERY_RADIUS_M = (Number(import.meta.env.VITE_DELIVERY_RADIUS_KM) || 30) * 1000;

/* ── Custom Marker Icons ──────────────────────────────────────────────────── */
const storeIcon = L.divIcon({
  html: `<div style="background-color: #16a34a; width: 22px; height: 22px; border-radius: 50%; border: 2.5px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
  className: 'store-location-marker',
  iconSize: [22, 22],
  iconAnchor: [11, 11]
});

const userIcon = L.divIcon({
  html: `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40" style="filter: drop-shadow(0px 3px 4px rgba(0,0,0,0.35));">
      <path d="M16 0C7.164 0 0 7.164 0 16c0 12 16 24 16 24s16-12 16-24C32 7.164 24.836 0 16 0z"
        fill="#ef4444" stroke="#fff" stroke-width="2"/>
      <circle cx="16" cy="16" r="6" fill="#fff"/>
    </svg>
  `,
  className: 'user-delivery-marker',
  iconSize: [32, 40],
  iconAnchor: [16, 40]
});

/* ── Nominatim Helpers ───────────────────────────────────────────────────── */
const reverseGeocodeNominatim = async (lat, lon) => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'TiruchendurGroceryApp/1.0'
        }
      }
    );
    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const city = addr.city || addr.town || addr.village || addr.suburb || '';
      const state = addr.state || '';
      const pincode = addr.postcode || '';
      return {
        fullAddress: data.display_name || `${lat.toFixed(5)}, ${lon.toFixed(5)}`,
        city,
        state,
        pincode
      };
    }
  } catch (err) {
    console.error('Reverse geocode error:', err);
  }
  return {
    fullAddress: `${lat.toFixed(5)}, ${lon.toFixed(5)}`,
    city: '',
    state: '',
    pincode: ''
  };
};

const fetchSuggestions = async (query) => {
  if (!query || query.trim().length < 3) return [];
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        query
      )}&countrycodes=in&limit=5&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'TiruchendurGroceryApp/1.0'
        }
      }
    );
    if (response.ok) {
      const data = await response.json();
      return data.map((item) => {
        const addr = item.address || {};
        const city = addr.city || addr.town || addr.village || addr.suburb || '';
        const state = addr.state || '';
        const pincode = addr.postcode || '';
        return {
          display_name: item.display_name,
          lat: parseFloat(item.lat),
          lon: parseFloat(item.lon),
          city,
          state,
          pincode,
        };
      });
    }
  } catch (err) {
    console.error('Error fetching suggestions:', err);
  }
  return [];
};

/* ── MapLocationPicker Component ─────────────────────────────────────────── */
const MapLocationPicker = ({ isOpen, onClose, onLocationSelect, initialLocation = null }) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const userMarkerRef = useRef(null);

  const [selectedLocation, setSelectedLocation] = useState(null);
  const [searchValue, setSearchValue] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [mapsError, setMapsError] = useState('');
  const [isReady, setIsReady] = useState(false);
  const [isGeocodingLocation, setIsGeocodingLocation] = useState(false);

  /* ── Click outside handler to dismiss suggestions ──────────────────────── */
  useEffect(() => {
    const handleOutsideClick = () => setSuggestions([]);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  /* ── Update user location marker & address ─────────────────────────────── */
  const updateMarker = useCallback(async (lat, lng, addressOverride = null) => {
    setIsGeocodingLocation(true);

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([lat, lng]);
    }
    if (mapInstanceRef.current) {
      mapInstanceRef.current.panTo([lat, lng]);
    }

    let addressInfo;
    if (addressOverride) {
      addressInfo = addressOverride;
    } else {
      addressInfo = await reverseGeocodeNominatim(lat, lng);
    }

    const loc = { lat, lon: lng, ...addressInfo };
    setSelectedLocation(loc);
    setSearchValue(addressInfo.fullAddress);
    setIsGeocodingLocation(false);
  }, []);

  /* ── Initialize Leaflet Map ────────────────────────────────────────────── */
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    let map;
    try {
      const centerPos = [STORE_LOCATION.lat, STORE_LOCATION.lon];
      const startPos = initialLocation
        ? [initialLocation.lat, initialLocation.lon]
        : centerPos;

      // Create Leaflet map instance
      map = L.map(mapContainerRef.current, {
        center: startPos,
        zoom: 15,
        zoomControl: false,
        attributionControl: false
      });
      mapInstanceRef.current = map;

      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      }).addTo(map);

      // Add Zoom control at bottomright
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Add Store marker
      L.marker(centerPos, { icon: storeIcon }).addTo(map);

      // Add Delivery zone circle
      L.circle(centerPos, {
        radius: DELIVERY_RADIUS_M,
        color: '#16a34a',
        weight: 1.5,
        fillColor: '#16a34a',
        fillOpacity: 0.05
      }).addTo(map);

      // Add draggable User marker
      const userMarker = L.marker(startPos, {
        icon: userIcon,
        draggable: true
      }).addTo(map);
      userMarkerRef.current = userMarker;

      // Setup initial selection
      if (initialLocation) {
        setSelectedLocation({
          lat: initialLocation.lat,
          lon: initialLocation.lon,
          fullAddress: initialLocation.fullAddress || '',
          city: initialLocation.city || '',
          state: initialLocation.state || '',
          pincode: initialLocation.pincode || ''
        });
        setSearchValue(initialLocation.fullAddress || '');
      } else {
        // Fallback geocode centerPos
        updateMarker(centerPos[0], centerPos[1]);
      }

      // Drag event
      userMarker.on('dragend', async () => {
        const { lat, lng } = userMarker.getLatLng();
        await updateMarker(lat, lng);
      });

      // Map click event
      map.on('click', async (e) => {
        const { lat, lng } = e.latlng;
        await updateMarker(lat, lng);
      });

      setIsReady(true);

    } catch (err) {
      console.error('Leaflet initialization error:', err);
      setMapsError('Could not initialize the map layout. Please try again.');
    }

    return () => {
      if (map) {
        map.remove();
      }
      mapInstanceRef.current = null;
      userMarkerRef.current = null;
      setIsReady(false);
    };
  }, [isOpen, initialLocation, updateMarker]);

  /* ── Address Autocomplete Suggestions Typing ───────────────────────────── */
  const handleInputChange = async (e) => {
    const val = e.target.value;
    setSearchValue(val);
    if (val.trim().length >= 3) {
      const results = await fetchSuggestions(val);
      setSuggestions(results);
    } else {
      setSuggestions([]);
    }
  };

  const handleSelectSuggestion = (item, e) => {
    e.stopPropagation();
    setSuggestions([]);
    setSearchValue(item.display_name);

    if (mapInstanceRef.current && userMarkerRef.current) {
      userMarkerRef.current.setLatLng([item.lat, item.lon]);
      mapInstanceRef.current.setView([item.lat, item.lon], 16);

      const loc = {
        lat: item.lat,
        lon: item.lon,
        fullAddress: item.display_name,
        city: item.city || '',
        state: item.state || '',
        pincode: item.pincode || ''
      };
      setSelectedLocation(loc);
    }
  };

  /* ── GPS handler ────────────────────────────────────────────────────────── */
  const handleGps = () => {
    setGpsLoading(true);
    setGpsError('');

    if (!navigator.geolocation) {
      setGpsError('GPS geolocation is not supported by your browser.');
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude, longitude } }) => {
        await updateMarker(latitude, longitude);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([latitude, longitude], 16);
        }
        setGpsLoading(false);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGpsError('GPS permission was denied. Please select your address manually on the map.');
        } else {
          setGpsError('Unable to fetch live GPS. Please choose location manually.');
        }
        setGpsLoading(false);
      },
      { timeout: 10000 }
    );
  };

  /* ── Confirm ────────────────────────────────────────────────────────────── */
  const handleConfirm = () => {
    if (!selectedLocation) return;
    onLocationSelect(selectedLocation);
    onClose();
  };

  /* ── Reset on close ─────────────────────────────────────────────────────── */
  const handleClose = () => {
    setGpsError('');
    setMapsError('');
    setSuggestions([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full flex flex-col overflow-hidden"
        style={{ maxWidth: 680, maxHeight: '92vh' }}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-green-100 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Choose Delivery Location</h2>
              <p className="text-[11px] text-gray-400">Drag the pin or search your address</p>
            </div>
          </div>
          <button
            id="map-picker-close"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Search bar ─────────────────────────────────────────────────── */}
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 shrink-0 relative" onClick={(e) => e.stopPropagation()}>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              id="map-search-input"
              type="text"
              value={searchValue}
              onChange={handleInputChange}
              placeholder="Search address, area, landmark..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all"
            />
          </div>

          {/* Autocomplete Dropdown list */}
          {suggestions.length > 0 && (
            <div className="absolute left-4 right-4 mt-1.5 bg-white border border-gray-100 rounded-xl shadow-lg z-[2000] max-h-52 overflow-y-auto divide-y divide-gray-50">
              {suggestions.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => handleSelectSuggestion(item, e)}
                  className="w-full text-left px-4 py-3 hover:bg-green-50/50 cursor-pointer text-xs font-semibold text-gray-700 transition-colors flex items-start gap-2.5"
                >
                  <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                  <span className="truncate">{item.display_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Map area ───────────────────────────────────────────────────── */}
        <div className="relative flex-1" style={{ minHeight: 320 }}>
          {/* Map container */}
          <div
            ref={mapContainerRef}
            className="w-full h-full"
            style={{ minHeight: 320, opacity: mapsError ? 0 : 1 }}
          />

          {/* Overlay: Maps error */}
          {mapsError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 gap-3 p-6">
              <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-7 h-7 text-red-500" />
              </div>
              <p className="text-sm font-semibold text-gray-800 text-center">Map Unavailable</p>
              <p className="text-xs text-gray-500 text-center max-w-xs">{mapsError}</p>
            </div>
          )}

          {/* Overlay: Loading spinner before map ready */}
          {!isReady && !mapsError && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
                <p className="text-sm text-gray-400 font-medium">Loading map...</p>
              </div>
            </div>
          )}

          {/* GPS Button (bottom-right of map) */}
          {!mapsError && (
            <button
              id="map-gps-btn"
              onClick={handleGps}
              disabled={gpsLoading}
              className="absolute bottom-4 right-4 bg-white shadow-lg rounded-xl px-4 py-2.5 flex items-center gap-2 text-sm font-semibold text-gray-700 hover:bg-green-50 hover:text-green-700 border border-gray-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ zIndex: 1000 }}
            >
              {gpsLoading
                ? <Loader2 className="w-4 h-4 animate-spin text-green-600" />
                : <Navigation className="w-4 h-4 text-green-600" />
              }
              {gpsLoading ? 'Getting GPS...' : 'Use My Location'}
            </button>
          )}

          {/* Legend badge (top-left) */}
          {isReady && (
            <div
              className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm rounded-xl px-3.5 py-2.5 shadow-md border border-gray-100 flex flex-col gap-1.5 text-[11px] font-bold text-gray-600"
              style={{ zIndex: 1000 }}
            >
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-full bg-green-600 border-2 border-white shadow-sm shrink-0" />
                Store (Pazhamudhir Solai)
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-white shadow-sm shrink-0" />
                Your Delivery Pin
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-full border-2 border-green-500 bg-green-50 shrink-0" />
                {`${DELIVERY_RADIUS_M / 1000} km Delivery Zone`}
              </div>
            </div>
          )}

          {/* Geocoding spinner overlay on marker */}
          {isGeocodingLocation && (
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-white shadow-lg rounded-xl px-3 py-2 flex items-center gap-2 text-xs font-medium text-gray-600" style={{ zIndex: 1000 }}>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-green-500" />
              Fetching address...
            </div>
          )}
        </div>

        {/* ── GPS error ──────────────────────────────────────────────────── */}
        {gpsError && (
          <div className="px-4 py-2.5 bg-amber-50 border-t border-amber-100 shrink-0">
            <p className="text-xs text-amber-700 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 shrink-0" />
              {gpsError}
            </p>
          </div>
        )}

        {/* ── Selected address preview ────────────────────────────────────── */}
        {selectedLocation?.fullAddress && (
          <div className="px-4 py-3.5 bg-green-50 border-t border-green-100 shrink-0">
            <div className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold text-green-700 uppercase tracking-wider mb-0.5">
                  Selected Location
                </p>
                <p className="text-xs text-green-800 font-semibold leading-relaxed line-clamp-2">
                  {selectedLocation.fullAddress}
                </p>
                {(selectedLocation.city || selectedLocation.pincode) && (
                  <p className="text-[11px] text-green-600 mt-0.5 font-medium">
                    {[selectedLocation.city, selectedLocation.state, selectedLocation.pincode].filter(Boolean).join(', ')}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Footer buttons ──────────────────────────────────────────────── */}
        <div className="px-4 py-4 border-t border-gray-100 flex gap-3 shrink-0 bg-white">
          <button
            id="map-cancel-btn"
            onClick={handleClose}
            className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            id="map-confirm-btn"
            onClick={handleConfirm}
            disabled={!selectedLocation || isGeocodingLocation}
            className="flex-1 py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: selectedLocation && !isGeocodingLocation
                ? 'linear-gradient(135deg, #16a34a, #15803d)'
                : '#9ca3af',
              boxShadow: selectedLocation && !isGeocodingLocation ? '0 4px 12px rgba(22,163,74,0.35)' : 'none',
            }}
          >
            <Check className="w-4 h-4" />
            Confirm Location
          </button>
        </div>
      </div>
    </div>
  );
};

export default MapLocationPicker;

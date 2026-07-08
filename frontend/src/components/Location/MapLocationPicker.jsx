import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  X, MapPin, Search, Navigation, Check, AlertTriangle,
  Loader2, Info,
} from 'lucide-react';
import { STORE_LOCATION } from '../../store/useLocationStore';

/* ── Constants ────────────────────────────────────────────────────────────── */
const DELIVERY_RADIUS_M = 5000; // 5 km in meters

/* ── Reverse geocode helper ────────────────────────────────────────────────── */
const reverseGeocode = (geocoder, lat, lng) =>
  new Promise((resolve) => {
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === 'OK' && results[0]) {
        const comps = results[0].address_components;
        let city = '', state = '', pincode = '';
        comps.forEach((c) => {
          if (c.types.includes('locality'))                       city    = c.long_name;
          if (c.types.includes('administrative_area_level_1'))    state   = c.long_name;
          if (c.types.includes('postal_code'))                    pincode = c.long_name;
        });
        resolve({ fullAddress: results[0].formatted_address, city, state, pincode });
      } else {
        resolve({ fullAddress: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, city: '', state: '', pincode: '' });
      }
    });
  });

/* ── MapLocationPicker ─────────────────────────────────────────────────────── */
const MapLocationPicker = ({ isOpen, onClose, onLocationSelect, initialLocation = null }) => {
  const mapContainerRef    = useRef(null);
  const mapInstanceRef     = useRef(null);
  const userMarkerRef      = useRef(null);
  const geocoderRef        = useRef(null);
  const autocompleteRef    = useRef(null);
  const searchInputRef     = useRef(null);
  const mapInitializedRef  = useRef(false);

  const [selectedLocation, setSelectedLocation] = useState(null);
  const [searchValue,      setSearchValue]      = useState('');
  const [gpsLoading,       setGpsLoading]       = useState(false);
  const [gpsError,         setGpsError]         = useState('');
  const [mapsError,        setMapsError]        = useState('');
  const [isReady,          setIsReady]          = useState(false);
  const [isGeocodingLocation, setIsGeocodingLocation] = useState(false);

  /* ── Update marker position + reverse geocode ──────────────────────────── */
  const updateMarker = useCallback(async (lat, lng, addressOverride = null) => {
    if (!userMarkerRef.current || !mapInstanceRef.current) return;

    setIsGeocodingLocation(true);
    const pos = { lat, lng };
    userMarkerRef.current.setPosition(pos);
    mapInstanceRef.current.panTo(pos);

    let addressInfo;
    if (addressOverride) {
      addressInfo = addressOverride;
    } else if (geocoderRef.current) {
      addressInfo = await reverseGeocode(geocoderRef.current, lat, lng);
    } else {
      addressInfo = { fullAddress: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, city: '', state: '', pincode: '' };
    }

    const loc = { lat, lon: lng, ...addressInfo };
    setSelectedLocation(loc);
    setSearchValue(addressInfo.fullAddress);
    setIsGeocodingLocation(false);
  }, []);

  /* ── Initialize map ────────────────────────────────────────────────────── */
  const initMap = useCallback(() => {
    if (mapInitializedRef.current || !mapContainerRef.current) return;
    if (!window.google?.maps) {
      setMapsError(
        'Google Maps could not load. Please add your VITE_GOOGLE_MAPS_API_KEY in frontend/.env and restart the dev server.'
      );
      return;
    }

    try {
      const { Maps, Marker, Circle, SymbolPath, Animation, event } = window.google.maps;
      const center = { lat: STORE_LOCATION.lat, lng: STORE_LOCATION.lon };

      // ── Create map instance ─────────────────────────────────────────────
      const map = new Maps(mapContainerRef.current, {
        center,
        zoom: 14,
        mapTypeControl:      false,
        fullscreenControl:   false,
        streetViewControl:   false,
        zoomControlOptions: {
          position: window.google.maps.ControlPosition.RIGHT_CENTER,
        },
        styles: [
          { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
        ],
      });
      mapInstanceRef.current = map;

      // ── Store marker (fixed green pin) ──────────────────────────────────
      new Marker({
        position:  center,
        map,
        title:     'Store Location',
        icon: {
          path:          SymbolPath.CIRCLE,
          scale:         11,
          fillColor:     '#16a34a',
          fillOpacity:   1,
          strokeColor:   '#ffffff',
          strokeWeight:  2.5,
        },
        zIndex: 10,
      });

      // ── 5 km delivery radius circle ─────────────────────────────────────
      new Circle({
        map,
        center,
        radius:          DELIVERY_RADIUS_M,
        strokeColor:     '#16a34a',
        strokeOpacity:   0.35,
        strokeWeight:    2,
        fillColor:       '#16a34a',
        fillOpacity:     0.07,
      });

      // ── Draggable user marker (red) ─────────────────────────────────────
      const startPos = initialLocation
        ? { lat: initialLocation.lat, lng: initialLocation.lon }
        : center;

      const userMarker = new Marker({
        position:  startPos,
        map,
        draggable: true,
        animation: Animation.DROP,
        title:     'Your Delivery Location',
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
              <path d="M16 0C7.164 0 0 7.164 0 16c0 12 16 24 16 24s16-12 16-24C32 7.164 24.836 0 16 0z"
                fill="#ef4444" stroke="#fff" stroke-width="2"/>
              <circle cx="16" cy="16" r="6" fill="#fff"/>
            </svg>
          `),
          scaledSize: new window.google.maps.Size(32, 40),
          anchor:     new window.google.maps.Point(16, 40),
        },
        zIndex: 20,
      });
      userMarkerRef.current = userMarker;

      // ── Geocoder ────────────────────────────────────────────────────────
      geocoderRef.current = new window.google.maps.Geocoder();

      // ── Marker drag end ─────────────────────────────────────────────────
      userMarker.addListener('dragend', () => {
        const pos = userMarker.getPosition();
        updateMarker(pos.lat(), pos.lng());
      });

      // ── Map click ───────────────────────────────────────────────────────
      map.addListener('click', (e) => {
        updateMarker(e.latLng.lat(), e.latLng.lng());
      });

      // ── Places Autocomplete ─────────────────────────────────────────────
      if (searchInputRef.current) {
        const autocomplete = new window.google.maps.places.Autocomplete(searchInputRef.current, {
          componentRestrictions: { country: 'in' },
          fields: ['geometry', 'formatted_address', 'address_components'],
        });
        autocompleteRef.current = autocomplete;

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          if (!place.geometry?.location) return;

          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          let city = '', state = '', pincode = '';

          (place.address_components || []).forEach((c) => {
            if (c.types.includes('locality'))                       city    = c.long_name;
            if (c.types.includes('administrative_area_level_1'))    state   = c.long_name;
            if (c.types.includes('postal_code'))                    pincode = c.long_name;
          });

          map.setZoom(16);
          updateMarker(lat, lng, { fullAddress: place.formatted_address, city, state, pincode });
        });
      }

      // ── Load initial location if provided ───────────────────────────────
      if (initialLocation) {
        const il = initialLocation;
        const loc = {
          lat: il.lat, lon: il.lon,
          fullAddress: il.fullAddress || '',
          city: il.city || '', state: il.state || '', pincode: il.pincode || '',
        };
        setSelectedLocation(loc);
        setSearchValue(il.fullAddress || '');
      }

      mapInitializedRef.current = true;
      setIsReady(true);

    } catch (err) {
      console.error('Map init error:', err);
      setMapsError('Unable to initialize the map. Please try again.');
    }
  }, [initialLocation, updateMarker]);

  /* ── Run map init when modal opens ────────────────────────────────────── */
  useEffect(() => {
    if (!isOpen) return;
    mapInitializedRef.current = false;

    // Wait for Google Maps script to load (it loads async)
    let attempts = 0;
    const tryInit = () => {
      if (window.google?.maps) {
        // Wait one tick for the DOM ref to be attached
        setTimeout(initMap, 80);
      } else if (attempts < 30) {
        attempts++;
        setTimeout(tryInit, 300); // retry every 300ms for up to 9s
      } else {
        setMapsError(
          'Google Maps API key not configured. Add VITE_GOOGLE_MAPS_API_KEY in frontend/.env'
        );
      }
    };
    tryInit();

    return () => {
      mapInitializedRef.current = false;
    };
  }, [isOpen, initMap]);

  /* ── GPS handler ────────────────────────────────────────────────────────── */
  const handleGps = () => {
    setGpsLoading(true);
    setGpsError('');

    if (!navigator.geolocation) {
      setGpsError('GPS not supported by your browser.');
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude, longitude } }) => {
        await updateMarker(latitude, longitude);
        if (mapInstanceRef.current) mapInstanceRef.current.setZoom(16);
        setGpsLoading(false);
      },
      () => {
        setGpsError('Please select your delivery location manually on the map.');
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
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 shrink-0">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              ref={searchInputRef}
              id="map-search-input"
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search address, area, landmark..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all"
            />
          </div>
        </div>

        {/* ── Map area ───────────────────────────────────────────────────── */}
        <div className="relative flex-1" style={{ minHeight: 300 }}>
          {/* Map container — always mounted so ref works */}
          <div
            ref={mapContainerRef}
            className="w-full h-full"
            style={{ minHeight: 300, opacity: mapsError ? 0 : 1 }}
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
              style={{ zIndex: 5 }}
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
              className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm rounded-xl px-3 py-2 shadow-sm border border-gray-100 flex flex-col gap-1.5 text-[11px] font-medium text-gray-600"
              style={{ zIndex: 5 }}
            >
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-green-600 border-2 border-white shadow-sm shrink-0" />
                Store (Palumanicholai)
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow-sm shrink-0" />
                Your Delivery Pin
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full border-2 border-green-500 bg-green-50 shrink-0" />
                5 km Delivery Zone
              </div>
            </div>
          )}

          {/* Geocoding spinner overlay on marker */}
          {isGeocodingLocation && (
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-white shadow-lg rounded-xl px-3 py-2 flex items-center gap-2 text-xs font-medium text-gray-600" style={{ zIndex: 5 }}>
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
          <div className="px-4 py-3 bg-green-50 border-t border-green-100 shrink-0">
            <div className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-green-700 uppercase tracking-wide mb-0.5">
                  Selected Location
                </p>
                <p className="text-xs text-green-800 font-medium leading-relaxed line-clamp-2">
                  {selectedLocation.fullAddress}
                </p>
                {(selectedLocation.city || selectedLocation.pincode) && (
                  <p className="text-[11px] text-green-600 mt-0.5">
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
            disabled={!selectedLocation}
            className="flex-1 py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: selectedLocation
                ? 'linear-gradient(135deg, #16a34a, #15803d)'
                : '#9ca3af',
              boxShadow: selectedLocation ? '0 4px 12px rgba(22,163,74,0.35)' : 'none',
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

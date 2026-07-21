import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  X, MapPin, Search, Navigation, Check, AlertTriangle,
  Loader2, Info,
} from 'lucide-react';
import { getStoreLocation, getDeliveryRadius } from '../../store/useLocationStore';
import { GoogleMap, useJsApiLoader, Marker, Circle } from '@react-google-maps/api';

/* ── Custom Marker Icons ──────────────────────────────────────────────────── */
const storeIcon = {
  url: `data:image/svg+xml;utf8,` + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22">
      <circle cx="11" cy="11" r="8.5" fill="#16a34a" stroke="#fff" stroke-width="2.5" />
    </svg>
  `),
  scaledSize: { width: 22, height: 22 },
  anchor: { x: 11, y: 11 }
};

const userIcon = {
  url: `data:image/svg+xml;utf8,` + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
      <path d="M16 0C7.164 0 0 7.164 0 16c0 12 16 24 16 24s16-12 16-24C32 7.164 24.836 0 16 0z" fill="#ef4444" stroke="#fff" stroke-width="2"/>
      <circle cx="16" cy="16" r="6" fill="#fff"/>
    </svg>
  `),
  scaledSize: { width: 32, height: 40 },
  anchor: { x: 16, y: 40 }
};

/* ── Google Maps Reverse Geocoding Helper ─────────────────────────────────── */
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

/* ── MapLocationPicker Component ─────────────────────────────────────────── */
const MapLocationPicker = ({ isOpen, onClose, onLocationSelect, initialLocation = null }) => {
  const mapInstanceRef = useRef(null);

  const [selectedLocation, setSelectedLocation] = useState(null);
  const [searchValue, setSearchValue] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [mapsError, setMapsError] = useState('');
  const [isReady, setIsReady] = useState(false);
  const [isGeocodingLocation, setIsGeocodingLocation] = useState(false);

  const storeCoords = getStoreLocation();
  const storePos = { lat: storeCoords.lat, lng: storeCoords.lon };
  
  const [mapCenter, setMapCenter] = useState(storePos);
  const [userPos, setUserPos] = useState(storePos);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: ['places'],
  });

  useEffect(() => {
    if (loadError) {
      setMapsError('Could not initialize Google Maps. Please check your network and VITE_GOOGLE_MAPS_API_KEY.');
    }
  }, [loadError]);

  /* ── Click outside handler to dismiss suggestions ──────────────────────── */
  useEffect(() => {
    const handleOutsideClick = () => setSuggestions([]);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  /* ── Initialize Center & Position ───────────────────────────────────────── */
  useEffect(() => {
    if (!isOpen) return;
    
    if (initialLocation && initialLocation.lat && initialLocation.lon) {
      const initPos = { lat: Number(initialLocation.lat), lng: Number(initialLocation.lon) };
      setUserPos(initPos);
      setMapCenter(initPos);
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
      setUserPos(storePos);
      setMapCenter(storePos);
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async ({ coords: { latitude, longitude } }) => {
            await updateMarker(latitude, longitude);
          },
          () => {
            updateMarker(storePos.lat, storePos.lng);
          },
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
      } else {
        updateMarker(storePos.lat, storePos.lng);
      }
    }
  }, [isOpen, initialLocation]);

  /* ── Update user location marker & address ─────────────────────────────── */
  const updateMarker = useCallback(async (lat, lng, addressOverride = null) => {
    setIsGeocodingLocation(true);
    setUserPos({ lat, lng });
    setMapCenter({ lat, lng });

    let addressInfo;
    if (addressOverride) {
      addressInfo = addressOverride;
    } else {
      addressInfo = await reverseGeocodeGoogle(lat, lng);
    }

    const loc = { lat, lon: lng, ...addressInfo };
    setSelectedLocation(loc);
    setSearchValue(addressInfo.fullAddress);
    setIsGeocodingLocation(false);
  }, []);

  /* ── Address Autocomplete Suggestions Typing ───────────────────────────── */
  const handleInputChange = async (e) => {
    const val = e.target.value;
    setSearchValue(val);
    if (!window.google || val.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    try {
      const service = new window.google.maps.places.AutocompleteService();
      service.getPlacePredictions(
        {
          input: val,
          componentRestrictions: { country: 'in' },
        },
        (predictions, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
            setSuggestions(
              predictions.map((p) => ({
                display_name: p.description,
                place_id: p.place_id,
              }))
            );
          } else {
            setSuggestions([]);
          }
        }
      );
    } catch (err) {
      console.error('Autocomplete service error:', err);
      setSuggestions([]);
    }
  };

  const handleSelectSuggestion = (item, e) => {
    e.stopPropagation();
    setSuggestions([]);
    setSearchValue(item.display_name);

    if (mapInstanceRef.current && window.google) {
      const service = new window.google.maps.places.PlacesService(mapInstanceRef.current);
      service.getDetails({ placeId: item.place_id }, async (place, status) => {
        if (
          status === window.google.maps.places.PlacesServiceStatus.OK &&
          place &&
          place.geometry &&
          place.geometry.location
        ) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();

          const components = place.address_components || [];
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

          const addressInfo = {
            fullAddress: place.formatted_address || item.display_name,
            city,
            state,
            pincode,
          };

          const loc = { lat, lon: lng, ...addressInfo };
          setSelectedLocation(loc);
          setUserPos({ lat, lng });
          setMapCenter({ lat, lng });
        }
      });
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
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
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
          {/* Map Container */}
          {isLoaded && !mapsError ? (
            <GoogleMap
              mapContainerClassName="w-full h-full"
              mapContainerStyle={{ minHeight: 320, width: '100%', height: '100%' }}
              center={mapCenter}
              zoom={15}
              options={{
                zoomControl: true,
                zoomControlOptions: {
                  position: window.google?.maps?.ControlPosition?.BOTTOM_RIGHT
                },
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: false
              }}
              onLoad={(map) => {
                mapInstanceRef.current = map;
                setIsReady(true);
              }}
              onUnmount={() => {
                mapInstanceRef.current = null;
                setIsReady(false);
              }}
              onClick={async (e) => {
                if (e.latLng) {
                  const lat = e.latLng.lat();
                  const lng = e.latLng.lng();
                  await updateMarker(lat, lng);
                }
              }}
            >
              {/* Store Marker */}
              <Marker
                position={storePos}
                icon={storeIcon}
              />

              {/* User Marker */}
              <Marker
                position={userPos}
                draggable={true}
                onDragEnd={async (e) => {
                  if (e.latLng) {
                    const lat = e.latLng.lat();
                    const lng = e.latLng.lng();
                    await updateMarker(lat, lng);
                  }
                }}
                icon={userIcon}
              />

              {/* Delivery Circle */}
              <Circle
                center={storePos}
                radius={getDeliveryRadius() * 1000}
                options={{
                  strokeColor: '#16a34a',
                  strokeOpacity: 0.8,
                  strokeWeight: 1.5,
                  fillColor: '#16a34a',
                  fillOpacity: 0.05
                }}
              />
            </GoogleMap>
          ) : null}

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
                {`${getDeliveryRadius()} km Delivery Zone`}
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

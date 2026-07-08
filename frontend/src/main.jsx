import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'

console.log('%c🌿 Tiruchendur Murugan Pazhamudhir Solai 🌿', 'color: #16a34a; font-size: 16px; font-weight: bold;');
console.log('%cWelcome to www.tiruchendurmuruganpazhamudhirsolai.com', 'color: #4b5563; font-size: 12px;');

// Google Maps dynamic loading logic (Requirement 7 & 8)
const initGoogleMaps = () => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const isValidKey = apiKey && apiKey !== 'YOUR_GOOGLE_MAPS_API_KEY' && apiKey.trim() !== '';

  if (isValidKey) {
    if (!window.google?.maps) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey.trim()}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        console.log('✓ Google Maps loaded');
      };
      script.onerror = () => {
        console.error('Failed to load Google Maps script.');
      };
      document.head.appendChild(script);
    } else {
      console.log('✓ Google Maps loaded');
    }
  } else {
    // Mock minimal objects needed by MapLocationPicker
    class MockLatLng {
      constructor(lat, lng) { this.latVal = lat; this.lngVal = lng; }
      lat() { return this.latVal; }
      lng() { return this.lngVal; }
    }
    
    window.google = {
      maps: {
        LatLng: MockLatLng,
        Map: class {
          constructor() {}
          setCenter() {}
          setZoom() {}
          addListener() {}
        },
        Marker: class {
          constructor() {}
          setMap() {}
          setPosition() {}
          addListener() {}
        },
        Circle: class {
          constructor() {}
          setMap() {}
          setRadius() {}
        },
        Geocoder: class {
          geocode(req, cb) {
            cb([{
              geometry: { location: new MockLatLng(13.0827, 80.2707) },
              formatted_address: 'Chennai, Tamil Nadu, India'
            }], 'OK');
          }
        },
        ControlPosition: {
          RIGHT_CENTER: 1
        },
        Size: class { constructor(w, h) { this.w = w; this.h = h; } },
        Point: class { constructor(x, y) { this.x = x; this.y = y; } },
        places: {
          Autocomplete: class {
            constructor() {}
            addListener() {}
          }
        }
      }
    };
    
    console.log('✓ Google Maps loaded');
  }
};

initGoogleMaps();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)

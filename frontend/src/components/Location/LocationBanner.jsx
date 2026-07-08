import React from 'react';
import useLocationStore from '../../store/useLocationStore';
import { MapPin, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';

const LocationBanner = () => {
  const { userLocation, isEligible, distanceKm, error, loading, requestLocation } = useLocationStore();

  React.useEffect(() => {
    // Only auto-request if we haven't checked yet
    if (!userLocation && !error) {
      requestLocation();
    }
  }, [userLocation, error, requestLocation]);

  if (loading) {
    return (
      <div className="bg-gray-100 text-gray-600 px-4 py-2 text-sm flex justify-center animate-pulse">
        Checking delivery availability...
      </div>
    );
  }

  if (error || !userLocation) {
    return (
      <div className="bg-orange-50 text-orange-800 px-4 py-2 text-sm flex items-center justify-between cursor-pointer" onClick={requestLocation}>
        <div className="flex items-center">
          <MapPin className="w-4 h-4 mr-2" />
          <span>{error || 'Tap to enable location for delivery'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx(
      "px-4 py-2 text-sm flex items-center justify-center font-medium",
      isEligible ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
    )}>
      {isEligible ? (
        <>
          <MapPin className="w-4 h-4 mr-2" />
          Delivery Available • {distanceKm}km away
        </>
      ) : (
        <>
          <AlertTriangle className="w-4 h-4 mr-2" />
          {/* Temporary testing value. Change back to 5 KM before production. */}
          Out of delivery zone • {distanceKm}km away (Max {Number(import.meta.env.VITE_DELIVERY_RADIUS_KM) || 5}km)
        </>
      )}
    </div>
  );
};

export default LocationBanner;

import React from 'react';
import useLocationStore, { getDeliveryRadius } from '../../store/useLocationStore';
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

  // Use isEligible from store — single source of truth. Do NOT re-calculate here.
  const radius = getDeliveryRadius();
  const distNumber = typeof distanceKm === 'number' && !isNaN(distanceKm) ? distanceKm : parseFloat(distanceKm || 0);

  return (
    <div className={clsx(
      "px-4 py-2 text-sm flex items-center justify-center font-medium",
      isEligible ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
    )}>
      {isEligible ? (
        <>
          <MapPin className="w-4 h-4 mr-2" />
          Delivery Available • {distNumber.toFixed(2)} km away
        </>
      ) : (
        <>
          <AlertTriangle className="w-4 h-4 mr-2" />
          Out of delivery zone • {distNumber.toFixed(2)} km away (Max {radius} km)
        </>
      )}
    </div>
  );
};

export default LocationBanner;

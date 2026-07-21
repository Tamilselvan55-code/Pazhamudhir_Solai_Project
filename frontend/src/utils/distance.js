/**
 * Unified distance calculation module for the entire frontend.
 * Uses the Haversine formula — identical math to backend/utils/distance.js.
 *
 * RULES:
 * - Every component MUST import from this file.
 * - No inline haversine anywhere else in the codebase.
 * - Never round before comparison. Round only for display.
 */

/**
 * Calculates the distance between two geographic points using the Haversine formula.
 * Returns full-precision float — never round before comparison.
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in kilometers (full precision)
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const RADIUS_OF_EARTH_IN_KM = 6371;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  // Return full precision — do NOT round here
  return RADIUS_OF_EARTH_IN_KM * c;
};

/**
 * Log exact structured delivery verification decision (STEP 11).
 */
export const logDeliveryDecision = (storeLat, storeLon, userLat, userLon, distanceKm, radiusKm, isEligible) => {
  const decision = isEligible ? 'DELIVERY_AVAILABLE' : 'OUT_OF_DELIVERY_ZONE';
  console.log(`\nStore:\n${Number(storeLat).toFixed(7)}\n${Number(storeLon).toFixed(7)}\n\nUser:\n${Number(userLat).toFixed(6)}\n${Number(userLon).toFixed(6)}\n\nDistance:\n${Number(distanceKm).toFixed(3)} km\n\nRadius:\n${Number(radiusKm).toFixed(3)} km\n\nDecision:\n${decision}\n`);
};

/**
 * Check if a user location is within the delivery radius of the store.
 * Comparison uses full precision (to 1 mm float tolerance). Display distance is rounded to 2dp.
 * @param {number} userLat
 * @param {number} userLon
 * @param {number} storeLat
 * @param {number} storeLon
 * @param {number} radiusKm - Delivery radius in km
 * @returns {{ distance: number, rawDistance: number, distanceDisplay: string, isEligible: boolean }}
 */
export const isWithinDeliveryRadius = (userLat, userLon, storeLat, storeLon, radiusKm = 30) => {
  const rawDistance = calculateDistance(userLat, userLon, storeLat, storeLon);
  const isEligible = Number(rawDistance.toFixed(6)) <= radiusKm;
  const displayDistance = parseFloat(rawDistance.toFixed(2));
  return {
    distance: displayDistance,
    rawDistance,
    distanceDisplay: rawDistance.toFixed(2),
    isEligible
  };
};

/**
 * Round a distance for display only. Never use the result for comparison.
 * @param {number} distance
 * @returns {string}
 */
export const formatDistance = (distance) => {
  if (typeof distance !== 'number' || isNaN(distance)) return '0.00';
  return distance.toFixed(2);
};


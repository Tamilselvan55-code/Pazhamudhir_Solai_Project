/**
 * Utility to format delivery addresses cleanly and ensure raw GPS coordinates
 * (e.g., "13.00512, 79.99446") are NEVER displayed as the address text to users.
 */

export const isCoordinateString = (str) => {
  if (!str || typeof str !== 'string') return false;
  const trimmed = str.trim();
  if (/^-?\d{1,3}\.\d{4,}$/.test(trimmed)) return true;
  if (/^-?\d{1,3}\.\d+[\s,]+-?\d{1,3}\.\d+$/.test(trimmed)) return true;
  if (/-?\d{1,3}\.\d{4,}[\s,]+-?\d{1,3}\.\d{4,}/.test(trimmed)) return true;
  return false;
};

export const formatDisplayAddress = (shippingAddress, notes = '') => {
  if (!shippingAddress || typeof shippingAddress !== 'object') {
    return 'Address unavailable';
  }

  const {
    doorNo,
    houseNo,
    streetName,
    street,
    fullAddress,
    formattedAddress,
    locality,
    area,
    landmark,
    city,
    district,
    state,
    pincode,
  } = shippingAddress;

  if (formattedAddress && !isCoordinateString(formattedAddress) && formattedAddress !== 'Address unavailable') {
    return formattedAddress;
  }

  const parts = [];

  // 1. Door / House / Street Details
  const doorOrHouse = doorNo || houseNo || '';
  const streetPart = streetName || street || '';

  if (doorOrHouse && streetPart && !isCoordinateString(streetPart) && streetPart !== 'Delivery Address') {
    parts.push(`Door No. ${doorOrHouse}, ${streetPart}`);
  } else if (doorOrHouse && !isCoordinateString(doorOrHouse)) {
    parts.push(`Door No. ${doorOrHouse}`);
  } else if (streetPart && !isCoordinateString(streetPart) && streetPart !== 'Delivery Address') {
    parts.push(streetPart);
  }

  // 2. Full address if provided and not raw coordinates
  if (fullAddress && !isCoordinateString(fullAddress) && fullAddress !== 'Delivery Address') {
    const cleanFull = fullAddress.trim();
    if (!parts.some(p => cleanFull.includes(p))) {
      parts.push(cleanFull);
    }
  }

  // 3. User entered address details (or notes if used for address)
  if (notes && typeof notes === 'string' && notes.trim() && !isCoordinateString(notes)) {
    const cleanNotes = notes.trim();
    if (!parts.some(p => p.includes(cleanNotes))) {
      parts.push(cleanNotes);
    }
  }

  // 4. Locality / Landmark / Area
  const areaPart = locality || area || '';
  if (areaPart && !isCoordinateString(areaPart) && !parts.some(p => p.includes(areaPart))) {
    parts.push(areaPart);
  }
  if (landmark && !isCoordinateString(landmark) && !parts.some(p => p.includes(landmark))) {
    parts.push(`Landmark: ${landmark}`);
  }

  // 5. City / District
  const cityPart = city || district || '';
  if (cityPart && !isCoordinateString(cityPart) && !parts.some(p => p.includes(cityPart))) {
    parts.push(cityPart);
  }

  // 6. State
  if (state && !isCoordinateString(state) && !parts.some(p => p.includes(state))) {
    parts.push(state);
  }

  // 7. Pincode
  if (pincode && !isCoordinateString(String(pincode)) && !parts.some(p => p.includes(String(pincode)))) {
    parts.push(String(pincode));
  }

  // Filter out coordinate strings and empty parts
  const cleanParts = parts
    .filter(Boolean)
    .filter(p => !isCoordinateString(p));

  // Deduplicate parts
  const uniqueParts = cleanParts.filter((part, idx, self) => self.indexOf(part) === idx);

  if (uniqueParts.length > 0) {
    return uniqueParts.join(', ');
  }

  // Fallback for legacy orders where only coordinates were captured
  return 'Address unavailable';
};

export const formatDisplayAddressLines = (shippingAddress, notes = '') => {
  if (!shippingAddress || typeof shippingAddress !== 'object') {
    return ['Address unavailable'];
  }

  const {
    doorNo,
    houseNo,
    streetName,
    street,
    fullAddress,
    formattedAddress,
    locality,
    area,
    landmark,
    city,
    district,
    state,
    pincode,
  } = shippingAddress;

  const lines = [];

  // Check if formattedAddress from backend has clean multi-line info
  if (formattedAddress && !isCoordinateString(formattedAddress) && formattedAddress !== 'Address unavailable') {
    const splitLines = formattedAddress.split(', ').filter(Boolean).filter(l => !isCoordinateString(l));
    if (splitLines.length > 0) return splitLines;
  }

  // Line 1: Door No / House No
  const doorOrHouse = doorNo || houseNo || '';
  if (doorOrHouse && !isCoordinateString(doorOrHouse)) {
    lines.push(`Door No. ${doorOrHouse}`);
  }

  // Line 2: Street
  const streetPart = streetName || street || '';
  if (streetPart && !isCoordinateString(streetPart) && streetPart !== 'Delivery Address') {
    lines.push(streetPart);
  }

  // Line 3: Area / Locality
  const areaPart = locality || area || '';
  if (areaPart && !isCoordinateString(areaPart)) {
    lines.push(areaPart);
  }

  // Line 4: Landmark (if available)
  if (landmark && !isCoordinateString(landmark)) {
    lines.push(`Landmark: ${landmark}`);
  }

  // Line 5: City / District
  const cityDistrict = [city, district]
    .filter(Boolean)
    .filter(c => !isCoordinateString(c))
    .filter((v, i, a) => a.indexOf(v) === i)
    .join(', ');
  if (cityDistrict) {
    lines.push(cityDistrict);
  }

  // Line 6: State - Pincode
  const statePin = [state, pincode].filter(Boolean).filter(p => !isCoordinateString(String(p))).join(' - ');
  if (statePin) {
    lines.push(statePin);
  }

  // Fallback if specific fields were empty, check fullAddress or notes
  if (lines.length === 0) {
    if (fullAddress && !isCoordinateString(fullAddress) && fullAddress !== 'Delivery Address') {
      lines.push(fullAddress.trim());
    } else if (notes && typeof notes === 'string' && notes.trim() && !isCoordinateString(notes)) {
      lines.push(notes.trim());
    }
  }

  if (lines.length > 0) {
    return lines;
  }

  return ['Address unavailable'];
};

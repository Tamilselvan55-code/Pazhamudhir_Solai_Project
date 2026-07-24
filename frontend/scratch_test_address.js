const isCoordinateString = (str) => {
  if (!str || typeof str !== 'string') return false;
  const trimmed = str.trim();
  if (/^-?\d{1,3}\.\d{4,}$/.test(trimmed)) return true;
  if (/^-?\d{1,3}\.\d+[\s,]+-?\d{1,3}\.\d+$/.test(trimmed)) return true;
  if (/-?\d{1,3}\.\d{4,}[\s,]+-?\d{1,3}\.\d{4,}/.test(trimmed)) return true;
  return false;
};

const formatDisplayAddressLines = (shippingAddress, notes = '') => {
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

const shippingAddress = {
  "lat": 13.00531069853502,
  "lon": 79.99459831796155,
  "city": "",
  "state": "",
  "street": "13.00531, 79.99460",
  "pincode": "",
  "fullAddress": "13.00531, 79.99460",
  "deliveryAvailable": true,
  "distanceFromStore": 25.93
};

const userReportedStr = "13.00529,79.99458";

console.log("1. isCoordinateString on fullAddress:", isCoordinateString(shippingAddress.fullAddress));
console.log("2. formatDisplayAddressLines output:", formatDisplayAddressLines(shippingAddress));
console.log("3. formatDisplayAddressLines with userReported string:", formatDisplayAddressLines({street: userReportedStr, fullAddress: userReportedStr}));
console.log("4. isCoordinateString on userReportedStr:", isCoordinateString(userReportedStr));

/**
 * Helper utility to sanitize, standardize, and format order delivery addresses.
 * Guarantees that raw GPS coordinate strings (e.g. "13.00524, 79.99453") are
 * NEVER returned or displayed as text address fields.
 */

export const isCoordinateString = (str) => {
  if (!str || typeof str !== 'string') return false;
  const trimmed = str.trim();
  if (/^-?\d{1,3}\.\d{4,}$/.test(trimmed)) return true;
  if (/^-?\d{1,3}\.\d+[\s,]+-?\d{1,3}\.\d+$/.test(trimmed)) return true;
  if (/-?\d{1,3}\.\d{4,}[\s,]+-?\d{1,3}\.\d{4,}/.test(trimmed)) return true;
  return false;
};

export const sanitizeAndFormatAddress = (shippingAddress, userAddress = null, user = null, recipient = null) => {
  const doorNo = shippingAddress?.doorNo || shippingAddress?.houseNo || userAddress?.doorNo || userAddress?.houseNo || '';
  const houseNo = shippingAddress?.houseNo || shippingAddress?.doorNo || userAddress?.houseNo || userAddress?.doorNo || '';
  
  const rawStreet = shippingAddress?.streetName || shippingAddress?.street || userAddress?.street || '';
  const street = !isCoordinateString(rawStreet) ? rawStreet : (userAddress?.street || '');
  
  const rawArea = shippingAddress?.locality || shippingAddress?.area || userAddress?.area || '';
  const area = !isCoordinateString(rawArea) ? rawArea : (userAddress?.area || '');
  
  const rawLandmark = shippingAddress?.landmark || userAddress?.landmark || '';
  const landmark = !isCoordinateString(rawLandmark) ? rawLandmark : (userAddress?.landmark || '');
  
  const rawCity = shippingAddress?.city || userAddress?.city || '';
  const city = !isCoordinateString(rawCity) ? rawCity : (userAddress?.city || '');
  
  const rawDistrict = shippingAddress?.district || city || userAddress?.district || '';
  const district = !isCoordinateString(rawDistrict) ? rawDistrict : city;
  
  const rawState = shippingAddress?.state || userAddress?.state || '';
  const state = !isCoordinateString(rawState) ? rawState : (userAddress?.state || '');
  
  const rawPincode = shippingAddress?.pincode || userAddress?.pincode || '';
  const pincode = !isCoordinateString(rawPincode) ? String(rawPincode) : (userAddress?.pincode ? String(userAddress.pincode) : '');
  
  const country = shippingAddress?.country || userAddress?.country || 'India';
  const fullName = recipient?.name || user?.fullName || shippingAddress?.fullName || 'Customer';
  const phone = recipient?.phone || user?.phoneNumber || shippingAddress?.phone || '';

  // Build clean address text parts
  const parts = [];
  if (doorNo || houseNo) parts.push(`Door No. ${doorNo || houseNo}`);
  if (street && !isCoordinateString(street)) parts.push(street);
  if (area && !isCoordinateString(area)) parts.push(area);
  if (landmark && !isCoordinateString(landmark)) parts.push(`Landmark: ${landmark}`);
  if (city || district) {
    const cd = [city, district].filter(Boolean).filter(c => !isCoordinateString(c)).filter((v, i, a) => a.indexOf(v) === i).join(', ');
    if (cd) parts.push(cd);
  }
  if (state || pincode) {
    const sp = [state, pincode].filter(Boolean).join(' - ');
    if (sp) parts.push(sp);
  }

  // Check fullAddress fallback
  let formattedText = parts.join(', ');
  if (!formattedText || formattedText.trim() === '') {
    const full = shippingAddress?.fullAddress || userAddress?.fullAddress || '';
    if (full && !isCoordinateString(full)) {
      formattedText = full.trim();
    } else {
      formattedText = 'Address unavailable';
    }
  }

  const sanitizedSnapshot = {
    fullName,
    phone,
    doorNo,
    houseNo,
    street,
    streetName: street,
    area,
    locality: area,
    landmark,
    city,
    district,
    state,
    pincode,
    country,
    lat: shippingAddress?.lat || userAddress?.lat || null,
    lon: shippingAddress?.lon || userAddress?.lon || null,
    fullAddress: formattedText,
    formattedAddress: formattedText,
    distanceFromStore: shippingAddress?.distanceFromStore || null,
    deliveryAvailable: shippingAddress?.deliveryAvailable !== false
  };

  return sanitizedSnapshot;
};

export const formatOrderWithDeliveryAddress = (order) => {
  if (!order || typeof order !== 'object') return order;

  const user = order.user || null;
  const userAddress = user?.addresses && user.addresses.length > 0 ? user.addresses[0] : (user?.deliveryAddress || null);
  const deliveryAddress = sanitizeAndFormatAddress(order.shippingAddress, userAddress, user, order.recipient);

  return {
    ...order,
    shippingAddress: deliveryAddress,
    deliveryAddress
  };
};

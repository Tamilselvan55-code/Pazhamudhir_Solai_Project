import { sanitizeAndFormatAddress } from './utils/formatOrderAddress.js';

const shippingAddress = {
    lat: 13.00523502022833,
    lon: 79.99453292775111,
    city: "",
    state: "",
    street: "13.00524, 79.99453",
    pincode: "",
    fullAddress: "13.00524, 79.99453",
    deliveryAvailable: true,
    distanceFromStore: 25.94
};

const result = sanitizeAndFormatAddress(shippingAddress, null, null, null);
console.log(JSON.stringify(result, null, 2));

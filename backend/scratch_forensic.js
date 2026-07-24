import { PrismaClient } from '@prisma/client';
import { isCoordinateString, sanitizeAndFormatAddress, formatOrderWithDeliveryAddress } from './utils/formatOrderAddress.js';

const prisma = new PrismaClient();

const formatDisplayAddressLines = (shippingAddress, notes = '') => {
  if (!shippingAddress || typeof shippingAddress !== 'object') {
    return ['Address unavailable'];
  }

  const {
    doorNo, houseNo, streetName, street, fullAddress, formattedAddress,
    locality, area, landmark, city, district, state, pincode,
  } = shippingAddress;

  const lines = [];

  const isCoord = (str) => {
    if (!str || typeof str !== 'string') return false;
    const trimmed = str.trim();
    if (/^-?\d{1,3}\.\d{4,}$/.test(trimmed)) return true;
    if (/^-?\d{1,3}\.\d+[\s,]+-?\d{1,3}\.\d+$/.test(trimmed)) return true;
    if (/-?\d{1,3}\.\d{4,}[\s,]+-?\d{1,3}\.\d{4,}/.test(trimmed)) return true;
    return false;
  };

  if (formattedAddress && !isCoord(formattedAddress) && formattedAddress !== 'Address unavailable') {
    const splitLines = formattedAddress.split(', ').filter(Boolean).filter(l => !isCoord(l));
    if (splitLines.length > 0) return splitLines;
  }

  const doorOrHouse = doorNo || houseNo || '';
  if (doorOrHouse && !isCoord(doorOrHouse)) lines.push(`Door No. ${doorOrHouse}`);

  const streetPart = streetName || street || '';
  if (streetPart && !isCoord(streetPart) && streetPart !== 'Delivery Address') lines.push(streetPart);

  const areaPart = locality || area || '';
  if (areaPart && !isCoord(areaPart)) lines.push(areaPart);

  if (landmark && !isCoord(landmark)) lines.push(`Landmark: ${landmark}`);

  const cityDistrict = [city, district].filter(Boolean).filter(c => !isCoord(c)).filter((v, i, a) => a.indexOf(v) === i).join(', ');
  if (cityDistrict) lines.push(cityDistrict);

  const statePin = [state, pincode].filter(Boolean).filter(p => !isCoord(String(p))).join(' - ');
  if (statePin) lines.push(statePin);

  if (lines.length === 0) {
    if (fullAddress && !isCoord(fullAddress) && fullAddress !== 'Delivery Address') {
      lines.push(fullAddress.trim());
    } else if (notes && typeof notes === 'string' && notes.trim() && !isCoord(notes)) {
      lines.push(notes.trim());
    }
  }

  if (lines.length > 0) return lines;
  return ['Address unavailable'];
};

async function run() {
  const order = await prisma.order.findUnique({
    where: { invoiceNumber: 'INV-2026-469448755' },
    include: { user: { include: { addresses: true } } }
  });

  if (!order) {
    console.log("Order not found");
    return;
  }
  
  console.log("ORDER NOTES:");
  console.log(order.notes);

  console.log("2.\nDatabase\n");
  console.log(JSON.stringify(order.shippingAddress, null, 2));
  console.log("\n--------------------------------------------------");

  const apiOrder = formatOrderWithDeliveryAddress(order);
  
  console.log("3.\nGET /api/orders/user/myorders\n");
  console.log(JSON.stringify(apiOrder.shippingAddress, null, 2));
  console.log("\n--------------------------------------------------");

  console.log("4.\nInvoiceModal\nPrint\nconsole.log(order.shippingAddress)\nbefore\nformatDisplayAddressLines()\n");
  console.log(JSON.stringify(apiOrder.shippingAddress, null, 2));
  console.log("\n--------------------------------------------------");

  console.log("5.\nPrint\nformatDisplayAddressLines(order.shippingAddress)\nReturn value.\n");
  console.log(JSON.stringify(formatDisplayAddressLines(apiOrder.shippingAddress, apiOrder.notes), null, 2));
  console.log("\n==================================================");
  console.log("6.\nShow exactly which layer first contains\n13.00529\n79.99458\n");

  await prisma.$disconnect();
}

run();

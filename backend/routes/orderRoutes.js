import express from 'express';
import prisma from '../utils/prismaClient.js';
import { formatMongoCompat } from '../utils/formatMongoCompat.js';
import { isWithinDeliveryRadius, logDeliveryDecision } from '../utils/distance.js';
import { createAndEmitNotification } from '../utils/notificationHelper.js';
import { protect } from '../middleware/auth.js';
import { checkMaintenanceAndFeature } from '../middleware/maintenanceAndFeature.js';
import { sanitizeAndFormatAddress, formatOrderWithDeliveryAddress } from '../utils/formatOrderAddress.js';

const router = express.Router();

const isValidUuid = (id) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);

// ─── POST /api/orders — Create a new order ────────────────────────────────────
router.post('/', protect, checkMaintenanceAndFeature('disableOrderPlacement'), checkMaintenanceAndFeature('disableCheckout'), async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User authentication failed. Please log in again.',
      });
    }

    const userId = req.user._id.toString();

    console.log('[ORDER] ── Incoming Order Request ──');
    console.log('[ORDER] req.user._id:', userId);
    console.log('[ORDER] req.body:', JSON.stringify(req.body, null, 2));

    const {
      orderItems,
      shippingAddress,
      totalPrice,
      paymentMethod = 'COD',
      notes = '',
      recipient,
      couponCode = '',
      couponDiscount = 0,
    } = req.body;

    const missingFields = [];

    if (!orderItems || !Array.isArray(orderItems) || orderItems.length === 0) {
      missingFields.push('orderItems (cart is empty or missing)');
    }
    if (totalPrice === undefined || totalPrice === null || isNaN(Number(totalPrice)) || Number(totalPrice) < 0) {
      missingFields.push('totalPrice');
    }
    if (!shippingAddress || typeof shippingAddress !== 'object') {
      missingFields.push('shippingAddress');
    }
    if (!paymentMethod) {
      missingFields.push('paymentMethod');
    }

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Validation failed. Missing or invalid fields: ${missingFields.join(', ')}`,
        missingFields,
      });
    }

    const addressErrors = [];
    if (!shippingAddress.lat && shippingAddress.lat !== 0) addressErrors.push('lat (latitude)');
    if (!shippingAddress.lon && shippingAddress.lon !== 0) addressErrors.push('lon (longitude)');

    if (addressErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid shipping address. Missing required fields: ${addressErrors.join(', ')}`,
        missingFields: addressErrors,
      });
    }

    // ── Address completeness check: block GPS-only addresses ─────────────────
    const isCoordString = (str) => {
      if (!str || typeof str !== 'string') return false;
      const s = str.trim();
      return /^-?\d{1,3}\.\d{4,}$/.test(s) ||
             /^-?\d{1,3}\.\d+[\s,]+-?\d{1,3}\.\d+$/.test(s) ||
             /-?\d{1,3}\.\d{4,}[\s,]+-?\d{1,3}\.\d{4,}/.test(s);
    };

    const street = (shippingAddress.street || '').trim();
    const fullAddr = (shippingAddress.fullAddress || '').trim();
    const streetIsCoords = isCoordString(street);
    const fullAddrIsCoords = isCoordString(fullAddr);
    const hasValidStreet = street && !streetIsCoords;
    const hasValidFull = fullAddr && !fullAddrIsCoords && fullAddr !== 'Address unavailable';

    if (!hasValidStreet && !hasValidFull) {
      return res.status(400).json({
        success: false,
        message: 'Please complete your delivery address. Door number, street name, and area are required. GPS coordinates alone cannot be used as a delivery address.',
        missingFields: ['street', 'fullAddress'],
      });
    }

    const addressWarnings = [];
    if (!shippingAddress.city) addressWarnings.push('city');
    if (!shippingAddress.state) addressWarnings.push('state');
    if (!shippingAddress.pincode) addressWarnings.push('pincode');
    if (addressWarnings.length > 0) {
      console.warn('[ORDER] Address missing optional fields:', addressWarnings.join(', '));
    }


    const settingsRaw = await prisma.storeSettings.findFirst();
    const settings = formatMongoCompat(settingsRaw) || {};
    const storeLat = Number(settings.location?.lat ?? settings.lat ?? 13.0606941);
    const storeLon = Number(settings.location?.lon ?? settings.lon ?? 80.2270751);
    const radiusKm = Number(settings.deliveryRadiusKm || process.env.DELIVERY_RADIUS_KM || 30);

    const storeStatus = settings.storeStatus || 'OPEN';
    const openingTime = settings.openingTime || '08:00';
    const closingTime = settings.closingTime || '21:00';
    let isStoreOpen = true;

    if (storeStatus === 'CLOSED') {
      isStoreOpen = false;
    } else {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      let [currentHour, currentMinute] = formatter.format(now).split(':');
      if (currentHour === '24') currentHour = '00';
      const currentTime = `${currentHour.padStart(2, '0')}:${currentMinute.padStart(2, '0')}`;
      
      if (openingTime <= closingTime) {
        isStoreOpen = currentTime >= openingTime && currentTime <= closingTime;
      } else {
        isStoreOpen = currentTime >= openingTime || currentTime <= closingTime;
      }
    }

    if (!isStoreOpen) {
      const formatTime = (timeStr) => {
        if (!timeStr) return '';
        const [h, m] = timeStr.split(':');
        const d = new Date(); d.setHours(h, m);
        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      };
      return res.status(403).json({
        success: false,
        message: `Store is currently closed. Ordering hours are from ${formatTime(openingTime)} to ${formatTime(closingTime)}.`
      });
    }

    if (settings.disableCheckout || settings.disableOrderPlacement) {
      return res.status(403).json({
        success: false,
        message: 'Order placement or checkout is temporarily disabled.',
      });
    }

    const locationCheck = isWithinDeliveryRadius(
      shippingAddress.lat,
      shippingAddress.lon,
      storeLat,
      storeLon,
      radiusKm
    );

    logDeliveryDecision(storeLat, storeLon, shippingAddress.lat, shippingAddress.lon, locationCheck.rawDistance ?? locationCheck.distance, radiusKm, locationCheck.isEligible);

    if (!locationCheck.isEligible) {
      return res.status(400).json({
        success: false,
        message: `Delivery not available. You are ${locationCheck.distance} km away. Limit is ${radiusKm} km.`,
      });
    }


    const processedItems = [];
    const validCartItems = [];
    const invalidProducts = [];

    for (const item of orderItems) {
      const prodId = item?.product;

      if (!prodId || (typeof prodId !== 'string' && typeof prodId !== 'object')) {
        invalidProducts.push({ id: prodId ?? 'null', reason: 'Invalid or missing product ID' });
        continue;
      }

      const prodIdStr = typeof prodId === 'object' ? (prodId._id || prodId.id || '').toString() : prodId.toString();
      if (!isValidUuid(prodIdStr)) {
        invalidProducts.push({ id: prodIdStr, reason: 'Invalid UUID format' });
        continue;
      }

      const productDocRaw = await prisma.product.findUnique({ where: { id: prodIdStr } });

      if (!productDocRaw) {
        invalidProducts.push({ id: prodIdStr, reason: 'Product not found' });
        continue;
      }
      const productDoc = formatMongoCompat(productDocRaw);

      if (productDoc.isActive === false) {
        invalidProducts.push({ id: prodIdStr, name: productDoc.name, reason: 'Product is no longer available' });
        continue;
      }
      if (!productDoc.inStock || productDoc.stock <= 0) {
        invalidProducts.push({ id: prodIdStr, name: productDoc.name, reason: 'Product is out of stock' });
        if (productDoc.stock > 0) {
          validCartItems.push({
            product: productDoc._id,
            name: productDoc.name,
            nameTamil: productDoc.nameTamil || productDoc.tamilName || '',
            tamilName: productDoc.tamilName || productDoc.nameTamil || '',
            price: Number(productDoc.price),
            quantity: Math.min(Number(item.quantity) > 0 ? Number(item.quantity) : 1, productDoc.stock),
            image: productDoc.image,
          });
        }
        continue;
      }

      const qty = Number(item.quantity);
      const prc = Number(productDoc.price);
      if (isNaN(qty) || qty <= 0 || isNaN(prc) || prc < 0) {
        invalidProducts.push({ id: prodIdStr, name: productDoc.name, reason: 'Invalid quantity or price' });
        continue;
      }
      if (qty > productDoc.stock) {
        invalidProducts.push({ id: prodIdStr, name: productDoc.name, reason: `Requested qty (${qty}) exceeds stock (${productDoc.stock})` });
        if (productDoc.stock > 0) {
          validCartItems.push({
            product: productDoc._id,
            name: productDoc.name,
            nameTamil: productDoc.nameTamil || productDoc.tamilName || '',
            tamilName: productDoc.tamilName || productDoc.nameTamil || '',
            price: prc,
            quantity: Math.min(qty, productDoc.stock),
            image: productDoc.image,
          });
        }
        continue;
      }

      processedItems.push({
        product: productDoc._id,
        name: productDoc.name,
        nameTamil: productDoc.nameTamil || productDoc.tamilName || '',
        tamilName: productDoc.tamilName || productDoc.nameTamil || '',
        price: prc,
        quantity: qty,
        image: productDoc.image,
      });

      validCartItems.push({
        product: productDoc._id,
        name: productDoc.name,
        nameTamil: productDoc.nameTamil || productDoc.tamilName || '',
        tamilName: productDoc.tamilName || productDoc.nameTamil || '',
        price: prc,
        quantity: qty,
        image: productDoc.image,
      });
    }

    if (invalidProducts.length > 0 || processedItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: processedItems.length === 0
          ? 'None of the products in your cart are available. Please refresh your cart.'
          : 'One or more products in your cart are no longer available. Please refresh your cart.',
        invalidProducts,
        updatedCart: validCartItems,
      });
    }

    const itemsSubtotal = processedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    if (itemsSubtotal < (settings.minOrderValue ?? 0)) {
      return res.status(400).json({
        success: false,
        message: `Minimum order value required is ₹${settings.minOrderValue ?? 0}. Your items total is ₹${itemsSubtotal}.`,
      });
    }
    if (itemsSubtotal > (settings.maxOrderValue ?? 100000)) {
      return res.status(400).json({
        success: false,
        message: `Maximum order value allowed is ₹${settings.maxOrderValue ?? 100000}. Your items total is ₹${itemsSubtotal}.`,
      });
    }

    const gstPercentage = settings.gstPercentage || 0;
    const gstAmount = Math.round((itemsSubtotal * (gstPercentage / 100)) * 100) / 100;

    let deliveryFee = settings.deliveryCharges || 0;
    if (itemsSubtotal >= (settings.freeDeliveryThreshold || 500)) {
      deliveryFee = 0;
    }

    const discount = Number(couponDiscount) || 0;
    const computedTotalPrice = Math.max(0, Math.round((itemsSubtotal + gstAmount + deliveryFee - discount) * 100) / 100);

    const year = new Date().getFullYear();
    const ts = Date.now().toString().slice(-6);
    const randomDigits = Math.floor(100 + Math.random() * 900);
    const invoiceNo = `${settings.invoicePrefix || 'INV-'}${year}-${ts}${randomDigits}`;

    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { addresses: true }
    });
    const defaultUserAddress = dbUser?.addresses?.find(a => a.isDefault) || dbUser?.addresses?.[0] || null;
    const addressSnapshot = sanitizeAndFormatAddress(shippingAddress, defaultUserAddress, dbUser, recipient);

    let createdOrderRaw;
    try {
      createdOrderRaw = await prisma.order.create({
        data: {
          userId,
          invoiceNumber: invoiceNo,
          shippingAddress: addressSnapshot,
          recipient: recipient || { isForAnotherPerson: false, name: dbUser?.fullName || '', phone: dbUser?.phoneNumber || '' },
          totalPrice: computedTotalPrice,
          deliveryFee,
          gstAmount,
          paymentMethod: paymentMethod || 'COD',
          paymentStatus: 'Pending',
          status: 'Waiting for Admin Approval',
          notes,
          couponCode,
          couponDiscount: discount,
          statusHistory: [{ status: 'Waiting for Admin Approval', note: 'Order placed by customer', timestamp: new Date().toISOString() }],
          orderItems: {
            create: processedItems.map(item => ({
              productId: item.product.toString(),
              name: item.name,
              quantity: item.quantity,
              price: item.price,
              image: item.image
            }))
          }
        },
        include: { orderItems: { include: { product: true } }, user: true }
      });
    } catch (saveError) {
      console.error('[ORDER] Save failed:', saveError);
      return res.status(400).json({
        success: false,
        message: `Order save failed: ${saveError.message}`
      });
    }

    const createdOrder = formatMongoCompat(createdOrderRaw);

    const io = req.app.get('io');
    const stockErrors = [];

    for (const item of createdOrder.orderItems) {
      try {
        const prodRaw = await prisma.product.findUnique({ where: { id: item.productId } });
        if (!prodRaw) {
          stockErrors.push({ productId: item.productId, reason: 'Product not found during stock update' });
          continue;
        }

        const originalStock = prodRaw.stock || 0;
        const newStock = Math.max(0, originalStock - item.quantity);
        const updatedProdRaw = await prisma.product.update({
          where: { id: prodRaw.id },
          data: {
            stock: newStock,
            inStock: newStock > 0
          }
        });
        const prod = formatMongoCompat(updatedProdRaw);

        if (io) {
          io.emit('product_update', {
            _id: prod._id,
            id: prod.id,
            price: prod.price,
            stock: prod.stock,
            inStock: prod.inStock,
            image: prod.image,
            isActive: prod.isActive,
          });
        }

        if (originalStock > 0 && newStock === 0) {
          await createAndEmitNotification(io, {
            title: 'Product Out of Stock',
            message: `${prod.name} is out of stock.`,
            type: 'stock',
            role: 'admin',
            link: '/admin/products',
          });
        } else if (originalStock > 5 && newStock <= 5) {
          await createAndEmitNotification(io, {
            title: 'Low Stock Alert',
            message: `${prod.name} stock is low (${newStock} items left).`,
            type: 'stock',
            role: 'admin',
            link: '/admin/products',
          });
        }
      } catch (stockErr) {
        console.warn(`[ORDER] Stock update failed for product ${item.productId}:`, stockErr.message);
        stockErrors.push({ productId: item.productId, reason: stockErr.message });
      }
    }

    if (stockErrors.length > 0) {
      console.warn('[ORDER] Some stock updates failed:', stockErrors);
    }

    try {
      const orderUser = createdOrder.user || {};
      const userName = orderUser.fullName || 'Customer';
      const userPhone = orderUser.phoneNumber || '';
      const totalItemsCount = createdOrder.orderItems.reduce((sum, item) => sum + (item.quantity || 1), 0);

      await createAndEmitNotification(io, {
        title: 'New Order Received',
        message: `New order ${createdOrder.invoiceNumber || ('#ORD-' + createdOrder.id.slice(-5).toUpperCase())} placed by ${userName}.`,
        type: 'order',
        role: 'admin',
        link: '/admin/orders',
        customerName: userName,
        phone: userPhone,
        orderId: createdOrder.id,
        invoiceNumber: createdOrder.invoiceNumber || '',
        orderTotal: createdOrder.totalPrice || 0,
        totalItems: totalItemsCount,
        paymentMethod: createdOrder.paymentMethod || 'COD',
        orderStatus: 'Pending',
      });

      await createAndEmitNotification(io, {
        userId: createdOrder.userId,
        title: 'Order Placed',
        message: `Your order ${createdOrder.invoiceNumber || ('#ORD-' + createdOrder.id.slice(-5).toUpperCase())} has been placed.`,
        type: 'order',
        role: 'customer',
        link: '/profile',
      });

      await createAndEmitNotification(io, {
        userId: createdOrder.userId,
        title: 'Order Confirmed',
        message: `Your order ${createdOrder.invoiceNumber || ('#ORD-' + createdOrder.id.slice(-5).toUpperCase())} has been confirmed.`,
        type: 'order',
        role: 'customer',
        link: '/profile',
      });

      if (createdOrder.paymentStatus === 'Paid' || createdOrder.paymentMethod === 'Card' || createdOrder.paymentMethod === 'UPI' || createdOrder.paymentMethod === 'Razorpay') {
        await createAndEmitNotification(io, {
          userId: createdOrder.userId,
          title: 'Payment Received',
          message: `Payment of Rs. ${createdOrder.totalPrice} for order ${createdOrder.invoiceNumber || ('#ORD-' + createdOrder.id.slice(-5).toUpperCase())} has been received.`,
          type: 'payment',
          role: 'customer',
          link: '/profile',
        });
      }
    } catch (notifErr) {
      console.warn('[ORDER] Notification failed (order still created):', notifErr.message);
    }

    res.status(201).json({
      ...createdOrder,
      success: true,
      message: 'Order placed successfully!',
      orderId: createdOrder.id,
      invoiceNo: createdOrder.invoiceNumber,
      ...(stockErrors.length > 0 && { stockWarnings: stockErrors }),
    });

  } catch (error) {
    console.error('[ORDER] Unhandled error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'An unexpected error occurred while creating the order.',
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
    });
  }
});

// ─── GET /api/orders/myorders/:userId — Customer's order history (by userId) ──
router.get('/myorders/:userId', async (req, res) => {
  try {
    if (!isValidUuid(req.params.userId)) return res.json([]);
    const ordersRaw = await prisma.order.findMany({
      where: { userId: req.params.userId },
      orderBy: { createdAt: 'desc' },
      include: {
        orderItems: { include: { product: true } },
        deliveryPartner: { select: { name: true, mobile: true, vehicleNumber: true, employeeId: true } }
      }
    });
    const formatted = ordersRaw.map(o => formatOrderWithDeliveryAddress(o));
    res.json(formatMongoCompat(formatted));
  } catch (error) {
    console.error('[ORDER] Fetch orders error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch orders' });
  }
});

// ─── GET /api/orders/user/myorders — Protected order history ─────────────────
router.get('/user/myorders', protect, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const ordersRaw = await prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { orderItems: { include: { product: true } }, user: { include: { addresses: true } } }
    });
    const formatted = ordersRaw.map(o => formatOrderWithDeliveryAddress(o));
    res.json(formatMongoCompat(formatted));
  } catch (error) {
    console.error('[ORDER] Fetch user orders error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch user orders' });
  }
});

// ─── GET /api/orders/detail/:id — Single order detail ────────────────────────
router.get('/detail/:id', async (req, res) => {
  try {
    if (!isValidUuid(req.params.id)) return res.status(404).json({ message: 'Order not found' });
    const orderRaw = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { orderItems: { include: { product: true } }, user: { include: { addresses: true } } }
    });
    if (!orderRaw) return res.status(404).json({ message: 'Order not found' });
    const formatted = formatOrderWithDeliveryAddress(orderRaw);
    res.json(formatMongoCompat(formatted));
  } catch (error) {
    console.error('[ORDER] Fetch order detail error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch order detail' });
  }
});

// ─── PATCH /api/orders/:id/cancel — Cancel pending order ─────────────────────
router.patch('/:id/cancel', async (req, res) => {
  try {
    if (!isValidUuid(req.params.id)) return res.status(404).json({ success: false, message: 'Order not found' });
    const orderRaw = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { orderItems: true }
    });
    if (!orderRaw) return res.status(404).json({ success: false, message: 'Order not found' });
    let order = formatMongoCompat(orderRaw);

    const allowedTransitions = {
      Pending: ["Accepted", "Cancelled"],
      "Waiting for Admin Approval": ["Order Confirmed", "Cancelled by Customer", "Rejected by Store"],
      Accepted: ["Out for Delivery"],
      "Order Confirmed": ["Out for Delivery"],
      "Out for Delivery": ["Delivered"],
      Delivered: [],
      Cancelled: [],
      "Cancelled by Customer": [],
      "Rejected by Store": []
    };

    const currentStatus = order.status || 'Pending';
    const nextStatuses = allowedTransitions[currentStatus] || [];

    if (!nextStatuses.includes('Cancelled') && !nextStatuses.includes('Cancelled by Customer')) {
      return res.status(400).json({
        success: false,
        message: 'Order can no longer be cancelled.'
      });
    }

    const newStatus = currentStatus === 'Pending' ? 'Cancelled' : 'Cancelled by Customer';

    const updatedHistory = Array.isArray(order.statusHistory) ? [...order.statusHistory] : [];
    updatedHistory.push({
      status: newStatus,
      note: "Your order has been cancelled.",
      timestamp: new Date().toISOString()
    });

    const updatedOrderRaw = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: newStatus,
        statusHistory: updatedHistory
      },
      include: { orderItems: { include: { product: true } } }
    });
    order = formatMongoCompat(updatedOrderRaw);

    const io = req.app.get('io');
    for (const item of order.orderItems) {
      if (item.productId) {
        const prodRaw = await prisma.product.findUnique({ where: { id: item.productId } });
        if (prodRaw) {
          const updatedStock = (prodRaw.stock || 0) + item.quantity;
          const updatedProdRaw = await prisma.product.update({
            where: { id: prodRaw.id },
            data: {
              stock: updatedStock,
              inStock: updatedStock > 0
            }
          });
          const prod = formatMongoCompat(updatedProdRaw);
          if (io) io.emit('product_update', prod);
        }
      }
    }

    if (io) {
      io.emit('order_status_updated', { orderId: order._id, status: newStatus, invoiceNumber: order.invoiceNumber });
      io.emit('order_update', { orderId: order._id, status: newStatus });
    }

    if (order.userId) {
      await createAndEmitNotification(io, {
        userId: order.userId,
        title: 'Order Cancelled',
        message: `Your order ${order.invoiceNumber || ('#ORD-' + order.id.slice(-5).toUpperCase())} has been cancelled.`,
        type: 'order',
        role: 'customer',
        link: '/profile'
      });
    }

    await createAndEmitNotification(io, {
      title: 'Order Cancelled',
      message: `Order ${order.invoiceNumber || ('#ORD-' + order.id.slice(-5).toUpperCase())} has been cancelled.`,
      type: 'order',
      role: 'admin',
      link: '/admin/orders'
    });

    res.json({ success: true, message: 'Order cancelled successfully.', order });
  } catch (error) {
    console.error('[ORDER] Cancel order error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to cancel order' });
  }
});

// ─── Phase 15: POST /api/orders/:id/rate — Customer Rating & Review ─────────
router.post('/:id/rate', protect, async (req, res) => {
  try {
    const { rating, review } = req.body;
    const userId = req.user._id.toString();
    const orderId = req.params.id;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Please provide a rating between 1 and 5' });
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });

    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.userId !== userId) return res.status(403).json({ message: 'Unauthorized' });
    if (!order.isDelivered) return res.status(400).json({ message: 'Order must be delivered before rating' });
    if (order.customerRating) return res.status(400).json({ message: 'You have already rated this delivery' });

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        customerRating: parseInt(rating),
        customerReview: review?.trim() || null
      }
    });

    const io = req.app?.get('io');
    if (io) {
      io.emit('rating_submitted', {
        orderId,
        partnerId: order.deliveryPartnerId,
        rating: parseInt(rating),
        invoiceNumber: order.invoiceNumber
      });
    }

    res.json({ success: true, message: 'Rating submitted. Thank you!', order: formatMongoCompat(updatedOrder) });
  } catch (error) {
    console.error('[RATING] Error:', error);
    res.status(500).json({ message: 'Failed to submit rating' });
  }
});

export default router;


import express from 'express';
import prisma from '../utils/prismaClient.js';
import { formatMongoCompat } from '../utils/formatMongoCompat.js';
import { isWithinDeliveryRadius, logDeliveryDecision } from '../utils/distance.js';
import { createAndEmitNotification } from '../utils/notificationHelper.js';
import { protect } from '../middleware/auth.js';
import { checkMaintenanceAndFeature } from '../middleware/maintenanceAndFeature.js';

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

    const addressWarnings = [];
    if (!shippingAddress.street && !shippingAddress.fullAddress) addressWarnings.push('street/fullAddress');
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

    let createdOrderRaw;
    try {
      createdOrderRaw = await prisma.order.create({
        data: {
          userId,
          invoiceNumber: invoiceNo,
          shippingAddress: {
            street:            shippingAddress.street || shippingAddress.fullAddress || '',
            fullAddress:       shippingAddress.fullAddress || '',
            city:              shippingAddress.city || '',
            state:             shippingAddress.state || '',
            pincode:           shippingAddress.pincode || '',
            lat:               shippingAddress.lat,
            lon:               shippingAddress.lon,
            distanceFromStore: shippingAddress.distanceFromStore,
            deliveryAvailable: shippingAddress.deliveryAvailable,
          },
          recipient: recipient || { isForAnotherPerson: false, name: '', phone: '' },
          totalPrice: computedTotalPrice,
          deliveryFee,
          gstAmount,
          paymentMethod: paymentMethod || 'COD',
          paymentStatus: 'Pending',
          notes,
          couponCode,
          couponDiscount: discount,
          statusHistory: [{ status: 'Pending', note: 'Order placed by customer', timestamp: new Date().toISOString() }],
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
      include: { orderItems: { include: { product: true } } }
    });
    res.json(formatMongoCompat(ordersRaw));
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
      include: { orderItems: { include: { product: true } } }
    });
    res.json(formatMongoCompat(ordersRaw));
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
      include: { orderItems: { include: { product: true } }, user: true }
    });
    if (!orderRaw) return res.status(404).json({ message: 'Order not found' });
    res.json(formatMongoCompat(orderRaw));
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

    const settingsRaw = await prisma.storeSettings.findFirst();
    const settings = formatMongoCompat(settingsRaw);
    const timeLimitMinutes = settings?.cancellationTimeLimit ?? 30;
    const createdAtTime = new Date(order.createdAt).getTime();
    const currentTime = Date.now();
    const minutesElapsed = (currentTime - createdAtTime) / (1000 * 60);

    if (minutesElapsed > timeLimitMinutes) {
      return res.status(400).json({
        success: false,
        message: `Order cancellation time limit of ${timeLimitMinutes} minutes has passed. Current elapsed: ${Math.round(minutesElapsed)} minutes.`,
      });
    }

    const allowedTransitions = {
      Pending: ["Accepted", "Cancelled"],
      Accepted: ["Out for Delivery"],
      "Out for Delivery": ["Delivered"],
      Delivered: [],
      Cancelled: []
    };

    const currentStatus = order.status || 'Pending';
    const nextStatuses = allowedTransitions[currentStatus] || [];

    if (!nextStatuses.includes('Cancelled')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status transition'
      });
    }

    const updatedHistory = Array.isArray(order.statusHistory) ? [...order.statusHistory] : [];
    updatedHistory.push({
      status: 'Cancelled',
      note: "Your order has been cancelled.",
      timestamp: new Date().toISOString()
    });

    const updatedOrderRaw = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'Cancelled',
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
      io.emit('order_status_updated', { orderId: order._id, status: 'Cancelled', invoiceNumber: order.invoiceNumber });
      io.emit('order_update', { orderId: order._id, status: 'Cancelled' });
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

export default router;

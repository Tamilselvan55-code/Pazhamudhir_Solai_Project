import express from 'express';
import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import StoreSettings from '../models/StoreSettings.js';
import { isWithinDeliveryRadius } from '../utils/distance.js';
import { createAndEmitNotification } from '../utils/notificationHelper.js';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import { checkMaintenanceAndFeature } from '../middleware/maintenanceAndFeature.js';

const router = express.Router();

// ─── POST /api/orders — Create a new order ────────────────────────────────────
// STEP 4: protect middleware ensures req.user._id exists (401 if not)
router.post('/', protect, checkMaintenanceAndFeature('disableOrderPlacement'), checkMaintenanceAndFeature('disableCheckout'), async (req, res) => {
  // STEP 1: Wrap entire handler — always return real errors, never crash
  try {
    // ── STEP 4: Verify authenticated user ────────────────────────────────────
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User authentication failed. Please log in again.',
      });
    }

    const userId = req.user._id;

    // ── STEP 2: Log incoming request for debugging ─────────────────────────
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

    // ── STEP 2: Validate every required field ────────────────────────────────
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

    // ── STEP 5: Validate address fields ──────────────────────────────────────
    // lat and lon are hard required (needed for delivery radius check)
    // city/state/pincode are optional — GPS reverse geocode may return empty
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

    // Log address warnings (non-blocking — these fields are optional)
    const addressWarnings = [];
    if (!shippingAddress.street && !shippingAddress.fullAddress) addressWarnings.push('street/fullAddress');
    if (!shippingAddress.city) addressWarnings.push('city');
    if (!shippingAddress.state) addressWarnings.push('state');
    if (!shippingAddress.pincode) addressWarnings.push('pincode');
    if (addressWarnings.length > 0) {
      console.warn('[ORDER] Address missing optional fields:', addressWarnings.join(', '));
    }

    // ── Geolocation check against store settings ─────────────────────────────
    const settings = await StoreSettings.findOne() || {
      location:         { lat: 13.0606941, lon: 80.2270751 },
      deliveryRadiusKm: Number(process.env.DELIVERY_RADIUS_KM) || 5,
    };

    if (settings.disableCheckout || settings.disableOrderPlacement) {
      return res.status(403).json({
        success: false,
        message: 'Order placement or checkout is temporarily disabled.',
      });
    }

    const locationCheck = isWithinDeliveryRadius(
      shippingAddress.lat,
      shippingAddress.lon,
      settings.location.lat,
      settings.location.lon,
      settings.deliveryRadiusKm
    );

    if (!locationCheck.isEligible) {
      return res.status(400).json({
        success: false,
        message: `Delivery not available. You are ${locationCheck.distance} km away. Limit is ${settings.deliveryRadiusKm} km.`,
      });
    }

    // ── STEP 3: Validate product IDs — verify every product exists ───────────
    const processedItems = [];
    const validCartItems = [];
    const invalidProducts = [];

    for (const item of orderItems) {
      const prodId = item?.product;

      if (!prodId || (typeof prodId !== 'string' && typeof prodId !== 'object')) {
        invalidProducts.push({ id: prodId ?? 'null', reason: 'Invalid or missing product ID' });
        continue;
      }

      const prodIdStr = prodId.toString();
      if (!mongoose.Types.ObjectId.isValid(prodIdStr)) {
        invalidProducts.push({ id: prodIdStr, reason: 'Invalid ObjectId format' });
        continue;
      }

      const productDoc = await Product.findById(prodIdStr);

      // STEP 3: If product is deleted or invalid, return 400 with specific ID
      if (!productDoc) {
        invalidProducts.push({ id: prodIdStr, reason: 'Product not found' });
        continue;
      }
      if (productDoc.isActive === false || productDoc.isDeleted === true) {
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

    // Calculate subtotal
    const itemsSubtotal = processedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Validate min/max order value (items total)
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

    // Calculate GST
    const gstPercentage = settings.gstPercentage || 0;
    const gstAmount = Math.round((itemsSubtotal * (gstPercentage / 100)) * 100) / 100;

    // Calculate delivery fee
    let deliveryFee = settings.deliveryCharges || 0;
    if (itemsSubtotal >= (settings.freeDeliveryThreshold || 500)) {
      deliveryFee = 0;
    }

    // Calculate final total price
    const discount = Number(couponDiscount) || 0;
    const computedTotalPrice = Math.max(0, Math.round((itemsSubtotal + gstAmount + deliveryFee - discount) * 100) / 100);

    // ── Create order (STEP 6: ObjectId refs verified above) ──────────────────
    const order = new Order({
      orderItems: processedItems,
      user: userId, // STEP 4: from authenticated req.user, not req.body
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
      paymentMethod: 'COD',
      paymentStatus: 'Pending',
      notes,
      couponCode,
      couponDiscount: discount,
      statusHistory: [{ status: 'Pending', note: 'Order placed by customer' }],
    });

    // STEP 8: Invoice number is generated in pre-save hook (collision-safe)
    let createdOrder;
    try {
      createdOrder = await order.save();
    } catch (saveError) {
      // STEP 10: If save fails (e.g. duplicate invoice), retry once with timestamp suffix
      if (saveError.code === 11000 && saveError.keyPattern?.invoiceNumber) {
        const year = new Date().getFullYear();
        const ts = Date.now().toString().slice(-6);
        order.invoiceNumber = `INV-${year}-${ts}`;
        createdOrder = await order.save();
      } else {
        // Return the actual Mongoose validation or DB error
        console.error('[ORDER] Save failed:', saveError);
        return res.status(400).json({
          success: false,
          message: `Order save failed: ${saveError.message}`,
          errors: saveError.errors
            ? Object.entries(saveError.errors).map(([field, err]) => ({ field, message: err.message }))
            : undefined,
        });
      }
    }

    // ── STEP 7: Deduct stock safely — skip products that fail ────────────────
    const io = req.app.get('io');
    const stockErrors = [];

    for (const item of createdOrder.orderItems) {
      try {
        const prod = await Product.findById(item.product);
        if (!prod) {
          stockErrors.push({ productId: item.product, reason: 'Product not found during stock update' });
          continue; // STEP 7: skip, don't crash
        }

        const originalStock = prod.stock || 0;
        const newStock = Math.max(0, originalStock - item.quantity);
        prod.stock = newStock;
        if (newStock === 0) {
          prod.inStock = false;
        }
        await prod.save();

        if (io) {
          io.emit('product_update', {
            _id: prod._id,
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
        // STEP 7: Log but don't crash the order
        console.warn(`[ORDER] Stock update failed for product ${item.product}:`, stockErr.message);
        stockErrors.push({ productId: item.product, reason: stockErr.message });
      }
    }

    if (stockErrors.length > 0) {
      console.warn('[ORDER] Some stock updates failed:', stockErrors);
    }

    // ── Notifications (wrapped safely — never crash the order) ───────────────
    try {
      const orderUser = await User.findById(createdOrder.user);
      const userName = orderUser ? (orderUser.fullName || orderUser.name) : 'Customer';
      const userPhone = orderUser ? (orderUser.phoneNumber || '') : '';
      const totalItemsCount = createdOrder.orderItems.reduce((sum, item) => sum + (item.quantity || 1), 0);

      await createAndEmitNotification(io, {
        title: 'New Order Received',
        message: `New order ${createdOrder.invoiceNumber || ('#ORD-' + createdOrder._id.toString().slice(-5).toUpperCase())} placed by ${userName}.`,
        type: 'order',
        role: 'admin',
        link: '/admin/orders',
        customerName: userName,
        phone: userPhone,
        orderId: createdOrder._id,
        invoiceNumber: createdOrder.invoiceNumber || '',
        orderTotal: createdOrder.totalPrice || 0,
        totalItems: totalItemsCount,
        paymentMethod: createdOrder.paymentMethod || 'COD',
        orderStatus: 'Pending',
      });

      await createAndEmitNotification(io, {
        userId: createdOrder.user,
        title: 'Order Placed',
        message: `Your order ${createdOrder.invoiceNumber || ('#ORD-' + createdOrder._id.toString().slice(-5).toUpperCase())} has been placed.`,
        type: 'order',
        role: 'customer',
        link: '/profile',
      });

      await createAndEmitNotification(io, {
        userId: createdOrder.user,
        title: 'Order Confirmed',
        message: `Your order ${createdOrder.invoiceNumber || ('#ORD-' + createdOrder._id.toString().slice(-5).toUpperCase())} has been confirmed.`,
        type: 'order',
        role: 'customer',
        link: '/profile',
      });

      if (createdOrder.paymentStatus === 'Paid' || createdOrder.paymentMethod === 'Card' || createdOrder.paymentMethod === 'UPI' || createdOrder.paymentMethod === 'Razorpay') {
        await createAndEmitNotification(io, {
          userId: createdOrder.user,
          title: 'Payment Received',
          message: `Payment of Rs. ${createdOrder.totalPrice} for order ${createdOrder.invoiceNumber || ('#ORD-' + createdOrder._id.toString().slice(-5).toUpperCase())} has been received.`,
          type: 'payment',
          role: 'customer',
          link: '/profile',
        });
      }
    } catch (notifErr) {
      // Notifications should never block order creation
      console.warn('[ORDER] Notification failed (order still created):', notifErr.message);
    }

    // ── STEP 9: Return 201 Created with orderId, invoiceNo, success ──────────
    // Spread full order object at top level for frontend backward compatibility
    // (frontend reads data.invoiceNumber, data.totalPrice, data.orderItems directly)
    const orderObj = createdOrder.toObject ? createdOrder.toObject() : createdOrder;
    res.status(201).json({
      ...orderObj,
      success: true,
      message: 'Order placed successfully!',
      orderId: createdOrder._id,
      invoiceNo: createdOrder.invoiceNumber,
      ...(stockErrors.length > 0 && { stockWarnings: stockErrors }),
    });

  } catch (error) {
    // STEP 1 & 11: Never return generic errors — always return the real error
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
    const orders = await Order.find({ user: req.params.userId })
      .sort('-createdAt')
      .populate('orderItems.product', 'name nameTamil tamilName englishName image price stock inStock');
    res.json(orders);
  } catch (error) {
    console.error('[ORDER] Fetch orders error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch orders' });
  }
});

// ─── GET /api/orders/user/myorders — Protected order history ─────────────────
router.get('/user/myorders', protect, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .sort('-createdAt')
      .populate('orderItems.product', 'name nameTamil tamilName englishName image price stock inStock');
    res.json(orders);
  } catch (error) {
    console.error('[ORDER] Fetch user orders error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch user orders' });
  }
});

// ─── GET /api/orders/detail/:id — Single order detail ────────────────────────
router.get('/detail/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('orderItems.product', 'name nameTamil tamilName englishName image price stock inStock');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (error) {
    console.error('[ORDER] Fetch order detail error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch order detail' });
  }
});

// ─── PATCH /api/orders/:id/cancel — Cancel pending order ─────────────────────
router.patch('/:id/cancel', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    // Enforce cancellation limit from settings
    const settings = await StoreSettings.findOne();
    const timeLimitMinutes = settings?.cancellationTimeLimit ?? 30; // default 30 mins
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

    order.status = 'Cancelled';
    order.statusHistory.push({
      status: 'Cancelled',
      note: "Your order has been cancelled."
    });

    // Restock items
    const io = req.app.get('io');
    for (const item of order.orderItems) {
      if (item.product) {
        const prod = await Product.findById(item.product);
        if (prod) {
          prod.stock = (prod.stock || 0) + item.quantity;
          if (prod.stock > 0) prod.inStock = true;
          await prod.save();
          if (io) io.emit('product_update', prod);
        }
      }
    }

    await order.save();

    if (io) {
      io.emit('order_status_updated', { orderId: order._id, status: 'Cancelled', invoiceNumber: order.invoiceNumber });
      io.emit('order_update', { orderId: order._id, status: 'Cancelled' });
    }

    // Trigger customer notification for cancellation
    if (order.user) {
      await createAndEmitNotification(io, {
        userId: order.user,
        title: 'Order Cancelled',
        message: `Your order ${order.invoiceNumber || ('#ORD-' + order._id.toString().slice(-5).toUpperCase())} has been cancelled.`,
        type: 'order',
        role: 'customer',
        link: '/profile'
      });
    }

    // Trigger admin notification for cancellation
    await createAndEmitNotification(io, {
      title: 'Order Cancelled',
      message: `Order ${order.invoiceNumber || ('#ORD-' + order._id.toString().slice(-5).toUpperCase())} has been cancelled.`,
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

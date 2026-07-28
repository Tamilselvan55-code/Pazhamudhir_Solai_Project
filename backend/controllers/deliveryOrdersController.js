import prisma from '../utils/prismaClient.js';
// @desc    Get orders assigned to logged in delivery partner
// @route   GET /api/delivery/orders
// @access  Private (Delivery Partner)
export const getAssignedOrders = async (req, res) => {
  try {
    const partnerId = req.partner.id;
    const history = req.query.history === 'true';

    let where;
    if (history) {
      // Full history: all delivered orders for this partner (all time)
      where = {
        deliveryPartnerId: partnerId,
        isDelivered: true
      };
    } else {
      // Default: active orders + today's completed
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      where = {
        deliveryPartnerId: partnerId,
        OR: [
          { isDelivered: false },
          { deliveredAt: { gte: startOfToday } }
        ]
      };
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        user: { select: { fullName: true, phoneNumber: true } },
        orderItems: { include: { product: { select: { name: true } } } }
      },
      orderBy: { createdAt: 'desc' },
      ...(history ? { take: 50 } : {})
    });

    res.json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update delivery status of an order
// @route   PATCH /api/delivery/orders/:id/status
// @access  Private (Delivery Partner)
export const updateOrderStatus = async (req, res) => {
  try {
    const { action } = req.body; // 'Accept Order', 'Picked Up', 'Out For Delivery', 'Delivered'
    const partnerId = req.partner.id;
    const orderId = req.params.id;

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.deliveryPartnerId !== partnerId) {
      return res.status(403).json({ message: 'Unauthorized. Order assigned to another partner.' });
    }

    const now = new Date();
    let updateData = {};
    let partnerUpdate = {};

    // Validate sequential steps and set data
    if (action === 'Accept Order') {
      if (order.deliveryAcceptedAt) return res.status(400).json({ message: 'Order already accepted' });
      updateData.deliveryAcceptedAt = now;
    } 
    else if (action === 'Picked Up') {
      if (!order.deliveryAcceptedAt) return res.status(400).json({ message: 'You must Accept Order first' });
      if (order.pickedUpAt) return res.status(400).json({ message: 'Order already picked up' });
      updateData.pickedUpAt = now;
    } 
    else if (action === 'Out For Delivery') {
      if (!order.pickedUpAt) return res.status(400).json({ message: 'You must mark Picked Up first' });
      if (order.outForDeliveryAt) return res.status(400).json({ message: 'Order already Out For Delivery' });
      
      updateData.outForDeliveryAt = now;
      updateData.status = 'Out for Delivery';
      
      const newHistoryEntry = { status: 'Out for Delivery', note: 'Order is out for delivery', date: now.toISOString() };
      updateData.statusHistory = order.statusHistory && Array.isArray(order.statusHistory)
        ? [...order.statusHistory, newHistoryEntry]
        : [newHistoryEntry];
    } 
    else if (action === 'Delivered') {
      if (!order.outForDeliveryAt) return res.status(400).json({ message: 'You must mark Out For Delivery first' });
      if (order.isDelivered) return res.status(400).json({ message: 'Order already delivered' });

      updateData.deliveredAt = now;
      updateData.isDelivered = true;
      updateData.status = 'Delivered';
      
      const newHistoryEntry = { status: 'Delivered', note: 'Order has been delivered', date: now.toISOString() };
      updateData.statusHistory = order.statusHistory && Array.isArray(order.statusHistory)
        ? [...order.statusHistory, newHistoryEntry]
        : [newHistoryEntry];

      // Automatically return partner to Available
      partnerUpdate = {
        where: { id: partnerId },
        data: { status: 'Available' }
      };
    } 
    else {
      return res.status(400).json({ message: 'Invalid action' });
    }

    const transactionTasks = [
      prisma.order.update({
        where: { id: orderId },
        data: updateData
      })
    ];

    if (Object.keys(partnerUpdate).length > 0) {
      transactionTasks.push(prisma.deliveryPartner.update(partnerUpdate));
    }

    await prisma.$transaction(transactionTasks);

    const updatedOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: { select: { fullName: true, phoneNumber: true } }
      }
    });

    const io = req.app?.get('io');
    if (io) {
      io.emit('admin_notification', {
        title: `Order ${action}`,
        message: `Delivery partner has marked order ${updatedOrder.invoiceNumber || orderId.slice(-6).toUpperCase()} as ${action}`,
        type: 'order',
        link: `/admin/orders?search=${updatedOrder.invoiceNumber || orderId}`
      });
      // also emit the generic update
      io.emit('order_status_updated', {
        orderId,
        status: updatedOrder.status,
        action
      });
    }

    res.json({ success: true, order: updatedOrder, message: `Successfully marked as ${action}` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Reject an assigned order (before accepting)
// @route   POST /api/delivery/orders/:id/reject
// @access  Private (Delivery Partner)
export const rejectOrder = async (req, res) => {
  try {
    const partnerId = req.partner.id;
    const orderId = req.params.id;

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (order.deliveryPartnerId !== partnerId) {
      return res.status(403).json({ message: 'Unauthorized. Order is not assigned to you.' });
    }

    // Block rejection after already accepted/picked up
    if (order.deliveryAcceptedAt) {
      return res.status(400).json({ message: 'Cannot reject an order you have already accepted. Contact admin.' });
    }

    const now = new Date();
    const newHistoryEntry = {
      status: order.status,
      note: `Delivery partner rejected this assignment`,
      date: now.toISOString()
    };
    const updatedHistory = Array.isArray(order.statusHistory)
      ? [...order.statusHistory, newHistoryEntry]
      : [newHistoryEntry];

    await prisma.$transaction([
      prisma.deliveryPartner.update({
        where: { id: partnerId },
        data: { status: 'Available' }
      }),
      prisma.order.update({
        where: { id: orderId },
        data: {
          deliveryPartnerId: null,
          deliveryAssignedAt: null,
          statusHistory: updatedHistory
        }
      })
    ]);

    // Notify admin via socket
    const io = req.app?.get('io');
    if (io) {
      io.emit('delivery_rejected', {
        orderId,
        partnerId,
        invoiceNumber: order.invoiceNumber,
        message: `Delivery partner rejected assignment for order ${order.invoiceNumber || orderId.slice(-6).toUpperCase()}`
      });
    }

    res.json({ success: true, message: 'Assignment rejected. Order is now unassigned.' });
  } catch (error) {
    console.error('[DELIVERY] Reject order error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

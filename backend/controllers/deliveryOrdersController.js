import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// @desc    Get orders assigned to logged in delivery partner
// @route   GET /api/delivery/orders
// @access  Private (Delivery Partner)
export const getAssignedOrders = async (req, res) => {
  try {
    const partnerId = req.deliveryPartner.id;
    
    // Get all active orders, and orders delivered today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const orders = await prisma.order.findMany({
      where: {
        deliveryPartnerId: partnerId,
        OR: [
          { isDelivered: false },
          { deliveredAt: { gte: startOfToday } }
        ]
      },
      include: {
        user: { select: { fullName: true, phoneNumber: true } }
      },
      orderBy: { createdAt: 'desc' }
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
    const partnerId = req.deliveryPartner.id;
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

    res.json({ success: true, order: updatedOrder, message: `Successfully marked as ${action}` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

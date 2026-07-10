import express from 'express';
import prisma from '../utils/prismaClient.js';
import { formatMongoCompat } from '../utils/formatMongoCompat.js';

const router = express.Router();

const isValidUuid = (id) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);

router.post('/validate-cart', async (req, res) => {
  try {
    const { cartItems } = req.body;
    if (!Array.isArray(cartItems)) {
      return res.status(400).json({ success: false, message: 'Invalid cart data' });
    }

    const validItems = [];
    let hasChanges = false;

    for (const item of cartItems) {
      if (!item || !item.product || (typeof item.product !== 'string' && typeof item.product !== 'object')) {
        hasChanges = true;
        continue;
      }
      const prodIdStr = typeof item.product === 'object' ? (item.product._id || item.product.id || '').toString() : item.product.toString();
      if (!isValidUuid(prodIdStr)) {
        hasChanges = true;
        continue;
      }
      const productDocRaw = await prisma.product.findUnique({ where: { id: prodIdStr } });
      if (!productDocRaw || productDocRaw.isActive === false || !productDocRaw.inStock || productDocRaw.stock <= 0) {
        hasChanges = true;
        continue;
      }
      const productDoc = formatMongoCompat(productDocRaw);

      const qty = Number(item.quantity) || 1;
      if (qty > productDoc.stock) {
        hasChanges = true;
        validItems.push({
          product: productDoc._id,
          name: productDoc.name,
          nameTamil: productDoc.nameTamil || productDoc.tamilName || '',
          tamilName: productDoc.tamilName || productDoc.nameTamil || '',
          price: Number(productDoc.price),
          quantity: productDoc.stock,
          image: productDoc.image
        });
      } else {
        if (Number(item.price) !== Number(productDoc.price) || item.name !== productDoc.name) {
          hasChanges = true;
        }
        validItems.push({
          product: productDoc._id,
          name: productDoc.name,
          nameTamil: productDoc.nameTamil || productDoc.tamilName || '',
          tamilName: productDoc.tamilName || productDoc.nameTamil || '',
          price: Number(productDoc.price),
          quantity: qty,
          image: productDoc.image
        });
      }
    }

    res.json({ success: true, validItems, hasChanges });
  } catch (error) {
    console.error('Validate cart error:', error);
    res.status(500).json({ success: false, message: 'Server error validating cart' });
  }
});

router.get('/', async (req, res) => {
  try {
    const productsRaw = await prisma.product.findMany({
      include: { category: { select: { name: true } } }
    });
    res.json(formatMongoCompat(productsRaw));
  } catch (error) {
    console.error('Fetch products error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching products',
      error: error.message || String(error),
      stack: error.stack
    });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const prodId = req.params.id;
    if (!isValidUuid(prodId)) {
      return res.status(404).json({ message: 'Product not found' });
    }
    const productRaw = await prisma.product.findUnique({
      where: { id: prodId },
      include: { category: { select: { name: true } } }
    });
    if (productRaw) {
      res.json(formatMongoCompat(productRaw));
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    console.error('Fetch single product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching product details',
      error: error.message || String(error),
      stack: error.stack
    });
  }
});

export default router;

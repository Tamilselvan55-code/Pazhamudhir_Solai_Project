import express from 'express';
import mongoose from 'mongoose';
import Product from '../models/Product.js';

const router = express.Router();

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
      const prodIdStr = item.product.toString();
      if (!mongoose.Types.ObjectId.isValid(prodIdStr)) {
        hasChanges = true;
        continue;
      }
      const productDoc = await Product.findById(prodIdStr);
      if (!productDoc || productDoc.isActive === false || productDoc.isDeleted === true || !productDoc.inStock || productDoc.stock <= 0) {
        hasChanges = true;
        continue;
      }

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
    const products = await Product.find({}).populate('category', 'name');
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('category', 'name');
    if (product) {
      res.json(product);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;

import express from 'express';
import multer from 'multer';
import { protectAdmin } from '../../middleware/adminAuth.js';
import prisma from '../../utils/prismaClient.js';
import { formatMongoCompat, formatMongoCompatArray } from '../../utils/formatMongoCompat.js';
import { productUpdateUpload } from './upload.js';
import { createAndEmitNotification } from '../../utils/notificationHelper.js';

const router = express.Router();

const logAuditAndEmit = async (req, action, targetType, targetId, targetName, oldValue, newValue, eventName, eventData) => {
  try {
    const adminName = req.admin ? req.admin.name : 'System Admin';
    await prisma.auditLog.create({
      data: {
        adminName,
        action,
        targetType,
        targetId: String(targetId || ''),
        targetName: String(targetName || ''),
        oldValue: oldValue ? String(oldValue) : null,
        newValue: newValue ? String(newValue) : null
      }
    });
    const io = req.app.get('io');
    if (io && eventName) {
      io.emit(eventName, eventData);
    }
  } catch (err) {
    console.error('AuditLog helper error:', err);
  }
};

router.get('/products', async (req, res) => {
  try {
    const { search, category, stockStatus, activeStatus, sort, page = 1, limit = 10 } = req.query;

    const filter = {};
    if (search && search.trim()) {
      filter.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' } },
        { nameTamil: { contains: search.trim(), mode: 'insensitive' } },
        { tamilName: { contains: search.trim(), mode: 'insensitive' } },
        { englishName: { contains: search.trim(), mode: 'insensitive' } },
        { category: { contains: search.trim(), mode: 'insensitive' } },
        { sku: { contains: search.trim(), mode: 'insensitive' } }
      ];
    }
    if (category) {
      filter.category = category;
    }
    if (stockStatus) {
      if (stockStatus === 'low') filter.stock = { gt: 0, lte: 5 };
      else if (stockStatus === 'out') filter.stock = 0;
      else if (stockStatus === 'in') filter.stock = { gt: 5 };
    }
    if (activeStatus) {
      filter.isActive = activeStatus === 'active';
    }

    let orderBy = { createdAt: 'desc' };
    if (sort === 'price_asc') orderBy = { price: 'asc' };
    else if (sort === 'price_desc') orderBy = { price: 'desc' };
    else if (sort === 'newest') orderBy = { createdAt: 'desc' };

    const total = await prisma.product.count({ where: filter });
    const productsRaw = await prisma.product.findMany({
      where: filter,
      orderBy,
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit)
    });

    res.json({
      products: formatMongoCompatArray(productsRaw),
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit))
    });
  } catch (error) {
    console.error('Fetch admin products error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/products', async (req, res) => {
  try {
    const { name, category } = req.body;
    
    if (req.body.category && typeof req.body.category === 'string') {
      req.body.categorySlug = req.body.category;
      const catRec = await prisma.category.findFirst({
        where: { name: { equals: req.body.category, mode: 'insensitive' } }
      });
      if (catRec) {
        req.body.category = { connect: { id: catRec.id } };
      } else {
        delete req.body.category;
      }
    }

    const exists = await prisma.product.findFirst({ where: { name, categorySlug: typeof category === 'string' ? category : undefined } });
    if (exists) {
      return res.status(409).json({ message: 'Product name already exists in this category.' });
    }

    const newProductRaw = await prisma.product.create({
      data: {
        ...req.body,
        stock: req.body.stock ? Number(req.body.stock) : 0,
        inStock: (req.body.stock ? Number(req.body.stock) : 0) > 0,
        price: req.body.price ? Number(req.body.price) : 0,
        discount: req.body.discount ? Number(req.body.discount) : 0
      }
    });

    const createdProduct = formatMongoCompat(newProductRaw);

    await logAuditAndEmit(req, 'Create Product', 'Product', createdProduct._id, createdProduct.name, null, JSON.stringify(createdProduct), 'product_update', createdProduct);

    (async () => {
      try {
        const users = await prisma.user.findMany({ where: { isBlocked: { not: true } }, select: { id: true } });
        const io = req.app.get('io');
        for (const user of users) {
          await createAndEmitNotification(io, {
            userId: user.id,
            title: 'New Product Added',
            message: `Check out our new product: "${createdProduct.name}" in category "${createdProduct.category}".`,
            type: 'general',
            role: 'customer',
            actionUrl: '/'
          });
        }
      } catch (bcErr) {
        console.error('Failed to broadcast new product notification:', bcErr);
      }
    })();

    res.status(201).json(createdProduct);
  } catch (error) {
    console.error('Add product error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

router.put('/products/:id', productUpdateUpload, async (req, res) => {
  try {
    const originalRaw = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!originalRaw) {
      return res.status(404).json({ message: 'Product not found' });
    }
    const original = formatMongoCompat(originalRaw);

    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.get('host');
    const backendUrl = `${protocol}://${host}`;

    let hasUploadedFile = false;
    let newImageUrl = null;
    let newImagesUrls = [];

    if (req.files) {
      if (req.files.image && req.files.image.length > 0) {
        hasUploadedFile = true;
        newImageUrl = `${backendUrl}/uploads/${req.files.image[0].filename}`;
      }
      if (req.files.file && req.files.file.length > 0) {
        hasUploadedFile = true;
        newImageUrl = `${backendUrl}/uploads/${req.files.file[0].filename}`;
      }
      if (req.files.thumbnail && req.files.thumbnail.length > 0) {
        hasUploadedFile = true;
        newImageUrl = `${backendUrl}/uploads/${req.files.thumbnail[0].filename}`;
      }
      if (req.files.images && req.files.images.length > 0) {
        hasUploadedFile = true;
        newImagesUrls = req.files.images.map(file => `${backendUrl}/uploads/${file.filename}`);
      }
    }
    if (req.file) {
      hasUploadedFile = true;
      newImageUrl = `${backendUrl}/uploads/${req.file.filename}`;
    }

    if (hasUploadedFile) {
      const updatePayload = {};
      if (newImageUrl) updatePayload.image = newImageUrl;
      if (newImagesUrls.length > 0) updatePayload.images = newImagesUrls;

      const updatedProductRaw = await prisma.product.update({
        where: { id: req.params.id },
        data: updatePayload
      });
      const updatedProduct = formatMongoCompat(updatedProductRaw);

      await logAuditAndEmit(req, 'Edit Product Image', 'Product', updatedProduct._id, updatedProduct.name, JSON.stringify(original), JSON.stringify(updatedProduct), 'product_update', updatedProduct);
      return res.status(200).json(updatedProduct);
    }

    if (!req.body.image && !req.body.imageUrl) req.body.image = original.image;
    if (!req.body.images || (Array.isArray(req.body.images) && req.body.images.length === 0)) req.body.images = original.images;

    delete req.body._id;
    delete req.body.id;
    delete req.body.createdAt;
    delete req.body.updatedAt;

    if (req.body.images !== undefined && !Array.isArray(req.body.images)) {
      req.body.images = typeof req.body.images === 'string' ? [req.body.images] : [];
    }
    if (req.body.imageUrl !== undefined) {
      req.body.image = String(req.body.imageUrl || '');
      delete req.body.imageUrl;
    }

    if (req.body.stock !== undefined) {
      req.body.stock = Number(req.body.stock);
      req.body.inStock = req.body.stock > 0;
    }
    if (req.body.price !== undefined) req.body.price = Number(req.body.price);
    if (req.body.discount !== undefined) req.body.discount = Number(req.body.discount);
    if (req.body.isActive !== undefined) req.body.isActive = req.body.isActive === true || req.body.isActive === 'true';
    if (req.body.isFeatured !== undefined) req.body.isFeatured = req.body.isFeatured === true || req.body.isFeatured === 'true';

    if (req.body.category && typeof req.body.category === 'string') {
      req.body.categorySlug = req.body.category;
      const catRec = await prisma.category.findFirst({
        where: { name: { equals: req.body.category, mode: 'insensitive' } }
      });
      if (catRec) {
        req.body.category = { connect: { id: catRec.id } };
      } else {
        delete req.body.category;
      }
    }

    const updatedProductRaw = await prisma.product.update({
      where: { id: req.params.id },
      data: req.body
    });
    const updatedProduct = formatMongoCompat(updatedProductRaw);

    const actionName = req.body.price !== undefined && req.body.price !== original.price ? 'Update Price' : req.body.stock !== undefined && req.body.stock !== original.stock ? 'Update Stock' : 'Edit Product';
    await logAuditAndEmit(req, actionName, req.body.price !== undefined ? 'Price' : req.body.stock !== undefined ? 'Stock' : 'Product', updatedProduct._id, updatedProduct.name, JSON.stringify(original), JSON.stringify(updatedProduct), 'product_update', updatedProduct);

    (async () => {
      try {
        const isBackInStock = original.stock === 0 && req.body.stock !== undefined && req.body.stock > 0;
        const isPriceDropped = req.body.price !== undefined && req.body.price < original.price;

        if (isBackInStock || isPriceDropped) {
          const users = await prisma.user.findMany({
            where: { wishlist: { has: req.params.id }, isBlocked: { not: true } },
            select: { id: true }
          });
          const io = req.app.get('io');
          for (const user of users) {
            if (isBackInStock) {
              await createAndEmitNotification(io, {
                userId: user.id,
                title: 'Item Back in Stock!',
                message: `"${original.name}" is now back in stock! Grab yours before it runs out.`,
                type: 'wishlist',
                role: 'customer',
                actionUrl: '/'
              });
            }
            if (isPriceDropped) {
              await createAndEmitNotification(io, {
                userId: user.id,
                title: 'Price Dropped!',
                message: `Price dropped for "${original.name}"! It is now Rs. ${req.body.price} (was Rs. ${original.price}).`,
                type: 'wishlist',
                role: 'customer',
                actionUrl: '/'
              });
            }
          }
        }
      } catch (wlErr) {
        console.error('Failed to trigger wishlist notifications:', wlErr);
      }
    })();

    return res.status(200).json(updatedProduct);
  } catch (error) {
    console.error('Edit product error:', error);
    return res.status(500).json({ message: 'Unexpected Error: ' + error.message });
  }
});

router.post('/products/:id/duplicate', async (req, res) => {
  try {
    const originalRaw = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!originalRaw) return res.status(404).json({ message: 'Product not found' });
    const original = formatMongoCompat(originalRaw);

    let duplicateName = `${original.name} (Copy)`;
    let nameExists = await prisma.product.findFirst({ where: { name: duplicateName, category: original.category } });
    let counter = 1;
    while (nameExists) {
      duplicateName = `${original.name} (Copy ${counter})`;
      nameExists = await prisma.product.findFirst({ where: { name: duplicateName, category: original.category } });
      counter++;
    }

    const duplicatedRaw = await prisma.product.create({
      data: {
        name: duplicateName,
        nameTamil: original.nameTamil ? `${original.nameTamil} (நகல்)` : '',
        tamilName: (original.nameTamil || original.tamilName) ? `${original.nameTamil || original.tamilName} (நகல்)` : '',
        price: original.price,
        category: original.category,
        image: original.image,
        images: original.images || [],
        inStock: original.inStock,
        stock: original.stock,
        unit: original.unit,
        description: original.description,
        isActive: original.isActive,
        isFeatured: original.isFeatured,
        discount: original.discount,
        offerTag: original.offerTag
      }
    });
    
    const saved = formatMongoCompat(duplicatedRaw);
    const io = req.app.get('io');
    if (io) io.emit('product_update', saved);

    res.status(201).json(saved);
  } catch (error) {
    console.error('Duplicate product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/products/:id', async (req, res) => {
  try {
    const deleted = await prisma.product.delete({ where: { id: req.params.id } }).catch(() => null);
    if (!deleted) return res.status(404).json({ message: 'Product not found' });

    const io = req.app.get('io');
    if (io) io.emit('product_update', { _id: req.params.id, isActive: false, isDeleted: true });

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/products/:id/status', async (req, res) => {
  try {
    const isActive = req.body.isActive === true || req.body.isActive === 'true';
    const oldProdRaw = await prisma.product.findUnique({ where: { id: req.params.id } });
    const updatedRaw = await prisma.product.update({
      where: { id: req.params.id },
      data: { isActive }
    });
    const updated = formatMongoCompat(updatedRaw);

    await logAuditAndEmit(req, 'Toggle Product Status', 'Product', updated._id, updated.name, String(oldProdRaw?.isActive), String(isActive), 'product_update', updated);

    res.json(updated);
  } catch (error) {
    console.error('Toggle status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/products/bulk', async (req, res) => {
  try {
    const { ids, action, value } = req.body;
    if (!ids || ids.length === 0) {
      return res.status(400).json({ message: 'No products selected' });
    }

    if (action === 'delete') {
      await prisma.product.deleteMany({ where: { id: { in: ids } } });
      const io = req.app.get('io');
      if (io) {
        ids.forEach(id => io.emit('product_update', { _id: id, isActive: false, isDeleted: true }));
      }
    } else if (action === 'category') {
      let updateData = { categorySlug: value };
      const catRec = await prisma.category.findFirst({
        where: { name: { equals: value, mode: 'insensitive' } }
      });
      if (catRec) {
        updateData.categoryId = catRec.id;
      }
      await prisma.product.updateMany({ where: { id: { in: ids } }, data: updateData });
    } else if (action === 'price') {
      const valStr = String(value);
      if (valStr.startsWith('+')) {
        const amt = parseFloat(valStr.substring(1));
        await prisma.product.updateMany({ where: { id: { in: ids } }, data: { price: { increment: amt } } });
      } else if (valStr.startsWith('-')) {
        const amt = parseFloat(valStr.substring(1));
        await prisma.product.updateMany({ where: { id: { in: ids } }, data: { price: { decrement: amt } } });
      } else {
        const amt = parseFloat(valStr);
        await prisma.product.updateMany({ where: { id: { in: ids } }, data: { price: amt } });
      }
    } else if (action === 'status') {
      const activeState = value === 'active' || value === true;
      await prisma.product.updateMany({ where: { id: { in: ids } }, data: { isActive: activeState } });
    } else if (action === 'stock') {
      const valStr = String(value);
      if (valStr.startsWith('+')) {
        const amt = parseInt(valStr.substring(1));
        const prods = await prisma.product.findMany({ where: { id: { in: ids } } });
        for (const prod of prods) {
          const newStock = (prod.stock || 0) + amt;
          await prisma.product.update({ where: { id: prod.id }, data: { stock: newStock, inStock: newStock > 0 } });
        }
      } else if (valStr.startsWith('-')) {
        const amt = parseInt(valStr.substring(1));
        const prods = await prisma.product.findMany({ where: { id: { in: ids } } });
        for (const prod of prods) {
          const newStock = Math.max(0, (prod.stock || 0) - amt);
          await prisma.product.update({ where: { id: prod.id }, data: { stock: newStock, inStock: newStock > 0 } });
        }
      } else {
        const amt = parseInt(valStr);
        await prisma.product.updateMany({ where: { id: { in: ids } }, data: { stock: amt, inStock: amt > 0 } });
      }
    }

    const affectedRaw = await prisma.product.findMany({ where: { id: { in: ids } } });
    const affected = formatMongoCompatArray(affectedRaw);
    const io = req.app.get('io');
    if (io) {
      affected.forEach(prod => {
        io.emit('product_update', prod);
      });
    }

    res.json({ message: 'Bulk action completed successfully' });
  } catch (error) {
    console.error('Bulk products update error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;

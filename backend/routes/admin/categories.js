import express from 'express';
import { protectAdmin } from '../../middleware/adminAuth.js';
import prisma from '../../utils/prismaClient.js';
import { formatMongoCompat, formatMongoCompatArray } from '../../utils/formatMongoCompat.js';
import { ensureDefaultCategories } from '../../utils/seedDefaultCategories.js';

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

router.get('/categories', async (req, res) => {
  try {
    await ensureDefaultCategories();
    const { search } = req.query;
    let where = {};
    if (search && search.trim()) {
      const s = search.trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { tamilName: { contains: s, mode: 'insensitive' } },
        { description: { contains: s, mode: 'insensitive' } }
      ];
    }
    const categoriesRaw = await prisma.category.findMany({
      where,
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }]
    });
    
    const categories = formatMongoCompatArray(categoriesRaw);

    const withCount = await Promise.all(categories.map(async (cat) => {
      const n = cat.name.toLowerCase().trim();
      let slug = n.replace(/[^a-z0-9]+/g, '-');
      if (n === 'vegetables' || n.includes('veg')) slug = 'vegetables';
      else if (n === 'fruits' || n.includes('fruit')) slug = 'fruits';
      else if (n.includes('dairy')) slug = 'dairy';
      else if (n.includes('biscuit') || n.includes('cookie')) slug = 'biscuits';
      else if (n.includes('snack')) slug = 'snacks';
      else if (n.includes('masala')) slug = 'masala';
      else if (n.includes('oil')) slug = 'oils';
      else if (n.includes('detergent') || n.includes('cleaner') || n.includes('soap')) slug = 'detergents';
      else if (n.includes('pickle')) slug = 'pickles';
      else if (n.includes('other')) slug = 'others';

      const searchTerms = [slug, cat.name, cat.name.toLowerCase(), cat.name.toLowerCase().replace(/\\s+/g, '-')];
      const count = await prisma.product.count({
        where: { category: { in: searchTerms } }
      });

      return { 
        ...cat, 
        status: cat.isActive !== false ? 'Active' : 'Hidden',
        productCount: count 
      };
    }));

    res.json(withCount);
  } catch (err) {
    console.error('Fetch categories error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/categories', async (req, res) => {
  try {
    const { name, tamilName, description, image, displayOrder, status } = req.body;
    const exists = await prisma.category.findUnique({ where: { name } });
    if (exists) return res.status(409).json({ message: 'Category name already exists' });

    const isActive = status !== 'Hidden' && status !== 'Disabled';

    const newCatRaw = await prisma.category.create({ 
      data: {
        name, 
        tamilName: tamilName || '', 
        description: description || '', 
        image: image || '', 
        displayOrder: displayOrder ? Number(displayOrder) : 0, 
        isActive 
      }
    });

    const catObj = formatMongoCompat(newCatRaw);
    catObj.status = catObj.isActive ? 'Active' : 'Hidden';

    await logAuditAndEmit(req, 'Create Category', 'Category', catObj._id, catObj.name, null, JSON.stringify(catObj), 'category_update', catObj);
    res.status(201).json(catObj);
  } catch (err) {
    console.error('Create category error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/categories/:id', async (req, res) => {
  try {
    const oldCatRaw = await prisma.category.findUnique({ where: { id: req.params.id } });
    if (!oldCatRaw) return res.status(404).json({ message: 'Category not found' });
    const oldCat = formatMongoCompat(oldCatRaw);

    const updateData = { ...req.body };
    if (updateData.status !== undefined) {
      updateData.isActive = updateData.status !== 'Hidden' && updateData.status !== 'Disabled';
      delete updateData.status;
    }
    delete updateData._id;
    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    if (updateData.displayOrder !== undefined) updateData.displayOrder = Number(updateData.displayOrder);

    const catRaw = await prisma.category.update({
      where: { id: req.params.id },
      data: updateData
    });
    
    const catObj = formatMongoCompat(catRaw);
    catObj.status = catObj.isActive ? 'Active' : 'Hidden';

    await logAuditAndEmit(req, 'Edit Category', 'Category', catObj._id, catObj.name, JSON.stringify(oldCat), JSON.stringify(catObj), 'category_update', catObj);
    res.json(catObj);
  } catch (err) {
    console.error('Update category error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/categories/:id', async (req, res) => {
  try {
    const oldCatRaw = await prisma.category.findUnique({ where: { id: req.params.id } });
    await prisma.category.delete({ where: { id: req.params.id } });
    if (oldCatRaw) {
      const oldCat = formatMongoCompat(oldCatRaw);
      await logAuditAndEmit(req, 'Delete Category', 'Category', oldCat._id, oldCat.name, JSON.stringify(oldCat), null, 'category_update', { _id: req.params.id, deleted: true });
    }
    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    console.error('Delete category error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/categories/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const oldCatRaw = await prisma.category.findUnique({ where: { id: req.params.id } });
    if (!oldCatRaw) return res.status(404).json({ message: 'Category not found' });

    const isActive = status !== 'Hidden' && status !== 'Disabled';
    const catRaw = await prisma.category.update({
      where: { id: req.params.id },
      data: { isActive }
    });
    
    const catObj = formatMongoCompat(catRaw);
    catObj.status = catObj.isActive ? 'Active' : 'Hidden';

    await logAuditAndEmit(req, 'Toggle Category Status', 'Category', catObj._id, catObj.name, oldCatRaw.isActive ? 'Active' : 'Hidden', status, 'category_update', catObj);
    res.json(catObj);
  } catch (err) {
    console.error('Toggle category status error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;

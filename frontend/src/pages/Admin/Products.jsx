import { API_BASE as config_API_BASE, API_URL as config_API_URL } from '../../config/api';
import React, { useState, useEffect, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import {
  ShoppingBag, Search, Plus, Trash2, Edit3, Eye, Copy,
  Check, X, ToggleLeft, ToggleRight, ArrowUpDown, ChevronLeft, ChevronRight,
  Filter, AlertTriangle, FileSpreadsheet, Sparkles, Image as ImageIcon, Loader2,
  Upload, Download
} from 'lucide-react';
import AdminLayout from '../../components/Admin/AdminLayout';
import useAuthStore from '../../store/useAuthStore';
import useModal from '../../hooks/useModal';
import { formatCurrency } from '../../utils/currency';

const CATEGORIES = [
  { slug: 'vegetables', label: 'Vegetables (காய்கறிகள்)' },
  { slug: 'fruits', label: 'Fruits (பழங்கள்)' },
  { slug: 'biscuits', label: 'Biscuits (பிஸ்கட்)' },
  { slug: 'masala', label: 'Aachi Masala (ஆச்சி மசாலா)' },
  { slug: 'pickles', label: 'Pickles (ஊறுகாய்)' },
  { slug: 'detergents', label: 'Detergents (சுத்திகரிப்பான்கள்)' },
  { slug: 'dairy', label: 'Dairy (பால் பொருட்கள்)' },
  { slug: 'snacks', label: 'Snacks (பலகாரங்கள்)' },
  { slug: 'oils', label: 'Cooking Oils (சமையல் எண்ணெய்)' },
  { slug: 'others', label: 'Other Products (மற்ற மளிகை பொருட்கள்)' }
];

const Products = () => {
  const { adminInfo } = useAuthStore();
  const location = useLocation();
  const { adminAlert, adminConfirm, adminPrompt } = useModal();
  const jsonImportInputRef = useRef(null);
  const bulkImageInputRef = useRef(null);
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [stockStatus, setStockStatus] = useState('');
  const [activeStatus, setActiveStatus] = useState('');
  const [sort, setSort] = useState('newest');

  // Loading state
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Selection
  const [selectedIds, setSelectedIds] = useState([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState('add'); // 'add' | 'edit' | 'view'
  const [currentProduct, setCurrentProduct] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    nameTamil: '',
    englishName: '',
    sku: '',
    price: 0,
    category: 'vegetables',
    unit: '1 kg',
    stock: 20,
    description: '',
    offerTag: '',
    isTrending: false,
    isBestSeller: false,
    isFeatured: false,
    isActive: true,
    discount: 0,
    image: '',
    images: []
  });

  // Local uploads state for preview
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(false);

  // Toast auto-clear
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const querySearch = params.get('search');
    if (querySearch) {
      setSearch(querySearch);
    }
  }, [location.search]);

  // Toast auto-clear
  useEffect(() => {
    if (successMsg) {
      const t = setTimeout(() => setSuccessMsg(''), 3000);
      return () => clearTimeout(t);
    }
  }, [successMsg]);

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(''), 4000);
      return () => clearTimeout(t);
    }
  }, [error]);

  // Fetch products
  const fetchProducts = async () => {
    if (!adminInfo) return;
    setLoading(true);
    try {
      const { data } = await axios.get(`${config_API_BASE}/admin/products`, {
        params: {
          search,
          category,
          stockStatus,
          activeStatus,
          sort,
          page,
          limit: 10
        },
        headers: { Authorization: `Bearer ${adminInfo.token}` }
      });
      setProducts(data.products);
      setTotal(data.total);
      setPages(data.pages);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, category, stockStatus, activeStatus, sort, page]);

  if (!adminInfo) {
    return <Navigate to="/admin/login" replace />;
  }

  // Row selection
  const handleSelectRow = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(x => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === products.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(products.map(p => p._id));
    }
  };

  // Toggle Single Status
  const handleToggleStatus = async (id, currentActive) => {
    setActionLoading(true);
    try {
      await axios.patch(`${config_API_BASE}/admin/products/${id}/status`, 
        { isActive: !currentActive },
        { headers: { Authorization: `Bearer ${adminInfo.token}` } }
      );
      setSuccessMsg('Product status updated successfully!');
      fetchProducts();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to toggle status');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Single Product
  const handleDeleteProduct = async (id) => {
    const ok = await adminConfirm('Delete Product?', 'Are you sure you want to delete this product?\n\nThis action cannot be undone.', { danger: true, confirmLabel: '🗑️ Delete' });
    if (!ok) return;
    setActionLoading(true);
    try {
      await axios.delete(`${config_API_BASE}/admin/products/${id}`, {
        headers: { Authorization: `Bearer ${adminInfo.token}` }
      });
      setSuccessMsg('Product deleted successfully!');
      setSelectedIds(selectedIds.filter(x => x !== id));
      fetchProducts();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to delete product';
      setError(msg);
      adminAlert('error', 'Delete Failed', msg);
    } finally {
      setActionLoading(false);
    }
  };

  // Duplicate Product
  const handleDuplicateProduct = async (id) => {
    setActionLoading(true);
    try {
      await axios.post(`${config_API_BASE}/admin/products/${id}/duplicate`, {}, {
        headers: { Authorization: `Bearer ${adminInfo.token}` }
      });
      setSuccessMsg('Product duplicated successfully!');
      fetchProducts();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to duplicate product');
    } finally {
      setActionLoading(false);
    }
  };

  // Bulk Actions
  const handleBulkAction = async (action, value = null) => {
    if (selectedIds.length === 0) return;
    
    if (action === 'delete') {
      const ok = await adminConfirm('Delete Selected?', `Are you sure you want to delete the ${selectedIds.length} selected products?\n\nThis action cannot be undone.`, { danger: true, confirmLabel: '🗑️ Delete' });
      if (!ok) return;
    }

    if (action === 'price') {
      const inputVal = await adminPrompt('Adjust Price', 'Enter new price or adjustments (e.g., 50, +5, -10):');
      if (inputVal === null) return;
      value = inputVal;
    }

    if (action === 'category') {
      const inputCat = await adminPrompt('Update Category', 'Enter category slug (vegetables, fruits, biscuits, masala, pickles, detergents, dairy, snacks, oils, others):');
      if (!inputCat) return;
      if (!CATEGORIES.some(c => c.slug === inputCat)) {
        adminAlert('error', 'Invalid Category', 'Please enter a valid category slug.');
        return;
      }
      value = inputCat;
    }

    if (action === 'stock') {
      const inputVal = await adminPrompt('Adjust Stock', 'Enter new stock or adjustments (e.g., 100, +20, -5):');
      if (inputVal === null) return;
      value = inputVal;
    }

    setActionLoading(true);
    try {
      await axios.post(`${config_API_BASE}/admin/products/bulk`, 
        { ids: selectedIds, action, value },
        { headers: { Authorization: `Bearer ${adminInfo.token}` } }
      );
      setSuccessMsg(`Bulk action "${action}" completed successfully!`);
      setSelectedIds([]);
      fetchProducts();
    } catch (err) {
      const msg = err.response?.data?.message || `Failed to perform bulk action "${action}"`;
      setError(msg);
      adminAlert('error', 'Bulk Action Failed', msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportJSON = async () => {
    try {
      const response = await axios.get(`${config_API_BASE}/admin/products/export`, {
        headers: { Authorization: `Bearer ${adminInfo.token}` }
      });
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `tiruchendur_products_${Date.now()}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setSuccessMsg('Catalog JSON exported successfully!');
    } catch (err) {
      adminAlert('error', 'Export Failed', 'Unable to export catalog products to JSON.');
    }
  };

  const handleImportJSON = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (!Array.isArray(parsed)) {
          adminAlert('error', 'Invalid File Format', 'Product import JSON must contain a root array.');
          return;
        }
        
        setActionLoading(true);
        const { data } = await axios.post(`${config_API_BASE}/admin/products/import`, parsed, {
          headers: { Authorization: `Bearer ${adminInfo.token}` }
        });
        
        adminAlert('success', 'Import Successful', data.message || 'Catalog imported successfully.');
        fetchProducts();
      } catch (err) {
        adminAlert('error', 'Import Failed', err.message || 'Error processing the JSON file.');
      } finally {
        setActionLoading(false);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleBulkImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setActionLoading(true);
    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('images', file);
      });

      const { data } = await axios.post(`${config_API_BASE}/admin/products/bulk-image-upload`, formData, {
        headers: { 
          Authorization: `Bearer ${adminInfo.token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      adminAlert(
        'success', 
        'Bulk Match Complete', 
        `${data.message}\n\nMatched: ${data.matches?.length || 0}\nUnmatched: ${data.unmatched?.length || 0} (${data.unmatched?.join(', ') || 'none'})`
      );
      fetchProducts();
    } catch (err) {
      const msg = err.response?.data?.message || 'Bulk image upload and matching failed.';
      adminAlert('error', 'Upload Failed', msg);
    } finally {
      setActionLoading(false);
      e.target.value = '';
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    const activeProducts = products.filter(p => selectedIds.includes(p._id));
    const itemsToExport = activeProducts.length > 0 ? activeProducts : products;

    let csvContent = '\uFEFF'; // Prepend UTF-8 BOM so Excel opens Tamil Unicode characters correctly
    csvContent += 'Product ID,Name,Tamil Name,Category,Price,Stock,Discount (%),Status,Offer Tag,Unit,Trending,Best Seller,Featured\n';

    itemsToExport.forEach(p => {
      const row = [
        p._id,
        `"${p.name}"`,
        `"${p.nameTamil || p.tamilName || ''}"`,
        typeof p.category === 'string' ? p.category : p.category?.name || p.categorySlug || '',
        p.price,
        p.stock,
        p.discount || 0,
        p.isActive ? 'Active' : 'Inactive',
        `"${p.offerTag || ''}"`,
        `"${p.unit}"`,
        p.isTrending ? 'Yes' : 'No',
        p.isBestSeller ? 'Yes' : 'No',
        p.isFeatured ? 'Yes' : 'No'
      ].join(',');
      csvContent += row + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `tiruchendur_murugan_pazhamudhir_solai_products_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle Multi-file uploads
  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Show instant local previews
    const localPreviews = files.map(file => ({
      name: file.name,
      url: URL.createObjectURL(file),
      file
    }));
    setSelectedFiles([...selectedFiles, ...localPreviews]);

    // Perform upload
    setUploadProgress(true);
    const formDataUpload = new FormData();
    files.forEach(file => {
      formDataUpload.append('images', file);
    });

    try {
      const { data } = await axios.post(`${config_API_BASE}/admin/upload`, formDataUpload, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${adminInfo.token}`
        }
      });
      // Append new URLs to formData
      setFormData(prev => ({
        ...prev,
        images: [...(prev.images || []), ...data.urls],
        // Set first uploaded image as main image if main image is empty
        image: prev.image || data.urls[0] || ''
      }));
    } catch (err) {
      setError('Image upload failed. Try again.');
    } finally {
      setUploadProgress(false);
    }
  };

  // Remove uploaded image from list
  const handleRemoveImage = (indexToRemove) => {
    setFormData(prev => {
      const newImages = prev.images.filter((_, idx) => idx !== indexToRemove);
      let newMainImage = prev.image;
      if (prev.image === prev.images[indexToRemove]) {
        newMainImage = newImages[0] || '';
      }
      return { ...prev, images: newImages, image: newMainImage };
    });
    setSelectedFiles(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Set main image from list
  const handleSetMainImage = (url) => {
    setFormData(prev => ({ ...prev, image: url }));
  };

  // Open modal
  const openModal = (type, prod = null) => {
    setModalType(type);
    setCurrentProduct(prod);
    setSelectedFiles([]);
    if (type === 'add') {
      setFormData({
        name: '',
        nameTamil: '',
        tamilName: '',
        englishName: '',
        sku: '',
        price: 0,
        category: 'vegetables',
        unit: '1 kg',
        stock: 20,
        description: '',
        offerTag: '',
        isTrending: false,
        isBestSeller: false,
        isFeatured: false,
        isActive: true,
        discount: 0,
        image: '',
        images: []
      });
    } else if (prod) {
      setFormData({
        name: prod.name,
        nameTamil: prod.nameTamil || prod.tamilName || '',
        tamilName: prod.tamilName || prod.nameTamil || '',
        englishName: prod.englishName || '',
        sku: prod.sku || '',
        price: prod.price,
        category: typeof prod.category === 'string' ? prod.category : prod.category?.slug || prod.categorySlug || prod.category?.name || 'vegetables',
        unit: prod.unit || '1 kg',
        stock: prod.stock || 0,
        description: prod.description || '',
        offerTag: prod.offerTag || '',
        isTrending: prod.isTrending || false,
        isBestSeller: prod.isBestSeller || false,
        isFeatured: prod.isFeatured || false,
        isActive: prod.isActive !== undefined ? prod.isActive : true,
        discount: prod.discount || 0,
        image: prod.image || '',
        images: prod.images || []
      });
    }
    setIsModalOpen(true);
  };

  // Submit modal form
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return setError('Product name is required');
    if (formData.price <= 0) return setError('Product price must be greater than 0');

    setActionLoading(true);
    try {
      if (modalType === 'add') {
        await axios.post(`${config_API_BASE}/admin/products`, formData, {
          headers: { Authorization: `Bearer ${adminInfo.token}` }
        });
        setSuccessMsg('Product added successfully!');
      } else if (modalType === 'edit' && currentProduct) {
        await axios.put(`${config_API_BASE}/admin/products/${currentProduct._id}`, formData, {
          headers: { Authorization: `Bearer ${adminInfo.token}` }
        });
        setSuccessMsg('Product updated successfully!');
      }
      setIsModalOpen(false);
      fetchProducts();
    } catch (err) {
      setError(err.response?.data?.message || 'Operation failed');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Toast Alert Banner */}
        {successMsg && (
          <div className="fixed top-20 right-6 z-50 flex items-center gap-2 bg-[#22C55E] text-white px-5 py-3 rounded-xl shadow-xl animate-bounce font-bold text-sm">
            <Check className="w-5 h-5" />
            <span>{successMsg}</span>
          </div>
        )}
        {error && (
          <div className="fixed top-20 right-6 z-50 flex items-center gap-2 bg-[#EF4444] text-white px-5 py-3 rounded-xl shadow-xl font-bold text-sm">
            <AlertTriangle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}

        {/* ─── Header & Top Actions ─────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-white flex items-center gap-3">
              <div className="p-2.5 rounded-[16px] bg-white/4 border border-white/8 shadow-sm">
                <ShoppingBag className="w-6 h-6 text-[#22C55E]" />
              </div>
              Product Inventory
            </h1>
            <p className="text-sm text-[#94A3B8] mt-1">Manage, edit, filter, duplicate, and toggle items in your store catalog</p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => openModal('add')}
              className="admin-btn-primary h-[40px] px-4 text-xs font-bold flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Add Product
            </button>
            <button
              onClick={handleExportCSV}
              className="h-[40px] px-4 bg-white/6 hover:bg-white/10 text-white font-bold text-xs rounded-xl border border-white/8 flex items-center gap-1.5 transition-all shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4 text-[#22C55E]" /> Export CSV
            </button>
            <button
              onClick={() => jsonImportInputRef.current?.click()}
              className="h-[40px] px-4 bg-white/6 hover:bg-white/10 text-white font-bold text-xs rounded-xl border border-white/8 flex items-center gap-1.5 transition-all shadow-sm"
              title="Import products from JSON"
            >
              <Upload className="w-4 h-4 text-[#22C55E]" /> Import JSON
            </button>
            <button
              onClick={handleExportJSON}
              className="h-[40px] px-4 bg-white/6 hover:bg-white/10 text-white font-bold text-xs rounded-xl border border-white/8 flex items-center gap-1.5 transition-all shadow-sm"
              title="Export products to JSON"
            >
              <Download className="w-4 h-4 text-[#22C55E]" /> Export JSON
            </button>
            <button
              onClick={() => bulkImageInputRef.current?.click()}
              className="h-[40px] px-4 bg-white/6 hover:bg-white/10 text-white font-bold text-xs rounded-xl border border-white/8 flex items-center gap-1.5 transition-all shadow-sm"
              title="Upload & Match multiple images"
            >
              <ImageIcon className="w-4 h-4 text-orange-400" /> Match Images
            </button>

            {/* Hidden file selectors */}
            <input
              type="file"
              ref={jsonImportInputRef}
              accept=".json"
              onChange={handleImportJSON}
              className="hidden"
            />
            <input
              type="file"
              ref={bulkImageInputRef}
              accept="image/*"
              multiple
              onChange={handleBulkImageUpload}
              className="hidden"
            />
          </div>
        </div>

        {/* ─── Filter & Search Bar (55px) ───────────────────────────────── */}
        <div className="admin-card space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8]" />
              <input
                type="text"
                placeholder="Search by name, category, SKU..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="admin-search-bar"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => { setSearch(''); setPage(1); }}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-white font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Category */}
            <select
              value={category}
              onChange={(e) => { setCategory(e.target.value); setPage(1); }}
              className="admin-form-input h-[55px] px-4 font-bold text-xs"
            >
              <option value="" className="bg-[#081A38]">All Categories</option>
              {CATEGORIES.map(c => (
                <option key={c.slug} value={c.slug} className="bg-[#081A38]">{c.label}</option>
              ))}
            </select>

            {/* Stock Status */}
            <select
              value={stockStatus}
              onChange={(e) => { setStockStatus(e.target.value); setPage(1); }}
              className="admin-form-input h-[55px] px-4 font-bold text-xs"
            >
              <option value="" className="bg-[#081A38]">All Stock Levels</option>
              <option value="in" className="bg-[#081A38]">In Stock (&gt; 5)</option>
              <option value="low" className="bg-[#081A38]">Low Stock (1 - 5)</option>
              <option value="out" className="bg-[#081A38]">Out of Stock (0)</option>
            </select>

            {/* Active Status */}
            <select
              value={activeStatus}
              onChange={(e) => { setActiveStatus(e.target.value); setPage(1); }}
              className="admin-form-input h-[55px] px-4 font-bold text-xs"
            >
              <option value="" className="bg-[#081A38]">All Statuses</option>
              <option value="active" className="bg-[#081A38]">Active Products</option>
              <option value="inactive" className="bg-[#081A38]">Inactive Products</option>
            </select>

            {/* Sort */}
            <select
              value={sort}
              onChange={(e) => { setSort(e.target.value); setPage(1); }}
              className="admin-form-input h-[55px] px-4 font-bold text-xs"
            >
              <option value="newest" className="bg-[#081A38]">Newest First</option>
              <option value="price_asc" className="bg-[#081A38]">Price: Low to High</option>
              <option value="price_desc" className="bg-[#081A38]">Price: High to Low</option>
            </select>
          </div>

          {/* ── Bulk Actions Bar ────────────────────────────────────────── */}
          {selectedIds.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#22C55E]/15 border border-[#22C55E]/30 rounded-2xl p-4 animate-fadeIn">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">
                  Selected <span className="text-[#22C55E]">{selectedIds.length}</span> products:
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => handleBulkAction('status', 'active')}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/10 text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
                >
                  Enable Selected
                </button>
                <button
                  onClick={() => handleBulkAction('status', 'inactive')}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/10 text-gray-300 text-xs font-bold rounded-xl shadow-sm transition-colors"
                >
                  Disable Selected
                </button>
                <button
                  onClick={() => handleBulkAction('price')}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/10 text-[#22C55E] text-xs font-bold rounded-xl shadow-sm transition-colors"
                >
                  Change Price
                </button>
                <button
                  onClick={() => handleBulkAction('stock')}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/10 text-orange-400 text-xs font-bold rounded-xl shadow-sm transition-colors"
                >
                  Change Stock
                </button>
                <button
                  onClick={() => handleBulkAction('category')}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/10 text-cyan-400 text-xs font-bold rounded-xl shadow-sm transition-colors"
                >
                  Move Category
                </button>
                <button
                  onClick={() => handleBulkAction('delete')}
                  className="px-3 py-1.5 bg-[#EF4444]/20 hover:bg-[#EF4444]/30 border border-[#EF4444]/40 text-[#EF4444] text-xs font-bold rounded-xl shadow-sm transition-colors"
                >
                  Delete Selected
                </button>
                <button
                  onClick={() => setSelectedIds([])}
                  className="p-2 text-[#94A3B8] hover:text-white rounded-xl hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ─── Inventory Table ──────────────────────────────────────────── */}
        <div className="admin-table-container">
          <div className="overflow-x-auto admin-scroll">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="admin-table-header text-xs font-bold text-[#94A3B8] uppercase tracking-wider border-b border-white/8">
                  <th className="py-4 px-5 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={products.length > 0 && selectedIds.length === products.length}
                      onChange={handleSelectAll}
                      className="rounded text-[#22C55E] focus:ring-[#22C55E] w-4 h-4 cursor-pointer bg-white/10 border-white/20"
                    />
                  </th>
                  <th className="py-4 px-4 w-16">Image</th>
                  <th className="py-4 px-4">Product Name</th>
                  <th className="py-4 px-4">Tamil Name</th>
                  <th className="py-4 px-4">Category</th>
                  <th className="py-4 px-4 text-right">Price</th>
                  <th className="py-4 px-4 text-center">Stock</th>
                  <th className="py-4 px-4 text-center">Status</th>
                  <th className="py-4 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/6">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-16 text-center text-xs font-semibold text-[#94A3B8]">
                      <Loader2 className="w-8 h-8 animate-spin text-[#22C55E] mx-auto mb-3" />
                      Loading product inventory...
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-20 text-center">
                      <div className="w-16 h-16 rounded-[20px] bg-white/4 border border-white/8 flex items-center justify-center mx-auto mb-4 shadow-sm">
                        <ShoppingBag className="w-8 h-8 text-[#94A3B8]" />
                      </div>
                      <p className="text-base font-bold text-white">No products found matching filters</p>
                      <p className="text-xs text-[#94A3B8] mt-1">Try adjusting search query or category filters</p>
                    </td>
                  </tr>
                ) : (
                  products.map(p => {
                    const isLow = p.stock > 0 && p.stock <= 5;
                    const isOut = p.stock === 0;
                    return (
                      <tr key={p._id} className="text-xs hover:bg-white/4 transition-colors group">
                        <td className="py-3.5 px-5 text-center">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(p._id)}
                            onChange={() => handleSelectRow(p._id)}
                            className="rounded text-[#22C55E] focus:ring-[#22C55E] w-4 h-4 cursor-pointer bg-white/10 border-white/20"
                          />
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="w-11 h-11 rounded-xl bg-white border border-white/8 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                            {p.image ? (
                              <img src={p.image} alt={p.name} className="w-full h-full object-contain" style={{ padding: '2px', borderRadius: '10px' }} />
                            ) : (
                              <ImageIcon className="w-5 h-5 text-[#94A3B8]" />
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-white">
                          <div className="flex flex-col">
                            <span className="text-sm">{p.name}</span>
                            <span className="text-[11px] text-[#94A3B8] font-medium mt-0.5">{p.unit}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-gray-300 font-semibold">{p.nameTamil || p.tamilName || '--'}</td>
                        <td className="py-3.5 px-4">
                          <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-white/6 text-gray-200 border border-white/8 capitalize">
                            {typeof p.category === 'string' ? p.category : p.category?.name || p.categorySlug || '--'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-white text-sm">
                          {p.discount > 0 ? (
                            <div className="flex flex-col items-end">
                              <span className="text-[#22C55E]">{formatCurrency(p.price - Math.round((p.price * p.discount) / 100))}</span>
                              <span className="text-[10px] line-through text-[#94A3B8] font-normal">{formatCurrency(p.price)}</span>
                            </div>
                          ) : (
                            formatCurrency(p.price)
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-block px-3 py-1 rounded-full text-[11px] font-bold border ${
                            isOut ? 'bg-[#EF4444]/20 text-[#EF4444] border-[#EF4444]/30' :
                            isLow ? 'bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/30' :
                            'bg-[#22C55E]/20 text-[#22C55E] border-[#22C55E]/30'
                          }`}>
                            {p.stock}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => handleToggleStatus(p._id, p.isActive)}
                            disabled={actionLoading}
                            className="focus:outline-none transition-transform hover:scale-105"
                          >
                            {p.isActive ? (
                              <span className="inline-flex items-center gap-1.5 text-[#22C55E] font-bold">
                                <ToggleRight className="w-5 h-5 text-[#22C55E] shrink-0" /> Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-[#94A3B8] font-bold">
                                <ToggleLeft className="w-5 h-5 text-[#94A3B8] shrink-0" /> Inactive
                              </span>
                            )}
                          </button>
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => openModal('view', p)}
                              title="View product details"
                              className="p-2 hover:bg-white/10 text-[#94A3B8] hover:text-white rounded-xl transition-colors border border-transparent hover:border-white/8"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openModal('edit', p)}
                              title="Edit product"
                              className="p-2 hover:bg-white/10 text-[#22C55E] hover:text-[#22C55E] rounded-xl transition-colors border border-transparent hover:border-white/8"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDuplicateProduct(p._id)}
                              title="Duplicate product"
                              className="p-2 hover:bg-white/10 text-cyan-400 hover:text-cyan-300 rounded-xl transition-colors border border-transparent hover:border-white/8"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(p._id)}
                              title="Delete product"
                              className="p-2 hover:bg-[#EF4444]/20 text-[#EF4444] hover:text-[#EF4444] rounded-xl transition-colors border border-transparent hover:border-[#EF4444]/30"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ─── Pagination ────────────────────────────────────────────── */}
          {pages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-white/8 bg-[#081A38]">
              <span className="text-xs font-semibold text-[#94A3B8]">
                Showing page <strong className="text-white">{page}</strong> of <strong className="text-white">{pages}</strong>
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(prev => Math.max(1, prev - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-xl bg-white/6 border border-white/8 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage(prev => Math.min(pages, prev + 1))}
                  disabled={page === pages}
                  className="p-2 rounded-xl bg-white/6 border border-white/8 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ─── Add/Edit/View Product Modal ─────────────────────────────── */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto animate-fadeIn">
            <div className="bg-[#081A38] rounded-2xl w-full max-w-2xl overflow-hidden border border-white/10 shadow-2xl animate-scaleUp">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-white/8 bg-white/4">
                <h2 className="text-lg font-black text-white capitalize flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-[#22C55E]" />
                  {modalType === 'view' ? 'Product Info' : modalType === 'edit' ? 'Edit Product' : 'Add New Product'}
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 text-[#94A3B8] hover:text-white rounded-xl hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form body */}
              <form onSubmit={handleFormSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto admin-scroll">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Product Name */}
                  <div>
                    <label className="block text-xs font-bold text-[#94A3B8] mb-1.5 uppercase tracking-wide">Product Name *</label>
                    <input
                      type="text"
                      required
                      disabled={modalType === 'view'}
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="admin-form-input text-xs h-[40px] px-3 font-medium bg-[#020B24]"
                      placeholder="e.g. Tomato"
                    />
                  </div>

                  {/* Tamil Name */}
                  <div>
                    <label className="block text-xs font-bold text-[#94A3B8] mb-1.5 uppercase tracking-wide">Tamil Name</label>
                    <input
                      type="text"
                      disabled={modalType === 'view'}
                      value={formData.nameTamil || formData.tamilName || ''}
                      onChange={(e) => setFormData({ ...formData, nameTamil: e.target.value, tamilName: e.target.value })}
                      className="admin-form-input text-xs h-[40px] px-3 font-medium bg-[#020B24]"
                      placeholder="e.g. வெங்காயம்"
                    />
                  </div>

                  {/* English Name */}
                  <div>
                    <label className="block text-xs font-bold text-[#94A3B8] mb-1.5 uppercase tracking-wide">English Name</label>
                    <input
                      type="text"
                      disabled={modalType === 'view'}
                      value={formData.englishName}
                      onChange={(e) => setFormData({ ...formData, englishName: e.target.value })}
                      className="admin-form-input text-xs h-[40px] px-3 font-medium bg-[#020B24]"
                      placeholder="e.g. Tomato Fresh"
                    />
                  </div>

                  {/* SKU */}
                  <div>
                    <label className="block text-xs font-bold text-[#94A3B8] mb-1.5 uppercase tracking-wide">SKU Code</label>
                    <input
                      type="text"
                      disabled={modalType === 'view'}
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      className="admin-form-input text-xs h-[40px] px-3 font-medium bg-[#020B24]"
                      placeholder="e.g. VEG-001"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-xs font-bold text-[#94A3B8] mb-1.5 uppercase tracking-wide">Category *</label>
                    <select
                      disabled={modalType === 'view'}
                      value={typeof formData.category === 'string' ? formData.category : formData.category?.slug || formData.categorySlug || (formData.category?.name || '').toLowerCase() || ''}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="admin-form-input text-xs h-[40px] px-3 font-bold bg-[#020B24]"
                    >
                      {CATEGORIES.map(c => (
                        <option key={c.slug} value={c.slug} className="bg-[#081A38] text-white">{c.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Unit */}
                  <div>
                    <label className="block text-xs font-bold text-[#94A3B8] mb-1.5 uppercase tracking-wide">Unit *</label>
                    <input
                      type="text"
                      required
                      disabled={modalType === 'view'}
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className="admin-form-input text-xs h-[40px] px-3 font-medium bg-[#020B24]"
                      placeholder="e.g. 1 kg, 500 g, 1 bunch"
                    />
                  </div>

                  {/* Price */}
                  <div>
                    <label className="block text-xs font-bold text-[#94A3B8] mb-1.5 uppercase tracking-wide">Price (₹) *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      disabled={modalType === 'view'}
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                      className="admin-form-input text-xs h-[40px] px-3 font-bold bg-[#020B24]"
                    />
                  </div>

                  {/* Stock */}
                  <div>
                    <label className="block text-xs font-bold text-[#94A3B8] mb-1.5 uppercase tracking-wide">Stock Level *</label>
                    <input
                      type="number"
                      required
                      min={0}
                      disabled={modalType === 'view'}
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                      className="admin-form-input text-xs h-[40px] px-3 font-bold bg-[#020B24]"
                    />
                  </div>

                  {/* Discount Percentage */}
                  <div>
                    <label className="block text-xs font-bold text-[#94A3B8] mb-1.5 uppercase tracking-wide">Discount (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      disabled={modalType === 'view'}
                      value={formData.discount}
                      onChange={(e) => setFormData({ ...formData, discount: Number(e.target.value) })}
                      className="admin-form-input text-xs h-[40px] px-3 font-bold bg-[#020B24]"
                    />
                  </div>

                  {/* Offer Tag */}
                  <div>
                    <label className="block text-xs font-bold text-[#94A3B8] mb-1.5 uppercase tracking-wide">Offer Tag</label>
                    <input
                      type="text"
                      disabled={modalType === 'view'}
                      value={formData.offerTag}
                      onChange={(e) => setFormData({ ...formData, offerTag: e.target.value })}
                      className="admin-form-input text-xs h-[40px] px-3 font-medium bg-[#020B24]"
                      placeholder="e.g. FRESH, 5% OFF, SEASONAL"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-bold text-[#94A3B8] mb-1.5 uppercase tracking-wide">Description</label>
                  <textarea
                    rows={2}
                    disabled={modalType === 'view'}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="admin-form-input text-xs p-3 font-medium bg-[#020B24] resize-none"
                    placeholder="Enter product details..."
                  />
                </div>

                {/* Checkboxes */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-3 border-y border-white/8">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={modalType === 'view'}
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="rounded text-[#22C55E] focus:ring-[#22C55E] w-4 h-4 bg-[#020B24] border-white/20"
                    />
                    <span className="text-xs text-white font-bold">Enabled</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={modalType === 'view'}
                      checked={formData.isFeatured}
                      onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                      className="rounded text-[#22C55E] focus:ring-[#22C55E] w-4 h-4 bg-[#020B24] border-white/20"
                    />
                    <span className="text-xs text-white font-bold">Featured</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={modalType === 'view'}
                      checked={formData.isTrending}
                      onChange={(e) => setFormData({ ...formData, isTrending: e.target.checked })}
                      className="rounded text-[#22C55E] focus:ring-[#22C55E] w-4 h-4 bg-[#020B24] border-white/20"
                    />
                    <span className="text-xs text-white font-bold">Trending</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={modalType === 'view'}
                      checked={formData.isBestSeller}
                      onChange={(e) => setFormData({ ...formData, isBestSeller: e.target.checked })}
                      className="rounded text-[#22C55E] focus:ring-[#22C55E] w-4 h-4 bg-[#020B24] border-white/20"
                    />
                    <span className="text-xs text-white font-bold">Best Seller</span>
                  </label>
                </div>

                {/* ── Multiple Image Upload with Previews ───────────────────── */}
                <div>
                  <label className="block text-xs font-bold text-[#94A3B8] mb-1.5 uppercase tracking-wide">Product Images</label>
                  {modalType !== 'view' && (
                    <div className="flex items-center gap-3 mb-3">
                      <input
                        type="file"
                        id="multi-image-upload"
                        multiple
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <label
                        htmlFor="multi-image-upload"
                        className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-white/20 hover:border-[#22C55E] bg-white/4 hover:bg-[#22C55E]/10 rounded-xl cursor-pointer text-xs font-bold text-[#94A3B8] hover:text-white transition-all"
                      >
                        <ImageIcon className="w-4 h-4 text-[#22C55E]" /> Upload Multiple Images
                      </label>
                      {uploadProgress && (
                        <span className="text-xs text-[#22C55E] flex items-center gap-1.5 font-bold">
                          <Loader2 className="w-4 h-4 animate-spin" /> Uploading to server...
                        </span>
                      )}
                    </div>
                  )}

                  {/* Previews grid */}
                  <div className="grid grid-cols-4 gap-3">
                    {(formData.images || []).map((url, idx) => {
                      const isMain = formData.image === url;
                      return (
                        <div key={idx} className="relative group rounded-xl border border-white/10 overflow-hidden bg-[#020B24] aspect-square shadow-sm">
                          <img src={url} alt={`preview-${idx}`} className="w-full h-full object-cover" />
                          
                          {/* Selected as main badge */}
                          {isMain && (
                            <div className="absolute top-1.5 left-1.5 bg-[#22C55E] text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm">
                              Main
                            </div>
                          )}

                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            {modalType !== 'view' && !isMain && (
                              <button
                                type="button"
                                onClick={() => handleSetMainImage(url)}
                                className="px-2 py-1 bg-[#22C55E] text-white text-[9px] font-bold rounded-lg hover:bg-[#16A34A] transition-colors"
                              >
                                Set Main
                              </button>
                            )}
                            {modalType !== 'view' && (
                              <button
                                type="button"
                                onClick={() => handleRemoveImage(idx)}
                                className="p-1.5 bg-[#EF4444] text-white rounded-lg hover:bg-red-700 transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Main image text fallback */}
                {modalType !== 'view' && (
                  <div>
                    <label className="block text-xs font-bold text-[#94A3B8] mb-1.5 uppercase tracking-wide">Main Image URL (or select from uploaded above)</label>
                    <input
                      type="text"
                      value={formData.image}
                      onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                      className="admin-form-input text-xs h-[40px] px-3 font-medium bg-[#020B24]"
                      placeholder="http://example.com/image.jpg"
                    />
                  </div>
                )}

                {/* Actions */}
                {modalType !== 'view' && (
                  <div className="flex items-center justify-end gap-3 pt-5 border-t border-white/8">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="h-[40px] px-5 bg-white/6 hover:bg-white/10 border border-white/8 text-white font-bold text-xs rounded-xl transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="admin-btn-primary h-[40px] px-6 font-bold text-xs flex items-center gap-2 disabled:opacity-50"
                    >
                      {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                      Save Product
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default Products;

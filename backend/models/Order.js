import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  orderItems: [
    {
      name:    { type: String, required: true },
      quantity: { type: Number, required: true },
      image:   { type: String },
      price:   { type: Number, required: true },
      product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    }
  ],

  // ── Shipping / Delivery Address ──────────────────────────────────────────
  shippingAddress: {
    street:            { type: String },
    fullAddress:       { type: String },
    city:              { type: String },
    state:             { type: String },
    pincode:           { type: String },
    lat:               { type: Number, required: true },
    lon:               { type: Number, required: true },
    distanceFromStore: { type: Number },
    deliveryAvailable: { type: Boolean },
  },

  // ── Recipient (Order for someone else) ────────────────────────────────────
  recipient: {
    isForAnotherPerson: { type: Boolean, default: false },
    name:               { type: String, default: '' },
    phone:              { type: String, default: '' },
  },

  // ── Pricing ───────────────────────────────────────────────────────────────
  totalPrice:      { type: Number, required: true, default: 0.0 },
  deliveryFee:     { type: Number, default: 0.0 },
  gstAmount:       { type: Number, default: 0.0 },
  couponCode:      { type: String, default: '' },
  couponDiscount:  { type: Number, default: 0 },

  // ── Payment ───────────────────────────────────────────────────────────────
  paymentMethod:   { type: String, default: 'COD' },
  paymentStatus:   { type: String, enum: ['Pending', 'Paid', 'Failed', 'Refunded'], default: 'Pending' },
  transactionId:   { type: String, default: '' },
  paymentAuditLog: [
    {
      updatedBy:   { type: String },
      oldStatus:   { type: String },
      newStatus:   { type: String },
      updatedTime: { type: Date, default: Date.now },
    }
  ],

  // ── Order Status ─────────────────────────────────────────────────────────
  status: {
    type: String,
    enum: ['Pending', 'Accepted', 'Out for Delivery', 'Delivered', 'Cancelled'],
    default: 'Pending',
  },
  statusHistory: [
    {
      status:    { type: String },
      note:      { type: String },
      timestamp: { type: Date, default: Date.now },
    }
  ],

  isDelivered: { type: Boolean, required: true, default: false },
  deliveredAt: { type: Date },

  // ── Customer Notes ────────────────────────────────────────────────────────
  notes:         { type: String, default: '' },
  invoiceNumber: { type: String },

}, { timestamps: true });

// Auto-generate invoice number before save (collision-safe)
orderSchema.pre('save', async function () {
  if (!this.invoiceNumber) {
    const StoreSettings = mongoose.model('StoreSettings');
    const settings = await StoreSettings.findOne();
    const prefix = settings?.invoicePrefix || 'INV-';
    const year = new Date().getFullYear();
    // Use document count + timestamp suffix for uniqueness
    const count = await mongoose.model('Order').countDocuments();
    const seq = String(count + 1).padStart(6, '0');
    this.invoiceNumber = `${prefix}${year}-${seq}`;
  }
});

// Unique index to catch any remaining edge-case duplicates
orderSchema.index({ invoiceNumber: 1 }, { unique: true, sparse: true });

const Order = mongoose.model('Order', orderSchema);
export default Order;

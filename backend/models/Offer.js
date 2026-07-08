import mongoose from 'mongoose';

const offerSchema = new mongoose.Schema({
  title: { type: String, required: [true, 'Title is required'] },
  discountPercentage: { 
    type: Number, 
    required: [true, 'Discount percentage is required'],
    min: [1, 'Discount percentage must be at least 1%'],
    max: [100, 'Discount percentage cannot exceed 100%']
  },
  minOrderValue: { 
    type: Number, 
    required: [true, 'Minimum order value is required'],
    min: [0, 'Minimum order value cannot be negative'],
    default: 0 
  },
  validFrom: { type: Date, required: [true, 'Valid From date is required'] },
  validUntil: { type: Date, required: [true, 'Valid Until date is required'] },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active',
  },
  bannerImage: { type: String, default: '' },
}, { timestamps: true });

const Offer = mongoose.model('Offer', offerSchema);
export default Offer;

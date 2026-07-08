import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  nameTamil:   { type: String, default: '' },
  tamilName:   { type: String, default: '' },
  englishName: { type: String, default: '' },
  sku:         { type: String, default: '' },
  price:       { type: Number, required: true },
  category:    { type: String, required: true }, // slug string e.g. 'vegetables'
  image:       { type: String, default: '' },
  images:      { type: [String], default: [] },
  inStock:     { type: Boolean, default: true },
  stock:       { type: Number, default: 20 },
  isActive:    { type: Boolean, default: true },
  isFeatured:  { type: Boolean, default: false },
  discount:    { type: Number, default: 0 },
  offerTag:    { type: String, default: '' },
  description: { type: String, default: '' },
  unit:        { type: String, default: '1 kg' },
  isTrending:  { type: Boolean, default: false },
  isBestSeller:{ type: Boolean, default: false },
}, { timestamps: true });

// Sync nameTamil and tamilName before save
productSchema.pre('save', function (next) {
  if (this.nameTamil && !this.tamilName) {
    this.tamilName = this.nameTamil;
  } else if (this.tamilName && !this.nameTamil) {
    this.nameTamil = this.tamilName;
  } else if (this.isModified('nameTamil')) {
    this.tamilName = this.nameTamil;
  } else if (this.isModified('tamilName')) {
    this.nameTamil = this.tamilName;
  }
  next();
});

productSchema.pre('findOneAndUpdate', function () {
  const update = this.getUpdate();
  if (update) {
    if (update.nameTamil && !update.tamilName) update.tamilName = update.nameTamil;
    else if (update.tamilName && !update.nameTamil) update.nameTamil = update.tamilName;
    else if (update.$set) {
      if (update.$set.nameTamil && !update.$set.tamilName) update.$set.tamilName = update.$set.nameTamil;
      else if (update.$set.tamilName && !update.$set.nameTamil) update.$set.nameTamil = update.$set.tamilName;
    }
  }
});

productSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    if (ret.nameTamil && !ret.tamilName) ret.tamilName = ret.nameTamil;
    if (ret.tamilName && !ret.nameTamil) ret.nameTamil = ret.tamilName;
    return ret;
  }
});
productSchema.set('toObject', {
  virtuals: true,
  transform: (doc, ret) => {
    if (ret.nameTamil && !ret.tamilName) ret.tamilName = ret.nameTamil;
    if (ret.tamilName && !ret.nameTamil) ret.nameTamil = ret.tamilName;
    return ret;
  }
});

// Prevent exact duplicate product names per category
productSchema.index({ name: 1, category: 1 }, { unique: true });
productSchema.index({ name: 1 });
productSchema.index({ category: 1 });

const Product = mongoose.model('Product', productSchema);
export default Product;

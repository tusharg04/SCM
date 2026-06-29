const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  }
}, { _id: false });

const quotationItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  pricePerUnit: {
    type: Number,
    required: true,
    min: 0
  },
  gst: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  }
}, { _id: false });

const quotationSchema = new mongoose.Schema({
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [quotationItemSchema],
  totalValue: {
    type: Number,
    required: true
  },
  rank: {
    type: Number
  }
}, { timestamps: true });

const orderSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  items: [itemSchema],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  selectedSellers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  quotations: [quotationSchema],
  isBiddingActive: {
    type: Boolean,
    default: true
  },
  biddingEndedAt: {
    type: Date
  }
}, {
  timestamps: true
});

orderSchema.methods.calculateRanks = function() {
  const order = this;
  if (order.quotations.length === 0) return;
  
  // Sort quotations by totalValue in ascending order
  const sortedQuotations = [...order.quotations].sort((a, b) => a.totalValue - b.totalValue);
  
  // Assign ranks
  sortedQuotations.forEach((quotation, index) => {
    const originalQuotation = order.quotations.find(q => q.seller.equals(quotation.seller));
    if (originalQuotation) {
      originalQuotation.rank = index + 1;
    }
  });
};

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
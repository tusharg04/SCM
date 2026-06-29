const Order = require('../models/Order');
const User = require('../models/User');
const mongoose = require('mongoose');

// Create an order
exports.createOrder = async (req, res) => {
  try {
    const { title, description, items, selectedSellers } = req.body;
    console.log('📝 Create Order Payload:', req.body);

    if (!title || !Array.isArray(items) || items.length === 0 || !Array.isArray(selectedSellers) || selectedSellers.length === 0) {
      return res.status(400).json({ error: 'Title, items, and selected sellers are required and must be valid.' });
    }

    // Validate each item
    for (const [index, item] of items.entries()) {
      if (!item.name || isNaN(item.quantity) || item.quantity <= 0) {
        return res.status(400).json({ error: `Invalid item at position ${index + 1}` });
      }
    }

    // Validate seller ObjectIds
    const areValidIds = selectedSellers.every(id => mongoose.Types.ObjectId.isValid(id));
    if (!areValidIds) {
      return res.status(400).json({ error: 'One or more seller IDs are invalid' });
    }

    // Check if all sellers are valid and active
    const validSellers = await User.find({
      _id: { $in: selectedSellers },
      role: 'seller',
      isActive: true
    });

    if (validSellers.length !== selectedSellers.length) {
      return res.status(400).json({ error: 'One or more selected sellers are invalid or inactive' });
    }

    const order = new Order({
      title,
      description: description || '',
      items: items.map(item => ({
        name: item.name,
        quantity: item.quantity
      })),
      createdBy: req.user._id,
      selectedSellers,
      isBiddingActive: true
    });

    await order.save();

    const created = await Order.findById(order._id)
      .populate('createdBy', 'name email')
      .populate('selectedSellers', 'name email');

    res.status(201).json(created);
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({ error: 'Failed to create order.' });
  }
};

// List orders based on user role
exports.listOrders = async (req, res) => {
  try {
    let orders;

    if (req.user.role === 'admin') {
      orders = await Order.find()
        .populate('createdBy', 'name email')
        .populate('selectedSellers', 'name email')
        .populate('quotations.seller', 'name email');
    } else if (req.user.role === 'agent') {
      orders = await Order.find({ createdBy: req.user._id })
        .populate('selectedSellers', 'name email')
        .populate('quotations.seller', 'name email');
    } else if (req.user.role === 'seller') {
      orders = await Order.find({
        selectedSellers: req.user._id,
        isBiddingActive: true
      }).populate('createdBy', 'name email');
    }

    res.json(orders);
  } catch (error) {
    console.error('List orders error:', error);
    res.status(500).json({ error: 'Failed to list orders.' });
  }
};

// Get single order
exports.getOrder = async (req, res) => {
  try {
    const { id } = req.params;
    let order;

    if (req.user.role === 'admin') {
      order = await Order.findById(id)
        .populate('createdBy', 'name email')
        .populate('selectedSellers', 'name email')
        .populate('quotations.seller', 'name email');
    } else if (req.user.role === 'agent') {
      order = await Order.findOne({ _id: id, createdBy: req.user._id })
        .populate('selectedSellers', 'name email')
        .populate('quotations.seller', 'name email');
    } else if (req.user.role === 'seller') {
      order = await Order.findOne({
        _id: id,
        selectedSellers: req.user._id
      }).populate('createdBy', 'name email');

      if (order && order.isBiddingActive) {
        const sellerQuotation = order.quotations.find(q =>
          q.seller.equals(req.user._id)
        );
        order.quotations = sellerQuotation ? [sellerQuotation] : [];
      }
    }

    if (!order) return res.status(404).json({ error: 'Order not found or access denied.' });

    res.json(order);
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: 'Failed to retrieve order.' });
  }
};

// Seller submits quotation
exports.submitQuotation = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { items } = req.body;
    const userId = req.user._id;

    const order = await Order.findById(orderId);
    if (!order || !order.isBiddingActive) {
      return res.status(400).json({ message: 'Invalid or closed order' });
    }

    if (!order.selectedSellers.some(id => id.equals(userId))) {
      return res.status(403).json({ message: 'Access denied — not allowed to bid.' });
    }

    const existing = order.quotations.find(q => q.seller.equals(userId));
    if (existing) {
      return res.status(400).json({ message: 'Quotation already submitted' });
    }

    let totalValue = 0;
    for (const item of items) {
      const subtotal = item.pricePerUnit * item.quantity;
      const gstAmount = subtotal * (item.gst / 100);
      totalValue += subtotal + gstAmount;
    }

    order.quotations.push({ seller: userId, items, totalValue });

    order.calculateRanks();
    await order.save();

    res.json({ message: 'Quotation submitted successfully' });
  } catch (error) {
    console.error('Submit quotation error:', error);
    res.status(500).json({ message: 'Failed to submit quotation' });
  }
};

// Seller updates their quotation
exports.updateQuotation = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { items } = req.body;
    const userId = req.user._id;

    const order = await Order.findById(orderId);
    if (!order || !order.isBiddingActive) {
      return res.status(400).json({ message: 'Invalid or closed order' });
    }

    const quotation = order.quotations.find(q => q.seller.equals(userId));
    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    quotation.items = items;

    let totalValue = 0;
    for (const item of items) {
      const subtotal = item.pricePerUnit * item.quantity;
      const gstAmount = subtotal * (item.gst / 100);
      totalValue += subtotal + gstAmount;
    }

    quotation.totalValue = totalValue;
    order.calculateRanks();

    await order.save();
    res.json({ message: 'Quotation updated successfully' });
  } catch (error) {
    console.error('Update quotation error:', error);
    res.status(500).json({ message: 'Failed to update quotation' });
  }
};

// Stop bidding on an order
exports.stopBidding = async (req, res) => {
  try {
    await Order.findByIdAndUpdate(req.params.orderId, { isBiddingActive: false });
    res.json({ message: 'Bidding has been successfully stopped.' });
  } catch (error) {
    console.error('Stop bidding error:', error);
    res.status(500).json({ message: 'Failed to stop bidding.' });
  }
};

// Get data for order creation form
exports.getCreateOrderForm = async (req, res) => {
  try {
    const sellers = await User.find({ role: 'seller', isActive: true }).select('name email');

    res.json({
      success: true,
      sellers,
      defaultItems: [{ name: '', quantity: 1 }]
    });
  } catch (error) {
    console.error('Create form data error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

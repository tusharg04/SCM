const express = require('express');
const router = express.Router();
const { auth, requireRole } = require('../middleware/auth');
const orderController = require('../controllers/orderController');
const User = require('../models/User'); // Add this import

// Add this new route for order creation data
router.get('/orders/creation-data', auth, requireRole('agent'), async (req, res) => {
  try {
    const sellers = await User.find({ role: 'seller', isActive: true })
      .select('_id name email');
    res.json({ sellers });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Existing routes
router.post('/orders', auth, requireRole('agent'), orderController.createOrder);
router.get('/orders', auth, orderController.listOrders);
router.get('/orders/:id', auth, orderController.getOrder);
router.post('/orders/:orderId/quotations', auth, requireRole('seller'), orderController.submitQuotation);
router.patch('/orders/:orderId/stop-bidding', auth, orderController.stopBidding);
router.patch('/orders/:orderId/quotations', auth, requireRole('seller'), orderController.updateQuotation);
module.exports = router;
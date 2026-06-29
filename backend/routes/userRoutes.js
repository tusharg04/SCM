const express = require('express');
const router = express.Router();
const { auth, requireRole } = require('../middleware/auth');
const userController = require('../controllers/userController');

// Public routes
router.post('/login', userController.loginUser);

// Protected routes
router.post('/register', auth, requireRole('admin'), userController.registerUser);
router.post('/logout', auth, userController.logoutUser);
router.get('/profile', auth, userController.getProfile);
router.get('/users', auth, (req, res, next) => {
  // Manual role checking
  if (req.user.role === 'admin' || req.user.role === 'agent') {
    return next();
  }
  return res.status(403).json({ error: 'Access denied' });
}, userController.listUsers);

// Only admin can modify user status
router.patch('/users/:userId/status', auth, requireRole('admin'), userController.updateUserStatus);
// Add this DELETE route
router.delete('/users/:userId', auth, requireRole('admin'), userController.deleteUser);

module.exports = router;
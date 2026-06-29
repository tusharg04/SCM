const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('../config/config');

// Register a new user (Admin only)
exports.registerUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Validate role
    if (!['agent', 'seller'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role specified' });
    }

    // Check for existing user
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // PASS PLAIN PASSWORD — let the model hash it!
    const user = new User({ name, email, password, role });
    await user.save();

    // Generate token
    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
        name: user.name,
      },
      config.JWT_SECRET,
      { expiresIn: '8h' }
    );

    // Return safe user
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.tokens;

    res.status(201).json({ user: userResponse, token });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};


// Login user
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(email,password)
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    console.log(user)
    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }
    
    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate token
    const token = jwt.sign(
      { 
        userId: user._id, 
        role: user.role,
        name: user.name
      }, 
      config.JWT_SECRET,
      { expiresIn: '8h' }
    );
    
    // Save token to user (optional)
    user.tokens = user.tokens.concat({ token });
    await user.save();
    
    // Return user without sensitive data
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.tokens;
    
    res.json({ 
      user: userResponse, 
      token 
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Logout user
exports.logoutUser = async (req, res) => {
  try {
    // Remove current token
    req.user.tokens = req.user.tokens.filter(token => token.token !== req.token);
    await req.user.save();
    
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Logout from all devices
exports.logoutAll = async (req, res) => {
  try {
    // Remove all tokens
    req.user.tokens = [];
    await req.user.save();
    
    res.json({ message: 'Logged out from all devices' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Get current user profile
exports.getProfile = async (req, res) => {
  try {
    const user = req.user.toObject();
    delete user.password;
    delete user.tokens;
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Update user status (Admin only)
exports.updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;
    
    // Validate input
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'Invalid status value' });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Prevent self-deactivation
    if (user._id.equals(req.user._id)) {
      return res.status(400).json({ error: 'Cannot change your own status' });
    }
    
    // Prevent deactivating other admins
    if (user.role === 'admin' && !isActive) {
      return res.status(403).json({ error: 'Cannot deactivate admin users' });
    }
    
    user.isActive = isActive;
    await user.save();
    
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.tokens;
    
    res.json({ user: userResponse });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// List users (Admin only)
exports.listUsers = async (req, res) => {
  try {
    const { role, isActive } = req.query;
    const filter = {};
    
    if (role) filter.role = role;
    if (isActive) filter.isActive = isActive === 'true';
    
    const users = await User.find(filter).select('-password -tokens');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Delete user (Admin only)
exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(userId)
    const user = await User.findById(userId);
    console.log(user)
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Prevent self-deletion
    if (user._id.equals(req.user._id)) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    
    // Prevent deleting other admins
    if (user.role === 'admin') {
      return res.status(403).json({ error: 'Cannot delete admin users' });
    }
    
     await User.deleteOne({ _id: userId });
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};
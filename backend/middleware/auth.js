const User = require('../models/User');
const jwt = require('jsonwebtoken');

const auth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication token missing' });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Use decoded.userId instead of decoded._id
    const user = await User.findOne({ _id: decoded.userId, 'tokens.token': token });

    if (!user) {
      return res.status(401).json({ error: 'Invalid token - user not found' });
    }

    req.token = token;
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth Error:', error.message);
    res.status(401).json({ error: 'Please authenticate.' });
  }
};

const requireRole = (role) => {
  return (req, res, next) => {
    if (req.user.role !== role) {
      return res.status(403).send({ error: 'Access denied.' });
    }
    next();
  };
};

module.exports = { auth, requireRole };
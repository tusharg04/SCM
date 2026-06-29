const mongoose = require('mongoose');
const User = require('../models/User');
const config = require('../config/config');

async function seedDatabase() {
  try {
    await mongoose.connect(config.MONGODB_URI);
    
    // Clear existing data
    await User.deleteMany({});
    
    // Create admin user
    const admin = new User({
      name: 'Admin',
      email: 'admin@example.com',
      password: 'admin123',
      role: 'admin'
    });
    
    await admin.save();
    
    console.log('Database seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
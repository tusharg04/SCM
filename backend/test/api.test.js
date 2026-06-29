import { it, describe, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../app';
import User from '../models/User';
import Order from '../models/Order';
import jwt from 'jsonwebtoken';
import config from '../config/config';

let mongoServer;
let adminToken, agentToken, sellerToken;
let adminUser, agentUser, sellerUser;

const createToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
      role: user.role,
      name: user.name,
    },
    config.JWT_SECRET,
    { expiresIn: '8h' }
  );
};

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // Clear collections
  await User.deleteMany({});
  await Order.deleteMany({});

  // Seed users
  adminUser = await User.create({ name: 'Admin User', email: 'admin@test.com', password: 'password123', role: 'admin' });
  agentUser = await User.create({ name: 'Agent User', email: 'agent@test.com', password: 'password123', role: 'agent' });
  sellerUser = await User.create({ name: 'Seller User', email: 'seller@test.com', password: 'password123', role: 'seller' });

  // Generate tokens
  adminToken = createToken(adminUser);
  agentToken = createToken(agentUser);
  sellerToken = createToken(sellerUser);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('User API', () => {
  it('should allow admin to register a new agent', async () => {
    const res = await request(app)
      .post('/api/register')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'New Agent',
        email: 'newagent@test.com',
        password: 'password123',
        role: 'agent',
      });
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('user');
    expect(res.body.user.email).toBe('newagent@test.com');
  });

  it('should not allow agent to register a user', async () => {
    const res = await request(app)
      .post('/api/register')
      .set('Authorization', `Bearer ${agentToken}`)
      .send({
        name: 'Unauthorized User',
        email: 'unauthorized@test.com',
        password: 'password123',
        role: 'seller',
      });
    expect(res.statusCode).toBe(403);
  });

  it('should allow a user to login and receive a token', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({
        email: 'agent@test.com',
        password: 'password123',
      });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  it('should prevent login with wrong password', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({
        email: 'agent@test.com',
        password: 'wrongpassword',
      });
    expect(res.statusCode).toBe(401);
  });
  
  it('should not allow admin to deactivate themselves', async () => {
    const res = await request(app)
      .patch(`/api/users/${adminUser._id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Cannot change your own status');
  });
  
  it('should not allow admin to delete another admin', async () => {
    // Create another admin user for this test
    const anotherAdmin = await User.create({ name: 'Another Admin', email: 'anotheradmin@test.com', password: 'password123', role: 'admin' });
    
    const res = await request(app)
      .delete(`/api/users/${anotherAdmin._id}`)
      .set('Authorization', `Bearer ${adminToken}`);
      
    expect(res.statusCode).toBe(403);
    expect(res.body.error).toBe('Cannot delete admin users');
  });
});

describe('Order API', () => {
  let orderId;

  it('should allow an agent to create an order', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${agentToken}`)
      .send({
        title: 'Test Order',
        description: 'Order for testing purposes',
        items: [{ name: 'Item 1', quantity: 10 }],
        selectedSellers: [sellerUser._id.toString()],
      });
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('title', 'Test Order');
    orderId = res.body._id;
  });
  
  it('should allow a seller to submit a quotation', async () => {
    const res = await request(app)
      .post(`/api/orders/${orderId}/quotations`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        items: [{ name: 'Item 1', quantity: 10, pricePerUnit: 5, gst: 18 }],
      });
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Quotation submitted successfully');
  });

  it('should allow a seller to update their quotation', async () => {
    const res = await request(app)
      .patch(`/api/orders/${orderId}/quotations`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        items: [{ name: 'Item 1', quantity: 10, pricePerUnit: 4.5, gst: 18 }],
      });
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Quotation updated successfully');
  });
  
  it('should not allow a seller to submit a quotation for an already closed order', async () => {
    await request(app)
      .patch(`/api/orders/${orderId}/stop-bidding`)
      .set('Authorization', `Bearer ${agentToken}`);

    const res = await request(app)
      .post(`/api/orders/${orderId}/quotations`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        items: [{ name: 'Item 2', quantity: 5, pricePerUnit: 10, gst: 5 }],
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Invalid or closed order');
  });
});
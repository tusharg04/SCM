import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import '../assets/styles/pages/Home.css';
const HomePage = () => {
  const { user } = useAuth();

  return (
    <div className="home-container">
      <h1>Welcome to the Bidding System</h1>
      {user && (
        <div className="dashboard-links">
          {user.role === 'admin' && (
            <>
              <Link to="/users" className="dashboard-link">Manage Users</Link>
              <Link to="/orders" className="dashboard-link">View All Orders</Link>
            </>
          )}
          {user.role === 'agent' && (
            <>
              <Link to="/orders/create" className="dashboard-link">Create New Order</Link>
              <Link to="/orders" className="dashboard-link">View My Orders</Link>
            </>
          )}
          {user.role === 'seller' && (
            <Link to="/orders" className="dashboard-link">View Orders for Bidding</Link>
          )}
        </div>
      )}
    </div>
  );
};

export default HomePage;
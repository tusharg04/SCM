import { useState } from 'react';
import api from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import './UserCreate.css'

const UserCreate = ({ onUserCreated }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'agent'
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/register', formData);
      setSuccess('User created successfully!');
      setError(null);
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'agent'
      });
      if (onUserCreated) onUserCreated();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create user');
      setSuccess(null);
    }
  };

  return (
    <div className="user-create">
      <h2>Create New User</h2>
      
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <form onSubmit={handleSubmit} className="user-form">
        <div className="form-group">
          <label>Name:</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Email:</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Password:</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            minLength="6"
            required
          />
        </div>

        <div className="form-group">
          <label>Role:</label>
          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            required
          >
            <option value="agent">Purchasing Agent</option>
            <option value="seller">Seller</option>
          </select>
        </div>

        <button type="submit" className="btn btn-primary">
          Create User
        </button>
      </form>
    </div>
  );
};

export default UserCreate;
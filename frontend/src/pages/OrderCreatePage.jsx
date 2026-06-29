import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';

const OrderCreatePage = () => {
  const navigate = useNavigate();
  const [sellers, setSellers] = useState([]);
  const [selectedSellers, setSelectedSellers] = useState([]);
  const [items, setItems] = useState([{ name: '', quantity: 1 }]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchSellers = async () => {
      try {
        const res = await api.get('/users', { params: { role: 'seller' } });
        setSellers(res.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load sellers');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSellers();
  }, []);

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = field === 'quantity' ? parseInt(value) : value;
    setItems(newItems);
  };

  const handleAddItem = () => {
    setItems([...items, { name: '', quantity: 1 }]);
  };

  const handleRemoveItem = (index) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  const handleSellerSelect = (sellerId) => {
    setSelectedSellers(prev => 
      prev.includes(sellerId)
        ? prev.filter(id => id !== sellerId)
        : [...prev, sellerId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/orders', {
        title,
        description,
        items,
        selectedSellers
      });
      navigate('/orders');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create order');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={styles.loading}>Loading...</div>;
  if (error) return <div style={styles.errorMessage}>{error}</div>;

  return (
    <div style={styles.orderCreateContainer}>
      <h2 style={styles.heading}>Create New Order</h2>
      
      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.formGroup}>
          <label style={styles.label}>Title:</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            style={styles.input}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Description:</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={styles.textarea}
          />
        </div>

        <div style={styles.formSection}>
          <h3 style={styles.sectionHeading}>Items</h3>
          {items.map((item, index) => (
            <div key={index} style={styles.itemRow}>
              <input
                type="text"
                value={item.name}
                onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                placeholder="Item name"
                required
                style={styles.itemInput}
              />
              <input
                type="number"
                min="1"
                value={item.quantity}
                onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                required
                style={styles.quantityInput}
              />
              {items.length > 1 && (
                <button 
                  type="button" 
                  onClick={() => handleRemoveItem(index)}
                  style={styles.dangerButton}
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          <button 
            type="button" 
            onClick={handleAddItem}
            style={styles.secondaryButton}
          >
            Add Item
          </button>
        </div>

        <div style={styles.formSection}>
          <h3 style={styles.sectionHeading}>Select Sellers</h3>
          <div style={styles.sellerList}>
            {sellers.map(seller => (
              <div key={seller._id} style={styles.sellerItem}>
                <input
                  type="checkbox"
                  id={`seller-${seller._id}`}
                  checked={selectedSellers.includes(seller._id)}
                  onChange={() => handleSellerSelect(seller._id)}
                  style={styles.checkbox}
                />
                <label htmlFor={`seller-${seller._id}`} style={styles.sellerLabel}>
                  {seller.name} ({seller.email})
                </label>
              </div>
            ))}
          </div>
        </div>

        <button 
          type="submit" 
          disabled={submitting} 
          style={submitting ? styles.submitButtonDisabled : styles.submitButton}
        >
          {submitting ? 'Creating...' : 'Create Order'}
        </button>
      </form>

      <style>{`
        @media (max-width: 768px) {
          .item-row {
            flex-direction: column;
            gap: 0.5rem;
          }
          .item-row input {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

// CSS Styles
const styles = {
  orderCreateContainer: {
    padding: '2rem',
    maxWidth: '800px',
    margin: '0 auto',
    fontFamily: 'Arial, sans-serif'
  },
  heading: {
    marginBottom: '1.5rem',
    color: '#2c3e50',
    textAlign: 'center'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem'
  },
  formGroup: {
    marginBottom: '1.5rem'
  },
  label: {
    display: 'block',
    marginBottom: '0.5rem',
    fontWeight: '500',
    color: '#2c3e50'
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '1rem'
  },
  textarea: {
    width: '100%',
    minHeight: '100px',
    padding: '0.75rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '1rem',
    resize: 'vertical'
  },
  formSection: {
    padding: '1.5rem',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    marginBottom: '1.5rem'
  },
  sectionHeading: {
    marginBottom: '1rem',
    color: '#2c3e50'
  },
  itemRow: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '1rem',
    alignItems: 'center'
  },
  itemInput: {
    flex: '2',
    padding: '0.5rem',
    border: '1px solid #ddd',
    borderRadius: '4px'
  },
  quantityInput: {
    flex: '1',
    maxWidth: '80px',
    padding: '0.5rem',
    border: '1px solid #ddd',
    borderRadius: '4px'
  },
  sellerList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '1rem',
    marginTop: '1rem'
  },
  sellerItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem',
    backgroundColor: '#f8fafc',
    borderRadius: '4px'
  },
  checkbox: {
    marginRight: '0.5rem'
  },
  sellerLabel: {
    cursor: 'pointer'
  },
  button: {
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: '500',
    transition: 'all 0.2s',
    border: 'none'
  },
  submitButton: {
    backgroundColor: '#2563eb',
    color: 'white',
    padding: '0.75rem 1.5rem',
    fontSize: '1rem',
    borderRadius: '4px',
    cursor: 'pointer',
    border: 'none',
    transition: 'background-color 0.2s'
  },
  submitButtonDisabled: {
    backgroundColor: '#93c5fd',
    color: 'white',
    padding: '0.75rem 1.5rem',
    fontSize: '1rem',
    borderRadius: '4px',
    cursor: 'not-allowed',
    border: 'none'
  },
  secondaryButton: {
    backgroundColor: '#e2e8f0',
    color: '#2c3e50',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    cursor: 'pointer',
    border: 'none',
    transition: 'background-color 0.2s'
  },
  dangerButton: {
    backgroundColor: '#ef4444',
    color: 'white',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    cursor: 'pointer',
    border: 'none',
    transition: 'background-color 0.2s'
  },
  loading: {
    textAlign: 'center',
    padding: '2rem',
    color: '#64748b'
  },
  errorMessage: {
    color: '#ef4444',
    padding: '1rem',
    backgroundColor: '#fee2e2',
    borderRadius: '4px',
    marginBottom: '1rem'
  }
};

export default OrderCreatePage;
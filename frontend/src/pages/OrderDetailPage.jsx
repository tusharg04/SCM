import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';
import '../assets/styles/pages/OrderDetailPage.css';

const OrderDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [order, setOrder] = useState(null);
  const [quotation, setQuotation] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await api.get(`/orders/${id}`);
        const fetchedOrder = res.data;
        setOrder(fetchedOrder);

        if (user?.role === 'seller') {
          const existingQuotation = fetchedOrder.quotations?.find(
            (q) => q?.seller?._id === user._id || q?.seller === user._id
          );

          if (existingQuotation) {
            setQuotation(existingQuotation.items);
          } else {
            setQuotation(
              fetchedOrder.items.map(item => ({
                name: item.name,
                quantity: item.quantity,
                pricePerUnit: 0,
                gst: 0,
              }))
            );
          }
        }
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load order.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [id, user]);

  const handleQuotationChange = (index, field, value) => {
    const updated = [...quotation];
    updated[index][field] =
      field === 'quantity' ? parseInt(value) || 0 : parseFloat(value) || 0;
    setQuotation(updated);
  };

  const handleSubmitQuotation = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const totalValue = quotation.reduce((sum, item) => {
        const subtotal = item.pricePerUnit * item.quantity;
        const gst = subtotal * (item.gst / 100);
        return sum + subtotal + gst;
      }, 0);

      const sellerQuotation = order.quotations.find(
        q => q?.seller?._id === user._id || q?.seller === user._id
      );

      const method = sellerQuotation ? 'patch' : 'post';

      await api[method](`/orders/${id}/quotations`, {
        items: quotation,
        totalValue,
      });

      navigate('/orders');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit quotation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStopBidding = async () => {
    try {
      await api.patch(`/orders/${id}/stop-bidding`);
      setOrder((prev) => ({ ...prev, isBiddingActive: false }));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to stop bidding');
    }
  };

  const calculateItemTotal = (item) => {
    const subtotal = item.pricePerUnit * item.quantity;
    const gst = subtotal * (item.gst / 100);
    return (subtotal + gst).toFixed(2);
  };

  const handleDownloadCSV = () => {
    if (!order || !order.quotations || !order.items) return;

    const items = order.items.map((item) => item.name);

    const sellers = order.quotations.map((q) => ({
      name: q?.seller?.name || 'Seller',
      prices: q.items.reduce((acc, item) => {
        const total =
          item.pricePerUnit * item.quantity * (1 + item.gst / 100);
        acc[item.name] = total;
        return acc;
      }, {}),
    }));

    const header = ['Item Name', ...sellers.map((s) => s.name), 'Best Price'];
    const rows = [header];

    items.forEach((itemName) => {
      const prices = sellers.map(
        (s) => parseFloat(s.prices[itemName] || 0)
      );
      const bestPrice = Math.min(...prices.filter(p => p > 0));
      const row = [
        itemName,
        ...prices.map((p) => (p ? p.toFixed(2) : '')),
        bestPrice > 0 ? bestPrice.toFixed(2) : '',
      ];
      rows.push(row);
    });

    const csvContent = rows
      .map((row) => row.map((col) => `"${col}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${order.title.replace(/\s+/g, '_')}_Seller_Prices.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  if (loading) return <div className="loading">Loading order details...</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (!order) return <div>Order not found</div>;

  const isOrderOwner = order.createdBy._id === user._id;
  const isSeller = user?.role === 'seller';
  const canStopBidding =
    user?.role === 'admin' || (user?.role === 'agent' && isOrderOwner);

  return (
    <div className="order-detail-container">
      <h2>{order.title}</h2>
      <p className="order-description">{order.description}</p>
      <p
        className={`order-status ${
          order.isBiddingActive ? 'active' : 'closed'
        }`}
      >
        Status: {order.isBiddingActive ? 'Bidding Active' : 'Bidding Closed'}
      </p>

      <div className="order-section">
        <h3>Items</h3>
        <table className="items-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Quantity</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, idx) => (
              <tr key={idx}>
                <td>{item.name}</td>
                <td>{item.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isSeller && order.isBiddingActive && (
        <div className="quotation-form">
          <h3>
            {order.quotations.find(
              (q) =>
                q?.seller?._id === user._id || q?.seller === user._id
            )
              ? 'Update Quotation'
              : 'Submit Quotation'}
          </h3>
          <form onSubmit={handleSubmitQuotation}>
            <table className="quotation-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Price/Unit</th>
                  <th>GST %</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {quotation.map((item, index) => (
                  <tr key={index}>
                    <td>{item.name}</td>
                    <td>{item.quantity}</td>
                    <td>
                      <input
                        type="number"
                        value={item.pricePerUnit}
                        onChange={(e) =>
                          handleQuotationChange(
                            index,
                            'pricePerUnit',
                            e.target.value
                          )
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={item.gst}
                        onChange={(e) =>
                          handleQuotationChange(index, 'gst', e.target.value)
                        }
                      />
                    </td>
                    <td>${calculateItemTotal(item)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              type="submit"
              className={`submit-btn ${submitting ? 'submitting' : ''}`}
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit Quotation'}
            </button>
          </form>
        </div>
      )}

      {order.quotations?.length > 0 && (
        <div className="quotations-section">
          <h3>Quotations</h3>
          <table className="quotations-table">
            <thead>
              <tr>
                <th>Seller</th>
                <th>Total Value</th>
                <th>Rank</th>
              </tr>
            </thead>
            <tbody>
              {order.quotations
                .sort((a, b) => a.rank - b.rank)
                .map((q) => (
                  <tr
                    key={q._id}
                    className={
                      (q?.seller?._id || q.seller) === user._id
                        ? 'current-seller'
                        : ''
                    }
                  >
                    <td>{q.seller?.name || 'Seller'}</td>
                    <td>${q.totalValue.toFixed(2)}</td>
                    <td>{q.rank}</td>
                  </tr>
                ))}
            </tbody>
          </table>

          {(user?.role === 'admin' || user?.role === 'agent') && (
            <button
              className="download-csv-btn"
              onClick={handleDownloadCSV}
            >
              Download CSV
            </button>
          )}
        </div>
      )}

      {canStopBidding && order.isBiddingActive && (
        <button
          onClick={handleStopBidding}
          className="stop-bidding-btn"
          disabled={submitting}
        >
          Stop Bidding
        </button>
      )}
    </div>
  );
};

export default OrderDetailPage;

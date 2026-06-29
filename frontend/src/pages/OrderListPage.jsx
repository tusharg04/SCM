import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';
import * as XLSX from 'xlsx';
import '../assets/styles/pages/Orders.css';

const OrderListPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showQuotes, setShowQuotes] = useState({});
  const [openSellerQuotes, setOpenSellerQuotes] = useState({});

  const { user } = useAuth();

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await api.get('/orders');
        setOrders(res.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to fetch orders');
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const handleStopBidding = async (orderId) => {
    try {
      await api.patch(`/orders/${orderId}/stop-bidding`);
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order._id === orderId ? { ...order, isBiddingActive: false } : order
        )
      );
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to stop bidding');
    }
  };

  // ✅ Excel export function
const handleDownloadExcel = (order) => {
  if (!order || !order.items || !order.quotations) return;

  const items = order.items.map(item => item.name);

  const sellers = order.quotations.map(q => ({
    name: q.seller?.name || 'Seller',
    items: q.items.map(item => {
      const subtotal = item.pricePerUnit * item.quantity;
      const gstAmount = subtotal * (item.gst / 100);
      const total = subtotal + gstAmount;

      return {
        name: item.name,
        quantity: item.quantity,
        pricePerUnit: item.pricePerUnit,
        gst: item.gst,
        total: parseFloat(total.toFixed(2)),
      };
    }),
  }));

  // 🔍 Step 1: Determine winners per item
  const itemWinnerMap = {};
  const sellerWinCount = {};

  items.forEach(itemName => {
    const prices = sellers.map(seller => {
      const found = seller.items.find(i => i.name === itemName);
      return found ? { seller: seller.name, total: found.total, item: found } : null;
    }).filter(Boolean);

    if (prices.length === 0) return;

    const bestPrice = Math.min(...prices.map(p => p.total));
    const winners = prices.filter(p => p.total === bestPrice);

    // Count wins
    winners.forEach(({ seller }) => {
      sellerWinCount[seller] = (sellerWinCount[seller] || 0) + 1;
    });

    // Resolve tie: pick seller with most wins
    const bestSeller = winners.reduce((acc, current) =>
      (sellerWinCount[current.seller] || 0) > (sellerWinCount[acc.seller] || 0)
        ? current
        : acc,
      winners[0]
    );

    itemWinnerMap[itemName] = bestSeller;
  });

  // 🧾 Step 2: Build seller → items they won
  const sellerFinalItems = {};
  Object.entries(itemWinnerMap).forEach(([itemName, winner]) => {
    const seller = winner.seller;
    if (!sellerFinalItems[seller]) {
      sellerFinalItems[seller] = [];
    }
    sellerFinalItems[seller].push(winner.item); // Original item object
  });

  // 📘 Sheet 1: Comparison Table
  const comparisonRows = [['Item Name', ...sellers.map(s => s.name), 'Best Price']];

  items.forEach(itemName => {
    const sellerPrices = sellers.map(s => {
      const item = s.items.find(i => i.name === itemName);
      return item ? item.total : 0;
    });

    const best = Math.min(...sellerPrices.filter(p => p > 0));

    const row = [
      itemName,
      ...sellerPrices.map(p =>
        p > 0 && p === best ? `${p.toFixed(2)} ✅ BEST` :
        p > 0 ? p.toFixed(2) : ''
      ),
      best.toFixed(2),
    ];

    comparisonRows.push(row);
  });

  const wsComparison = XLSX.utils.aoa_to_sheet(comparisonRows);

  // 📘 Sheet 2: Seller Wise Breakdown Table
  const breakdownRows = [];

  Object.entries(sellerFinalItems).forEach(([sellerName, items]) => {
    breakdownRows.push([`${sellerName}`]);
    breakdownRows.push(['Item', 'Price/Unit', 'Quantity', 'GST %', 'Total Price']);

    items.forEach(item => {
      breakdownRows.push([
        item.name,
        item.pricePerUnit.toFixed(2),
        item.quantity,
        `${item.gst}%`,
        item.total.toFixed(2),
      ]);
    });

    breakdownRows.push([]); // Blank line between sellers
  });

  const wsBreakdown = XLSX.utils.aoa_to_sheet(breakdownRows);

  // 📦 Final Excel Export
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsComparison, 'Comparison');
  XLSX.utils.book_append_sheet(wb, wsBreakdown, 'Winners Breakdown');

  XLSX.writeFile(wb, `${order.title.replace(/\s+/g, '_')}_Quotes_Report.xlsx`);
};



  if (loading) return <div className="loading">Loading orders...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="order-list-container">
      <h2 className="order-title">
        {user?.role === 'seller' ? 'Orders Available for Bidding' : 'All Orders'}
      </h2>

      {orders.length === 0 ? (
        <p>No orders available</p>
      ) : (
        <div className="orders-grid">
          {orders.map(order => (
            <div key={order._id} className="order-card">
              <h3>
                <Link to={`/orders/${order._id}`}>{order.title}</Link>
              </h3>
              <p>{order.description}</p>
              <p className={`order-status ${order.isBiddingActive ? 'active' : 'closed'}`}>
                {order.isBiddingActive ? 'Bidding Active' : 'Bidding Closed'}
              </p>

              {(user?.role === 'admin' || (user?.role === 'agent' && order.createdBy === user._id)) &&
                order.isBiddingActive && (
                  <button
                    className="stop-bidding-btn"
                    onClick={() => handleStopBidding(order._id)}
                  >
                    Stop Bidding
                  </button>
              )}

              {order.quotations?.length > 0 && (
                <>
                  <button
                    className="toggle-quotes-btn"
                    onClick={() =>
                      setShowQuotes(prev => ({ ...prev, [order._id]: !prev[order._id] }))
                    }
                  >
                    {showQuotes[order._id] ? 'Hide Quotations' : 'View Quotations'}
                  </button>

                  {showQuotes[order._id] && (
                    <>
                      <table className="quotation-table">
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
                            .map(q => (
                              <React.Fragment key={q._id}>
                                <tr
                                  className={
                                    (q?.seller?._id || q.seller) === user._id
                                      ? 'current-seller-row'
                                      : ''
                                  }
                                >
                                  <td>
                                    {q.seller?.name || 'Seller'}
                                    <br />
                                    {(user.role === 'admin' || user.role === 'agent') && (
                                      <button
                                        className="breakdown-btn"
                                        onClick={() =>
                                          setOpenSellerQuotes(prev => ({
                                            ...prev,
                                            [q._id]: !prev[q._id]
                                          }))
                                        }
                                      >
                                        {openSellerQuotes[q._id] ? 'Hide' : 'Show'} Breakdown
                                      </button>
                                    )}
                                  </td>
                                  <td>Rs {q.totalValue.toFixed(2)}</td>
                                  <td>{q.rank}</td>
                                </tr>

                                {openSellerQuotes[q._id] && q.items?.length > 0 && (
                                  <tr>
                                    <td colSpan="3">
                                      <table className="nested-breakdown-table">
                                        <thead>
                                          <tr>
                                            <th>Item</th>
                                            <th>Quantity</th>
                                            <th>Price/Unit</th>
                                            <th>GST %</th>
                                            <th>Total</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {q.items.map((item, idx) => {
                                            const subtotal = item.pricePerUnit * item.quantity;
                                            const gstAmount = subtotal * (item.gst / 100);
                                            return (
                                              <tr key={idx}>
                                                <td>{item.name}</td>
                                                <td>{item.quantity}</td>
                                                <td>Rs {item.pricePerUnit.toFixed(2)}</td>
                                                <td>{item.gst}%</td>
                                                <td>Rs {(subtotal + gstAmount).toFixed(2)}</td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            ))}
                        </tbody>
                      </table>

                      {/* ✅ Download Excel Button */}
                      {(user?.role === 'admin' || user?.role === 'agent') && (
                        <button
                          className="excel-download-btn"
                          onClick={() => handleDownloadExcel(order)}
                        >
                          Download Excel
                        </button>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrderListPage;

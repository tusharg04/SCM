import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import '../assets/styles/components/Navbar.css';
import CompanyLogo from 'C:\\tushar\\SCM_internproject\\frontend\\company_image.jpg'; 

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/">
          <img src={CompanyLogo} alt="Logo" className="navbar-logo" />
          <span className="navbar-title">Bidding System</span>
        </Link>
      </div>
      <div className="navbar-links">
        {user ? (
          <>
            <div className="role-links">
              {/* Show admin-specific links */}
              {user.role === 'admin' && (
                <>
                  <Link to="/admin/users/create" className="nav-link">
                    Create Users
                  </Link>
                  <Link to="/admin/users" className="nav-link">
                    Manage Users
                  </Link>
                  <Link to="/orders" className="nav-link">
                    View All Orders
                  </Link>
                </>
              )}

              {/* Show agent-specific links */}
              {user.role === 'agent' && (
                <>
                  <Link to="/orders/create" className="nav-link">
                    Create Order
                  </Link>
                  <Link to="/orders" className="nav-link">
                    My Orders
                  </Link>
                </>
              )}

              {/* Show seller-specific links */}
              {user.role === 'seller' && (
                <Link to="/orders" className="nav-link">
                  Available Orders
                </Link>
              )}
            </div>

            <div className="user-actions">
              <span className="navbar-user">
                <span className="user-name">{user.name}</span>
                <span className="user-role">({user.role})</span>
              </span>
              <button onClick={handleLogout} className="btn btn-logout">
                Logout
              </button>
            </div>
          </>
        ) : (
          <Link to="/login" className="btn btn-login">
            Login
          </Link>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
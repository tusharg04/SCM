import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import OrderListPage from './pages/OrderListPage';
import OrderDetailPage from './pages/OrderDetailPage';
import PrivateRoute from './components/PrivateRoute';
import UserManagement from './pages/Admin/UserManagement';
import OrderCreatePage from './pages/OrderCreatePage';
import UserCreate from './pages/Admin/UserCreate';
import Header from './components/Header';

function App() {
  return (
    <AuthProvider>
      <div className="app">
        {/* <Header/> */}
        <Navbar />
        <div className="main-content">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<HomePage />} />
            <Route path="/orders" element={
              <PrivateRoute>
                <OrderListPage />
              </PrivateRoute>
            } />
            <Route 
  path="/orders/create" 
  element={
    <PrivateRoute roles={['agent']}>
      <OrderCreatePage />
    </PrivateRoute>
  }
/>
            <Route path="/orders/:id" element={
              <PrivateRoute>
                <OrderDetailPage />
              </PrivateRoute>
            } />
            <Route 
  path="/admin/users" 
  element={
    <PrivateRoute roles={['admin']}>
      <UserManagement />
    </PrivateRoute>
  }
/>
       <Route 
  path="/admin/users/create" 
  element={
    <PrivateRoute roles={['admin']}>
      <UserCreate/>
    </PrivateRoute>
  }
/>
          </Routes>
        </div>
      </div>
    </AuthProvider>
  );
}

export default App;
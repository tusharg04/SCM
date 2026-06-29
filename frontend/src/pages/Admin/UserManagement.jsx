// components/user/UserManagement.jsx
import { useState, useEffect } from 'react';
import api from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import UserCreate from './UserCreate';
import ConfirmationModal from './ConfirmationModal';
import './UserManagement.css';

const UserManagement = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('manage');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionType, setActionType] = useState('');

  useEffect(() => {
    if (currentUser?.role === 'admin' && activeTab === 'manage') {
      fetchUsers();
    }
  }, [currentUser, activeTab]);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleUserCreated = () => {
    setActiveTab('manage');
    fetchUsers();
  };

  const openModal = (user, action) => {
    setSelectedUser(user);
    setActionType(action);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedUser(null);
    setActionType('');
  };

  const handleUserAction = async () => {
    try {
      if (actionType === 'delete') {
        await api.delete(`/users/${selectedUser._id}`);
      } else {
        await api.patch(`/users/${selectedUser._id}/status`, {
          isActive: actionType === 'activate'
        });
      }
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || `Failed to ${actionType} user`);
    } finally {
      closeModal();
    }
  };

  if (currentUser?.role !== 'admin') {
    return <div className="access-denied">Admin access required</div>;
  }

  return (
    <div className="user-management">
      <div className="tabs">
        <button className={activeTab === 'manage' ? 'active' : ''} onClick={() => setActiveTab('manage')}>
          Manage Users
        </button>
        <button className={activeTab === 'create' ? 'active' : ''} onClick={() => setActiveTab('create')}>
          Create User
        </button>
      </div>

      {activeTab === 'create' ? (
        <UserCreate onUserCreated={handleUserCreated} />
      ) : loading ? (
        <div className="loading">Loading users...</div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : (
        <table className="users-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user._id} className={!user.isActive ? 'inactive' : ''}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>
                  <span className={`status-badge ${user.isActive ? 'active' : 'inactive'}`}>
                    {user.isActive ? 'Active' : 'Blocked'}
                  </span>
                </td>
                <td>
                  {user._id !== currentUser._id && (
                    <>
                      <button
                        className={`btn btn-sm ${user.isActive ? 'btn-warning' : 'btn-success'}`}
                        onClick={() => openModal(user, user.isActive ? 'deactivate' : 'activate')}
                      >
                        {user.isActive ? 'Block' : 'Unblock'}
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => openModal(user, 'delete')}>
                        Delete
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <ConfirmationModal
        isOpen={modalOpen}
        onClose={closeModal}
        onConfirm={handleUserAction}
        title={actionType === 'delete' ? 'Delete User' : actionType === 'activate' ? 'Unblock User' : 'Block User'}
      >
        <p>
          Are you sure you want to{' '}
          <strong>{actionType === 'activate' ? 'unblock' : actionType === 'deactivate' ? 'block' : 'delete'}</strong>{' '}
          <strong>{selectedUser?.name}'s</strong> account?
        </p>
      </ConfirmationModal>
    </div>
  );
};

export default UserManagement;

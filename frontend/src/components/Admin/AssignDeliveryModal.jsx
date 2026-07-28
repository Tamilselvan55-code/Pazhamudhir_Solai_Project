import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Search, Loader2 } from 'lucide-react';
import axios from 'axios';
import { API_BASE as config_API_BASE } from '../../config/api';

const API_BASE = `${config_API_BASE}/admin`;

const AssignDeliveryModal = ({ order, token, onClose, onAssignSuccess }) => {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [assigningId, setAssigningId] = useState(null);

  useEffect(() => {
    const fetchPartners = async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/delivery-partners`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        // ONLY Delivery Partners whose status is Available
        const available = data.filter(p => p.status === 'Available');
        setPartners(available);
      } catch (err) {
        setError('Failed to load delivery partners');
      } finally {
        setLoading(false);
      }
    };
    fetchPartners();
  }, [token]);

  const handleAssign = async (partnerId) => {
    setAssigningId(partnerId);
    setError('');
    
    // Check if reassign or normal assign
    const endpoint = order.deliveryPartnerId ? 'reassign-delivery' : 'assign-delivery';
    
    try {
      await axios.post(
        `${API_BASE}/orders/${order.id}/${endpoint}`,
        { deliveryPartnerId: partnerId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onAssignSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Assignment failed');
      setAssigningId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#111827] rounded-3xl max-w-md w-full shadow-2xl border border-white/10 flex flex-col max-h-[85vh]">
        <div className="p-6 border-b border-white/10 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-white">
              {order.deliveryPartnerId ? 'Reassign Delivery Partner' : 'Assign Delivery Partner'}
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              Order {order.invoiceNumber || `#${order.id.slice(-6).toUpperCase()}`}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-10">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              <p className="text-gray-400 mt-4 text-sm font-medium">Finding available partners...</p>
            </div>
          ) : partners.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-400 text-sm font-medium">No available delivery partners found.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {partners.map(partner => (
                <div key={partner.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-blue-500/50 transition-colors">
                  <div>
                    <p className="text-white font-bold">{partner.name} <span className="text-xs text-gray-400 font-normal">({partner.employeeId})</span></p>
                    <p className="text-xs text-gray-400 mt-0.5">{partner.mobile}</p>
                  </div>
                  <button
                    disabled={assigningId !== null}
                    onClick={() => handleAssign(partner.id)}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50"
                  >
                    {assigningId === partner.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Assign'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssignDeliveryModal;

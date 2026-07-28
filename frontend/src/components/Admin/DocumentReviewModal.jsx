import React, { useState } from 'react';
import { X, CheckCircle, XCircle, FileText, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import { API_BASE } from '../../config/api';

const DocumentReviewModal = ({ isOpen, onClose, partner, token, onVerify }) => {
  const [loading, setLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

  if (!isOpen || !partner) return null;

  const handleVerify = async (status) => {
    if (status === 'Rejected' && !rejectReason.trim()) {
      alert('Please provide a reason for rejection.');
      return;
    }

    try {
      setLoading(true);
      await axios.post(`${API_BASE}/admin/delivery-partners/${partner.id}/verify`, {
        status,
        rejectionReason: status === 'Rejected' ? rejectReason : null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      onVerify();
      onClose();
    } catch (err) {
      console.error('Error verifying docs:', err);
      alert('Failed to verify documents');
    } finally {
      setLoading(false);
    }
  };

  const docs = partner.documents;
  const docStatus = docs?.status || 'Missing';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Document Review: {partner.name}
            </h3>
            <p className="text-xs text-gray-500 mt-1">Review and approve delivery partner documents.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {!docs ? (
            <div className="text-center py-10">
              <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
              <p className="text-sm font-bold text-gray-800">No Documents Uploaded</p>
              <p className="text-xs text-gray-500 mt-1">This partner has not uploaded any documents yet.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: 'Driving License', url: docs.drivingLicense },
                  { label: 'Government ID', url: docs.governmentId },
                  { label: 'Vehicle Registration', url: docs.vehicleRegistration },
                  { label: 'Insurance Certificate', url: docs.insuranceCertificate },
                  { label: 'Vehicle Photo', url: docs.vehiclePhoto }
                ].map((doc, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-xl p-4">
                    <p className="text-xs font-bold text-gray-700 mb-2">{doc.label}</p>
                    {doc.url ? (
                      <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                        <FileText className="w-4 h-4" /> View Document
                      </a>
                    ) : (
                      <span className="text-sm text-gray-400 italic">Not provided</span>
                    )}
                  </div>
                ))}
              </div>

              {docStatus === 'Pending' && (
                <div className="pt-4 border-t border-gray-100 space-y-4">
                  {showRejectInput ? (
                    <div className="space-y-3">
                      <label className="block text-xs font-bold text-gray-700">Reason for Rejection</label>
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm h-24"
                        placeholder="E.g., Driving license is expired..."
                        required
                      ></textarea>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleVerify('Rejected')}
                          disabled={loading || !rejectReason.trim()}
                          className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold disabled:opacity-50"
                        >
                          {loading ? 'Processing...' : 'Confirm Rejection'}
                        </button>
                        <button
                          onClick={() => setShowRejectInput(false)}
                          className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-bold"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowRejectInput(true)}
                        className="flex-1 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
                      >
                        <XCircle className="w-4 h-4" /> Reject Documents
                      </button>
                      <button
                        onClick={() => handleVerify('Approved')}
                        disabled={loading}
                        className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" /> Approve & Verify
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentReviewModal;

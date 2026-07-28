import React, { useState, useEffect } from 'react';
import { AlertCircle, Upload, CheckCircle, Clock, XCircle, FileImage, ShieldAlert } from 'lucide-react';
import axios from 'axios';
import { API_BASE } from '../../config/api';

const DocumentVerification = ({ token, isVerified }) => {
  const [docs, setDocs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    drivingLicense: '',
    governmentId: '',
    vehicleRegistration: '',
    insuranceCertificate: '',
    vehiclePhoto: ''
  });

  useEffect(() => {
    fetchDocs();
  }, [token]);

  const fetchDocs = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${API_BASE}/delivery/documents`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (data.documents) {
        setDocs(data.documents);
        setFormData({
          drivingLicense: data.documents.drivingLicense || '',
          governmentId: data.documents.governmentId || '',
          vehicleRegistration: data.documents.vehicleRegistration || '',
          insuranceCertificate: data.documents.insuranceCertificate || '',
          vehiclePhoto: data.documents.vehiclePhoto || ''
        });
      }
    } catch (err) {
      console.error('Failed to fetch docs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setError('');
    setUploading(true);

    try {
      const { data } = await axios.post(`${API_BASE}/delivery/documents`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDocs(data.documents);
      alert('Documents submitted successfully for verification.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit documents.');
    } finally {
      setUploading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6 flex justify-center shadow-sm">
        <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const status = docs?.status || 'Missing';

  return (
    <div className="bg-white overflow-hidden shadow-sm rounded-2xl border border-gray-100 mb-8">
      <div className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-lg leading-6 font-bold text-gray-900 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-gray-700" />
              Document Verification
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              Upload required documents to activate your delivery account.
            </p>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
            isVerified ? 'bg-green-50 text-green-700 border-green-200' :
            status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
            status === 'Rejected' ? 'bg-red-50 text-red-700 border-red-200' :
            'bg-gray-100 text-gray-600 border-gray-200'
          }`}>
            {isVerified ? <CheckCircle className="w-3.5 h-3.5" /> :
             status === 'Pending' ? <Clock className="w-3.5 h-3.5" /> :
             status === 'Rejected' ? <XCircle className="w-3.5 h-3.5" /> :
             <AlertCircle className="w-3.5 h-3.5" />}
            {isVerified ? 'Verified' : status}
          </div>
        </div>

        {status === 'Rejected' && docs?.rejectionReason && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-red-800">Verification Rejected</p>
              <p className="text-xs text-red-600 mt-1">{docs.rejectionReason}</p>
            </div>
          </div>
        )}

        {(!docs || status === 'Rejected' || status === 'Missing') ? (
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: 'drivingLicense', label: 'Driving License URL' },
                { key: 'governmentId', label: 'Govt ID (Aadhaar/PAN) URL' },
                { key: 'vehicleRegistration', label: 'Vehicle Registration (RC) URL' },
                { key: 'insuranceCertificate', label: 'Insurance Certificate URL' },
                { key: 'vehiclePhoto', label: 'Vehicle Photo URL' }
              ].map(field => (
                <div key={field.key}>
                  <label className="block text-xs font-bold text-gray-700 mb-1">{field.label}</label>
                  <input
                    type="url"
                    required
                    value={formData[field.key]}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-sm"
                  />
                </div>
              ))}
            </div>

            {error && <p className="text-xs text-red-600 font-medium">{error}</p>}

            <div className="pt-2">
              <button
                type="submit"
                disabled={uploading}
                className="w-full py-2.5 bg-orange-600 text-white rounded-xl hover:bg-orange-700 text-sm font-bold disabled:opacity-70 flex items-center justify-center gap-2 transition-colors"
              >
                {uploading ? 'Submitting...' : (
                  <>
                    <Upload className="w-4 h-4" />
                    Submit Documents
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            {status === 'Pending' ? (
              <div className="text-center py-6">
                <Clock className="w-10 h-10 text-amber-500 mx-auto mb-3" />
                <p className="text-sm font-bold text-gray-800">Review in Progress</p>
                <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
                  Your documents are currently being reviewed by the admin. You'll be able to accept orders once approved.
                </p>
              </div>
            ) : (
              <div className="text-center py-6">
                <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-3" />
                <p className="text-sm font-bold text-gray-800">All Documents Verified</p>
                <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
                  Your account is fully verified. You can now go online and accept delivery assignments.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentVerification;

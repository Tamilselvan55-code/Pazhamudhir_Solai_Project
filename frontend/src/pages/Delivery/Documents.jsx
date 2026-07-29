import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { AlertCircle, Upload, CheckCircle, Clock, XCircle, FileImage, ShieldAlert, ArrowLeft, Camera, Image as ImageIcon, Trash2, Loader2 } from 'lucide-react';
import axios from 'axios';
import { API_BASE } from '../../config/api';

const compressImage = (file, maxWidth = 1000) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(maxWidth / img.width, 1);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
      img.onerror = (e) => reject(e);
    };
    reader.onerror = (e) => reject(e);
  });
};

const DocumentCard = ({ title, fieldKey, value, status, isVerified, onChange }) => {
  const fileInputRef = useRef(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be under 5MB');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Only JPG/PNG images are allowed');
      return;
    }

    setIsProcessing(true);
    setError(null);
    try {
      const base64Url = await compressImage(file);
      onChange(fieldKey, base64Url);
    } catch (err) {
      setError('Failed to process image');
    } finally {
      setIsProcessing(false);
    }
  };

  const isReadOnly = isVerified || status === 'Pending';

  return (
    <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm relative overflow-hidden">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${value ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400'}`}>
            <FileImage className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-900">{title}</h4>
            <p className="text-[10px] text-gray-400 font-semibold uppercase">{value ? 'Uploaded' : 'Required'}</p>
          </div>
        </div>
        {value && <CheckCircle className="w-5 h-5 text-green-500" />}
      </div>

      {error && <p className="text-xs text-red-600 font-semibold mb-3">{error}</p>}

      {value ? (
        <div className="relative group rounded-2xl overflow-hidden bg-gray-50 aspect-video border border-gray-100 flex items-center justify-center">
          {value.startsWith('data:image') || value.startsWith('http') ? (
            <img src={value} alt={title} className="w-full h-full object-contain" />
          ) : (
            <span className="text-xs text-gray-500">Document URL Provided</span>
          )}
          
          {!isReadOnly && (
            <button 
              onClick={() => onChange(fieldKey, '')}
              className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        <div>
          <input 
            type="file" 
            accept="image/jpeg, image/png, image/webp" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleFile} 
          />
          <button 
            disabled={isReadOnly || isProcessing}
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-gray-500 hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50"
          >
            {isProcessing ? (
              <Loader2 className="w-6 h-6 animate-spin text-green-500 mb-2" />
            ) : (
              <Upload className="w-6 h-6 mb-2 text-gray-400" />
            )}
            <span className="text-xs font-bold">{isProcessing ? 'Processing...' : 'Upload Document'}</span>
          </button>
        </div>
      )}
    </div>
  );
};

const DeliveryDocuments = () => {
  const { partner } = useOutletContext();
  const [docs, setDocs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    drivingLicense: '',
    governmentId: '',
    vehicleRegistration: '',
    insuranceCertificate: '',
    vehiclePhoto: ''
  });

  const getToken = () => {
    const stored = localStorage.getItem('deliveryPartnerInfo');
    return stored ? JSON.parse(stored).token : null;
  };

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/delivery/documents`, {
          headers: { Authorization: `Bearer ${getToken()}` }
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
    fetchDocs();
  }, []);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setError('');
    
    // Validate all required
    const required = ['drivingLicense', 'governmentId', 'vehicleRegistration', 'vehiclePhoto'];
    for (const req of required) {
      if (!formData[req]) {
        setError(`Please upload all required documents`);
        return;
      }
    }

    setUploading(true);
    try {
      const { data } = await axios.post(`${API_BASE}/delivery/documents`, formData, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      setDocs(data.documents);
      alert('Documents submitted successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit documents.');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const status = docs?.status || 'Missing';
  const isVerified = partner?.isVerified;

  const StatusBanner = () => {
    if (isVerified) {
      return (
        <div className="bg-green-50 border border-green-100 p-4 rounded-2xl flex items-start gap-3 mb-6">
          <CheckCircle className="w-6 h-6 text-green-600 shrink-0" />
          <div>
            <h3 className="text-sm font-bold text-green-900">Account Verified</h3>
            <p className="text-xs text-green-700 mt-1">All your documents are approved. You are ready to deliver.</p>
          </div>
        </div>
      );
    }
    if (status === 'Pending') {
      return (
        <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-start gap-3 mb-6">
          <Clock className="w-6 h-6 text-amber-600 shrink-0" />
          <div>
            <h3 className="text-sm font-bold text-amber-900">Under Review</h3>
            <p className="text-xs text-amber-700 mt-1">Your documents are being verified by our team. This usually takes 24 hours.</p>
          </div>
        </div>
      );
    }
    if (status === 'Rejected') {
      return (
        <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-start gap-3 mb-6">
          <XCircle className="w-6 h-6 text-red-600 shrink-0" />
          <div>
            <h3 className="text-sm font-bold text-red-900">Verification Rejected</h3>
            <p className="text-xs text-red-700 mt-1">{docs?.rejectionReason || 'Please re-upload clear copies of your documents.'}</p>
          </div>
        </div>
      );
    }
    return (
      <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-start gap-3 mb-6">
        <ShieldAlert className="w-6 h-6 text-blue-600 shrink-0" />
        <div>
          <h3 className="text-sm font-bold text-blue-900">Action Required</h3>
          <p className="text-xs text-blue-700 mt-1">Upload your driving license, ID, and vehicle documents to start earning.</p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-[100dvh] bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white px-4 pt-10 pb-4 shadow-sm border-b border-gray-100 z-10 sticky top-0 flex items-center gap-3">
        <Link to="/delivery/profile" className="w-10 h-10 flex items-center justify-center bg-gray-50 rounded-full active:bg-gray-100">
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </Link>
        <h1 className="text-2xl font-black text-gray-900">Documents</h1>
      </div>

      <div className="flex-1 p-4 sm:p-6 pb-24 overflow-y-auto">
        <StatusBanner />

        <form onSubmit={handleUpload} className="space-y-4">
          <DocumentCard 
            title="Driving License" 
            fieldKey="drivingLicense" 
            value={formData.drivingLicense} 
            onChange={handleChange} 
            status={status} 
            isVerified={isVerified} 
          />
          <DocumentCard 
            title="Aadhaar / PAN Card" 
            fieldKey="governmentId" 
            value={formData.governmentId} 
            onChange={handleChange} 
            status={status} 
            isVerified={isVerified} 
          />
          <DocumentCard 
            title="Vehicle RC" 
            fieldKey="vehicleRegistration" 
            value={formData.vehicleRegistration} 
            onChange={handleChange} 
            status={status} 
            isVerified={isVerified} 
          />
          <DocumentCard 
            title="Vehicle Photo" 
            fieldKey="vehiclePhoto" 
            value={formData.vehiclePhoto} 
            onChange={handleChange} 
            status={status} 
            isVerified={isVerified} 
          />
          
          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-xl text-xs font-bold border border-red-100 text-center">
              {error}
            </div>
          )}

          {(!isVerified && status !== 'Pending') && (
            <div className="pt-4">
              <button
                type="submit"
                disabled={uploading}
                className="w-full py-4 bg-green-600 text-white rounded-2xl text-sm font-bold disabled:bg-gray-300 disabled:shadow-none active:bg-green-700 shadow-lg shadow-green-600/30 transition-all flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Submitting...</>
                ) : (
                  <><Upload className="w-5 h-5" /> Submit for Verification</>
                )}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default DeliveryDocuments;

import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext, Link, useNavigate } from 'react-router-dom';
import { AlertCircle, Upload, CheckCircle, Clock, XCircle, FileImage, ShieldAlert, ArrowLeft, Loader2, Trash2, Calendar } from 'lucide-react';
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
  
  // Mock Dates for enterprise feel
  const mockUploadDate = value ? new Date().toLocaleDateString('en-IN') : '--';
  const mockExpiryDate = value ? new Date(Date.now() + 31536000000).toLocaleDateString('en-IN') : '--';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden transition-colors group hover:shadow-md">
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${value ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'bg-gray-50 dark:bg-gray-700 text-gray-400 dark:text-gray-500'}`}>
            <FileImage className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-base font-black text-gray-900 dark:text-white">{title}</h4>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${value ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                {value ? 'Uploaded' : 'Required'}
              </span>
            </div>
          </div>
        </div>
        {value && <CheckCircle className="w-6 h-6 text-green-500 dark:text-green-400" />}
      </div>

      {error && <p className="text-xs text-red-600 dark:text-red-400 font-semibold mb-4">{error}</p>}

      {value ? (
        <div className="space-y-4">
          <div className="relative group rounded-2xl overflow-hidden bg-gray-50 dark:bg-gray-900 aspect-[16/9] border border-gray-100 dark:border-gray-700 flex items-center justify-center transition-colors">
            {value.startsWith('data:image') || value.startsWith('http') ? (
              <img src={value} alt={title} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs text-gray-500 dark:text-gray-400">Document Provided</span>
            )}
            
            {!isReadOnly && (
              <button 
                onClick={() => onChange(fieldKey, '')}
                className="absolute top-3 right-3 w-10 h-10 bg-red-500/90 hover:bg-red-500 backdrop-blur-sm text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>
          
          <div className="flex justify-between items-center px-2 py-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1"><Upload className="w-3 h-3"/> Uploaded On</span>
              <span className="text-xs font-semibold text-gray-900 dark:text-white mt-0.5">{mockUploadDate}</span>
            </div>
            <div className="h-6 w-px bg-gray-200 dark:bg-gray-600"></div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1"><Calendar className="w-3 h-3"/> Valid Till</span>
              <span className="text-xs font-semibold text-gray-900 dark:text-white mt-0.5">{mockExpiryDate}</span>
            </div>
          </div>
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
            className="w-full py-8 border-2 border-dashed border-indigo-200 dark:border-indigo-900/50 rounded-2xl flex flex-col items-center justify-center text-indigo-500 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/10 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all disabled:opacity-50"
          >
            {isProcessing ? (
              <Loader2 className="w-8 h-8 animate-spin mb-3" />
            ) : (
              <Upload className="w-8 h-8 mb-3" />
            )}
            <span className="text-sm font-bold">{isProcessing ? 'Processing...' : 'Upload Document'}</span>
            <span className="text-[10px] font-semibold text-gray-400 mt-2">JPG, PNG up to 5MB</span>
          </button>
        </div>
      )}
    </div>
  );
};

const DeliveryDocuments = () => {
  const { partner, setPartner } = useOutletContext();
  const navigate = useNavigate();
  const [docs, setDocs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

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
      setPartner(prev => ({ ...prev, status: 'Pending' }));
      setSuccessMsg('Documents submitted successfully! Your account is now under review.');
      setTimeout(() => navigate('/delivery/profile'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit documents.');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-gray-50 dark:bg-gray-950 flex items-center justify-center transition-colors">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500">Loading documents...</p>
        </div>
      </div>
    );
  }

  const status = docs?.status || 'Missing';
  const isVerified = partner?.isVerified;

  const StatusBanner = () => {
    if (isVerified) {
      return (
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-6 rounded-3xl flex items-center gap-4 mb-8 text-white shadow-lg shadow-green-500/20">
          <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center shrink-0 backdrop-blur-sm border border-white/30">
            <CheckCircle className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-black tracking-tight">Account Verified</h3>
            <p className="text-sm font-medium text-green-50 mt-1">All your documents are approved. You are ready to deliver.</p>
          </div>
        </div>
      );
    }
    if (status === 'Pending') {
      return (
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 rounded-3xl flex items-center gap-4 mb-8 text-white shadow-lg shadow-orange-500/20">
          <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center shrink-0 backdrop-blur-sm border border-white/30">
            <Clock className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-black tracking-tight">Under Review</h3>
            <p className="text-sm font-medium text-amber-50 mt-1">Your documents are being verified by our team. This usually takes 24 hours.</p>
          </div>
        </div>
      );
    }
    if (status === 'Rejected') {
      return (
        <div className="bg-gradient-to-r from-red-500 to-rose-500 p-6 rounded-3xl flex items-center gap-4 mb-8 text-white shadow-lg shadow-red-500/20">
          <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center shrink-0 backdrop-blur-sm border border-white/30">
            <XCircle className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-black tracking-tight">Verification Rejected</h3>
            <p className="text-sm font-medium text-red-50 mt-1">{docs?.rejectionReason || 'Please re-upload clear copies of your documents.'}</p>
          </div>
        </div>
      );
    }
    return (
      <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-6 rounded-3xl flex items-center gap-4 mb-8 text-white shadow-lg shadow-blue-500/20">
        <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center shrink-0 backdrop-blur-sm border border-white/30">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <div>
          <h3 className="text-lg font-black tracking-tight">Action Required</h3>
          <p className="text-sm font-medium text-blue-50 mt-1">Upload your driving license, ID, and vehicle documents to start earning.</p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-[100dvh] bg-gray-50 dark:bg-gray-950 flex flex-col transition-colors duration-300">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 px-5 pt-8 pb-5 shadow-sm border-b border-gray-100 dark:border-gray-800 z-10 sticky top-0 flex items-center gap-4 transition-colors">
        <Link to="/delivery/profile" className="w-9 h-9 flex items-center justify-center bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
          <ArrowLeft className="w-4 h-4 text-gray-700 dark:text-gray-300" />
        </Link>
        <div>
          <h1 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Document Center</h1>
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mt-0.5">Manage your verification documents</p>
        </div>
      </div>

      <div className="flex-1 p-4 sm:p-6 pb-24 overflow-y-auto max-w-4xl mx-auto w-full">
        <StatusBanner />

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-2xl mb-6 text-sm font-bold flex items-center gap-2 border border-red-100 dark:border-red-900/30">
            <AlertCircle className="w-5 h-5" /> {error}
          </div>
        )}
        
        {successMsg && (
          <div className="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 p-4 rounded-2xl mb-6 text-sm font-bold flex items-center gap-2 border border-green-100 dark:border-green-900/30">
            <CheckCircle className="w-5 h-5" /> {successMsg}
          </div>
        )}

        <form onSubmit={handleUpload} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
          </div>

          {(!isVerified && status !== 'Pending') && (
            <div className="pt-6 border-t border-gray-100 dark:border-gray-700">
              <button
                type="submit"
                disabled={uploading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/30 disabled:opacity-70 disabled:hover:bg-indigo-600 text-lg"
              >
                {uploading ? (
                  <><Loader2 className="w-6 h-6 animate-spin" /> Submitting...</>
                ) : (
                  <><Upload className="w-6 h-6" /> Submit for Verification</>
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

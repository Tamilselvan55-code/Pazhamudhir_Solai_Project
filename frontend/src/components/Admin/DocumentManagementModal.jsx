import React, { useState, useRef } from 'react';
import { X, CheckCircle, XCircle, FileText, AlertTriangle, UploadCloud, Eye, Trash2, Loader2, Image as ImageIcon } from 'lucide-react';
import axios from 'axios';
import { API_BASE } from '../../config/api';
import useModal from '../../hooks/useModal';

const DocumentManagementModal = ({ isOpen, onClose, partner, token, onVerify }) => {
  const { toast } = useModal();
  const [loadingDoc, setLoadingDoc] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectDocType, setRejectDocType] = useState(null);
  const [activeTab, setActiveTab] = useState('Profile Photo');
  const fileInputRef = useRef(null);

  if (!isOpen || !partner) return null;

  const docs = partner.documents || {};

  const tabs = [
    'Profile Photo',
    'Aadhaar',
    'Driving License',
    'RC Book',
    'Vehicle Insurance'
  ];

  const getDocData = (type) => {
    switch (type) {
      case 'Profile Photo': return { url: partner.profileImage, status: null };
      case 'Aadhaar': return { url: docs.governmentId, status: docs.governmentIdStatus };
      case 'Driving License': return { url: docs.drivingLicense, status: docs.drivingLicenseStatus };
      case 'RC Book': return { url: docs.vehicleRegistration, status: docs.vehicleRegistrationStatus };
      case 'Vehicle Insurance': return { url: docs.insuranceCertificate, status: docs.insuranceCertificateStatus };
      default: return { url: null, status: 'Pending' };
    }
  };

  const handleFileUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast({ type: 'error', message: 'Only JPG, JPEG, PNG, and WEBP formats are supported.' });
      return;
    }

    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({ type: 'error', message: 'File size exceeds 5MB limit.' });
      return;
    }

    try {
      setLoadingDoc(type);
      
      // Upload image
      const formData = new FormData();
      formData.append('images', file);
      
      const uploadRes = await axios.post(`${API_BASE}/admin/upload`, formData, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      const documentUrl = uploadRes.data.urls[0];

      // Update partner data
      if (type === 'Profile Photo') {
        await axios.put(`${API_BASE}/admin/delivery-partners/${partner.id}`, 
          { profileImage: documentUrl },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        await axios.put(`${API_BASE}/admin/delivery-partners/${partner.id}/documents`, 
          { documentType: type, documentUrl },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      toast({ type: 'success', message: `${type} uploaded successfully.` });
      onVerify(); // Refresh data
    } catch (err) {
      console.error('Error uploading doc:', err);
      toast({ type: 'error', message: `Failed to upload ${type}` });
    } finally {
      setLoadingDoc(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemove = async (type) => {
    if (!window.confirm(`Are you sure you want to remove ${type}?`)) return;
    
    try {
      setLoadingDoc(type);
      if (type === 'Profile Photo') {
        await axios.put(`${API_BASE}/admin/delivery-partners/${partner.id}`, 
          { profileImage: '' }, // empty string clears it
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        await axios.put(`${API_BASE}/admin/delivery-partners/${partner.id}/documents`, 
          { documentType: type, documentUrl: '' }, 
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      toast({ type: 'success', message: `${type} removed successfully.` });
      onVerify();
    } catch (err) {
      console.error('Error removing doc:', err);
      toast({ type: 'error', message: `Failed to remove ${type}` });
    } finally {
      setLoadingDoc(null);
    }
  };

  const handleVerify = async (type, status) => {
    if (status === 'Rejected' && (!rejectReason.trim() || rejectDocType !== type)) {
      setRejectDocType(type);
      return; // Open reject input
    }

    try {
      setLoadingDoc(type);
      await axios.post(`${API_BASE}/admin/delivery-partners/${partner.id}/verify`, {
        status,
        documentType: type,
        rejectionReason: status === 'Rejected' ? rejectReason : null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast({ type: 'success', message: `${type} ${status.toLowerCase()} successfully.` });
      setRejectDocType(null);
      setRejectReason('');
      onVerify();
    } catch (err) {
      console.error('Error verifying doc:', err);
      toast({ type: 'error', message: `Failed to verify ${type}` });
    } finally {
      setLoadingDoc(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0F172A] rounded-3xl w-full max-w-4xl h-[85vh] shadow-2xl flex flex-col overflow-hidden border border-slate-700/60 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-700/60 flex justify-between items-center bg-slate-900/60">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <FileText className="w-6 h-6 text-blue-500" />
              Document Management
            </h3>
            <p className="text-sm text-slate-400 mt-1">Manage profile and verification documents for {partner.name} ({partner.employeeId})</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar Tabs */}
          <div className="w-64 border-r border-slate-700/60 bg-slate-900/40 overflow-y-auto">
            {tabs.map(tab => {
              const { status, url } = getDocData(tab);
              return (
                <button
                  key={tab}
                  onClick={() => { setActiveTab(tab); setRejectDocType(null); setRejectReason(''); }}
                  className={`w-full text-left px-5 py-4 border-b border-slate-700/40 transition-colors flex flex-col gap-1 ${activeTab === tab ? 'bg-blue-500/10 border-l-4 border-l-blue-500 text-blue-400' : 'text-slate-300 hover:bg-white/5 border-l-4 border-l-transparent'}`}
                >
                  <span className="font-semibold text-sm">{tab}</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${url ? 'bg-slate-800 text-slate-300' : 'bg-red-500/20 text-red-400'}`}>
                      {url ? 'Uploaded' : 'Missing'}
                    </span>
                    {tab !== 'Profile Photo' && url && status && (
                      <span className={`text-[10px] uppercase font-bold tracking-wider ${
                        status === 'Approved' ? 'text-green-400' : 
                        status === 'Rejected' ? 'text-red-400' : 'text-amber-400'
                      }`}>
                        {status}
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Main Content Area */}
          <div className="flex-1 p-6 overflow-y-auto bg-[#0F172A]">
            <div className="max-w-2xl mx-auto space-y-6">
              
              <div className="flex justify-between items-center pb-4 border-b border-slate-700/60">
                <h4 className="text-lg font-bold text-white">{activeTab}</h4>
                {activeTab !== 'Profile Photo' && (
                  <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                    getDocData(activeTab).status === 'Approved' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                    getDocData(activeTab).status === 'Rejected' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                    'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}>
                    Status: {getDocData(activeTab).status || 'Pending'}
                  </div>
                )}
              </div>

              {/* Upload/Preview Section */}
              <div className="space-y-6">
                {getDocData(activeTab).url ? (
                  <div className="space-y-4">
                    <div className="aspect-[4/3] w-full max-w-md mx-auto bg-slate-900 rounded-2xl border border-slate-700/60 overflow-hidden flex items-center justify-center relative group">
                      <img 
                        src={getDocData(activeTab).url} 
                        alt={activeTab} 
                        className={`w-full h-full object-contain ${activeTab === 'Profile Photo' ? 'object-cover rounded-full max-w-[200px] max-h-[200px] my-6 aspect-square' : ''}`}
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                        <a href={getDocData(activeTab).url} target="_blank" rel="noopener noreferrer" className="p-3 bg-white/10 hover:bg-white/20 rounded-xl text-white backdrop-blur-md transition-colors" title="View Full Image">
                          <Eye className="w-5 h-5" />
                        </a>
                        <button 
                          onClick={() => handleRemove(activeTab)}
                          disabled={loadingDoc === activeTab}
                          className="p-3 bg-red-500/20 hover:bg-red-500/40 rounded-xl text-red-400 backdrop-blur-md transition-colors"
                          title="Remove Image"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex justify-center">
                      <label className="cursor-pointer px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl text-sm font-medium text-slate-300 transition-colors flex items-center gap-2">
                        <UploadCloud className="w-4 h-4" /> Replace Image
                        <input type="file" className="hidden" accept=".jpg,.jpeg,.png,.webp" onChange={(e) => handleFileUpload(e, activeTab)} disabled={loadingDoc === activeTab} />
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="w-full max-w-md mx-auto">
                    <label className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${
                      loadingDoc === activeTab ? 'opacity-50 border-slate-600 bg-slate-900' : 'border-slate-600 hover:border-blue-500 bg-slate-800/50 hover:bg-slate-800'
                    }`}>
                      <div className="flex flex-col items-center justify-center pt-5 pb-6 text-slate-400">
                        {loadingDoc === activeTab ? (
                          <Loader2 className="w-10 h-10 mb-3 animate-spin text-blue-500" />
                        ) : (
                          <UploadCloud className="w-10 h-10 mb-3 text-slate-400 group-hover:text-blue-500 transition-colors" />
                        )}
                        <p className="mb-2 text-sm"><span className="font-semibold text-white">Click to upload</span> or drag and drop</p>
                        <p className="text-xs">JPG, JPEG, PNG, WEBP (Max 5MB)</p>
                      </div>
                      <input 
                        ref={fileInputRef}
                        type="file" 
                        className="hidden" 
                        accept=".jpg,.jpeg,.png,.webp" 
                        onChange={(e) => handleFileUpload(e, activeTab)}
                        disabled={loadingDoc === activeTab} 
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* Admin Actions for Verification */}
              {activeTab !== 'Profile Photo' && getDocData(activeTab).url && (
                <div className="mt-8 pt-6 border-t border-slate-700/60">
                  <h5 className="text-sm font-bold text-slate-300 mb-4">Verification Action</h5>
                  
                  {rejectDocType === activeTab ? (
                    <div className="space-y-3 bg-red-500/10 p-4 rounded-xl border border-red-500/20">
                      <label className="block text-xs font-bold text-red-400">Reason for Rejection</label>
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm h-24 text-white"
                        placeholder="E.g., Image is blurry, name mismatch..."
                        required
                      ></textarea>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleVerify(activeTab, 'Rejected')}
                          disabled={loadingDoc === activeTab || !rejectReason.trim()}
                          className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                        >
                          {loadingDoc === activeTab ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Confirm Rejection'}
                        </button>
                        <button
                          onClick={() => { setRejectDocType(null); setRejectReason(''); }}
                          className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-bold transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <button
                        onClick={() => setRejectDocType(activeTab)}
                        disabled={loadingDoc === activeTab}
                        className="flex-1 py-2.5 bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400 border border-slate-700 hover:border-red-500/50 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                      >
                        <XCircle className="w-4 h-4" /> Reject Document
                      </button>
                      <button
                        onClick={() => handleVerify(activeTab, 'Approved')}
                        disabled={loadingDoc === activeTab || getDocData(activeTab).status === 'Approved'}
                        className="flex-1 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-green-600/20"
                      >
                        <CheckCircle className="w-4 h-4" /> 
                        {getDocData(activeTab).status === 'Approved' ? 'Already Approved' : 'Approve & Verify'}
                      </button>
                    </div>
                  )}
                </div>
              )}
              
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentManagementModal;

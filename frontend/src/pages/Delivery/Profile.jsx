import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { API_BASE } from '../../config/api';
import { 
  User, Shield, FileText, Settings, LogOut, ChevronRight, KeyRound, 
  MapPin, Phone, Car, HelpCircle, FileCheck, Moon, Sun, Monitor,
  Star, Award, TrendingUp, Clock, CheckCircle, Mail, Calendar, Activity,
  Briefcase, Truck, Download, Camera, Check, Target, Wallet, AlertCircle,
  Smartphone
} from 'lucide-react';
import useModal from '../../hooks/useModal';
import useDeliveryStore from '../../store/useDeliveryStore';

const DeliveryProfile = () => {
  const { partner, setPartner } = useOutletContext();
  const navigate = useNavigate();
  const { userAlert, toast } = useModal();
  const { theme, setTheme } = useDeliveryStore();

  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '' });
  const [passwordStatus, setPasswordStatus] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  // Feature 1: Profile Photo Mock State
  const [profileImage, setProfileImage] = useState(partner?.profileImage || null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Mock Performance Data
  const mockAnalytics = {
    todayDeliveries: partner?.todayDeliveries || 14,
    todayEarnings: partner?.todayEarnings || 420,
    completedDeliveries: 342,
    customerRating: 4.8,
    totalReviews: 128,
    fiveStarPercentage: 92,
    acceptanceRate: '98%',
    completionRate: '99%',
    avgDeliveryTime: '24 mins',
    weeklyEarnings: 3200,
    monthlyEarnings: 12500,
    availableBalance: 850
  };

  const handleLogout = () => {
    localStorage.removeItem('deliveryPartnerInfo');
    navigate('/delivery/login');
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordStatus('');
    setPasswordLoading(true);
    const stored = localStorage.getItem('deliveryPartnerInfo');
    if (!stored) return;
    const parsedInfo = JSON.parse(stored);

    try {
      await axios.put(`${API_BASE}/delivery/profile/password`, passwordData, {
        headers: { Authorization: `Bearer ${parsedInfo.token}` }
      });
      setPasswordStatus('Password changed successfully');
      setTimeout(() => {
        setIsPasswordModalOpen(false);
        setPasswordData({ currentPassword: '', newPassword: '' });
        setPasswordStatus('');
      }, 1500);
    } catch (error) {
      setPasswordStatus(error.response?.data?.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const toggleStatus = async () => {
    if (!partner) return;
    const stored = localStorage.getItem('deliveryPartnerInfo');
    if (!stored) return;
    const parsedInfo = JSON.parse(stored);
    const newStatus = partner.status === 'Offline' ? 'Available' : 'Offline';

    try {
      const { data } = await axios.put(`${API_BASE}/delivery/profile`, 
        { status: newStatus },
        { headers: { Authorization: `Bearer ${parsedInfo.token}` } }
      );
      setPartner({ ...partner, status: data.status });
      toast(`You are now ${newStatus}`);
    } catch (error) {
      console.error('Failed to update status', error);
      toast('Failed to update status');
    }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setIsUploading(true);
      setUploadProgress(0);
      const reader = new FileReader();
      
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 25;
        });
      }, 300);

      reader.onload = (event) => {
        setTimeout(() => {
          setProfileImage(event.target.result);
          setIsUploading(false);
          setUploadProgress(0);
          toast('Profile photo updated');
        }, 1200);
      };
      reader.readAsDataURL(file);
    }
  };

  // Mock Bar Chart Heights
  const chartHeights = [40, 70, 45, 90, 60, 85, 50]; 
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="min-h-[100dvh] bg-gray-50 dark:bg-gray-950 flex flex-col transition-colors duration-300 font-sans">
      {/* Header Area */}
      <div className="bg-white dark:bg-gray-900 pt-8 pb-32 px-6 shadow-sm border-b border-gray-100 dark:border-gray-800 relative z-10 transition-colors">
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent dark:from-green-900/10"></div>
        <div className="relative flex justify-between items-center max-w-5xl mx-auto">
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">My Profile</h1>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Manage your account and settings</p>
          </div>
          <button 
            onClick={toggleStatus}
            className={`relative inline-flex h-7 w-14 items-center rounded-full transition-all ${partner?.status === 'Offline' ? 'bg-gray-200 dark:bg-gray-700' : 'bg-green-500 shadow-md shadow-green-500/30'}`}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${partner?.status === 'Offline' ? 'translate-x-1' : 'translate-x-8'}`} />
          </button>
        </div>
      </div>

      <div className="flex-1 px-4 sm:px-6 pb-24 -mt-24 relative z-20 max-w-5xl mx-auto w-full space-y-5">
        
        {/* Profile Master Card */}
        <div className="bg-white dark:bg-gray-900 backdrop-blur-xl rounded-2xl p-6 sm:p-8 shadow-lg border border-gray-100 dark:border-gray-800 flex flex-col md:flex-row items-center md:items-start gap-6 transition-colors">
          
          {/* Feature 1: Profile Photo */}
          <div className="relative group cursor-pointer shrink-0" onClick={() => !isUploading && fileInputRef.current?.click()}>
            <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-full blur opacity-40 group-hover:opacity-70 transition duration-500"></div>
            
            <div className="relative w-32 h-32 rounded-full ring-4 ring-white dark:ring-gray-800 shadow-xl overflow-hidden bg-gray-100 dark:bg-gray-700">
              {isUploading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-10">
                  <span className="text-white text-xs font-bold mb-1">{uploadProgress}%</span>
                  <div className="w-16 h-1 bg-gray-600 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500 transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                  </div>
                </div>
              ) : (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <Camera className="w-8 h-8 text-white" />
                </div>
              )}
              
              {profileImage ? (
                <img src={profileImage} alt={partner?.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white font-black text-5xl">
                  {partner?.name?.charAt(0).toUpperCase() || 'D'}
                </div>
              )}
            </div>
            
            <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" className="hidden" />
            
            {partner?.isVerified && (
              <div className="absolute bottom-1 right-1 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center border-4 border-white dark:border-gray-800 shadow-sm z-20" title="Verified Partner">
                <CheckCircle className="w-4 h-4" />
              </div>
            )}
          </div>
          
          <div className="flex-1 text-center md:text-left w-full">
            <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
              <div>
                <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{partner?.name}</h2>
                <div className="flex flex-wrap justify-center md:justify-start items-center gap-2 mt-2">
                  <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 rounded-lg text-xs font-bold uppercase tracking-wider">ID: {partner?.employeeId || 'N/A'}</span>
                  <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${partner?.status === 'Offline' ? 'bg-gray-100 text-gray-500 dark:bg-gray-700/50 dark:text-gray-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
                    {partner?.status}
                  </span>
                  {/* Feature 7: Delivery Rank Badge */}
                  <span className="px-3 py-1 bg-gradient-to-r from-yellow-400 to-amber-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider shadow-md flex items-center gap-1">
                    <Award className="w-3.5 h-3.5" /> Gold Tier
                  </span>
                </div>
              </div>
              
              {/* Feature 7: Delivery Rank Card */}
              <div className="bg-orange-50 dark:bg-orange-900/20 px-4 py-3 rounded-2xl border border-orange-100 dark:border-orange-900/30 flex items-center gap-3 shrink-0 mx-auto md:mx-0">
                <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 rounded-full flex items-center justify-center font-black">#12</div>
                <div className="text-left">
                  <p className="text-[10px] font-bold text-orange-600/70 dark:text-orange-400/70 uppercase tracking-wider">Current Rank</p>
                  <p className="text-sm font-black text-orange-600 dark:text-orange-400">Out of 85 Partners</p>
                </div>
              </div>
            </div>

            {/* Feature 2: Customer Rating Section */}
            <div className="grid grid-cols-2 md:grid-cols-4 w-full gap-4 mt-6 pt-6 border-t border-gray-100 dark:border-gray-700/50">
              <div className="flex flex-col items-center md:items-start">
                <div className="flex items-center gap-1 text-yellow-500 mb-1">
                  <Star className="w-5 h-5 fill-current" />
                  <span className="text-xl font-black text-gray-900 dark:text-white">{mockAnalytics.customerRating}</span>
                </div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(s => <Starey key={s} active={s <= 4} />)}
                  </div>
                </span>
              </div>
              <div className="flex flex-col items-center md:items-start border-l border-gray-100 dark:border-gray-700/50 pl-4">
                <span className="text-xl font-black text-gray-900 dark:text-white mb-1">{mockAnalytics.totalReviews}</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Reviews</span>
              </div>
              <div className="flex flex-col items-center md:items-start border-l border-gray-100 dark:border-gray-700/50 pl-4">
                <span className="text-xl font-black text-gray-900 dark:text-white mb-1">{mockAnalytics.fiveStarPercentage}%</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">5-Star Ratings</span>
              </div>
              <div className="flex flex-col items-center md:items-start border-l border-gray-100 dark:border-gray-700/50 pl-4">
                <span className="text-xl font-black text-green-600 dark:text-green-400 mb-1">₹{mockAnalytics.todayEarnings}</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Today's Earnings</span>
              </div>
            </div>
          </div>
        </div>

        {/* Feature 8: Monthly Target Progress */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 flex items-center justify-center shrink-0">
            <Target className="w-8 h-8" />
          </div>
          <div className="flex-1 w-full text-center md:text-left">
            <div className="flex justify-between items-end mb-2">
              <div>
                <h3 className="font-black text-gray-900 dark:text-white text-lg">Monthly Target</h3>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">{mockAnalytics.completedDeliveries} of 450 deliveries completed</p>
              </div>
              <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">74%</span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-1000 w-[74%] relative">
                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Feature 3: Current Service Location */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl">
                <MapPin className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white">Service Location</h3>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Assigned Hub</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5">Sriperumbudur Main Hub</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Current Working Area</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5">South Zone • Sector 4</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3 border border-gray-100 dark:border-gray-700">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center justify-between">
                  GPS Status <span className="text-green-500 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Active</span>
                </p>
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mt-1 truncate">12.9716° N, 77.5946° E</p>
              </div>
            </div>
          </div>

          {/* Feature 4: Vehicle Information */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-xl">
                <Car className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white">Vehicle Details</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-gray-50 dark:border-gray-700/50">
                <p className="text-xs font-bold text-gray-500 uppercase">Model</p>
                <p className="text-sm font-black text-gray-900 dark:text-white">{partner?.vehicleType || 'Honda Activa 6G'}</p>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-gray-50 dark:border-gray-700/50">
                <p className="text-xs font-bold text-gray-500 uppercase">Number</p>
                <p className="text-sm font-black text-gray-900 dark:text-white tracking-widest">{partner?.vehicleNumber || 'TN 09 AB 1234'}</p>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-gray-50 dark:border-gray-700/50">
                <p className="text-xs font-bold text-gray-500 uppercase">Fuel Type</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white">Petrol</p>
              </div>
              <div className="flex justify-between items-center pt-1">
                <div className="flex flex-col gap-1 w-full">
                  <span className="flex items-center justify-between text-xs font-semibold text-gray-700 dark:text-gray-300">RC Status <Shield className="w-3.5 h-3.5 text-green-500"/></span>
                  <span className="flex items-center justify-between text-xs font-semibold text-gray-700 dark:text-gray-300">Insurance <CheckCircle className="w-3.5 h-3.5 text-green-500"/></span>
                </div>
              </div>
            </div>
          </div>

          {/* Feature 6: Wallet */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2.5 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-xl">
                  <Wallet className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white">Partner Wallet</h3>
              </div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Available Balance</p>
              <h2 className="text-4xl font-black text-gray-900 dark:text-white mb-4">₹{mockAnalytics.availableBalance}</h2>
              <div className="flex justify-between text-xs font-semibold text-gray-600 dark:text-gray-400 border-t border-gray-50 dark:border-gray-700/50 pt-3">
                <span>Last Settlement:</span>
                <span className="text-gray-900 dark:text-white">Yesterday, 11:30 PM</span>
              </div>
            </div>
            <button className="w-full mt-4 py-3 bg-gray-900 dark:bg-gray-700 text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-colors">
              Withdraw Funds
            </button>
          </div>
        </div>

        {/* Feature 5: Weekly Performance & Feature 9: Attendance */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2"><Activity className="w-5 h-5 text-orange-500"/> Weekly Performance</h3>
              <div className="text-right">
                <p className="text-sm font-black text-gray-900 dark:text-white">₹{mockAnalytics.weeklyEarnings}</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase">This Week</p>
              </div>
            </div>
            
            <div className="flex items-end justify-between h-40 mt-4 mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">
              {chartHeights.map((h, i) => (
                <div key={i} className="flex flex-col items-center gap-2 group w-full relative">
                  {/* Tooltip mock */}
                  <div className="absolute -top-8 bg-gray-900 text-white text-[10px] font-bold py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    {h} Del
                  </div>
                  <div className="w-full max-w-[2rem] bg-orange-100 dark:bg-orange-900/30 rounded-t-lg relative group-hover:bg-orange-200 dark:group-hover:bg-orange-900/50 transition-colors" style={{ height: '100px' }}>
                    <div className="absolute bottom-0 w-full bg-orange-500 rounded-t-lg transition-all duration-500 group-hover:bg-orange-400" style={{ height: `${h}%` }}></div>
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">{days[i]}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-4 pt-2">
              <div className="text-center">
                <p className="text-xl font-black text-gray-900 dark:text-white">{mockAnalytics.acceptanceRate}</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase mt-0.5">Acceptance</p>
              </div>
              <div className="text-center border-x border-gray-100 dark:border-gray-700">
                <p className="text-xl font-black text-gray-900 dark:text-white">{mockAnalytics.completionRate}</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase mt-0.5">Completion</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-black text-gray-900 dark:text-white">{mockAnalytics.avgDeliveryTime}</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase mt-0.5">Avg Time</p>
              </div>
            </div>
          </div>

          {/* Attendance Section */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-black text-gray-900 dark:text-white mb-5 flex items-center gap-2"><Calendar className="w-5 h-5 text-indigo-500"/> Attendance</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-gray-500 dark:text-gray-400">Today's Status</span>
                  <span className="px-2.5 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-lg text-xs font-bold">Present</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-gray-500 dark:text-gray-400">Online Hours</span>
                  <span className="text-sm font-black text-gray-900 dark:text-white">6h 45m</span>
                </div>
                <div className="flex justify-between items-center border-t border-gray-50 dark:border-gray-700/50 pt-4">
                  <div className="text-center">
                    <p className="text-xl font-black text-indigo-600 dark:text-indigo-400">14 <span className="text-sm">Days</span></p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">Current Streak</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-black text-gray-900 dark:text-white">28 <span className="text-sm">Days</span></p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">Longest Streak</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-gray-50 dark:border-gray-700/50">
              <p className="text-xs font-semibold text-gray-500 text-center">Worked 22 of 24 days this month</p>
            </div>
          </div>
        </div>

        {/* Feature 10: Last Login & Security */}
        <div className="bg-gray-100 dark:bg-gray-800/50 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white dark:bg-gray-700 rounded-full flex items-center justify-center shadow-sm">
              <Smartphone className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">Current Session</p>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">iPhone 14 Pro • Safari • iOS 17</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Last Login</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} • Today</p>
          </div>
        </div>

        {/* Achievements */}
        <div>
          <h3 className="text-lg font-black text-gray-900 dark:text-white mb-4 flex items-center gap-2"><Award className="w-5 h-5 text-yellow-500"/> Badges & Achievements</h3>
          <div className="flex gap-4 overflow-x-auto pb-4 snap-x hide-scrollbar">
            {[
              { title: 'Top Performer', icon: Award, color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
              { title: '100 Deliveries', icon: Truck, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
              { title: '5-Star Rating', icon: Star, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20' },
              { title: 'Verified Partner', icon: Shield, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20' },
            ].map((badge, idx) => (
              <div key={idx} className="shrink-0 snap-start bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 w-32 flex flex-col items-center text-center hover:-translate-y-1 transition-transform cursor-default">
                <div className={`w-12 h-12 rounded-full ${badge.bg} flex items-center justify-center mb-3 ring-4 ring-white dark:ring-gray-800 shadow-sm`}>
                  <badge.icon className={`w-6 h-6 ${badge.color}`} />
                </div>
                <span className="text-xs font-bold text-gray-900 dark:text-white">{badge.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions Grid */}
        <h3 className="text-lg font-black text-gray-900 dark:text-white pt-2 flex items-center gap-2"><Settings className="w-5 h-5 text-gray-500"/> Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          
          <button className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center text-center hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group outline-none">
            <div className="w-10 h-10 bg-gray-50 dark:bg-gray-900/50 text-gray-600 dark:text-gray-400 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <User className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-gray-900 dark:text-white">Edit Profile</span>
          </button>

          <Link to="/delivery/documents" className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center text-center hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
            <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <FileCheck className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-gray-900 dark:text-white">Documents</span>
          </Link>
          
          <button onClick={() => setIsPasswordModalOpen(true)} className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center text-center hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group outline-none">
            <div className="w-10 h-10 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <KeyRound className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-gray-900 dark:text-white">Password</span>
          </button>
          
          <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center text-center hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group outline-none">
            <div className="w-10 h-10 bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </div>
            <span className="text-[11px] font-bold text-gray-900 dark:text-white">Theme</span>
          </button>

          <button onClick={() => userAlert('ID Card', 'Downloading Digital ID Card...')} className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center text-center hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group outline-none">
            <div className="w-10 h-10 bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Download className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-gray-900 dark:text-white">ID Card</span>
          </button>

          <button onClick={() => userAlert('Contact Support', 'Admin Hub Line: +91 9876543210')} className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center text-center hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group outline-none">
            <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Phone className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-gray-900 dark:text-white">Support</span>
          </button>
        </div>

        {/* Logout at bottom */}
        <button onClick={handleLogout} className="w-full mt-4 bg-red-50 dark:bg-red-900/10 rounded-2xl p-4 shadow-sm border border-red-100 dark:border-red-900/30 flex items-center justify-center gap-2 hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors group outline-none font-bold text-red-600 dark:text-red-400">
          <LogOut className="w-5 h-5" /> Logout from Account
        </button>

      </div>

      {/* Password Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-[200] bg-gray-900/60 backdrop-blur-sm flex justify-center items-end sm:items-center p-4 animate-in fade-in transition-colors">
          <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-[2rem] p-6 shadow-2xl relative animate-in slide-in-from-bottom-10 transition-colors">
            <div className="w-16 h-1 rounded-full bg-gray-200 dark:bg-gray-700 mx-auto mb-6 sm:hidden"></div>
            
            <h2 className="text-xl font-black text-gray-900 dark:text-white mb-6">Change Password</h2>
            
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Current Password</label>
                <input
                  type="password"
                  required
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm font-semibold text-gray-900 dark:text-white transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">New Password</label>
                <input
                  type="password"
                  required
                  minLength="6"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm font-semibold text-gray-900 dark:text-white transition-all"
                />
              </div>
              
              {passwordStatus && (
                <div className={`text-xs font-bold p-3 rounded-xl flex items-center gap-2 ${passwordStatus.includes('successfully') ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                  {passwordStatus.includes('successfully') ? <CheckCircle className="w-4 h-4"/> : <AlertCircle className="w-4 h-4"/>}
                  {passwordStatus}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="flex-1 py-4 rounded-xl font-bold text-sm text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="flex-[2] py-4 rounded-xl font-bold text-sm text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-70 shadow-md shadow-orange-600/30 transition-colors"
                >
                  {passwordLoading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      <style jsx>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

// Helper for tiny star rendering
const Starey = ({ active }) => (
  <svg className={`w-2.5 h-2.5 ${active ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`} fill="currentColor" viewBox="0 0 20 20">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
  </svg>
);

export default DeliveryProfile;

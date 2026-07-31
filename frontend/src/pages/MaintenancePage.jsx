import React, { useState, useEffect } from 'react';
import { 
  Wrench, 
  RefreshCcw, 
  Home, 
  Phone, 
  Mail, 
  MapPin, 
  MessageCircle, // Using MessageCircle for WhatsApp as fallback
  Truck, 
  Leaf, 
  ShieldCheck,
  Bell,
  CheckCircle2
} from 'lucide-react';

const MaintenancePage = () => {
  const [progress, setProgress] = useState(0);
  const [notifyEmail, setNotifyEmail] = useState('');
  const [notified, setNotified] = useState(false);

  // Animate progress bar to 80%
  useEffect(() => {
    const timer = setTimeout(() => {
      setProgress(80);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleNotifySubmit = (e) => {
    e.preventDefault();
    if (notifyEmail) {
      setNotified(true);
      setNotifyEmail('');
      setTimeout(() => setNotified(false), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white relative overflow-hidden font-sans selection:bg-green-500 selection:text-white flex flex-col justify-between">
      
      {/* Abstract Background Shapes */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-green-200/40 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
        <div className="absolute top-48 -right-24 w-96 h-96 bg-emerald-200/40 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-24 left-1/2 w-96 h-96 bg-lime-200/40 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 flex flex-col">
        
        {/* Header / Logo */}
        <header className="flex flex-col items-center text-center animate-fade-in-up">
          <div className="w-20 h-20 bg-gradient-to-tr from-green-600 to-emerald-500 rounded-2xl shadow-xl shadow-green-500/20 flex items-center justify-center mb-4 transform hover:scale-105 transition-transform duration-300">
            <span className="text-4xl">🥭</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">TIRUCHENDUR MURUGAN</h1>
          <h2 className="text-xl sm:text-2xl font-black text-green-600 tracking-tight leading-none mb-2">PAZHAMUDHIR SOLAI</h2>
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-widest">Fresh Fruits • Vegetables • Grocery Store</p>
        </header>

        {/* Main Content Box */}
        <main className="mt-12 w-full max-w-4xl mx-auto flex flex-col md:flex-row gap-8 items-center bg-white/60 backdrop-blur-xl border border-white/40 p-8 sm:p-12 rounded-[2.5rem] shadow-2xl shadow-gray-200/50">
          
          {/* Left Column (Text & Progress) */}
          <div className="flex-1 space-y-8 text-center md:text-left">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 text-green-700 font-bold text-xs uppercase tracking-wide mx-auto md:mx-0">
                <Wrench className="w-4 h-4" /> System Maintenance
              </div>
              <h3 className="text-4xl sm:text-5xl font-black text-gray-900 tracking-tight leading-tight">
                We'll Be Back <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-500">Soon!</span>
              </h3>
              <p className="text-base text-gray-600 font-medium leading-relaxed max-w-md mx-auto md:mx-0">
                We're making improvements to provide you with a faster, smoother, and better grocery shopping experience. Our team is working hard and we'll be back shortly.
              </p>
            </div>

            {/* Progress Section */}
            <div className="bg-white/80 p-5 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex justify-between items-end mb-2">
                <span className="text-sm font-bold text-gray-900">Maintenance Progress</span>
                <span className="text-sm font-black text-green-600">{progress}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3 mb-3 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
                  style={{ width: `${progress}%` }}
                >
                  <div className="absolute top-0 left-0 w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PGVsbGlwc2UgY3g9IjEwIiBjeT0iMTAiIHJ4PSIzIiByeT0iMyIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjIpIi8+PC9zdmc+')] opacity-50 animate-[shimmer_2s_linear_infinite]"></div>
                </div>
              </div>
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-gray-500 flex items-center gap-1.5"><RefreshCcw className="w-3.5 h-3.5 animate-spin-slow" /> Optimizing Performance</span>
                <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">Almost Ready</span>
              </div>
            </div>

            {/* Notify Me */}
            <form onSubmit={handleNotifySubmit} className="relative max-w-md mx-auto md:mx-0">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">We'll notify you when live</p>
              <div className="flex bg-white rounded-xl shadow-sm border border-gray-200 p-1">
                <input 
                  type="email" 
                  placeholder="Enter your email address" 
                  value={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.value)}
                  className="flex-1 bg-transparent px-4 text-sm outline-none text-gray-700 placeholder:text-gray-400 font-medium"
                />
                <button type="submit" className="bg-gray-900 hover:bg-gray-800 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-2">
                  {notified ? <CheckCircle2 className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                  {notified ? 'Notified!' : 'Notify Me'}
                </button>
              </div>
            </form>
          </div>

          {/* Right Column (Illustration & Features) */}
          <div className="flex-1 w-full flex flex-col items-center">
            {/* Animated Box Illustration */}
            <div className="relative w-full max-w-xs aspect-square mb-8 animate-float">
              <div className="absolute inset-0 bg-gradient-to-tr from-green-100 to-emerald-50 rounded-[3rem] rotate-6"></div>
              <div className="absolute inset-0 bg-white rounded-[3rem] shadow-xl border border-gray-50 flex items-center justify-center p-8">
                <img src="https://cdn-icons-png.flaticon.com/512/3081/3081986.png" alt="Grocery Delivery" className="w-full h-full object-contain opacity-90 drop-shadow-md" />
              </div>
              
              {/* Floating badges */}
              <div className="absolute -right-4 top-10 bg-white p-3 rounded-2xl shadow-lg border border-gray-100 flex items-center gap-2 animate-bounce-slow">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-600">
                  <Clock className="w-4 h-4" />
                </div>
                <div className="text-left pr-2">
                  <p className="text-[10px] text-gray-500 font-bold uppercase">Estimated Return</p>
                  <p className="text-xs font-black text-gray-900">Within a few hours</p>
                </div>
              </div>
            </div>

            {/* Feature Highlights */}
            <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white/80 p-4 rounded-2xl shadow-sm border border-gray-100 text-center hover:-translate-y-1 transition-transform cursor-default">
                <Truck className="w-6 h-6 text-green-500 mx-auto mb-2" />
                <h4 className="text-xs font-black text-gray-900 mb-1">Fast Delivery</h4>
                <p className="text-[10px] font-semibold text-gray-500 leading-tight">Fresh groceries delivered quickly.</p>
              </div>
              <div className="bg-white/80 p-4 rounded-2xl shadow-sm border border-gray-100 text-center hover:-translate-y-1 transition-transform cursor-default">
                <Leaf className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                <h4 className="text-xs font-black text-gray-900 mb-1">Fresh Products</h4>
                <p className="text-[10px] font-semibold text-gray-500 leading-tight">Quality fruits & veg every day.</p>
              </div>
              <div className="bg-white/80 p-4 rounded-2xl shadow-sm border border-gray-100 text-center hover:-translate-y-1 transition-transform cursor-default">
                <ShieldCheck className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                <h4 className="text-xs font-black text-gray-900 mb-1">Secure Shopping</h4>
                <p className="text-[10px] font-semibold text-gray-500 leading-tight">Safe ordering & reliable service.</p>
              </div>
            </div>
          </div>
          
        </main>

        {/* Bottom Actions */}
        <div className="mt-10 flex flex-wrap justify-center gap-4 animate-fade-in-up">
          <button onClick={() => window.location.reload()} className="flex items-center gap-2 bg-white px-6 py-3 rounded-xl font-bold text-sm text-gray-900 shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors">
            <RefreshCcw className="w-4 h-4" /> Refresh Page
          </button>
          <a href="mailto:support@pazhamudhirsolai.com" className="flex items-center gap-2 bg-white px-6 py-3 rounded-xl font-bold text-sm text-gray-900 shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors">
            <Mail className="w-4 h-4" /> Contact Support
          </a>
          <a href="/" className="flex items-center gap-2 bg-green-600 px-6 py-3 rounded-xl font-bold text-sm text-white shadow-md shadow-green-600/20 hover:bg-green-700 transition-colors">
            <Home className="w-4 h-4" /> Go to Home
          </a>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 w-full border-t border-gray-200/50 bg-white/50 backdrop-blur-md py-6 mt-12">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          
          <div className="flex items-center gap-4">
            <a href="#" className="w-10 h-10 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center text-green-500 hover:scale-110 transition-transform">
              <MessageCircle className="w-5 h-5" />
            </a>
          </div>
          
          <div className="text-center md:text-right space-y-1">
            <p className="text-xs font-bold text-gray-900">
              © {new Date().getFullYear()} Tiruchendur Murugan Pazhamudhir Solai
            </p>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
              Fresh • Quality • Trust <span className="mx-2">|</span> Version 1.0
            </p>
          </div>
          
        </div>
      </footer>

      {/* Global Styles for Animations */}
      <style jsx>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
          100% { transform: translateY(0px); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 3s ease-in-out infinite;
        }
        @keyframes fade-in-up {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out forwards;
        }
        @keyframes shimmer {
          0% { background-position: -100% 0; }
          100% { background-position: 100% 0; }
        }
        .animate-spin-slow {
          animation: spin 3s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default MaintenancePage;

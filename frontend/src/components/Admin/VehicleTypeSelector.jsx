import React from 'react';
import { Check, AlertCircle } from 'lucide-react';

const VEHICLE_OPTIONS = [
  {
    id: 'Two Wheeler',
    name: 'Bike / Scooter',
    icon: '🛵',
    description: 'Fast and ideal for grocery deliveries.'
  },
  {
    id: 'Bicycle',
    name: 'Bicycle',
    icon: '🚲',
    description: 'Eco-friendly for nearby deliveries.'
  },
  {
    id: 'Four Wheeler',
    name: 'Car',
    icon: '🚗',
    description: 'Recommended for bulk grocery orders.'
  },
  {
    id: 'Three Wheeler',
    name: 'Mini Van',
    icon: '🚚',
    description: 'Suitable for large commercial deliveries.'
  }
];

const VehicleTypeSelector = ({ value, onChange, error }) => {
  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-300 mb-2">
        Vehicle Type <span className="text-red-400">*</span>
      </label>
      
      {/* Responsive Grid: Desktop (2 cols), Tablet (2 cols), Mobile (1 col) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {VEHICLE_OPTIONS.map((option) => {
          const isSelected = value === option.id;
          
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              className={`group relative text-left p-4 rounded-2xl transition-all duration-200 flex flex-col justify-between cursor-pointer border ${
                isSelected
                  ? 'bg-[#22C55E]/10 border-[#22C55E] shadow-lg shadow-[#22C55E]/15 scale-[1.01]'
                  : 'bg-white/5 border-white/10 hover:border-white/25 hover:bg-white/[0.08] hover:scale-[1.005]'
              }`}
            >
              {/* Card Header: Icon & Selection Indicator */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl p-2 rounded-xl bg-white/5 border border-white/10 group-hover:scale-110 transition-transform">
                  {option.icon}
                </span>
                
                {/* Selection Checkmark Indicator */}
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 ${
                    isSelected
                      ? 'bg-[#22C55E] text-white shadow-md shadow-[#22C55E]/40 scale-100'
                      : 'border border-white/20 bg-white/5 group-hover:border-white/40 scale-90'
                  }`}
                >
                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </div>

              {/* Vehicle Title & Description */}
              <div>
                <h4 className={`text-sm font-bold transition-colors ${isSelected ? 'text-[#22C55E]' : 'text-white'}`}>
                  {option.name}
                </h4>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                  {option.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Inline Validation Message */}
      {error && (
        <div className="mt-2 flex items-center gap-1.5 text-red-400 text-xs font-medium animate-fadeIn">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default VehicleTypeSelector;

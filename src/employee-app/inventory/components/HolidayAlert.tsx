// src/employee-app/inventory/components/HolidayAlert.tsx
import React, { useState } from 'react';
import { Calendar, ChevronDown, ChevronUp, TrendingUp } from 'lucide-react';
import { HolidayAlert as HolidayAlertType } from '../../types';

interface HolidayAlertProps {
  alert: HolidayAlertType;
}

const HolidayAlert: React.FC<HolidayAlertProps> = ({ alert }) => {
  const [expanded, setExpanded] = useState(false);
  
  // Mock last year data for demonstration
  const mockLastYearData = {
    topItems: [
      { id: '1', name: 'Chocolate Hearts', consumed: 45, normal: 15 },
      { id: '2', name: 'Red Wine', consumed: 30, normal: 10 },
      { id: '3', name: 'Fresh Roses', consumed: 25, normal: 5 }
    ],
    totalIncrease: '165%',
    peakDay: 'February 14th'
  };

  const getUrgencyColor = () => {
    if (alert.daysUntil <= 7) return 'border-red-500 bg-red-50';
    if (alert.daysUntil <= 14) return 'border-orange-500 bg-orange-50';
    return 'border-yellow-500 bg-yellow-50';
  };

  const getUrgencyText = () => {
    if (alert.daysUntil <= 7) return '🚨 URGENT - Order Now!';
    if (alert.daysUntil <= 14) return '⚠️ Important - Plan Order';
    return '📅 Upcoming - Review Soon';
  };

  return (
    <div className={`border-l-4 p-4 rounded-lg transition-all ${getUrgencyColor()}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start flex-1">
          <Calendar className="w-5 h-5 text-orange-500 mt-1 mr-3 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-orange-900 text-sm md:text-base">
                {getUrgencyText()}
              </h3>
              <span className="text-xs md:text-sm font-medium px-2 py-1 bg-orange-200 text-orange-800 rounded-full">
                {alert.daysUntil} days
              </span>
            </div>
            
            <div className="space-y-1">
              <p className="text-orange-700 font-medium text-sm md:text-base">
                {alert.holiday}
              </p>
              <p className="text-orange-600 text-xs md:text-sm">
                Based on last year, expect significant consumption increases
              </p>
            </div>

            {/* Quick Stats Preview */}
            <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
              <div className="bg-white bg-opacity-50 rounded p-2">
                <div className="font-medium text-orange-800">Expected Increase</div>
                <div className="text-orange-600">+{mockLastYearData.totalIncrease}</div>
              </div>
              <div className="bg-white bg-opacity-50 rounded p-2">
                <div className="font-medium text-orange-800">Top Item Impact</div>
                <div className="text-orange-600">{mockLastYearData.topItems[0]?.name}</div>
              </div>
              <div className="bg-white bg-opacity-50 rounded p-2 col-span-2 md:col-span-1">
                <div className="font-medium text-orange-800">Peak Day</div>
                <div className="text-orange-600">{mockLastYearData.peakDay}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Expand/Collapse Button */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="ml-2 p-1 hover:bg-orange-200 rounded transition-colors flex-shrink-0"
          aria-label={expanded ? 'Collapse details' : 'Expand details'}
        >
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-orange-600" />
          ) : (
            <ChevronDown className="w-4 h-4 text-orange-600" />
          )}
        </button>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-orange-200">
          <h4 className="font-medium text-orange-900 mb-3 flex items-center text-sm">
            <TrendingUp className="w-4 h-4 mr-2" />
            Last Year's Consumption Pattern
          </h4>
          
          <div className="space-y-3">
            {mockLastYearData.topItems.map((item, index) => (
              <div key={item.id} className="flex items-center justify-between bg-white bg-opacity-60 rounded p-3">
                <div className="flex items-center space-x-3">
                  <span className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                    {index + 1}
                  </span>
                  <div>
                    <div className="font-medium text-orange-900 text-sm">{item.name}</div>
                    <div className="text-xs text-orange-600">
                      Used {item.consumed} units (normal: {item.normal})
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-orange-800">
                    +{Math.round(((item.consumed - item.normal) / item.normal) * 100)}%
                  </div>
                  <div className="text-xs text-orange-600">increase</div>
                </div>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            <button className="flex-1 bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 transition-colors text-sm font-medium">
              📋 Generate Holiday Order List
            </button>
            <button className="flex-1 bg-white border border-orange-300 text-orange-700 px-4 py-2 rounded hover:bg-orange-50 transition-colors text-sm font-medium">
              📊 View Full Analysis
            </button>
          </div>

          {/* Pro Tip */}
          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <div className="flex items-start">
              <span className="text-yellow-600 mr-2">💡</span>
              <div className="text-xs text-yellow-700">
                <strong>Pro Tip:</strong> Order 2-3 days before the holiday to ensure delivery. 
                Consider staff schedule changes and supplier availability during holiday periods.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HolidayAlert;
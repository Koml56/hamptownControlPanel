// DailyReports.tsx
import React from 'react';
import { Calendar, Download } from 'lucide-react';
import { MOOD_EMOJIS, MOOD_LABELS } from './constants';
import { getFormattedDate } from './utils';
import type { DailyDataMap, Employee, ConnectionStatus } from './types';

interface DailyReportsProps {
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  dailyData: DailyDataMap;
  employees: Employee[];
  connectionStatus: ConnectionStatus;
}

const DailyReports: React.FC<DailyReportsProps> = ({
  selectedDate,
  setSelectedDate,
  dailyData,
  employees,
  connectionStatus
}) => {
  const selectedData = dailyData[selectedDate];

  return (
    <div className="space-y-6">
      {/* Date Selector */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            Daily Reports (Firebase Storage)
          </h3>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-xs text-gray-600">
              {connectionStatus === 'connected' ? 'Live Data' : 'Offline'}
            </span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
            <button className="px-3 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 flex items-center">
              <Download className="w-4 h-4 mr-1" />
              Export
            </button>
          </div>
        </div>

        {selectedData ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {selectedData.completedTasks?.length || 0}
              </div>
              <div className="text-sm text-blue-700">Tasks Completed</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {selectedData.completionRate || 0}%
              </div>
              <div className="text-sm text-green-700">Completion Rate</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">
                {selectedData.employeeMoods?.length || 0}
              </div>
              <div className="text-sm text-orange-700">Mood Updates</div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No data available for {selectedDate}
          </div>
        )}
      </div>

      {/* Task Completion History */}
      {selectedData?.completedTasks && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h4 className="text-lg font-semibold text-gray-800 mb-4">Task Completions</h4>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 px-4 py-2 text-left">Time</th>
                  <th className="border border-gray-200 px-4 py-2 text-left">Task</th>
                  <th className="border border-gray-200 px-4 py-2 text-left">Employee</th>
                  <th className="border border-gray-200 px-4 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {selectedData.completedTasks.map((completion, index) => {
                  const employee = employees.find(emp => emp.id === completion.employeeId);
                  return (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="border border-gray-200 px-4 py-2">{completion.completedAt}</td>
                      <td className="border border-gray-200 px-4 py-2">{completion.taskName}</td>
                      <td className="border border-gray-200 px-4 py-2">{employee?.name || 'Unknown'}</td>
                      <td className="border border-gray-200 px-4 py-2">
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                          Completed
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mood History */}
      {selectedData?.employeeMoods && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h4 className="text-lg font-semibold text-gray-800 mb-4">Mood Updates</h4>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 px-4 py-2 text-left">Time</th>
                  <th className="border border-gray-200 px-4 py-2 text-left">Employee</th>
                  <th className="border border-gray-200 px-4 py-2 text-left">Mood</th>
                  <th className="border border-gray-200 px-4 py-2 text-left">Rating</th>
                </tr>
              </thead>
              <tbody>
                {selectedData.employeeMoods.map((mood, index) => {
                  const employee = employees.find(emp => emp.id === mood.employeeId);
                  return (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="border border-gray-200 px-4 py-2">{mood.updatedAt}</td>
                      <td className="border border-gray-200 px-4 py-2">{employee?.name || 'Unknown'}</td>
                      <td className="border border-gray-200 px-4 py-2">
                        <div className="flex items-center">
                          <span className="text-lg mr-2">{MOOD_EMOJIS[mood.mood-1]}</span>
                          {MOOD_LABELS[mood.mood-1]}
                        </div>
                      </td>
                      <td className="border border-gray-200 px-4 py-2">{mood.mood}/5</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 30-Day Overview */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h4 className="text-lg font-semibold text-gray-800 mb-4">30-Day Overview</h4>
        <div className="flex flex-col gap-2">
          {/* Month and Year */}
          <div className="text-sm font-medium text-gray-600 mb-1">
            {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </div>
          
          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Weekday Headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-xs font-medium text-gray-500 text-center">
                {day}
              </div>
            ))}
            
            {/* Date Cells */}
            {(() => {
              const today = new Date();
              const dates = [];
              
              // Calculate the start of the current month
              const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
              
              // Add empty cells for days before the month starts
              for (let i = 0; i < currentMonth.getDay(); i++) {
                dates.push(<div key={`empty-${i}`} className="p-2" />);
              }
              
              // Add all days of the current month
              const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
              for (let day = 1; day <= daysInMonth; day++) {
                const date = new Date(today.getFullYear(), today.getMonth(), day);
                const dateStr = getFormattedDate(date);
                const dayData = dailyData[dateStr] || {};
                const completionRate = dayData?.completionRate || 0;
                
                // Only show if it's today or in the past, and within last 30 days
                const daysDiff = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
                if (daysDiff >= 0 && daysDiff < 30) {
                  dates.push(
                    <div
                      key={dateStr}
                      className={`p-2 rounded text-xs cursor-pointer transition-colors ${
                        dateStr === selectedDate ? 'bg-purple-500 text-white' :
                        completionRate >= 80 ? 'bg-green-100 text-green-700 hover:bg-green-200' :
                        completionRate >= 50 ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' :
                        completionRate > 0 ? 'bg-red-100 text-red-700 hover:bg-red-200' :
                        'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                      onClick={() => setSelectedDate(dateStr)}
                      title={`${date.toLocaleDateString('en-US', { month: 'short' })} ${date.getDate()}: ${completionRate}% completion`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{date.getDate()}</span>
                        <span>{completionRate}%</span>
                      </div>
                    </div>
                  );
                } else {
                  // Future dates or dates older than 30 days - show as disabled
                  dates.push(
                    <div key={`disabled-${day}`} className="p-2 rounded text-xs text-gray-300">
                      <div className="flex items-center justify-between">
                        <span>{date.getDate()}</span>
                        <span>-</span>
                      </div>
                    </div>
                  );
                }
              }
              
              return dates;
            })()}
          </div>
        </div>
        <div className="mt-4 flex justify-center space-x-4 text-xs">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-100 rounded mr-1"></div>
            80%+ completion
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-yellow-100 rounded mr-1"></div>
            50-79% completion
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-100 rounded mr-1"></div>
            Below 50%
          </div>
        </div>
      </div>

      {/* Daily Summary Table for Selected Date */}
      {selectedData && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h4 className="text-lg font-semibold text-gray-800 mb-4">
            Daily Summary - {new Date(selectedDate).toLocaleDateString()}
          </h4>
          
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-blue-600">
                {selectedData.completedTasks?.length || 0}
              </div>
              <div className="text-sm text-blue-700">Tasks Done</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-green-600">
                {selectedData.completionRate || 0}%
              </div>
              <div className="text-sm text-green-700">Completion</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-purple-600">
                {selectedData.employeeMoods?.length || 0}
              </div>
              <div className="text-sm text-purple-700">Mood Updates</div>
            </div>
          </div>

          {/* Combined Activity Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 px-3 py-2 text-left text-sm font-medium">Time</th>
                  <th className="border border-gray-200 px-3 py-2 text-left text-sm font-medium">Employee</th>
                  <th className="border border-gray-200 px-3 py-2 text-left text-sm font-medium">Action</th>
                  <th className="border border-gray-200 px-3 py-2 text-left text-sm font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {/* Task Completions */}
                {(selectedData.completedTasks || []).map((completion, index) => {
                  const employee = employees.find(emp => emp.id === completion.employeeId);
                  return (
                    <tr key={`task-${index}`} className="hover:bg-gray-50">
                      <td className="border border-gray-200 px-3 py-2 text-sm">{completion.completedAt}</td>
                      <td className="border border-gray-200 px-3 py-2 text-sm font-medium">{employee?.name || 'Unknown'}</td>
                      <td className="border border-gray-200 px-3 py-2">
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                          ✓ Task Completed
                        </span>
                      </td>
                      <td className="border border-gray-200 px-3 py-2 text-sm">{completion.taskName}</td>
                    </tr>
                  );
                })}
                
                {/* Mood Updates */}
                {(selectedData.employeeMoods || []).map((mood, index) => {
                  const employee = employees.find(emp => emp.id === mood.employeeId);
                  return (
                    <tr key={`mood-${index}`} className="hover:bg-gray-50">
                      <td className="border border-gray-200 px-3 py-2 text-sm">{mood.updatedAt}</td>
                      <td className="border border-gray-200 px-3 py-2 text-sm font-medium">{employee?.name || 'Unknown'}</td>
                      <td className="border border-gray-200 px-3 py-2">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                          😊 Mood Update
                        </span>
                      </td>
                      <td className="border border-gray-200 px-3 py-2 text-sm">
                        <div className="flex items-center">
                          <span className="text-lg mr-2">{MOOD_EMOJIS[mood.mood-1]}</span>
                          {MOOD_LABELS[mood.mood-1]} ({mood.mood}/5)
                        </div>
                      </td>
                    </tr>
                  );
                })}
                
                {/* No data message */}
                {(!selectedData.completedTasks || selectedData.completedTasks.length === 0) &&
                 (!selectedData.employeeMoods || selectedData.employeeMoods.length === 0) && (
                  <tr>
                    <td colSpan={4} className="border border-gray-200 px-3 py-8 text-center text-gray-500">
                      No activity recorded for this date
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyReports;

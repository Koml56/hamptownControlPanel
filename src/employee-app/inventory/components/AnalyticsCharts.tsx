// src/employee-app/inventory/components/AnalyticsCharts.tsx
// Interactive charts using recharts for comprehensive inventory analytics

import React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';

// Chart color palette
const COLORS = {
  primary: '#3B82F6',
  secondary: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  purple: '#8B5CF6',
  cyan: '#06B6D4',
  pink: '#EC4899',
  gray: '#6B7280'
};

const PIE_COLORS = [COLORS.primary, COLORS.secondary, COLORS.warning, COLORS.danger, COLORS.purple, COLORS.cyan];

// Custom tooltip component
const CustomTooltip = ({ active, payload, label, formatter }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-medium text-gray-900">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }} className="text-sm">
            {entry.name}: {formatter ? formatter(entry.value) : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Storage Growth Line Chart
export const StorageGrowthLineChart: React.FC<{
  data: Array<{date: string, totalValue: number, totalItems: number}>;
}> = ({ data }) => {
  const formatCurrency = (value: number) => `$${value.toFixed(2)}`;
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Storage Growth Over Time</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis 
            dataKey="date" 
            stroke="#6B7280"
            fontSize={12}
            tickFormatter={(value) => new Date(value).toLocaleDateString()}
          />
          <YAxis 
            yAxisId="value"
            orientation="left"
            stroke="#6B7280"
            fontSize={12}
            tickFormatter={formatCurrency}
          />
          <YAxis 
            yAxisId="count"
            orientation="right"
            stroke="#6B7280"
            fontSize={12}
          />
          <Tooltip content={<CustomTooltip formatter={formatCurrency} />} />
          <Legend />
          <Line 
            yAxisId="value"
            type="monotone" 
            dataKey="totalValue" 
            stroke={COLORS.primary}
            strokeWidth={3}
            dot={{ fill: COLORS.primary, strokeWidth: 2, r: 4 }}
            name="Total Value"
            activeDot={{ r: 6 }}
          />
          <Line 
            yAxisId="count"
            type="monotone" 
            dataKey="totalItems" 
            stroke={COLORS.secondary}
            strokeWidth={2}
            dot={{ fill: COLORS.secondary, strokeWidth: 2, r: 3 }}
            name="Total Items"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

// Order Frequency Bar Chart
export const OrderFrequencyBarChart: React.FC<{
  data: Array<{item: string, frequency: number, lastOrdered: string}>;
}> = ({ data }) => {
  // Show top 10 most frequently ordered items
  const topItems = data.slice(0, 10);
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Most Frequently Ordered Items</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={topItems} layout="horizontal">
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis type="number" stroke="#6B7280" fontSize={12} />
          <YAxis 
            type="category" 
            dataKey="item" 
            stroke="#6B7280" 
            fontSize={11}
            width={100}
            tickFormatter={(value) => value.length > 15 ? value.slice(0, 15) + '...' : value}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar 
            dataKey="frequency" 
            fill={COLORS.primary}
            radius={[0, 4, 4, 0]}
            name="Order Frequency"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// Waste Analysis Pie Chart
export const WasteAnalysisPieChart: React.FC<{
  data: Array<{name: string, value: number, percentage: number}>;
}> = ({ data }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Waste by Category</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value: number) => [`${value} items`, 'Waste Count']}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

// Consumption Trend Area Chart
export const ConsumptionTrendAreaChart: React.FC<{
  data: Array<{date: string, consumed: number, remaining: number}>;
}> = ({ data }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Consumption Trends</h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis 
            dataKey="date" 
            stroke="#6B7280"
            fontSize={12}
            tickFormatter={(value) => new Date(value).toLocaleDateString()}
          />
          <YAxis stroke="#6B7280" fontSize={12} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Area
            type="monotone"
            dataKey="consumed"
            stackId="1"
            stroke={COLORS.danger}
            fill={COLORS.danger}
            fillOpacity={0.6}
            name="Items Consumed"
          />
          <Area
            type="monotone"
            dataKey="remaining"
            stackId="1"
            stroke={COLORS.secondary}
            fill={COLORS.secondary}
            fillOpacity={0.6}
            name="Items Remaining"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// Category Breakdown Composed Chart
export const CategoryBreakdownChart: React.FC<{
  data: Array<{category: string, totalItems: number, totalValue: number, avgItemValue: number}>;
}> = ({ data }) => {
  const formatCurrency = (value: number) => `$${value.toFixed(2)}`;
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Inventory by Category</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis 
            dataKey="category" 
            stroke="#6B7280"
            fontSize={11}
            tickFormatter={(value) => value.length > 10 ? value.slice(0, 10) + '...' : value}
          />
          <YAxis 
            stroke="#6B7280"
            fontSize={12}
            tickFormatter={formatCurrency}
          />
          <Tooltip content={<CustomTooltip formatter={formatCurrency} />} />
          <Legend />
          <Bar 
            dataKey="totalValue" 
            fill={COLORS.primary}
            name="Total Value"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// Stock Level Distribution Chart
export const StockLevelChart: React.FC<{
  data: Array<{level: string, count: number, color: string}>;
}> = ({ data }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Stock Level Distribution</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey="level" stroke="#6B7280" fontSize={12} />
          <YAxis stroke="#6B7280" fontSize={12} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Item Count">
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
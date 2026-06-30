import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from 'recharts';

export function MessageTrendsTab() {
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [topSenders, setTopSenders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const monthly = await invoke<any[]>("get_monthly_message_counts");
        setMonthlyData(monthly);

        const senders = await invoke<any[]>("get_top_senders");
        setTopSenders(senders);
      } catch (err) {
        console.error("Failed to fetch trend data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const pieColors = ['#f97316', '#0ea5e9', '#22c55e', '#ef4444', '#8b5cf6'];

  if (loading) {
    return <div className="py-12 text-center text-gray-400 text-sm">Loading charts with real data...</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Real Bar Chart */}
      <Card className="shadow-sm border-border bg-card">
        <CardHeader className="pb-6">
          <CardTitle className="text-base font-bold text-gray-900">Monthly Message Volume</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                <Tooltip 
                  cursor={{ fill: '#f3f4f6' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="messages" fill="#16a34a" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Real Pie Chart (Top Senders) */}
      <Card className="shadow-sm border-border bg-card">
        <CardHeader className="pb-0">
          <CardTitle className="text-base font-bold text-gray-900">Top 5 Participants</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] w-full mt-4 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={topSenders}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {topSenders.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ color: '#374151', fontWeight: 600 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          <div className="mt-2 space-y-3 px-4">
            {topSenders.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: pieColors[index % pieColors.length] }}></div>
                  {item.name}
                </div>
                <div className="text-sm font-semibold text-gray-900">{item.value.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

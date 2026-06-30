import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutDashboard, Users, Calendar, Flame } from "lucide-react";

export function OverviewTab({ stats, heatmapGrid, fetchDateMessages }: any) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="shadow-sm border-border bg-card">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <LayoutDashboard className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Total Messages</p>
              <p className="text-2xl font-bold text-gray-900 mt-0.5">{stats?.total_messages?.toLocaleString() || "0"}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border bg-card">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Unique Contacts</p>
              <p className="text-2xl font-bold text-gray-900 mt-0.5">{stats?.total_people?.toLocaleString() || "0"}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border bg-card">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-sky-100 rounded-full flex items-center justify-center">
              <Calendar className="w-6 h-6 text-sky-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Time Span</p>
              <p className="text-2xl font-bold text-gray-900 mt-0.5">{stats?.years || "N/A"}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm border-border bg-card">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <Flame className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Longest Streak</p>
              <p className="text-2xl font-bold text-gray-900 mt-0.5">{stats?.longest_streak || "0"} days</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-bold text-gray-900">Activity Heatmap</CardTitle>
          <div className="flex items-center gap-4 text-xs font-medium text-gray-500">
            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-orange-500 rounded-sm"></div> High</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-orange-300 rounded-sm"></div> Med</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-orange-50 rounded-sm border border-gray-200"></div> Low</div>
          </div>
        </CardHeader>
        <CardContent>
          {heatmapGrid ? (
            <div className="flex gap-[3px] overflow-x-auto py-4 scrollbar-thin scrollbar-thumb-gray-200">
              {heatmapGrid.map((week: any[], weekIdx: number) => (
                <div key={weekIdx} className="flex flex-col gap-[3px]">
                  {week.map((day: any, dayIdx: number) => (
                    <div 
                      key={dayIdx} 
                      className={`w-[15px] h-[15px] rounded-[3px] ${day.color} hover:ring-2 ring-gray-400 cursor-pointer transition-all duration-100`}
                      title={day.tooltip}
                      onClick={() => {
                        if (day.hasData) {
                          fetchDateMessages(day.dateStr);
                        }
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-gray-400 text-sm">Loading heatmap data...</div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

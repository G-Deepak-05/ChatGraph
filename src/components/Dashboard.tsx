import { useEffect, useState, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Calendar, Flame, Search, Bell, 
  LayoutDashboard, Layers, Settings, HelpCircle,
  TrendingUp, Download, Filter
} from "lucide-react";
import { OverviewTab } from "./tabs/OverviewTab";
import { MessageTrendsTab } from "./tabs/MessageTrendsTab";
import { AIMemoriesTab } from "./tabs/AIMemoriesTab";
import { save } from '@tauri-apps/plugin-dialog';

interface DashboardStats {
  total_messages: number;
  total_people: number;
  years: string;
  longest_streak: number;
  unique_contacts?: number;
  active_days?: number;
}

interface SearchResult {
  id: number;
  sender_name: string;
  timestamp: string;
  message_content: string;
}

interface HeatmapDay {
  date: string;
  message_count: number;
  contacts_count: number;
  top_contact: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [, setIsSearching] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // UI State
  const [activeTab, setActiveTab] = useState("Overview");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Advanced Filters State
  const [showCalendarMenu, setShowCalendarMenu] = useState(false);
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [uniqueSenders, setUniqueSenders] = useState<string[]>([]);
  const [filterSender, setFilterSender] = useState("");
  const [heatmapData, setHeatmapData] = useState<HeatmapDay[]>([]);

  useEffect(() => {
    invoke<string[]>("get_unique_senders")
      .then(setUniqueSenders)
      .catch(console.error);
      
    invoke<DashboardStats>("get_dashboard_stats")
      .then(setStats)
      .catch((err) => {
        console.warn("Failed to fetch stats, using mock data", err);
        setStats({
          total_messages: 0,
          total_people: 0,
          years: "N/A",
          longest_streak: 0,
        });
      });

    invoke<HeatmapDay[]>("get_heatmap_data")
      .then(setHeatmapData)
      .catch((err) => console.error("Failed to fetch heatmap data", err));
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSelectedDate(null);
      return;
    }
    setSelectedDate(null);
    try {
      const results = await invoke<SearchResult[]>("search_messages", { query: searchQuery });
      setSearchResults(results);
    } catch (err) {
      console.error("Search failed", err);
    }
  };

  const fetchDateMessages = async (dateStr: string) => {
    setSelectedDate(dateStr);
    setSearchQuery(""); // Clear search query text since we are filtering by exact date
    try {
      const results = await invoke<SearchResult[]>("get_messages_by_date", { date: dateStr });
      setSearchResults(results);
    } catch (err) {
      console.error("Fetch by date failed", err);
    }
  };

  const heatmapGrid = useMemo(() => {
    if (heatmapData.length === 0) return null;

    const lastDayStr = heatmapData[heatmapData.length - 1].date;
    const endDate = new Date(lastDayStr);
    endDate.setHours(12, 0, 0, 0);

    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - 364); // 52 weeks

    const dataMap = new Map(heatmapData.map((d) => [d.date, d]));
    const maxMessages = Math.max(...heatmapData.map(d => d.message_count));

    const weeks = [];
    let currentDay = new Date(startDate);
    
    for (let w = 0; w < 52; w++) {
      const days = [];
      for (let d = 0; d < 7; d++) {
        const dateStr = currentDay.toISOString().split("T")[0];
        const dayData = dataMap.get(dateStr);
        
        // Match the orange template colors
        let color = "bg-orange-50"; 
        let tooltip = `${dateStr}\n0 Messages`;
        
        if (dayData) {
          const ratio = dayData.message_count / (maxMessages || 1);
          if (ratio > 0.75) color = "bg-orange-500";
          else if (ratio > 0.5) color = "bg-orange-400";
          else if (ratio > 0.25) color = "bg-orange-300";
          else color = "bg-orange-200";
          
          tooltip = `${dateStr}\n${dayData.message_count} Messages\n${dayData.contacts_count} Contacts active\nTop: ${dayData.top_contact}`;
        }

        days.push({
          dateStr,
          color,
          tooltip,
          hasData: !!dayData
        });
        
        currentDay.setDate(currentDay.getDate() + 1);
      }
      weeks.push(days);
    }
    
    return weeks;
  }, [heatmapData]);

  const handleExport = async () => {
    try {
      const filePath = await save({
        filters: [{ name: 'CSV File', extensions: ['csv'] }],
        defaultPath: 'chat_export.csv',
      });
      if (filePath) {
        const result = await invoke("export_csv", { filePath });
        alert(result);
      }
    } catch (e) {
      console.error(e);
      alert("Export failed: " + e);
    }
  };

  const handleApplyFilters = async () => {
    try {
      setIsSearching(true);
      setSearchQuery("");
      setSelectedDate(null);
      
      const sDate = filterStartDate || null;
      const eDate = filterEndDate || null;
      const sender = filterSender || null;
      
      const results = await invoke<SearchResult[]>("advanced_filter", {
        startDate: sDate,
        endDate: eDate,
        senderName: sender
      });
      setSearchResults(results);
      setShowCalendarMenu(false);
      setShowFilterMenu(false);
    } catch(e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  const SidebarItem = ({ icon: Icon, label, active = false, onClick }: { icon: any, label: string, active?: boolean, onClick?: () => void }) => (
    <div 
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg cursor-pointer transition-colors ${active ? 'bg-primary/10 text-primary font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
    >
      <Icon className="w-5 h-5" />
      <span className="text-sm">{label}</span>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden font-sans text-gray-800">
      {/* Sidebar */}
      <aside className="w-[280px] bg-card border-r border-border flex flex-col shrink-0 overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center gap-2 text-primary">
            <Layers className="w-8 h-8" />
            <span className="text-xl font-bold tracking-tight text-gray-900">ChatGraph</span>
          </div>
        </div>
        
        <div className="px-4 pb-4 space-y-8 flex-grow mt-4">
          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-4">Analytics</div>
            <SidebarItem icon={LayoutDashboard} label="Overview" active={activeTab === "Overview"} onClick={() => { setActiveTab("Overview"); document.getElementById("scroll-container")?.scrollTo({ top: 0, behavior: "smooth" }) }} />
            <SidebarItem icon={TrendingUp} label="Message Trends" active={activeTab === "Message Trends"} onClick={() => { setActiveTab("Message Trends"); document.getElementById("trends")?.scrollIntoView({ behavior: "smooth", block: "start" }) }} />
            <SidebarItem icon={Flame} label="AI Memories" active={activeTab === "AI Memories"} onClick={() => { setActiveTab("AI Memories"); document.getElementById("ai-memory")?.scrollIntoView({ behavior: "smooth", block: "start" }) }} />
          </div>
          
          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-4">App</div>
            <SidebarItem icon={Settings} label="Settings" active={activeTab === "Settings"} onClick={() => { setActiveTab("Settings"); setToastMessage("Settings panel coming in the next update!"); setTimeout(() => setToastMessage(null), 3000); }} />
            <SidebarItem icon={HelpCircle} label="Help & Support" active={activeTab === "Help & Support"} onClick={() => { setActiveTab("Help & Support"); setToastMessage("Support portal coming in the next update!"); setTimeout(() => setToastMessage(null), 3000); }} />
          </div>
        </div>

      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        
        {/* Global Toast */}
        {toastMessage && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[100] bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl font-medium text-sm animate-in fade-in slide-in-from-top-5 duration-300">
            {toastMessage}
          </div>
        )}

        {/* Header */}
        <header className="h-20 bg-card border-b border-border flex items-center justify-between px-8 shrink-0">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input 
              className="pl-10 bg-gray-50 border-0 rounded-xl h-10 w-full focus-visible:ring-1 focus-visible:ring-gray-200" 
              placeholder="Search Data..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-white px-2 py-0.5 rounded border shadow-sm text-xs text-gray-500 font-medium">
              <span>⌘</span><span>K</span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative cursor-pointer">
              <Bell className="w-5 h-5 text-gray-600" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-[9px] text-white font-bold">5</span>
            </div>
            <div className="flex items-center gap-3 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100 cursor-pointer">
              <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold overflow-hidden">
                 D {/* Avatar placeholder */}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-gray-900 leading-none">Deepak</span>
                <span className="text-xs text-gray-500">Owner</span>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Scroll Area */}
        <div id="scroll-container" className="flex-1 overflow-y-auto p-8 scroll-smooth relative">
          
          <div id="overview" className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <div className="flex gap-3 relative">
              <div className="relative">
                <Button onClick={() => { setShowCalendarMenu(!showCalendarMenu); setShowFilterMenu(false); }} variant="outline" className={`bg-white rounded-lg shadow-sm ${showCalendarMenu ? 'ring-2 ring-primary border-primary' : ''}`}>
                  <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                  {filterStartDate && filterEndDate ? `${filterStartDate} to ${filterEndDate}` : "Date Range"}
                </Button>
                {showCalendarMenu && (
                  <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 p-4 z-50">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Filter by Date</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-gray-500 font-medium block mb-1">Start Date</label>
                        <Input type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} className="w-full text-sm" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 font-medium block mb-1">End Date</label>
                        <Input type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} className="w-full text-sm" />
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button variant="outline" className="flex-1 h-8 text-xs" onClick={() => { setFilterStartDate(""); setFilterEndDate(""); }}>Clear</Button>
                        <Button className="flex-1 h-8 text-xs bg-primary text-white" onClick={handleApplyFilters}>Apply</Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="relative">
                <Button onClick={() => { setShowFilterMenu(!showFilterMenu); setShowCalendarMenu(false); }} variant="outline" className={`bg-white rounded-lg shadow-sm ${showFilterMenu ? 'ring-2 ring-primary border-primary' : ''}`}>
                  <Filter className="w-4 h-4 mr-2 text-gray-500" />
                  {filterSender || "All Senders"}
                </Button>
                {showFilterMenu && (
                  <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 p-4 z-50 max-h-[300px] overflow-y-auto shadow-2xl">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Filter by Sender</h3>
                    <div className="space-y-1">
                      <div 
                        className={`px-3 py-2 text-sm rounded-md cursor-pointer ${filterSender === "" ? 'bg-primary/10 text-primary font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                        onClick={() => setFilterSender("")}
                      >
                        All Senders
                      </div>
                      {uniqueSenders.map(s => (
                        <div 
                          key={s} 
                          className={`px-3 py-2 text-sm rounded-md cursor-pointer ${filterSender === s ? 'bg-primary/10 text-primary font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                          onClick={() => setFilterSender(s)}
                        >
                          {s}
                        </div>
                      ))}
                      <div className="pt-3">
                        <Button className="w-full h-8 text-xs bg-primary text-white hover:bg-primary/90" onClick={handleApplyFilters}>Apply Filter</Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <Button onClick={handleExport} className="bg-primary hover:bg-primary/90 text-white rounded-lg shadow-sm">
                <Download className="w-4 h-4 mr-2" />
                Export Data
              </Button>
            </div>
          </div>

          {searchResults.length > 0 && (
            <Card className="mb-6 shadow-sm border-border bg-card">
              <CardHeader className="pb-3 border-b border-gray-50">
                <CardTitle className="text-lg text-gray-800">{selectedDate ? `Messages from ${selectedDate}` : "Search Results"}</CardTitle>
                <CardDescription>
                  {selectedDate 
                    ? `Found ${searchResults.length} messages on this day` 
                    : `Found ${searchResults.length} messages matching "${searchQuery}"`}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-4">
                  {searchResults.map((res) => (
                    <div key={res.id} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-semibold text-gray-900">{res.sender_name}</span>
                        <span className="text-xs text-gray-500">{res.timestamp}</span>
                      </div>
                      <p className="text-sm text-gray-600">{res.message_content}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Active Tab Content */}
          <div className="mt-8">
            {activeTab === "Overview" && (
              <OverviewTab 
                stats={stats} 
                heatmapGrid={heatmapGrid} 
                fetchDateMessages={fetchDateMessages} 
              />
            )}

            {activeTab === "Message Trends" && (
              <MessageTrendsTab />
            )}

            {activeTab === "AI Memories" && (
              <AIMemoriesTab 
                selectedDate={selectedDate} 
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Flame } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AIMemoriesTab({ selectedDate }: any) {
  const [memoryResult, setMemoryResult] = useState<string | null>(null);
  const [isGeneratingMemory, setIsGeneratingMemory] = useState(false);

  return (
    <Card className="shadow-sm border-border bg-card flex flex-col max-w-3xl mx-auto mt-8">
      <CardHeader className="pb-6">
        <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-500" />
          AI Memory Generator
        </CardTitle>
        <CardDescription className="text-sm text-gray-500 mt-2">
          {selectedDate ? `Summarize conversations on ${selectedDate}` : `Summarize your recent conversations using local AI inference.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col justify-between">
        {isGeneratingMemory ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4 text-primary">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-base font-medium animate-pulse">Analyzing context natively with Ollama...</p>
          </div>
        ) : (
          <div className="bg-orange-50/50 p-6 rounded-xl text-base text-gray-700 flex-grow overflow-y-auto min-h-[250px] border border-orange-100 shadow-inner">
            {memoryResult || "Click generate to create an Ollama powered summary of these chats. It helps extract key topics, mood, and insights automatically based on the current context."}
          </div>
        )}
        
        <div className="mt-8 pt-6 border-t border-gray-100">
          <Button 
            className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-bold shadow-md text-lg rounded-xl transition-all hover:scale-[1.01]"
            disabled={isGeneratingMemory}
            onClick={async () => {
              setIsGeneratingMemory(true);
              setMemoryResult(null);
              try {
                let recent: any[] = [];
                if (selectedDate) {
                  recent = await invoke("get_messages_by_date", { date: selectedDate });
                } else {
                  recent = await invoke("search_messages", { query: "" });
                }
                
                const textSnippet = recent.map(m => `${m.sender_name}: ${m.message_content}`).join("\n");
                
                if (!textSnippet.trim()) {
                  setMemoryResult("No messages found to summarize.");
                  setIsGeneratingMemory(false);
                  return;
                }

                const summary = await invoke<string>("generate_memory", { messagesContent: textSnippet });
                setMemoryResult(summary);
              } catch (e) {
                setMemoryResult(`Error: ${e}`);
              } finally {
                setIsGeneratingMemory(false);
              }
            }}
          >
            {isGeneratingMemory ? "Generating AI Summary..." : memoryResult ? "Regenerate Analysis" : "Generate Local AI Summary"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

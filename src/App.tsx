import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FolderUp, Loader2 } from "lucide-react";
import Dashboard from "./components/Dashboard";

function App() {
  const [filePath, setFilePath] = useState("");
  const [chatName, setChatName] = useState("My Chat");
  const [isParsing, setIsParsing] = useState(false);
  const [isParsed, setIsParsed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleParse = async () => {
    if (!filePath) {
      setError("Please provide a file path.");
      return;
    }
    
    setIsParsing(true);
    setError(null);
    try {
      const messagesInserted = await invoke<number>("parse_whatsapp_chat", {
        filePath,
        chatName,
      });
      console.log(`Parsed ${messagesInserted} messages.`);
      setIsParsed(true);
    } catch (e) {
      console.error(e);
      setError(e as string);
    } finally {
      setIsParsing(false);
    }
  };

  if (isParsed) {
    return <Dashboard />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderUp className="w-6 h-6" />
            Upload Chat
          </CardTitle>
          <CardDescription>
            Provide the absolute path to your exported WhatsApp .txt file.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <div className="text-destructive text-sm font-medium">{error}</div>}
          
          <div className="space-y-2">
            <Label htmlFor="filePath">File Path (.txt)</Label>
            <Input
              id="filePath"
              placeholder="/Users/name/Downloads/chat.txt"
              value={filePath}
              onChange={(e) => setFilePath(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="chatName">Chat Name</Label>
            <Input
              id="chatName"
              placeholder="e.g. Best Friend, Family Group"
              value={chatName}
              onChange={(e) => setChatName(e.target.value)}
            />
          </div>

          <Button 
            className="w-full" 
            onClick={handleParse}
            disabled={isParsing || !filePath}
          >
            {isParsing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Parsing...
              </>
            ) : (
              "Upload and Parse"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default App;

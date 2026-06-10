import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGenerateStory } from "@workspace/api-client-react";
import { CATEGORIES, PlaybackState } from "./VideoPreview";
import { Loader2, Play, SquareSquare, Wand2 } from "lucide-react";
import { toast } from "sonner";

interface StoryConfigProps {
  category: string;
  setCategory: (c: string) => void;
  title: string;
  setTitle: (t: string) => void;
  story: string;
  setStory: (s: string) => void;
  playbackState: PlaybackState;
  setPlaybackState: (state: PlaybackState) => void;
}

export function StoryConfig({
  category,
  setCategory,
  title,
  setTitle,
  story,
  setStory,
  playbackState,
  setPlaybackState
}: StoryConfigProps) {
  const generateStoryMutation = useGenerateStory();
  const [customTitle, setCustomTitle] = useState("");

  const handleGenerate = () => {
    generateStoryMutation.mutate(
      { data: { category: "AITA", customTitle: customTitle || undefined } },
      {
        onSuccess: (data) => {
          setTitle(data.title);
          setStory(data.story);
        },
        onError: () => {
          toast.error("Failed to generate story");
        }
      }
    );
  };

  const handleTogglePlayback = () => {
    if (playbackState === "idle" || playbackState === "done") {
      if (!title || !story) {
        toast.error("Generate or write a story first");
        return;
      }
      setPlaybackState("intro");
    } else {
      setPlaybackState("idle");
    }
  };

  const isPlaying = playbackState === "intro" || playbackState === "narrating";

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-muted-foreground uppercase text-xs tracking-wider font-bold">
            Background Video
          </Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full bg-card">
              <SelectValue placeholder="Select video background" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 pt-4 border-t border-border">
          <Label className="text-muted-foreground uppercase text-xs tracking-wider font-bold flex justify-between items-center">
            <span>Story Generator</span>
          </Label>
          <div className="flex gap-2">
            <Input 
              placeholder="Optional prompt (e.g. 'Stole a cake')" 
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              className="bg-card"
            />
            <Button 
              onClick={handleGenerate} 
              disabled={generateStoryMutation.isPending}
              className="shrink-0 font-bold"
              variant="secondary"
            >
              {generateStoryMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Wand2 className="w-4 h-4 mr-2" />
              )}
              Generate
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-4 flex-1 flex flex-col min-h-0">
        <div className="space-y-2">
          <Label>Post Title</Label>
          <Input 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="AITA for..."
            className="font-bold text-lg bg-card"
          />
        </div>
        
        <div className="space-y-2 flex-1 flex flex-col min-h-0">
          <Label>Story Script</Label>
          <Textarea 
            value={story}
            onChange={(e) => setStory(e.target.value)}
            placeholder="Write the narration text here..."
            className="flex-1 resize-none bg-card leading-relaxed"
          />
        </div>
      </div>

      <div className="pt-4 border-t border-border">
        <Button 
          size="lg" 
          className="w-full h-14 text-lg font-bold shadow-lg"
          variant={isPlaying ? "destructive" : "default"}
          onClick={handleTogglePlayback}
        >
          {isPlaying ? (
            <>
              <SquareSquare className="w-5 h-5 mr-2" /> Stop Preview
            </>
          ) : (
            <>
              <Play className="w-5 h-5 mr-2" /> Preview Video
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

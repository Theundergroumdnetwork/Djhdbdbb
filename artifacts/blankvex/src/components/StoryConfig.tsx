import { useRef, useState } from "react";
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
import { Loader2, Play, SquareSquare, Wand2, Upload, Video, Clapperboard } from "lucide-react";
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
  gameplayFile: File | null;
  setGameplayFile: (f: File | null) => void;
  onGenerateVideo: () => void;
}

export function StoryConfig({
  category,
  setCategory,
  title,
  setTitle,
  story,
  setStory,
  playbackState,
  setPlaybackState,
  gameplayFile,
  setGameplayFile,
  onGenerateVideo,
}: StoryConfigProps) {
  const generateStoryMutation = useGenerateStory();
  const [customTitle, setCustomTitle] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        },
      }
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      toast.error("Please upload a video file");
      return;
    }
    setGameplayFile(file);
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

  const handleGenerateVideo = () => {
    if (!title || !story) {
      toast.error("Add a title and story first");
      return;
    }
    if (!gameplayFile) {
      toast.error("Upload a gameplay video first");
      return;
    }
    onGenerateVideo();
  };

  const isPlaying = playbackState === "intro" || playbackState === "narrating";

  return (
    <div className="flex flex-col h-full space-y-5">
      {/* Gameplay upload */}
      <div className="space-y-2">
        <Label className="text-muted-foreground uppercase text-xs tracking-wider font-bold">
          Gameplay Video
        </Label>
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleFileChange}
          className="hidden"
          data-testid="input-gameplay-file"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border-2 border-dashed transition-colors text-left ${
            gameplayFile
              ? "border-[#FF4500]/50 bg-[#FF4500]/5 text-foreground"
              : "border-border hover:border-border/80 text-muted-foreground hover:text-foreground"
          }`}
          data-testid="button-upload-gameplay"
        >
          {gameplayFile ? (
            <>
              <Video className="w-5 h-5 text-[#FF4500] shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{gameplayFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(gameplayFile.size / (1024 * 1024)).toFixed(1)} MB
                </p>
              </div>
            </>
          ) : (
            <>
              <Upload className="w-5 h-5 shrink-0" />
              <div>
                <p className="text-sm font-medium">Upload gameplay video</p>
                <p className="text-xs">MP4, MOV, or WebM</p>
              </div>
            </>
          )}
        </button>
      </div>

      {/* Background category (for live preview) */}
      <div className="space-y-2">
        <Label className="text-muted-foreground uppercase text-xs tracking-wider font-bold">
          Preview Background
        </Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full bg-card" data-testid="select-category">
            <SelectValue placeholder="Select video background" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Story generator */}
      <div className="space-y-2 pt-1 border-t border-border">
        <Label className="text-muted-foreground uppercase text-xs tracking-wider font-bold">
          Story Generator
        </Label>
        <div className="flex gap-2">
          <Input
            placeholder="Optional prompt (e.g. 'Stole a cake')"
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
            className="bg-card"
            data-testid="input-story-prompt"
          />
          <Button
            onClick={handleGenerate}
            disabled={generateStoryMutation.isPending}
            className="shrink-0 font-bold"
            variant="secondary"
            data-testid="button-generate-story"
          >
            {generateStoryMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <Wand2 className="w-4 h-4 mr-1.5" />
            )}
            Generate
          </Button>
        </div>
      </div>

      {/* Title + script */}
      <div className="space-y-4 flex-1 flex flex-col min-h-0">
        <div className="space-y-2">
          <Label>Post Title</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="AITA for..."
            className="font-bold text-base bg-card"
            data-testid="input-post-title"
          />
        </div>

        <div className="space-y-2 flex-1 flex flex-col min-h-0">
          <Label>Story Script</Label>
          <Textarea
            value={story}
            onChange={(e) => setStory(e.target.value)}
            placeholder="Write the narration text here..."
            className="flex-1 resize-none bg-card leading-relaxed"
            data-testid="input-story-script"
          />
        </div>
      </div>

      {/* Action buttons */}
      <div className="pt-4 border-t border-border space-y-2">
        {/* Live preview (uses YouTube background) */}
        <Button
          size="sm"
          variant="outline"
          className="w-full font-semibold"
          onClick={handleTogglePlayback}
          data-testid="button-preview"
        >
          {isPlaying ? (
            <>
              <SquareSquare className="w-4 h-4 mr-1.5" /> Stop Preview
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-1.5" /> Live Preview
            </>
          )}
        </Button>

        {/* Generate + download (uses uploaded gameplay) */}
        <Button
          size="lg"
          className="w-full h-14 text-lg font-bold shadow-lg bg-[#FF4500] hover:bg-[#E03D00] text-white"
          onClick={handleGenerateVideo}
          data-testid="button-generate-video"
        >
          <Clapperboard className="w-5 h-5 mr-2" />
          Generate &amp; Download
        </Button>
        {!gameplayFile && (
          <p className="text-xs text-muted-foreground text-center">
            Upload gameplay to enable video generation
          </p>
        )}
      </div>
    </div>
  );
}

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Play, SquareSquare, Upload, Video, Clapperboard } from "lucide-react";
import { toast } from "sonner";
import type { PlaybackState } from "./VideoPreview";

interface StoryConfigProps {
  title: string;
  setTitle: (t: string) => void;
  story: string;
  setStory: (s: string) => void;
  gameplayFile: File | null;
  onFileChange: (f: File) => void;
  playbackState: PlaybackState;
  setPlaybackState: (s: PlaybackState) => void;
  onGenerateVideo: () => void;
}

export function StoryConfig({
  title,
  setTitle,
  story,
  setStory,
  gameplayFile,
  onFileChange,
  playbackState,
  setPlaybackState,
  onGenerateVideo,
}: StoryConfigProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const isPlaying = playbackState === "intro" || playbackState === "narrating";

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("video/")) { toast.error("Upload a video file"); return; }
    onFileChange(f);
  };

  const handlePreview = () => {
    if (isPlaying) { setPlaybackState("idle"); return; }
    if (!title && !story) { toast.error("Add a title or story first"); return; }
    setPlaybackState("intro");
  };

  const handleGenerate = () => {
    if (!title && !story) { toast.error("Add a title or story first"); return; }
    if (!gameplayFile) { toast.error("Upload a gameplay video first"); return; }
    onGenerateVideo();
  };

  return (
    <div className="flex flex-col h-full space-y-5">

      {/* Gameplay upload */}
      <div className="space-y-2">
        <Label className="text-muted-foreground uppercase text-xs tracking-wider font-bold">
          Gameplay Video
        </Label>
        <input ref={fileRef} type="file" accept="video/*" onChange={handleFile} className="hidden" data-testid="input-file" />
        <button
          onClick={() => fileRef.current?.click()}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border-2 border-dashed transition-colors text-left ${
            gameplayFile
              ? "border-[#FF4500]/50 bg-[#FF4500]/5"
              : "border-border hover:border-white/20 text-muted-foreground"
          }`}
          data-testid="button-upload"
        >
          {gameplayFile ? (
            <>
              <Video className="w-5 h-5 text-[#FF4500] shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{gameplayFile.name}</p>
                <p className="text-xs text-muted-foreground">{(gameplayFile.size / 1024 / 1024).toFixed(1)} MB</p>
              </div>
            </>
          ) : (
            <>
              <Upload className="w-5 h-5 shrink-0" />
              <div>
                <p className="text-sm font-medium">Upload gameplay video</p>
                <p className="text-xs">MP4, MOV, WebM</p>
              </div>
            </>
          )}
        </button>
      </div>

      {/* Title */}
      <div className="space-y-2">
        <Label>Post Title</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder='e.g. "AITA for kicking my sister out of my wedding…"'
          className="bg-card font-bold"
          data-testid="input-title"
        />
      </div>

      {/* Story script */}
      <div className="space-y-2 flex-1 flex flex-col min-h-0">
        <Label>Story Script</Label>
        <Textarea
          value={story}
          onChange={(e) => setStory(e.target.value)}
          placeholder="Paste or type the narration text here. The AI voice will read this aloud…"
          className="flex-1 resize-none bg-card leading-relaxed"
          data-testid="input-story"
        />
      </div>

      {/* Buttons */}
      <div className="pt-4 border-t border-border space-y-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={handlePreview}
          data-testid="button-preview"
        >
          {isPlaying
            ? <><SquareSquare className="w-4 h-4 mr-1.5" />Stop Preview</>
            : <><Play className="w-4 h-4 mr-1.5" />Live Preview</>}
        </Button>

        <Button
          size="lg"
          className="w-full h-14 text-lg font-bold bg-[#FF4500] hover:bg-[#E03D00] text-white shadow-lg"
          onClick={handleGenerate}
          data-testid="button-generate"
        >
          <Clapperboard className="w-5 h-5 mr-2" />
          Generate &amp; Download
        </Button>

        {!gameplayFile && (
          <p className="text-xs text-center text-muted-foreground">Upload gameplay video to enable</p>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { StoryConfig } from "@/components/StoryConfig";
import { VideoPreview } from "@/components/VideoPreview";
import { VideoRecorder } from "@/components/VideoRecorder";
import type { PlaybackState } from "@/components/VideoPreview";

type View = "studio" | "recording";

export default function VideoStudio() {
  const [title, setTitle] = useState("");
  const [story, setStory] = useState("");
  const [gameplayFile, setGameplayFile] = useState<File | null>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [playbackState, setPlaybackState] = useState<PlaybackState>("idle");
  const [view, setView] = useState<View>("studio");

  // Keep object URL in sync with file
  useEffect(() => {
    if (!gameplayFile) { setVideoSrc(null); return; }
    const url = URL.createObjectURL(gameplayFile);
    setVideoSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [gameplayFile]);

  const handleGenerateVideo = () => {
    setPlaybackState("idle");
    setView("recording");
  };

  return (
    <div className="min-h-screen w-full bg-background flex flex-col md:flex-row dark">
      {/* Left sidebar */}
      <div className="w-full md:w-[420px] shrink-0 border-r border-border bg-background p-6 h-screen overflow-y-auto">
        <div className="mb-8 flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center font-black text-white text-xl leading-none">B</div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">
            BlankVex <span className="text-primary">Studio</span>
          </h1>
        </div>

        <StoryConfig
          title={title}
          setTitle={setTitle}
          story={story}
          setStory={setStory}
          gameplayFile={gameplayFile}
          onFileChange={setGameplayFile}
          playbackState={playbackState}
          setPlaybackState={setPlaybackState}
          onGenerateVideo={handleGenerateVideo}
        />
      </div>

      {/* Right panel */}
      <div className="flex-1 bg-neutral-950 flex items-center justify-center p-6 relative overflow-hidden h-screen">
        <div className="absolute inset-0 opacity-[0.025] pointer-events-none"
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/%3E%3C/svg%3E")' }}
        />

        {view === "studio" ? (
          <VideoPreview
            title={title}
            story={story}
            videoSrc={videoSrc}
            playbackState={playbackState}
            setPlaybackState={setPlaybackState}
          />
        ) : (
          <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
            <VideoRecorder
              title={title}
              story={story}
              gameplayFile={gameplayFile!}
              onBack={() => setView("studio")}
            />
          </div>
        )}
      </div>
    </div>
  );
}

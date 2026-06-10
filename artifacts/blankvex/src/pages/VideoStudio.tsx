import { useState } from "react";
import { StoryConfig } from "@/components/StoryConfig";
import { VideoPreview } from "@/components/VideoPreview";
import { VideoRecorder } from "@/components/VideoRecorder";
import type { PlaybackState } from "@/components/VideoPreview";
import { CATEGORIES } from "@/components/VideoPreview";

type View = "studio" | "recording";

export default function VideoStudio() {
  const [category, setCategory] = useState(CATEGORIES[0].id);
  const [title, setTitle] = useState("");
  const [story, setStory] = useState("");
  const [playbackState, setPlaybackState] = useState<PlaybackState>("idle");
  const [gameplayFile, setGameplayFile] = useState<File | null>(null);
  const [view, setView] = useState<View>("studio");

  const handleGenerateVideo = () => {
    // Stop any live preview before switching to recorder
    setPlaybackState("idle");
    setView("recording");
  };

  const handleBackFromRecorder = () => {
    setView("studio");
  };

  return (
    <div className="min-h-screen w-full bg-background flex flex-col md:flex-row dark">
      {/* Left sidebar — always visible */}
      <div className="w-full md:w-[450px] shrink-0 border-r border-border bg-background p-6 h-screen overflow-y-auto">
        <div className="mb-8 flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center font-black text-white text-xl leading-none">
            B
          </div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">
            BlankVex <span className="text-primary">Studio</span>
          </h1>
        </div>

        <StoryConfig
          category={category}
          setCategory={setCategory}
          title={title}
          setTitle={setTitle}
          story={story}
          setStory={setStory}
          playbackState={playbackState}
          setPlaybackState={setPlaybackState}
          gameplayFile={gameplayFile}
          setGameplayFile={setGameplayFile}
          onGenerateVideo={handleGenerateVideo}
        />
      </div>

      {/* Right panel — preview or recorder */}
      <div className="flex-1 bg-neutral-950 flex items-center justify-center p-6 relative overflow-hidden h-screen">
        {/* Subtle texture */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/%3E%3C/svg%3E")',
          }}
        />

        {view === "studio" ? (
          <VideoPreview
            title={title}
            story={story}
            category={category}
            playbackState={playbackState}
            setPlaybackState={setPlaybackState}
          />
        ) : (
          <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
            <VideoRecorder
              title={title}
              story={story}
              gameplayFile={gameplayFile!}
              onBack={handleBackFromRecorder}
            />
          </div>
        )}
      </div>
    </div>
  );
}

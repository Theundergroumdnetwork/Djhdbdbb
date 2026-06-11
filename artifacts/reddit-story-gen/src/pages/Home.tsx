import { useState, useRef, useEffect } from "react";
import { useListVoices, useGenerateStory, useSpeakText } from "@workspace/api-client-react";
import type { SpeakResponse, Voice, ErrorResponse } from "@workspace/api-client-react";
import { Play, Pause, RotateCcw, Loader2, Sparkles, AudioLines, Settings2, Edit3, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  const { toast } = useToast();
  
  // State
  const [category, setCategory] = useState<string>("AITA");
  const [story, setStory] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [voiceId, setVoiceId] = useState<string>("");
  const [audioData, setAudioData] = useState<SpeakResponse | null>(null);

  // Queries & Mutations
  const { data: voices, isLoading: loadingVoices } = useListVoices();
  const generateStory = useGenerateStory();
  const speakText = useSpeakText();

  // Handlers
  const handleGenerateStory = () => {
    generateStory.mutate({ data: { category } }, {
      onSuccess: (res) => {
        setTitle(res.title);
        setStory(res.story);
        setAudioData(null);
      },
      onError: (err) => {
        const msg = (err as { data?: ErrorResponse }).data?.error ?? err.message ?? "Unknown error";
        toast({ title: "Failed to generate story", description: msg, variant: "destructive" });
      }
    });
  };

  const handleGenerateAudio = () => {
    if (!story.trim()) {
      toast({ title: "No story text", description: "Generate or type a story first.", variant: "destructive" });
      return;
    }
    if (!voiceId) {
      toast({ title: "No voice selected", description: "Please select a voice first.", variant: "destructive" });
      return;
    }

    speakText.mutate({ data: { text: title ? `${title}. ${story}` : story, voiceId } }, {
      onSuccess: (res) => {
        setAudioData(res);
        toast({ title: "Audio generated successfully" });
      },
      onError: (err) => {
        const msg = (err as { data?: ErrorResponse }).data?.error ?? err.message ?? "Unknown error";
        toast({ title: "Failed to generate audio", description: msg, variant: "destructive" });
      }
    });
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left Sidebar - Controls */}
      <aside className="w-full md:w-[400px] border-r border-border/40 bg-card/50 flex flex-col h-screen overflow-y-auto p-6 space-y-8 no-scrollbar">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-primary" />
            ViralStory Gen
          </h1>
          <p className="text-sm text-muted-foreground">Create perfectly synced Reddit narrations</p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary uppercase tracking-wider">
            <Edit3 className="w-4 h-4" />
            1. Script
          </div>
          
          <div className="space-y-3">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger data-testid="select-category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AITA">AITA</SelectItem>
                <SelectItem value="Relationship Drama">Relationship Drama</SelectItem>
                <SelectItem value="Revenge">Revenge</SelectItem>
                <SelectItem value="Family">Family</SelectItem>
                <SelectItem value="Work">Work</SelectItem>
                <SelectItem value="Roommate">Roommate</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              className="w-full font-semibold group relative overflow-hidden" 
              onClick={handleGenerateStory}
              disabled={generateStory.isPending}
              data-testid="button-generate-story"
            >
              {generateStory.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2 group-hover:text-primary-foreground transition-colors" />
              )}
              {generateStory.isPending ? "Writing..." : "Generate AI Story"}
            </Button>
          </div>

          <div className="space-y-2">
            <Label className="flex justify-between items-center">
              Story Text
              <span className="text-xs text-muted-foreground font-normal">or paste your own</span>
            </Label>
            <Textarea 
              value={story}
              onChange={(e) => setStory(e.target.value)}
              placeholder="Your story goes here..."
              className="min-h-[200px] resize-none font-mono text-sm leading-relaxed"
              data-testid="input-story"
            />
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-border/40">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary uppercase tracking-wider">
            <Settings2 className="w-4 h-4" />
            2. Voice
          </div>

          <div className="space-y-3">
            <Label>Select Narrator</Label>
            {loadingVoices ? (
              <div className="h-10 border border-input rounded-md flex items-center px-3 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading voices...
              </div>
            ) : (
              <VoiceSelector voices={voices || []} value={voiceId} onChange={setVoiceId} />
            )}

            <Button 
              size="lg"
              className="w-full font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300"
              onClick={handleGenerateAudio}
              disabled={speakText.isPending || !story.trim() || !voiceId}
              data-testid="button-generate-audio"
            >
              {speakText.isPending ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <AudioLines className="w-5 h-5 mr-2" />
              )}
              {speakText.isPending ? "Synthesizing Audio..." : "Generate Audio Sync"}
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content - Playback Viewer */}
      <main className="flex-1 h-screen flex flex-col bg-background relative overflow-hidden">
        {/* Background ambient light */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
        
        {audioData ? (
          <PlaybackViewer audioData={audioData} title={title} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 z-10">
            <div className="w-20 h-20 rounded-2xl bg-card border border-border/50 flex items-center justify-center mb-6 box-glow">
              <AudioLines className="w-10 h-10 text-primary opacity-80" />
            </div>
            <h2 className="text-2xl font-display font-semibold mb-2">Ready for Action</h2>
            <p className="text-muted-foreground max-w-md">
              Generate a story and synthesize audio to preview your viral Reddit video captions.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

function VoiceSelector({ voices, value, onChange }: { voices: Voice[], value: string, onChange: (id: string) => void }) {
  const [playingPreview, setPlayingPreview] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePreview = (e: React.MouseEvent, url: string | null, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (!url) return;

    if (playingPreview === id) {
      audioRef.current?.pause();
      setPlayingPreview(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(url);
      audio.onended = () => setPlayingPreview(null);
      audio.play();
      audioRef.current = audio;
      setPlayingPreview(id);
    }
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger data-testid="select-voice">
        <SelectValue placeholder="Choose a voice" />
      </SelectTrigger>
      <SelectContent>
        {voices.map(voice => (
          <SelectItem key={voice.id} value={voice.id} className="cursor-pointer">
            <div className="flex items-center justify-between w-full pr-4">
              <div className="flex flex-col items-start gap-1">
                <span>{voice.name}</span>
                <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">{voice.category}</Badge>
              </div>
              {voice.previewUrl && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 ml-4 shrink-0 rounded-full"
                  onClick={(e) => togglePreview(e, voice.previewUrl, voice.id)}
                  title="Preview Voice"
                >
                  {playingPreview === voice.id ? <Volume2 className="w-3 h-3 text-primary animate-pulse" /> : <Play className="w-3 h-3" />}
                </Button>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function PlaybackViewer({ audioData, title }: { audioData: SpeakResponse, title: string }) {
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeWordRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    // Convert base64 to blob URL
    const byteCharacters = atob(audioData.audioBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'audio/mp3' });
    const url = URL.createObjectURL(blob);

    const audio = new Audio(url);
    audioRef.current = audio;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      URL.revokeObjectURL(url);
    };
  }, [audioData]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const restart = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    setCurrentTime(0);
    if (!isPlaying) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  // Sync scroll
  useEffect(() => {
    if (activeWordRef.current && containerRef.current) {
      // Offset scrolling to keep the word centered vertically
      activeWordRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentTime]);

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex-1 flex flex-col relative z-10">
      {/* Captions Display Area */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto px-8 py-24 md:px-20 lg:px-40 no-scrollbar relative"
      >
        <div className="max-w-4xl mx-auto space-y-12">
          {title && (
            <h2 className="text-4xl md:text-5xl font-display font-bold text-center text-primary/80 text-glow tracking-tight pb-8 border-b border-border/30">
              {title}
            </h2>
          )}
          
          <div className="text-3xl md:text-5xl font-display font-medium leading-tight md:leading-snug text-center tracking-tight flex flex-wrap justify-center gap-x-3 gap-y-4">
            {audioData.words.map((w: { word: string; start: number; end: number }, i: number) => {
              const isActive = currentTime >= w.start && currentTime <= w.end;
              const isPast = currentTime > w.end;
              
              return (
                <span
                  key={i}
                  ref={isActive ? activeWordRef : null}
                  className={`
                    transition-all duration-150 inline-block
                    ${isActive 
                      ? 'text-primary scale-110 -translate-y-1 text-glow font-bold' 
                      : isPast 
                        ? 'text-foreground opacity-80' 
                        : 'text-muted-foreground opacity-40'}
                  `}
                >
                  {w.word}
                </span>
              );
            })}
          </div>
        </div>
        
        {/* Gradient fades for top/bottom of scroll container */}
        <div className="fixed top-0 left-0 right-0 h-32 bg-gradient-to-b from-background to-transparent pointer-events-none md:ml-[400px]" />
        <div className="fixed bottom-24 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none md:ml-[400px]" />
      </div>

      {/* Audio Controls */}
      <div className="bg-card/80 backdrop-blur-xl border-t border-border p-6 flex flex-col gap-4">
        
        {/* Progress bar */}
        <div className="flex items-center gap-4 text-sm font-mono text-muted-foreground">
          <span>{formatTime(currentTime)}</span>
          <div 
            className="flex-1 h-2 bg-secondary rounded-full overflow-hidden cursor-pointer"
            onClick={(e) => {
              if (!audioRef.current) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const percent = (e.clientX - rect.left) / rect.width;
              audioRef.current.currentTime = percent * duration;
            }}
          >
            <div 
              className="h-full bg-primary relative transition-all duration-100 ease-linear"
              style={{ width: `${(currentTime / duration) * 100 || 0}%` }}
            >
              <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/50 blur-[2px]" />
            </div>
          </div>
          <span>{formatTime(duration)}</span>
        </div>

        {/* Buttons */}
        <div className="flex justify-center items-center gap-6">
          <Button 
            variant="outline" 
            size="icon" 
            className="h-12 w-12 rounded-full border-border/50 hover:bg-secondary/50"
            onClick={restart}
            data-testid="button-restart"
          >
            <RotateCcw className="w-5 h-5" />
          </Button>
          
          <Button 
            size="icon" 
            className="h-16 w-16 rounded-full shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={togglePlay}
            data-testid="button-play-pause"
          >
            {isPlaying ? (
              <Pause className="w-8 h-8 fill-current" />
            ) : (
              <Play className="w-8 h-8 fill-current ml-1" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

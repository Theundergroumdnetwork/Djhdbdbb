import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, MessageCircle, Share, ArrowBigUp } from "lucide-react";

export type PlaybackState = "idle" | "intro" | "narrating" | "done";

export const CATEGORIES = [
  { id: "minecraft", label: "Minecraft Parkour", videoId: "n_Dv4JMiwK8" },
  { id: "subway", label: "Subway Surfers", videoId: "i4SxQDidc_k" },
  { id: "gta-drive", label: "GTA Driving", videoId: "X3yFoONFlDI" },
  { id: "gta-stunt", label: "GTA Stunts", videoId: "sRAZvuMmvsY" },
  { id: "racing", label: "Car Racing", videoId: "7HKoqNJtMTQ" },
  { id: "slime", label: "Slime", videoId: "kNnlSMBTk3A" },
  { id: "asmr", label: "ASMR", videoId: "OoMcGP7C3bE" },
  { id: "cleaning", label: "Satisfying Cleaning", videoId: "Yz19YsAbBJ0" },
  { id: "hydraulic", label: "Hydraulic Press", videoId: "AbXL0UxqMsU" },
  { id: "satisfying", label: "Oddly Satisfying", videoId: "JJv74R7fVxY" },
];

interface VideoPreviewProps {
  title: string;
  story: string;
  category: string;
  playbackState: PlaybackState;
  setPlaybackState: (state: PlaybackState) => void;
}

export function VideoPreview({
  title,
  story,
  category,
  playbackState,
  setPlaybackState,
}: VideoPreviewProps) {
  const [activeWordIndex, setActiveWordIndex] = useState<number>(-1);
  const words = story.split(/\s+/).filter(Boolean);
  
  const videoId = CATEGORIES.find(c => c.id === category)?.videoId || CATEGORIES[0].videoId;
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Group words into chunks of 3-4 for display
  const getVisibleText = () => {
    if (activeWordIndex < 0 || activeWordIndex >= words.length) return "";
    
    // Simple approach: show 3 words around the active word
    const start = Math.max(0, activeWordIndex - 1);
    const end = Math.min(words.length, activeWordIndex + 2);
    
    return words.map((w, i) => {
      if (i >= start && i <= end) {
        return i === activeWordIndex ? `<span class="text-yellow-400">${w}</span>` : w;
      }
      return null;
    }).filter(Boolean).join(" ");
  };

  useEffect(() => {
    if (playbackState === "intro") {
      // Show intro for 5 seconds, then narrate
      const t = setTimeout(() => {
        setPlaybackState("narrating");
      }, 5000);
      return () => clearTimeout(t);
    } else if (playbackState === "narrating") {
      // Start TTS
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel(); // clear previous
        
        const utterance = new SpeechSynthesisUtterance(story);
        utterance.rate = 1.1;
        utterance.pitch = 1.0;
        synthRef.current = utterance;
        
        utterance.onboundary = (e) => {
          if (e.name === 'word') {
            const textUntilHere = story.substring(0, e.charIndex);
            const wordsUntilHere = textUntilHere.split(/\s+/).filter(Boolean).length;
            setActiveWordIndex(wordsUntilHere);
          }
        };
        
        utterance.onend = () => {
          setPlaybackState("done");
          setActiveWordIndex(-1);
        };
        
        window.speechSynthesis.speak(utterance);
      } else {
        // Fallback if no TTS
        const t = setTimeout(() => setPlaybackState("done"), 5000);
        return () => clearTimeout(t);
      }
    } else if (playbackState === "idle" || playbackState === "done") {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setActiveWordIndex(-1);
    }
  }, [playbackState, story, setPlaybackState]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return (
    <div className="relative w-full max-w-[400px] aspect-[9/16] bg-black rounded-xl overflow-hidden border border-border/50 shadow-2xl flex items-center justify-center">
      
      {/* Background Video */}
      {(playbackState === "intro" || playbackState === "narrating" || playbackState === "done") ? (
        <div className="absolute inset-0 pointer-events-none scale-125">
           <iframe 
            src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&loop=1&controls=0&playsinline=1&modestbranding=1&playlist=${videoId}`}
            className="absolute inset-0 w-full h-full object-cover"
            allow="autoplay; encrypted-media"
          />
          {/* Overlay to darken background slightly for readability */}
          <div className="absolute inset-0 bg-black/40" />
        </div>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-b from-neutral-900 to-black flex items-center justify-center flex-col">
          <div className="w-16 h-16 rounded-full bg-border/20 flex items-center justify-center mb-4">
             <span className="text-2xl opacity-50">▶</span>
          </div>
          <p className="text-muted-foreground font-medium">Ready to preview</p>
        </div>
      )}

      {/* Phase 1: Intro Card */}
      <AnimatePresence>
        {playbackState === "intro" && (
          <motion.div 
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.4 }}
            className="relative z-10 w-[90%] max-w-[320px] bg-white rounded-md p-4 shadow-xl"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-[#FF4500] flex items-center justify-center text-white font-bold text-sm">
                r/
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <span className="text-black font-bold text-sm">r/BlankVex</span>
                  <CheckCircle2 className="w-4 h-4 text-blue-500 fill-blue-500/20" />
                </div>
                <div className="text-gray-500 text-xs">
                  Posted by u/BlankVex_AI • 2h ago
                </div>
              </div>
            </div>
            
            <h2 className="text-black font-bold text-lg leading-tight mb-4">
              {title || "AITA for generating an awesome story?"}
            </h2>
            
            <div className="flex items-center gap-4 text-gray-500 text-sm font-semibold">
              <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded">
                <ArrowBigUp className="w-5 h-5" />
                <span>9.2k</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded">
                <MessageCircle className="w-4 h-4" />
                <span>428</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded">
                <Share className="w-4 h-4" />
                <span>Share</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Phase 2: Narrating Captions */}
      <AnimatePresence>
        {playbackState === "narrating" && activeWordIndex >= 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute z-10 bottom-[20%] left-4 right-4 text-center pointer-events-none"
          >
            <h1 
              className="text-4xl md:text-5xl font-black text-white leading-tight uppercase"
              style={{
                textShadow: "0px 0px 10px rgba(0,0,0,0.8), -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000",
                WebkitTextStroke: "1px black"
              }}
              dangerouslySetInnerHTML={{ __html: getVisibleText() }}
            />
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

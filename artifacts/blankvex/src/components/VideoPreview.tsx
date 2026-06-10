import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, MessageCircle, Share, ArrowBigUp, RotateCcw } from "lucide-react";

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

// StreamElements TTS — free, no API key, sounds like popular Reddit TikTok narrators
async function fetchTTSAudio(text: string): Promise<string> {
  const voice = "Brian"; // "Brian" is the classic Reddit story voice
  const url = `https://api.streamelements.com/kappa/v2/speech?voice=${voice}&text=${encodeURIComponent(text)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("TTS fetch failed");
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

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
  const [ttsLoading, setTtsLoading] = useState(false);
  const words = story.split(/\s+/).filter(Boolean);

  const videoId = CATEGORIES.find((c) => c.id === category)?.videoId ?? CATEGORIES[0].videoId;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const rafRef = useRef<number | null>(null);

  // Word tracking via requestAnimationFrame against audio.currentTime
  const trackWords = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || audio.paused || audio.ended) return;

    const elapsed = audio.currentTime;
    const duration = audio.duration || 1;
    const idx = Math.min(
      Math.floor((elapsed / duration) * words.length),
      words.length - 1
    );
    setActiveWordIndex(idx);
    rafRef.current = requestAnimationFrame(trackWords);
  }, [words.length]);

  const stopAudio = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    setActiveWordIndex(-1);
  }, []);

  useEffect(() => {
    if (playbackState === "intro") {
      const t = setTimeout(() => setPlaybackState("narrating"), 5000);
      return () => clearTimeout(t);
    }

    if (playbackState === "narrating") {
      setTtsLoading(true);
      fetchTTSAudio(story)
        .then((blobUrl) => {
          audioUrlRef.current = blobUrl;
          const audio = new Audio(blobUrl);
          audioRef.current = audio;

          audio.onplay = () => {
            setTtsLoading(false);
            rafRef.current = requestAnimationFrame(trackWords);
          };

          audio.onended = () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            setPlaybackState("done");
            setActiveWordIndex(-1);
          };

          audio.onerror = () => {
            setTtsLoading(false);
            // Fallback to Web Speech API if StreamElements fails
            if (window.speechSynthesis) {
              window.speechSynthesis.cancel();
              const utterance = new SpeechSynthesisUtterance(story);
              utterance.rate = 1.0;
              utterance.onboundary = (e) => {
                if (e.name === "word") {
                  const count = story.substring(0, e.charIndex).split(/\s+/).filter(Boolean).length;
                  setActiveWordIndex(count);
                }
              };
              utterance.onend = () => { setPlaybackState("done"); setActiveWordIndex(-1); };
              window.speechSynthesis.speak(utterance);
            }
          };

          audio.play().catch(() => {
            // Autoplay blocked — try Web Speech API fallback
            audio.onerror?.(new Event("error"));
          });
        })
        .catch(() => {
          setTtsLoading(false);
          setPlaybackState("done");
        });

      return () => { stopAudio(); };
    }

    if (playbackState === "idle" || playbackState === "done") {
      stopAudio();
      window.speechSynthesis?.cancel();
    }

    return undefined;
  }, [playbackState, story, setPlaybackState, trackWords, stopAudio]);

  useEffect(() => {
    return () => { stopAudio(); window.speechSynthesis?.cancel(); };
  }, [stopAudio]);

  // Show 4 words at a time, highlight the active one
  const getCaption = () => {
    if (activeWordIndex < 0 || activeWordIndex >= words.length) return null;
    const start = Math.max(0, activeWordIndex - 1);
    const end = Math.min(words.length - 1, start + 3);
    return words.slice(start, end + 1).map((w, i) => ({
      word: w,
      active: start + i === activeWordIndex,
    }));
  };

  const caption = getCaption();
  const isActive = playbackState === "intro" || playbackState === "narrating" || playbackState === "done";

  return (
    <div className="relative w-full max-w-[360px] aspect-[9/16] rounded-2xl overflow-hidden border border-white/10 shadow-[0_0_60px_rgba(0,0,0,0.8)] flex items-center justify-center">

      {/* ── Background YouTube video: always mounted once active, covers full portrait frame ── */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        style={{ zIndex: 0 }}
      >
        {isActive ? (
          <iframe
            key={videoId}
            src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&loop=1&controls=0&playsinline=1&modestbranding=1&playlist=${videoId}&rel=0`}
            allow="autoplay; encrypted-media"
            title="background"
            style={{
              position: "absolute",
              /* To cover a 9:16 container with a 16:9 video:
                 Container H = W * (16/9). Video at 100% W has H = W * (9/16).
                 Scale factor needed = (W * 16/9) / (W * 9/16) = 256/81 ≈ 3.16.
                 We set height=100% and width = height * (16/9), then center. */
              top: "50%",
              left: "50%",
              height: "100%",
              /* width = container_height * (16/9) = container_width * (16/9)^2 ≈ 316% */
              width: "316%",
              transform: "translate(-50%, -50%)",
              border: "none",
            }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-neutral-900 to-black" />
        )}
        {/* Subtle darkening scrim for text readability */}
        {isActive && <div className="absolute inset-0 bg-black/30" />}
      </div>

      {/* ── Idle placeholder ── */}
      {playbackState === "idle" && (
        <div className="relative z-10 flex flex-col items-center gap-3 text-center px-6">
          <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
            <span className="text-3xl text-white/40">▶</span>
          </div>
          <p className="text-white/40 font-medium text-sm">Ready to preview</p>
        </div>
      )}

      {/* ── Phase 1: Reddit Intro Card ── */}
      <AnimatePresence>
        {playbackState === "intro" && (
          <motion.div
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            style={{ zIndex: 20 }}
            className="absolute inset-x-4 mx-auto max-w-[310px] bg-white rounded-xl p-4 shadow-2xl"
          >
            {/* Subreddit header */}
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-full bg-[#FF4500] flex items-center justify-center shrink-0">
                <svg viewBox="0 0 20 20" width="20" height="20" fill="white">
                  <circle cx="10" cy="10" r="10" fill="#FF4500" />
                  <path d="M16.67 10a1.46 1.46 0 0 0-2.47-1 7.12 7.12 0 0 0-3.85-1.23l.65-3.08 2.13.45a1 1 0 1 0 .42-.81l-2.38-.5a.26.26 0 0 0-.31.2l-.73 3.44a7.14 7.14 0 0 0-3.89 1.23 1.46 1.46 0 1 0-1.61 2.39 2.87 2.87 0 0 0 0 .44c0 2.24 2.61 4.06 5.83 4.06s5.83-1.82 5.83-4.06a2.87 2.87 0 0 0 0-.44 1.46 1.46 0 0 0 .29-.59zM7 11a1 1 0 1 1 1 1 1 1 0 0 1-1-1zm5.56 2.65a3.47 3.47 0 0 1-2.56.85 3.47 3.47 0 0 1-2.56-.85.26.26 0 0 1 .37-.37 3 3 0 0 0 2.19.71 3 3 0 0 0 2.19-.71.26.26 0 0 1 .37.37zm-.16-1.65a1 1 0 1 1 1-1 1 1 0 0 1-1 1z" fill="white"/>
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <span className="text-black font-bold text-sm leading-none">r/BlankVex</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 fill-blue-100 shrink-0" />
                </div>
                <p className="text-gray-400 text-xs mt-0.5">Posted by u/BlankVex_AI · 2h ago</p>
              </div>
            </div>

            {/* Post title */}
            <h2 className="text-black font-bold text-base leading-snug mb-4">
              {title || "AITA for generating an awesome story?"}
            </h2>

            {/* Action bar */}
            <div className="flex items-center gap-2 text-gray-500 text-xs font-bold">
              <div className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 rounded-full">
                <ArrowBigUp className="w-4 h-4" />
                <span>99+</span>
              </div>
              <div className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 rounded-full">
                <MessageCircle className="w-3.5 h-3.5" />
                <span>99+</span>
              </div>
              <div className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 rounded-full">
                <Share className="w-3.5 h-3.5" />
                <span>Share</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Phase 2: TikTok-style captions ── */}
      {playbackState === "narrating" && (
        <div
          className="absolute left-3 right-3 text-center pointer-events-none"
          style={{ bottom: "18%", zIndex: 20 }}
        >
          {ttsLoading ? (
            <p className="text-white/60 text-sm font-semibold animate-pulse">Loading voice...</p>
          ) : caption ? (
            <p
              className="text-4xl font-black uppercase leading-tight tracking-wide"
              style={{
                textShadow:
                  "-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, 0 3px 8px rgba(0,0,0,0.9)",
              }}
            >
              {caption.map((item, i) => (
                <span
                  key={i}
                  className={item.active ? "text-yellow-400" : "text-white"}
                >
                  {item.word}
                  {i < caption.length - 1 ? " " : ""}
                </span>
              ))}
            </p>
          ) : null}
        </div>
      )}

      {/* ── Done: replay overlay ── */}
      {playbackState === "done" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50" style={{ zIndex: 20 }}>
          <button
            onClick={() => setPlaybackState("intro")}
            className="flex flex-col items-center gap-2 text-white hover:text-yellow-400 transition-colors"
          >
            <RotateCcw className="w-10 h-10" />
            <span className="text-sm font-bold uppercase tracking-widest">Replay</span>
          </button>
        </div>
      )}
    </div>
  );
}

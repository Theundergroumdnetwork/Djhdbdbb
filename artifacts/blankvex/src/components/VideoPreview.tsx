import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, MessageCircle, Share, ArrowBigUp, RotateCcw } from "lucide-react";

export type PlaybackState = "idle" | "intro" | "narrating" | "done";

// ── TTS via backend proxy ─────────────────────────────────────────────────────
async function fetchTTSBlob(text: string): Promise<string> {
  const base = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");
  const res = await fetch(`${base}/api/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `TTS ${res.status}`);
  }
  return URL.createObjectURL(await res.blob());
}

interface VideoPreviewProps {
  title: string;
  story: string;
  videoSrc: string | null;   // object URL from uploaded file
  playbackState: PlaybackState;
  setPlaybackState: (s: PlaybackState) => void;
}

export function VideoPreview({
  title,
  story,
  videoSrc,
  playbackState,
  setPlaybackState,
}: VideoPreviewProps) {
  const [activeWordIndex, setActiveWordIndex] = useState(-1);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [ttsError, setTtsError] = useState<string | null>(null);
  const words = story.split(/\s+/).filter(Boolean);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioBlobRef = useRef<string | null>(null);
  const rafRef = useRef<number | null>(null);

  const trackWords = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || audio.paused || audio.ended) return;
    const idx = Math.min(
      Math.floor((audio.currentTime / (audio.duration || 1)) * words.length),
      words.length - 1,
    );
    setActiveWordIndex(idx);
    rafRef.current = requestAnimationFrame(trackWords);
  }, [words.length]);

  const stopAudio = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; audioRef.current = null; }
    if (audioBlobRef.current) { URL.revokeObjectURL(audioBlobRef.current); audioBlobRef.current = null; }
    setActiveWordIndex(-1);
    setTtsError(null);
  }, []);

  useEffect(() => {
    if (playbackState === "intro") {
      const t = setTimeout(() => setPlaybackState("narrating"), 5000);
      return () => clearTimeout(t);
    }

    if (playbackState === "narrating") {
      setTtsLoading(true);
      setTtsError(null);

      fetchTTSBlob(story)
        .then((blobUrl) => {
          audioBlobRef.current = blobUrl;
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
            setTtsError("Voice failed — check console");
            setPlaybackState("done");
          };
          audio.play().catch((e) => {
            setTtsLoading(false);
            setTtsError(String(e));
          });
        })
        .catch((e: unknown) => {
          setTtsLoading(false);
          setTtsError(e instanceof Error ? e.message : String(e));
          setPlaybackState("done");
        });

      return () => stopAudio();
    }

    if (playbackState === "idle" || playbackState === "done") stopAudio();
    return undefined;
  }, [playbackState, story, setPlaybackState, trackWords, stopAudio]);

  useEffect(() => () => stopAudio(), [stopAudio]);

  const getCaption = () => {
    if (activeWordIndex < 0 || activeWordIndex >= words.length) return null;
    const start = Math.max(0, activeWordIndex - 1);
    const end = Math.min(words.length - 1, start + 3);
    return words.slice(start, end + 1).map((w, i) => ({ w, active: start + i === activeWordIndex }));
  };

  const isActive = playbackState !== "idle";

  return (
    <div className="relative w-full max-w-[360px] aspect-[9/16] rounded-2xl overflow-hidden border border-white/10 shadow-[0_0_60px_rgba(0,0,0,0.8)] flex items-center justify-center">

      {/* Background video layer */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        {isActive && videoSrc ? (
          <video
            key={videoSrc}
            src={videoSrc}
            autoPlay muted loop playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-neutral-900 to-black" />
        )}
        {isActive && <div className="absolute inset-0 bg-black/35" />}
      </div>

      {/* Idle state */}
      {playbackState === "idle" && (
        <div className="relative z-10 flex flex-col items-center gap-3 text-center px-6">
          <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
            <span className="text-3xl text-white/40">▶</span>
          </div>
          <p className="text-white/40 text-sm font-medium">Ready to preview</p>
        </div>
      )}

      {/* Reddit intro card */}
      <AnimatePresence>
        {playbackState === "intro" && (
          <motion.div
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="absolute inset-x-4 mx-auto max-w-[310px] bg-white rounded-xl p-4 shadow-2xl"
            style={{ zIndex: 20 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-full bg-[#FF4500] flex items-center justify-center shrink-0">
                <svg viewBox="0 0 20 20" width="22" height="22" fill="white">
                  <path d="M16.67 10a1.46 1.46 0 0 0-2.47-1 7.12 7.12 0 0 0-3.85-1.23l.65-3.08 2.13.45a1 1 0 1 0 .42-.81l-2.38-.5a.26.26 0 0 0-.31.2l-.73 3.44a7.14 7.14 0 0 0-3.89 1.23 1.46 1.46 0 1 0-1.61 2.39 2.87 2.87 0 0 0 0 .44c0 2.24 2.61 4.06 5.83 4.06s5.83-1.82 5.83-4.06a2.87 2.87 0 0 0 0-.44 1.46 1.46 0 0 0 .29-.59zM7 11a1 1 0 1 1 1 1 1 1 0 0 1-1-1zm5.56 2.65a3.47 3.47 0 0 1-2.56.85 3.47 3.47 0 0 1-2.56-.85.26.26 0 0 1 .37-.37 3 3 0 0 0 2.19.71 3 3 0 0 0 2.19-.71.26.26 0 0 1 .37.37zm-.16-1.65a1 1 0 1 1 1-1 1 1 0 0 1-1 1z" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <span className="text-black font-bold text-sm">r/BlankVex</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 fill-blue-100 shrink-0" />
                </div>
                <p className="text-gray-400 text-xs mt-0.5">Posted by u/BlankVex_AI · 2h ago</p>
              </div>
            </div>
            <h2 className="text-black font-bold text-base leading-snug mb-4">
              {title || "AITA for something outrageous?"}
            </h2>
            <div className="flex items-center gap-2 text-gray-500 text-xs font-bold">
              {[
                { icon: <ArrowBigUp className="w-4 h-4" />, label: "99+" },
                { icon: <MessageCircle className="w-3.5 h-3.5" />, label: "99+" },
                { icon: <Share className="w-3.5 h-3.5" />, label: "Share" },
              ].map(({ icon, label }, i) => (
                <div key={i} className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 rounded-full">
                  {icon}<span>{label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TikTok captions */}
      {playbackState === "narrating" && (
        <div className="absolute left-3 right-3 text-center pointer-events-none" style={{ bottom: "18%", zIndex: 20 }}>
          {ttsLoading ? (
            <p className="text-white/60 text-sm font-semibold animate-pulse">Loading voice…</p>
          ) : ttsError ? (
            <p className="text-red-400 text-xs font-medium">{ttsError}</p>
          ) : getCaption() ? (
            <p
              className="text-4xl font-black uppercase leading-tight tracking-wide"
              style={{ textShadow: "-2px -2px 0 #000,2px -2px 0 #000,-2px 2px 0 #000,2px 2px 0 #000,0 3px 8px rgba(0,0,0,.9)" }}
            >
              {getCaption()!.map((item, i) => (
                <span key={i} className={item.active ? "text-yellow-400" : "text-white"}>
                  {item.w}{i < getCaption()!.length - 1 ? " " : ""}
                </span>
              ))}
            </p>
          ) : null}
        </div>
      )}

      {/* Done overlay */}
      {playbackState === "done" && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center" style={{ zIndex: 20 }}>
          <button onClick={() => setPlaybackState("intro")} className="flex flex-col items-center gap-2 text-white hover:text-yellow-400 transition-colors">
            <RotateCcw className="w-10 h-10" />
            <span className="text-sm font-bold uppercase tracking-widest">Replay</span>
          </button>
        </div>
      )}
    </div>
  );
}

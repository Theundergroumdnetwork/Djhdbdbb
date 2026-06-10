import { useEffect, useRef, useState, useCallback } from "react";
import { Download, ArrowLeft, AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

const CW = 720;
const CH = 1280;

// ── Canvas drawing helpers ────────────────────────────────────────────────────

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lineH: number) {
  const words = text.split(" ");
  let line = "";
  let yy = y;
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, yy);
      line = w; yy += lineH;
    } else { line = test; }
  }
  if (line) ctx.fillText(line, x, yy);
}

function drawFrame(ctx: CanvasRenderingContext2D, video: HTMLVideoElement) {
  if (video.readyState < 2) { ctx.fillStyle = "#000"; ctx.fillRect(0, 0, CW, CH); return; }
  const s = Math.max(CW / video.videoWidth, CH / video.videoHeight);
  const sw = CW / s, sh = CH / s;
  const sx = (video.videoWidth - sw) / 2, sy = (video.videoHeight - sh) / 2;
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, CW, CH);
}

function drawCard(ctx: CanvasRenderingContext2D, title: string) {
  const cw = 620, cx = (CW - cw) / 2;
  ctx.font = "bold 26px Arial";
  const titleW = cw - 48;
  let lines = 0, line = "";
  for (const w of title.split(" ")) {
    const t = line ? line + " " + w : w;
    if (ctx.measureText(t).width > titleW && line) { lines++; line = w; } else line = t;
  }
  if (line) lines++;
  const ch = 150 + lines * 34 + 56;
  const cy = CH / 2 - ch / 2 - 40;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.55)"; ctx.shadowBlur = 28; ctx.shadowOffsetY = 10;
  ctx.fillStyle = "#FFFFFF";
  roundRect(ctx, cx, cy, cw, ch, 18); ctx.fill();
  ctx.restore();

  // Orange circle
  ctx.fillStyle = "#FF4500";
  ctx.beginPath(); ctx.arc(cx + 42, cy + 54, 24, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#FFF"; ctx.font = "bold 17px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("r/", cx + 42, cy + 54);

  // r/BlankVex + checkmark
  ctx.fillStyle = "#000"; ctx.font = "bold 21px Arial"; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  ctx.fillText("r/BlankVex", cx + 76, cy + 50);
  ctx.fillStyle = "#0079D3"; ctx.font = "bold 18px Arial";
  ctx.fillText("✓", cx + 76 + ctx.measureText("r/BlankVex").width + 7, cy + 50);

  // Meta
  ctx.fillStyle = "#888"; ctx.font = "15px Arial";
  ctx.fillText("Posted by u/BlankVex_AI  ·  2h ago", cx + 76, cy + 74);

  // Title
  ctx.fillStyle = "#1a1a1b"; ctx.font = "bold 26px Arial";
  wrapText(ctx, title, cx + 24, cy + 116, titleW, 34);

  // Action pills
  const by = cy + ch - 48;
  for (const [bx, label] of [[cx + 20, "▲  99+"], [cx + 126, "✦  99+"]] as [number, string][]) {
    ctx.fillStyle = "#F6F7F8"; roundRect(ctx, bx, by, 96, 34, 17); ctx.fill();
    ctx.fillStyle = "#444"; ctx.font = "bold 15px Arial"; ctx.textAlign = "center";
    ctx.fillText(label, bx + 48, by + 22);
  }
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
}

function drawCaptions(ctx: CanvasRenderingContext2D, words: string[], activeIdx: number) {
  if (activeIdx < 0 || activeIdx >= words.length) return;
  const start = Math.max(0, activeIdx - 1);
  const end = Math.min(words.length - 1, start + 3);
  const chunk = words.slice(start, end + 1);

  const maxW = CW - 56; // 28px padding each side
  let fontSize = 64;
  ctx.font = `bold ${fontSize}px Arial`;
  // Scale font down until all words fit on one line
  while (ctx.measureText(chunk.join(" ")).width > maxW && fontSize > 28) {
    fontSize -= 4;
    ctx.font = `bold ${fontSize}px Arial`;
  }

  ctx.textBaseline = "middle";
  const totalW = ctx.measureText(chunk.join(" ")).width;
  let x = (CW - totalW) / 2;
  const y = CH * 0.76;

  for (let i = 0; i < chunk.length; i++) {
    const w = chunk[i];
    const active = start + i === activeIdx;
    const offsets: [number, number][] = [[-3,-3],[0,-3],[3,-3],[-3,0],[3,0],[-3,3],[0,3],[3,3]];
    ctx.fillStyle = "#000";
    for (const [ox, oy] of offsets) ctx.fillText(w, x + ox, y + oy);
    ctx.fillStyle = active ? "#FFE000" : "#FFFFFF";
    ctx.fillText(w, x, y);
    x += ctx.measureText(w + " ").width;
  }
  ctx.textBaseline = "alphabetic";
}

// ── TTS: fetch audio as decoded AudioBuffer (handles long text via backend chunking) ──

async function fetchAudioBuffer(text: string, audioCtx: AudioContext): Promise<AudioBuffer> {
  const base = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");
  const res = await fetch(`${base}/api/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `TTS ${res.status}`);
  }
  const arrayBuf = await res.arrayBuffer();
  return audioCtx.decodeAudioData(arrayBuf);
}

// ── Component ─────────────────────────────────────────────────────────────────

type Phase = "preparing" | "recording" | "done" | "error";

export interface VideoRecorderProps {
  title: string;
  story: string;
  gameplayFile: File;
  onBack: () => void;
}

export function VideoRecorder({ title, story, gameplayFile, onBack }: VideoRecorderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<Phase>("preparing");
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState("Generating voice…");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadExt, setDownloadExt] = useState<string>("mp4");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const start = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setPhase("preparing");
    setProgress(0);
    setErrorMsg(null);
    setStatusMsg("Generating voice…");

    try {
      // 1. Create AudioContext and decode TTS (backend chunks long text automatically)
      const audioCtx = new AudioContext();
      await audioCtx.resume(); // browsers suspend AudioContext until a user-gesture; resume before scheduling
      const ttsBuffer = await fetchAudioBuffer(story, audioCtx);
      const ttsDuration = ttsBuffer.duration;
      const totalDuration = 5 + ttsDuration;

      setStatusMsg("Loading video…");

      // 2. Load gameplay video
      const videoEl = document.createElement("video");
      videoEl.src = URL.createObjectURL(gameplayFile);
      videoEl.muted = true; videoEl.playsInline = true; videoEl.loop = true;
      await new Promise<void>((res, rej) => {
        videoEl.onloadedmetadata = () => res();
        videoEl.onerror = () => rej(new Error("Video failed to load"));
        setTimeout(() => rej(new Error("Video load timeout")), 20000);
      });

      setStatusMsg("Recording…");

      // 3. Wire audio: TTS source → dest (for recording) + speakers
      const dest = audioCtx.createMediaStreamDestination();
      const src = audioCtx.createBufferSource();
      src.buffer = ttsBuffer;
      src.connect(dest);
      src.connect(audioCtx.destination);

      // 4. MediaRecorder on canvas + audio stream
      const canvasStream = canvas.captureStream(30);
      const combined = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...dest.stream.getAudioTracks(),
      ]);
      const mimeType = (
        MediaRecorder.isTypeSupported("video/mp4;codecs=avc1") ? "video/mp4;codecs=avc1" :
        MediaRecorder.isTypeSupported("video/mp4") ? "video/mp4" :
        MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus") ? "video/webm;codecs=vp9,opus" :
        "video/webm"
      );
      const ext = mimeType.startsWith("video/mp4") ? "mp4" : "webm";
      setDownloadExt(ext);
      const recorder = new MediaRecorder(combined, { mimeType });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = () => {
        setDownloadUrl(URL.createObjectURL(new Blob(chunks, { type: mimeType })));
        setPhase("done"); setProgress(100);
      };

      // 5. Start
      videoEl.play();
      recorder.start(100);
      setPhase("recording");

      const t0 = audioCtx.currentTime;
      const ttsStartAt = t0 + 5;
      src.start(ttsStartAt);

      const storyWords = story.split(/\s+/).filter(Boolean);
      let rafId = 0;

      const draw = () => {
        const elapsed = audioCtx.currentTime - t0;
        setProgress(Math.min(99, Math.round((elapsed / totalDuration) * 100)));

        // ── draw frame ──
        drawFrame(ctx, videoEl);
        ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fillRect(0, 0, CW, CH);

        if (elapsed < 5) {
          drawCard(ctx, title);
        } else if (elapsed < totalDuration) {
          const wIdx = Math.min(
            Math.floor(((elapsed - 5) / ttsDuration) * storyWords.length),
            storyWords.length - 1,
          );
          drawCaptions(ctx, storyWords, wIdx);
        }

        if (elapsed < totalDuration + 0.3) {
          rafId = requestAnimationFrame(draw);
        } else {
          recorder.stop();
          videoEl.pause();
          URL.revokeObjectURL(videoEl.src);
          audioCtx.close();
        }
      };
      rafId = requestAnimationFrame(draw);

      cleanupRef.current = () => {
        cancelAnimationFrame(rafId);
        try { recorder.stop(); } catch {}
        videoEl.pause();
        URL.revokeObjectURL(videoEl.src);
        audioCtx.close();
      };
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setPhase("error");
    }
  }, [title, story, gameplayFile]);

  useEffect(() => { start(); return () => cleanupRef.current?.(); }, [start]);
  useEffect(() => () => { if (downloadUrl) URL.revokeObjectURL(downloadUrl); }, [downloadUrl]);

  return (
    <div className="flex flex-col items-center gap-4 w-full h-full">
      {/* Top bar */}
      <div className="w-full flex items-center justify-between px-2">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="button-back">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <span className={`text-xs font-bold ${phase === "recording" ? "text-[#FF4500] animate-pulse" : phase === "done" ? "text-green-400" : "text-muted-foreground"}`}>
          {phase === "preparing" && statusMsg}
          {phase === "recording" && `REC ${progress}%`}
          {phase === "done" && "Done — ready to download"}
          {phase === "error" && "Error"}
        </span>
      </div>

      {/* Canvas */}
      <div className="relative flex-1 w-full flex items-center justify-center min-h-0">
        <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl" style={{ aspectRatio: "9/16", height: "min(100%, 540px)" }}>
          <canvas ref={canvasRef} width={CW} height={CH} className="w-full h-full" />

          {(phase === "preparing" || phase === "recording") && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
              <div className="h-full bg-[#FF4500] transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          )}

          {phase === "error" && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <AlertCircle className="w-10 h-10 text-red-400" />
              <p className="text-white text-sm font-medium">{errorMsg}</p>
              <button onClick={start} className="flex items-center gap-1.5 text-sm text-white/70 hover:text-white">
                <RotateCcw className="w-4 h-4" /> Retry
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Download */}
      {phase === "done" && downloadUrl && (
        <a href={downloadUrl} download={`blankvex-video.${downloadExt}`} className="w-full max-w-[360px]">
          <Button size="lg" className="w-full h-14 text-lg font-bold bg-[#FF4500] hover:bg-[#E03D00] text-white shadow-lg" data-testid="button-download">
            <Download className="w-5 h-5 mr-2" /> Download Video
          </Button>
        </a>
      )}

      {phase === "recording" && (
        <p className="text-xs text-muted-foreground text-center max-w-xs">Stay on this page until recording finishes</p>
      )}
    </div>
  );
}

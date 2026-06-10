import { useEffect, useRef, useState, useCallback } from "react";
import { Download, ArrowLeft, AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

const CW = 720;
const CH = 1280;

// ── Canvas helpers ────────────────────────────────────────────────────────────

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
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

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxW: number,
  lineH: number
): number {
  const wordsArr = text.split(" ");
  let line = "";
  let yPos = y;
  for (const word of wordsArr) {
    const test = line ? line + " " + word : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, yPos);
      line = word;
      yPos += lineH;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, yPos);
  return yPos;
}

function drawVideoFrame(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement
) {
  if (video.readyState < 2) {
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, CW, CH);
    return;
  }
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const scale = Math.max(CW / vw, CH / vh);
  const sw = CW / scale;
  const sh = CH / scale;
  const sx = (vw - sw) / 2;
  const sy = (vh - sh) / 2;
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, CW, CH);
}

function drawScrim(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "rgba(0,0,0,0.38)";
  ctx.fillRect(0, 0, CW, CH);
}

function drawRedditCard(ctx: CanvasRenderingContext2D, title: string) {
  const cardW = 620;
  const cardX = (CW - cardW) / 2;

  // Measure title height
  ctx.font = "bold 26px Arial";
  const titleMaxW = cardW - 48;
  const titleWords = title.split(" ");
  let line = "";
  let titleLines = 0;
  for (const word of titleWords) {
    const test = line ? line + " " + word : word;
    if (ctx.measureText(test).width > titleMaxW && line) {
      titleLines++;
      line = word;
    } else {
      line = test;
    }
  }
  if (line) titleLines++;

  const cardH = 148 + titleLines * 34 + 56;
  const cardY = CH / 2 - cardH / 2 - 40;

  // Drop shadow
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = "#FFFFFF";
  roundRect(ctx, cardX, cardY, cardW, cardH, 18);
  ctx.fill();
  ctx.restore();

  // Reddit orange circle
  ctx.fillStyle = "#FF4500";
  ctx.beginPath();
  ctx.arc(cardX + 42, cardY + 54, 24, 0, Math.PI * 2);
  ctx.fill();

  // Snoo "r/" in circle
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 17px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("r/", cardX + 42, cardY + 54);

  // r/BlankVex
  ctx.fillStyle = "#000000";
  ctx.font = "bold 21px Arial";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("r/BlankVex", cardX + 76, cardY + 50);

  // Blue checkmark
  ctx.fillStyle = "#0079D3";
  ctx.font = "bold 18px Arial";
  const subW = ctx.measureText("r/BlankVex").width;
  ctx.fillText("✓", cardX + 76 + subW + 7, cardY + 50);

  // Meta line
  ctx.fillStyle = "#888888";
  ctx.font = "15px Arial";
  ctx.fillText("Posted by u/BlankVex_AI  ·  2h ago", cardX + 76, cardY + 74);

  // Title
  ctx.fillStyle = "#1a1a1b";
  ctx.font = "bold 26px Arial";
  wrapText(ctx, title, cardX + 24, cardY + 116, titleMaxW, 34);

  // Action bar
  const btnY = cardY + cardH - 48;

  // Upvote pill
  ctx.fillStyle = "#F6F7F8";
  roundRect(ctx, cardX + 20, btnY, 96, 34, 17);
  ctx.fill();
  ctx.fillStyle = "#444444";
  ctx.font = "bold 15px Arial";
  ctx.textAlign = "center";
  ctx.fillText("▲  99+", cardX + 68, btnY + 22);

  // Comment pill
  ctx.fillStyle = "#F6F7F8";
  roundRect(ctx, cardX + 126, btnY, 100, 34, 17);
  ctx.fill();
  ctx.fillStyle = "#444444";
  ctx.fillText("✦  99+", cardX + 176, btnY + 22);

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

function drawCaptions(
  ctx: CanvasRenderingContext2D,
  words: string[],
  activeIdx: number
) {
  if (activeIdx < 0 || activeIdx >= words.length) return;

  const start = Math.max(0, activeIdx - 1);
  const end = Math.min(words.length - 1, start + 3);
  const chunk = words.slice(start, end + 1);

  ctx.font = "bold 66px Arial";
  ctx.textBaseline = "middle";

  // Measure total line width to center
  const line = chunk.join(" ");
  const totalW = ctx.measureText(line).width;
  let xPos = CW / 2 - totalW / 2;
  const yPos = CH * 0.76;

  for (let i = 0; i < chunk.length; i++) {
    const word = chunk[i];
    const isActive = start + i === activeIdx;
    const wordW = ctx.measureText(word).width;
    const spaceW = ctx.measureText(" ").width;

    // Black outline (8 directional offsets)
    ctx.fillStyle = "#000000";
    const offsets: [number, number][] = [
      [-3, -3], [0, -3], [3, -3],
      [-3, 0],           [3, 0],
      [-3, 3],  [0, 3],  [3, 3],
    ];
    for (const [ox, oy] of offsets) {
      ctx.fillText(word, xPos + ox, yPos + oy);
    }

    // Colored fill
    ctx.fillStyle = isActive ? "#FFE000" : "#FFFFFF";
    ctx.fillText(word, xPos, yPos);

    xPos += wordW + (i < chunk.length - 1 ? spaceW : 0);
  }

  ctx.textBaseline = "alphabetic";
}

// ── TTS fetch via backend proxy ───────────────────────────────────────────────

async function fetchTTS(text: string): Promise<ArrayBuffer> {
  const base = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
  const res = await fetch(`${base}/api/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, voice: "Brian" }),
  });
  if (!res.ok) throw new Error(`TTS failed: ${res.status}`);
  return res.arrayBuffer();
}

// ── Component ─────────────────────────────────────────────────────────────────

type Phase = "preparing" | "recording" | "done" | "error";

interface VideoRecorderProps {
  title: string;
  story: string;
  gameplayFile: File;
  onBack: () => void;
}

export function VideoRecorder({ title, story, gameplayFile, onBack }: VideoRecorderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<Phase>("preparing");
  const [progress, setProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const startRecording = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setPhase("preparing");
    setProgress(0);

    try {
      // 1. Fetch TTS audio
      const ttsBuffer = await fetchTTS(story);

      // 2. Decode via AudioContext
      const audioCtx = new AudioContext();
      const decodedBuffer = await audioCtx.decodeAudioData(ttsBuffer.slice(0));
      const ttsDuration = decodedBuffer.duration;
      const totalDuration = 5 + ttsDuration;

      // 3. Create audio destination for recording
      const dest = audioCtx.createMediaStreamDestination();
      const source = audioCtx.createBufferSource();
      source.buffer = decodedBuffer;
      source.connect(dest);
      source.connect(audioCtx.destination); // also play locally

      // 4. Load gameplay video
      const videoEl = document.createElement("video");
      videoEl.src = URL.createObjectURL(gameplayFile);
      videoEl.muted = true;
      videoEl.playsInline = true;
      videoEl.loop = true;

      await new Promise<void>((resolve, reject) => {
        videoEl.onloadedmetadata = () => resolve();
        videoEl.onerror = () => reject(new Error("Video failed to load"));
        setTimeout(() => reject(new Error("Video load timeout")), 15000);
      });

      // 5. Combine canvas + audio streams for recording
      const canvasStream = canvas.captureStream(30);
      const combined = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...dest.stream.getAudioTracks(),
      ]);

      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : MediaRecorder.isTypeSupported("video/webm")
        ? "video/webm"
        : "video/mp4";

      const recorder = new MediaRecorder(combined, { mimeType });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        setDownloadUrl(URL.createObjectURL(blob));
        setPhase("done");
        setProgress(100);
      };

      // 6. Start everything
      videoEl.play();
      recorder.start(100);
      setPhase("recording");

      const recordStart = audioCtx.currentTime;
      const ttsStartAt = recordStart + 5;
      source.start(ttsStartAt);

      const words = story.split(/\s+/).filter(Boolean);
      let rafId = 0;

      const draw = () => {
        const elapsed = audioCtx.currentTime - recordStart;
        const clamped = Math.min(elapsed, totalDuration);
        setProgress(Math.round((clamped / totalDuration) * 100));

        // Draw frame
        drawVideoFrame(ctx, videoEl);
        drawScrim(ctx);

        if (elapsed < 5) {
          drawRedditCard(ctx, title);
        } else if (elapsed < totalDuration) {
          const audioElapsed = elapsed - 5;
          const wordIdx = Math.min(
            Math.floor((audioElapsed / ttsDuration) * words.length),
            words.length - 1
          );
          drawCaptions(ctx, words, wordIdx);
        }

        if (elapsed < totalDuration + 0.2) {
          rafId = requestAnimationFrame(draw);
        } else {
          recorder.stop();
          videoEl.pause();
          URL.revokeObjectURL(videoEl.src);
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
      const msg = err instanceof Error ? err.message : "Recording failed";
      setErrorMsg(msg);
      setPhase("error");
    }
  }, [title, story, gameplayFile]);

  useEffect(() => {
    startRecording();
    return () => { cleanupRef.current?.(); };
  }, [startRecording]);

  // Clean up download URL on unmount
  useEffect(() => {
    return () => {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    };
  }, [downloadUrl]);

  const ext = (() => {
    if (!downloadUrl) return "webm";
    if (downloadUrl.includes("mp4")) return "mp4";
    return "webm";
  })();

  return (
    <div className="flex flex-col items-center gap-4 w-full h-full">
      {/* Header bar */}
      <div className="w-full flex items-center justify-between px-2">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {phase === "preparing" && (
          <span className="text-xs text-muted-foreground animate-pulse">Preparing...</span>
        )}
        {phase === "recording" && (
          <span className="text-xs text-[#FF4500] font-bold animate-pulse">
            REC {progress}%
          </span>
        )}
        {phase === "done" && (
          <span className="text-xs text-green-400 font-bold">Done</span>
        )}
      </div>

      {/* Canvas preview — scales to fit panel */}
      <div className="relative flex-1 w-full flex items-center justify-center min-h-0">
        <div
          className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
          style={{ aspectRatio: "9/16", height: "min(100%, 560px)" }}
        >
          <canvas
            ref={canvasRef}
            width={CW}
            height={CH}
            className="w-full h-full"
          />

          {/* Progress bar overlay during recording */}
          {(phase === "preparing" || phase === "recording") && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
              <div
                className="h-full bg-[#FF4500] transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {/* Error overlay */}
          {phase === "error" && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <AlertCircle className="w-10 h-10 text-red-400" />
              <p className="text-white text-sm font-medium">{errorMsg}</p>
              <button
                onClick={() => { setErrorMsg(null); startRecording(); }}
                className="flex items-center gap-1.5 text-sm text-white/70 hover:text-white"
              >
                <RotateCcw className="w-4 h-4" /> Retry
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Download button */}
      {phase === "done" && downloadUrl && (
        <a href={downloadUrl} download={`blankvex-video.${ext}`} className="w-full max-w-[360px]">
          <Button
            size="lg"
            className="w-full h-14 text-lg font-bold bg-[#FF4500] hover:bg-[#E03D00] text-white shadow-lg"
            data-testid="button-download"
          >
            <Download className="w-5 h-5 mr-2" />
            Download Video
          </Button>
        </a>
      )}

      {phase === "recording" && (
        <p className="text-xs text-muted-foreground text-center max-w-xs">
          Recording in progress — stay on this page until complete
        </p>
      )}
    </div>
  );
}

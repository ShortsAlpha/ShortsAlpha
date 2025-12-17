import React, { useRef, useEffect } from "react";
import { Play, Pause, SkipBack, SkipForward, Volume2, Maximize2 } from "lucide-react";

interface PlayerPanelProps {
    script: any[];
    activeVideoClips: any[];
    backgroundUrl?: string | null;
    audioUrl?: string | null;
    currentTime: number;
    isPlaying: boolean;
    onTogglePlay: () => void;
    currentSubtitle: string;
    audioTracks?: any[];
    // Track State
    videoTrackState?: Record<number, { muted: boolean, hidden: boolean }>;
    audioTrackState?: Record<number, { muted: boolean, hidden: boolean }>;
}

export function PlayerPanel({ script, activeVideoClips = [], audioUrl, currentTime, isPlaying, onTogglePlay, currentSubtitle, audioTracks = [], videoTrackState = {}, audioTrackState = {} }: PlayerPanelProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    // Refs for Video Elements (for Volume Control)
    const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});
    // Refs for Audio Elements
    const audioRefs = useRef<{ [key: string]: HTMLAudioElement | null }>({});

    // Sync Playback & Time for all media
    useEffect(() => {
        // Sync Videos
        activeVideoClips.forEach(clip => {
            const el = videoRefs.current[clip.id];
            if (el) {
                // Calculate local time for this clip
                // Timeline Time: T, Clip Start: S -> Clip Time: T - S
                const localTime = Math.max(0, currentTime - clip.start);

                // Seek if desync > 0.5s (Relaxed for iOS smoothness)
                if (Math.abs(el.currentTime - localTime) > 0.5) {
                    el.currentTime = localTime;
                }

                if (isPlaying && el.paused) el.play().catch(() => { });
                if (!isPlaying && !el.paused) el.pause();

                // Volume Control (Global Track Mute overrides clip volume)
                const trackIdx = clip.trackIndex || 0;
                const isTrackMuted = videoTrackState[trackIdx]?.muted;
                el.volume = Math.min(1, Math.max(0, isTrackMuted ? 0 : (clip.volume !== undefined ? clip.volume : 1.0)));
            }
        });

        // Sync Audio Tracks
        audioTracks.forEach(track => {
            const el = audioRefs.current[track.id];
            if (el) {
                // Check if track is active
                if (currentTime >= track.start && currentTime < track.start + track.duration) {
                    const localTime = Math.max(0, currentTime - track.start);
                    // Sync time
                    if (Math.abs(el.currentTime - localTime) > 0.5) {
                        el.currentTime = localTime;
                    }
                    // Play if playing
                    if (isPlaying && el.paused) el.play().catch(() => { });
                    if (!isPlaying && !el.paused) el.pause();
                } else {
                    // Pause if outside range
                    if (!el.paused) el.pause();
                }

                // Volume Control (Global Track Mute overrides clip volume)
                const trackIdx = track.trackIndex || 0;
                const isTrackMuted = audioTrackState[trackIdx]?.muted;
                el.volume = Math.min(1, Math.max(0, isTrackMuted ? 0 : (track.volume !== undefined ? track.volume : 1.0)));
            }
        });

    }, [currentTime, isPlaying, activeVideoClips, audioTracks]);

    return (
        <div
            ref={containerRef}
            className="w-full h-full relative cursor-pointer group bg-black"
            onClick={onTogglePlay}
        >
            {/* 1. Video Layers (Render ALL active clips) */}
            {activeVideoClips.length > 0 ? (
                activeVideoClips.map((clip, index) => {
                    const trackIdx = clip.trackIndex || 0;
                    if (videoTrackState[trackIdx]?.hidden) return null; // Don't render if hidden

                    // Force remount if URL changes (e.g. re-upload)
                    const mk = `${clip.id}-${clip.url}`;

                    return (
                        <React.Fragment key={mk}>
                            <video
                                ref={(el) => { if (el) videoRefs.current[clip.id] = el; }}
                                src={clip.url + "#t=0.001"}
                                preload="metadata"
                                className="absolute inset-0 w-full h-full object-cover pointer-events-none transition-transform duration-75"
                                style={{
                                    zIndex: index, // Higher index = On Top
                                    willChange: 'transform', // GPU Hint
                                    transform: `
                                        scale(${clip.scale ?? 1}) 
                                        translate3d(${clip.positionX ?? 0}px, ${clip.positionY ?? 0}px, 0) 
                                        rotate(${clip.rotation ?? 0}deg)
                                    `
                                }}
                                loop={false}
                                playsInline
                                // crossOrigin="anonymous" // REMOVED: R2 Bucket Likely doesn't have CORS set, so this blocks playback (Error 4).
                                muted={false}
                                onError={(e) => {
                                    const err = e.currentTarget.error;
                                    console.error("Video Error:", clip.url, err);
                                    // Show error on UI
                                    const span = document.getElementById(`debug-${clip.id}`);
                                    if (span) span.style.display = 'block';
                                    if (span) span.innerText = `ERR: ${err?.code}\nSrc: ${clip.url.slice(0, 50)}...`;
                                }}
                            />
                            <div id={`debug-${clip.id}`} className="hidden absolute top-0 left-0 bg-red-600 text-white text-[10px] p-1 z-[100] max-w-[200px] break-all">
                                Loading...
                            </div>
                        </React.Fragment>
                    );
                })
            ) : (
                <div className="flex items-center justify-center h-full text-[#333] select-none">
                    No Signal
                </div>
            )}

            {/* 2. Subtitles Overlay (Top Z-Index) */}
            <div className="absolute bottom-12 left-0 right-0 text-center px-4 pointer-events-none z-50">
                <span
                    className="inline-block px-2 py-1 bg-black/50 text-white text-lg font-bold rounded shadow-lg backdrop-blur-sm"
                    style={{ textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}
                >
                    {currentSubtitle}
                </span>
            </div>

            {/* 3. Audio Mixer (Invisible) */}
            <div className="hidden">
                {audioTracks.map(track => (
                    <video
                        key={track.id}
                        ref={(el) => {
                            if (el) audioRefs.current[track.id] = el;
                        }}
                        className="w-full h-full object-contain pointer-events-none"
                        src={track.url}
                        preload="auto"
                        playsInline
                        webkit-playsinline="true"
                        crossOrigin="anonymous"
                        style={{
                            transform: 'translate3d(0,0,0)',
                            willChange: 'transform'
                        }}
                    />
                ))}
            </div>
        </div>
    );
}

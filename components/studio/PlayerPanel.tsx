import { useRef, useEffect } from "react";
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

                // Seek if desync > 0.2s
                if (Math.abs(el.currentTime - localTime) > 0.2) {
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
                    if (Math.abs(el.currentTime - localTime) > 0.2) {
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

                    return (
                        <video
                            key={clip.id}
                            ref={(el) => { if (el) videoRefs.current[clip.id] = el; }}
                            src={clip.url}
                            className="absolute inset-0 w-full h-full object-cover pointer-events-none transition-transform duration-75"
                            style={{
                                zIndex: index, // Higher index = On Top
                                transform: `
                                    scale(${clip.scale ?? 1}) 
                                    translate(${clip.positionX ?? 0}px, ${clip.positionY ?? 0}px) 
                                    rotate(${clip.rotation ?? 0}deg)
                                `
                            }}
                            loop={false}
                            playsInline
                            muted={false} // Allow sound (mixed via volume)
                        />
                    );
                })
            ) : (
                // Fallback / Placeholder
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 text-zinc-700">
                    <span className="text-xs">No Signal</span>
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
                    <audio
                        key={track.id}
                        ref={(el) => {
                            if (el) audioRefs.current[track.id] = el;
                        }}
                        src={track.url}
                        preload="auto"
                    />
                ))}
            </div>
        </div>
    );
}

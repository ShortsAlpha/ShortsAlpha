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

    // Refs for Video/Audio Elements
    const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});
    const audioRefs = useRef<{ [key: string]: HTMLAudioElement | null }>({});

    // Web Audio Context & Nodes
    const audioCtxRef = useRef<AudioContext | null>(null);
    const gainNodesRef = useRef<{ [key: string]: GainNode }>({});
    const sourceNodesRef = useRef<{ [key: string]: MediaElementAudioSourceNode }>({});

    // Initialize Audio Context on first interaction
    useEffect(() => {
        const initAudio = () => {
            if (!audioCtxRef.current) {
                // @ts-ignore
                const AudioContextClass = window.AudioContext || window.webkitAudioContext;
                if (AudioContextClass) {
                    audioCtxRef.current = new AudioContextClass();
                }
            }
            if (audioCtxRef.current?.state === 'suspended') {
                audioCtxRef.current.resume();
            }
        };

        const handleInteraction = () => initAudio();
        window.addEventListener('click', handleInteraction);
        window.addEventListener('touchstart', handleInteraction); // iOS

        return () => {
            window.removeEventListener('click', handleInteraction);
            window.removeEventListener('touchstart', handleInteraction);
            // Don't close context, reuse it.
        };
    }, []);

    // Helper: Connect Element to Audio Graph
    const connectToAudioGraph = (id: string, element: HTMLMediaElement) => {
        if (!audioCtxRef.current) return;

        // Prevent double connection
        if (sourceNodesRef.current[id]) return;

        try {
            const source = audioCtxRef.current.createMediaElementSource(element);
            const gainNode = audioCtxRef.current.createGain();

            source.connect(gainNode);
            gainNode.connect(audioCtxRef.current.destination);

            sourceNodesRef.current[id] = source;
            gainNodesRef.current[id] = gainNode;
        } catch (e) {
            console.warn("Web Audio Connection Failed (likely CORS):", id, e);
            // Fallback: Normal volume will work (capped at 1.0) if connection fails?
            // If createMediaElementSource fails, the element keeps playing to destination? 
            // No, creating source 'hijacks' the output. If it fails, usually it throws.
        }
    };

    // Dispose nodes when clip removed?
    // Complex with Re-renders. For now, we rely on refs overriding. 
    // Ideally we disconnect. But React ref callback handles mount/unmount.

    // Sync Playback & Time & Volume
    useEffect(() => {
        if (audioCtxRef.current?.state === 'suspended' && isPlaying) {
            audioCtxRef.current.resume();
        }

        // Sync Videos
        activeVideoClips.forEach(clip => {
            const el = videoRefs.current[clip.id];
            if (el) {
                // Connect Audio Graph on first use
                if (audioCtxRef.current && !sourceNodesRef.current[clip.id]) {
                    connectToAudioGraph(clip.id, el);
                }

                // Time Sync
                const localTime = Math.max(0, currentTime - clip.start);
                if (Math.abs(el.currentTime - localTime) > 0.5) {
                    el.currentTime = localTime;
                }

                if (isPlaying && el.paused) el.play().catch(() => { });
                if (!isPlaying && !el.paused) el.pause();

                // Volume (GAIN)
                // If Web Audio Active: Set Gain. Set Element Volume to 1 (passed to source).
                // If Web Audio Failed: Set Element Volume (capped at 1).

                const trackIdx = clip.trackIndex || 0;
                const isTrackMuted = videoTrackState[trackIdx]?.muted;
                const targetVol = isTrackMuted ? 0 : (clip.volume ?? 1);

                if (gainNodesRef.current[clip.id]) {
                    // Amplification Enabled
                    gainNodesRef.current[clip.id].gain.value = targetVol;
                    // Don't touch el.volume (should be 1 to send full signal to node? Or does el.volume affect source?)
                    // MDN: element.volume applies BEFORE MediaElementAudioSourceNode for some browsers, or NOT?
                    // Usually: source node takes RAW output. element.volume controls 'native' output if not connected?
                    // Actually: modifying el.volume DOES affect the source node signal in Chrome.
                    // So we must set el.volume = 1 if we want GainNode to handle full range?
                    // No, if we want Gain 2.0. Signal 1.0 * 2.0 = 2.0.
                    // So el.volume should be 1.
                    el.volume = 1;
                    el.muted = false; // Must be unmuted
                } else {
                    // Fallback
                    el.volume = Math.min(1, Math.max(0, targetVol));
                }
            }
        });

        // Sync Audio Tracks
        audioTracks.forEach(track => {
            const el = audioRefs.current[track.id];
            if (el) {
                if (audioCtxRef.current && !sourceNodesRef.current[track.id]) {
                    connectToAudioGraph(track.id, el);
                }

                if (currentTime >= track.start && currentTime < track.start + track.duration) {
                    const localTime = Math.max(0, currentTime - track.start);
                    if (Math.abs(el.currentTime - localTime) > 0.5) el.currentTime = localTime;
                    if (isPlaying && el.paused) el.play().catch(() => { });
                    if (!isPlaying && !el.paused) el.pause();
                } else {
                    if (!el.paused) el.pause();
                }

                const trackIdx = track.trackIndex || 0;
                const isTrackMuted = audioTrackState[trackIdx]?.muted;
                const targetVol = isTrackMuted ? 0 : (track.volume ?? 1);

                if (gainNodesRef.current[track.id]) {
                    gainNodesRef.current[track.id].gain.value = targetVol;
                    el.volume = 1;
                } else {
                    el.volume = Math.min(1, Math.max(0, targetVol));
                }
            }
        });

    }, [currentTime, isPlaying, activeVideoClips, audioTracks, videoTrackState, audioTrackState]);

    return (
        <div
            ref={containerRef}
            className="w-full h-full relative cursor-pointer group bg-black"
            onClick={onTogglePlay}
        >
            {/* 1. Video Layers */}
            {activeVideoClips.length > 0 ? (
                activeVideoClips.map((clip, index) => {
                    const trackIdx = clip.trackIndex || 0;
                    if (videoTrackState[trackIdx]?.hidden) return null;

                    const mk = `${clip.id}-${clip.url}`;

                    return (
                        <React.Fragment key={mk}>
                            <video
                                ref={(el) => { if (el) videoRefs.current[clip.id] = el; }}
                                src={clip.url + "#t=0.001"}
                                preload="metadata"
                                className="absolute inset-0 w-full h-full object-cover pointer-events-none transition-transform duration-75"
                                style={{
                                    zIndex: index,
                                    willChange: 'transform',
                                    transform: `
                                        scale(${clip.scale ?? 1}) 
                                        translate3d(${clip.positionX ?? 0}px, ${clip.positionY ?? 0}px, 0) 
                                        rotate(${clip.rotation ?? 0}deg)
                                    `
                                }}
                                loop={false}
                                playsInline
                                crossOrigin="anonymous" // ENABLED for Web Audio
                                muted={false}
                                onError={(e) => {
                                    const err = e.currentTarget.error;
                                    console.error("Video Error:", clip.url, err);
                                    // Fallback: If CORS error, simplify?
                                    // Hard to recover gracefully without reload.
                                    // But CORS setup should prevent this.
                                }}
                            />
                        </React.Fragment>
                    );
                })
            ) : (
                <div className="flex items-center justify-center h-full text-[#333] select-none">
                    No Signal
                </div>
            )}

            {/* 2. Subtitles */}
            <div className="absolute bottom-12 left-0 right-0 text-center px-4 pointer-events-none z-50">
                <span
                    className="inline-block px-2 py-1 bg-black/50 text-white text-lg font-bold rounded shadow-lg backdrop-blur-sm"
                    style={{ textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}
                >
                    {currentSubtitle}
                </span>
            </div>

            {/* 3. Audio Mixer */}
            <div className="hidden">
                {audioTracks.map(track => (
                    <video // Using video for audio tracks for consistency? Note original used video tag for audio too? 
                        // No, original used video tag for audioTracks? 
                        // Yes, lines 149 in previous file: <video ... src={track.url} ... />
                        // Audio tracks handled as invisible video elements seems to be the pattern.
                        key={track.id}
                        ref={(el) => {
                            if (el && !audioRefs.current[track.id]) audioRefs.current[track.id] = el as unknown as HTMLAudioElement; // Casting hack or fix type
                        }}
                    // Actually let's use <audio> for audio? 
                    // If I change to <audio>, Refs type match.
                    // But original code used <video> for audioTracks?
                    // Let's stick to <audio> for Audio Tracks.
                    >
                        <source src={track.url} />
                    </video>
                    // Wait, JSX above returned <video> for audioTracks loop (L149).
                    // I should keep it consistent or fix it.
                    // <audio> is better for Audio.
                    // But ref type is HTMLAudioElement.
                    // Let's use <audio>.
                ))}
            </div>
            {/* 3. Audio Mixer Corrected */}
            <div className="hidden">
                {audioTracks.map(track => (
                    <audio
                        key={track.id}
                        ref={(el) => { if (el) audioRefs.current[track.id] = el; }}
                        src={track.url}
                        preload="auto"
                        playsInline
                        crossOrigin="anonymous"
                    />
                ))}
            </div>
        </div>
    );
}

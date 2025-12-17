import React, { useRef, useEffect, useState } from "react";
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

    // Text Interaction
    textTracks?: any[];
    onUpdateTextTracks?: (tracks: any[]) => void;
    selectedClipId?: string | null;
    onSelectClip?: (id: string | null) => void;
}

export function PlayerPanel({
    script,
    activeVideoClips = [],
    audioUrl,
    currentTime,
    isPlaying,
    onTogglePlay,
    currentSubtitle,
    audioTracks = [],
    videoTrackState = {},
    audioTrackState = {},
    textTracks = [],
    onUpdateTextTracks,
    selectedClipId,
    onSelectClip
}: PlayerPanelProps) {
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
        }
    };

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
                // Allow small drift for performance, but sync logic needs to be tight
                if (Math.abs(el.currentTime - localTime) > 0.5) {
                    el.currentTime = localTime;
                }

                if (isPlaying && el.paused) el.play().catch(() => { });
                if (!isPlaying && !el.paused) el.pause();

                // Volume (GAIN)
                const trackIdx = clip.trackIndex || 0;
                const isTrackMuted = videoTrackState[trackIdx]?.muted;
                const targetVol = isTrackMuted ? 0 : (clip.volume ?? 1);

                if (gainNodesRef.current[clip.id]) {
                    gainNodesRef.current[clip.id].gain.value = targetVol;
                    el.volume = 1;
                    el.muted = false;
                } else {
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


    // --- Text Drag Logic ---
    const [draggingText, setDraggingText] = useState<{ id: string, initialMouseX: number, initialMouseY: number, initialX: number, initialY: number } | null>(null);

    const handleTextMouseDown = (e: React.MouseEvent, clip: any) => {
        e.stopPropagation();
        e.preventDefault(); // Prevent player toggle
        if (onSelectClip) onSelectClip(clip.id);

        const style = clip.style || {};
        // Default positions if missing
        const currentX = style.x !== undefined ? style.x : 0.5;
        const currentY = style.y !== undefined ? style.y : 0.8;

        setDraggingText({
            id: clip.id,
            initialMouseX: e.clientX,
            initialMouseY: e.clientY,
            initialX: currentX, // Normalized 0-1
            initialY: currentY  // Normalized 0-1
        });
    };

    // Calculate Active Text Clips
    const activeTextClips = (textTracks || []).filter(t =>
        currentTime >= t.start && currentTime < t.start + t.duration
    );

    // Global Mouse Move for Text Dragging
    useEffect(() => {
        if (!draggingText) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                const deltaX = e.clientX - draggingText.initialMouseX;
                const deltaY = e.clientY - draggingText.initialMouseY;

                // Convert pixels to percentage logic
                // container width/height
                const percentX = deltaX / rect.width;
                const percentY = deltaY / rect.height;

                let newX = draggingText.initialX + percentX;
                let newY = draggingText.initialY + percentY;

                // Clamp to visible area (optional)
                newX = Math.max(0, Math.min(1, newX));
                newY = Math.max(0, Math.min(1, newY));

                // Update CLIP logic
                if (onUpdateTextTracks) {
                    const tracks = [...(textTracks || [])];
                    const index = tracks.findIndex(t => t.id === draggingText.id);
                    if (index !== -1) {
                        // Shallow Update for Performance? Or full update?
                        // Full update triggers re-render, which is fine for handful of texts.
                        tracks[index] = {
                            ...tracks[index],
                            style: { ...tracks[index].style, x: newX, y: newY }
                        };
                        onUpdateTextTracks(tracks);
                    }
                }
            }
        };

        const handleMouseUp = () => {
            setDraggingText(null);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [draggingText, textTracks, onUpdateTextTracks]);


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
                                crossOrigin="anonymous"
                                muted={false}
                                onError={(e) => {
                                    console.error("Video Error:", clip.url, e.currentTarget.error);
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

            {/* 2. Text Overlays (Draggable) */}
            {activeTextClips.map((clip) => {
                const style = clip.style || {};
                const x = (style.x ?? 0.5) * 100;
                const y = (style.y ?? 0.8) * 100;
                const isSelected = clip.id === selectedClipId;

                return (
                    <div
                        key={clip.id}
                        onMouseDown={(e) => handleTextMouseDown(e, clip)}
                        className={`absolute z-50 px-2 py-1 cursor-move transition-transform duration-75 select-none
                            ${isSelected ? 'ring-2 ring-indigo-500 rounded' : 'hover:ring-1 hover:ring-white/50 rounded'}
                        `}
                        style={{
                            left: `${x}%`,
                            top: `${y}%`,
                            transform: 'translate(-50%, -50%)', // Center pivot
                            color: style.color || '#white',
                            fontSize: `${style.fontSize || 24}px`,
                            fontFamily: style.fontFamily || 'sans-serif',
                            textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        {clip.text}
                    </div>
                );
            })}

            {/* 3. Audio Mixer Handlers (Hidden) */}
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

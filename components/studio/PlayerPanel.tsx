import React, { useRef, useEffect, useState } from "react";
import { Play, Pause, SkipBack, SkipForward, Volume2, Maximize2 } from "lucide-react";
import { generateSmoothStroke } from "./constants";

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

    // Sync Playback & Time & Volume
    // Sync Playback & Time & Volume
    useEffect(() => {
        // Sync Videos
        activeVideoClips.forEach(clip => {
            const el = videoRefs.current[clip.id];
            if (el && el instanceof HTMLVideoElement) {
                // Time Sync
                const localTime = Math.max(0, currentTime - clip.start + (clip.offset || 0));
                if (Math.abs(el.currentTime - localTime) > 0.5) {
                    el.currentTime = localTime;
                }

                // Safe Play Logic
                if (isPlaying && el.paused && !el.error) {
                    const playPromise = el.play();
                    if (playPromise !== undefined) {
                        playPromise.catch(e => {
                            // Ignore common errors
                            if (e.name === 'NotSupportedError') return;
                            if (e.name === 'AbortError') return;
                            console.warn("Video Play Failed", clip.id, e);
                        });
                    }
                }
                if (!isPlaying && !el.paused) el.pause();

                // Volume
                const trackIdx = clip.trackIndex || 0;
                const isTrackMuted = videoTrackState[trackIdx]?.muted;
                const targetVol = isTrackMuted ? 0 : (clip.volume ?? 1);

                el.volume = Math.min(1, Math.max(0, targetVol));
                el.muted = false;
            }
        });

        // Sync Audio Tracks... (unchanged)
        audioTracks.forEach(track => {
            // ... existing audio logic is fine ...
            const el = audioRefs.current[track.id];
            if (el) {
                // ... existing commands ...
                const duration = Number.isFinite(track.duration) ? track.duration : 300;
                const endTime = track.start + duration;

                if (currentTime >= track.start && currentTime < endTime) {
                    const localTime = Math.max(0, currentTime - track.start + (track.offset || 0));
                    if (Math.abs(el.currentTime - localTime) > 0.5) {
                        el.currentTime = localTime;
                    }

                    if (isPlaying && el.paused) {
                        const playPromise = el.play();
                        if (playPromise !== undefined) {
                            playPromise.catch((e) => {
                                if (e.name !== 'AbortError') console.warn("[Audio Play Error]", track.id, e);
                            });
                        }
                    }
                    if (!isPlaying && !el.paused) el.pause();
                } else {
                    if (!el.paused) el.pause();
                }

                const trackIdx = track.trackIndex || 0;
                const isTrackMuted = audioTrackState[trackIdx]?.muted;
                const targetVol = isTrackMuted ? 0 : (track.volume ?? 1);
                el.volume = Math.min(1, Math.max(0, targetVol));
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

    // Touch Support for Mobile/iPad
    const handleTextTouchStart = (e: React.TouchEvent, clip: any) => {
        e.stopPropagation();
        // e.preventDefault(); // Don't prevent default here or it might block scrolling/gestures if not careful, 
        // but for dragging we usually want to capture it.
        if (onSelectClip) onSelectClip(clip.id);

        const touch = e.touches[0];
        const style = clip.style || {};
        const currentX = style.x !== undefined ? style.x : 0.5;
        const currentY = style.y !== undefined ? style.y : 0.8;

        setDraggingText({
            id: clip.id,
            initialMouseX: touch.clientX,
            initialMouseY: touch.clientY,
            initialX: currentX,
            initialY: currentY
        });
    };

    // Snap Guides State
    const [snapGuides, setSnapGuides] = useState<{ x: boolean, y: boolean }>({ x: false, y: false });

    // Calculate Active Text Clips
    const activeTextClips = (textTracks || []).filter(t =>
        currentTime >= t.start && currentTime < t.start + t.duration
    );

    // Global Mouse/Touch Move for Text Dragging
    useEffect(() => {
        if (!draggingText) return;

        const handleMove = (clientX: number, clientY: number) => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                const deltaX = clientX - draggingText.initialMouseX;
                const deltaY = clientY - draggingText.initialMouseY;

                // Convert pixels to percentage logic
                // container width/height
                const percentX = deltaX / rect.width;
                const percentY = deltaY / rect.height;

                let newX = draggingText.initialX + percentX;
                let newY = draggingText.initialY + percentY;

                // Clamp to visible area (optional)
                newX = Math.max(0, Math.min(1, newX));
                newY = Math.max(0, Math.min(1, newY));

                // SNAPPING LOGIC
                const SNAP_THRESHOLD = 0.03; // 3%
                let snappedX = false;
                let snappedY = false;

                // Center X Snap
                if (Math.abs(newX - 0.5) < SNAP_THRESHOLD) {
                    newX = 0.5;
                    snappedX = true;
                }

                // Center Y Snap
                if (Math.abs(newY - 0.5) < SNAP_THRESHOLD) {
                    newY = 0.5;
                    snappedY = true;
                }

                setSnapGuides({ x: snappedX, y: snappedY });

                // Update CLIP logic
                if (onUpdateTextTracks) {
                    const tracks = [...(textTracks || [])];
                    const index = tracks.findIndex(t => t.id === draggingText.id);
                    if (index !== -1) {
                        const updatedTrack = {
                            ...tracks[index],
                            style: { ...tracks[index].style, x: newX, y: newY }
                        };
                        // Optimization: Only trigger update if values changed significantly? 
                        // For now straight update.
                        tracks[index] = updatedTrack;
                        onUpdateTextTracks(tracks);
                    }
                }
            }
        };

        const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
        const handleTouchMove = (e: TouchEvent) => {
            e.preventDefault(); // Prevent scrolling while dragging
            handleMove(e.touches[0].clientX, e.touches[0].clientY);
        };

        const handleEnd = () => {
            setDraggingText(null);
            setSnapGuides({ x: false, y: false });
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleEnd);
        window.addEventListener('touchmove', handleTouchMove, { passive: false });
        window.addEventListener('touchend', handleEnd);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleEnd);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleEnd);
        };
    }, [draggingText, textTracks, onUpdateTextTracks]);

    return (
        <div
            ref={containerRef}
            className="w-full h-full relative cursor-pointer group bg-black"
        >
            {/* 1. Video/Image Layers */}
            {activeVideoClips.length > 0 ? (
                activeVideoClips.map((clip, index) => {
                    const trackIdx = clip.trackIndex || 0;
                    if (videoTrackState[trackIdx]?.hidden) return null;

                    const mk = `${clip.id}-${clip.url}`;
                    const commonStyle = {
                        zIndex: index,
                        willChange: 'transform',
                        transform: `
                             scale(${clip.scale ?? 1}) 
                             translate3d(${clip.positionX ?? 0}px, ${clip.positionY ?? 0}px, 0) 
                             rotate(${clip.rotation ?? 0}deg)
                         `
                    };

                    const isImage = clip.type === 'image' ||
                        (clip.url && /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(clip.url.split('?')[0]));

                    return (
                        <React.Fragment key={mk}>
                            {isImage ? (
                                <img
                                    ref={(el) => { if (el) videoRefs.current[clip.id] = el as any; }}
                                    src={clip.url}
                                    className="absolute inset-0 w-full h-full object-contain pointer-events-none transition-transform duration-75"
                                    style={commonStyle}
                                    alt="Visual Asset"
                                    onError={(e) => console.warn("Image Load Error:", clip.id, clip.url)}
                                />
                            ) : clip.type === 'video' ? (
                                <video
                                    ref={(el) => { if (el) videoRefs.current[clip.id] = el; }}
                                    src={clip.url + "#t=0.001"}
                                    preload="metadata"
                                    className="absolute inset-0 w-full h-full object-cover pointer-events-none transition-transform duration-75"
                                    style={commonStyle}
                                    loop={false}
                                    playsInline
                                    crossOrigin="anonymous"
                                    muted={false}
                                    onError={(e) => {
                                        console.error("Video Error:", clip.id, clip.url, e.currentTarget.error);
                                    }}
                                />
                            ) : null}
                        </React.Fragment>
                    );
                })
            ) : (
                <div className="flex items-center justify-center h-full text-[#333] select-none">
                    No Signal
                </div>
            )}



            {/* Snap Guides */}
            {snapGuides.x && (
                <div className="absolute top-0 bottom-0 left-1/2 w-px bg-indigo-500 z-40 transform -translate-x-1/2 shadow-[0_0_4px_rgba(99,102,241,0.8)]" />
            )}
            {snapGuides.y && (
                <div className="absolute left-0 right-0 top-1/2 h-px bg-indigo-500 z-40 transform -translate-y-1/2 shadow-[0_0_4px_rgba(99,102,241,0.8)]" />
            )}

            {/* 2. Text Overlays (Draggable) */}
            {activeTextClips.map((clip) => {
                const style = clip.style || {};
                const x = (style.x ?? 0.5) * 100;
                const y = (style.y ?? 0.8) * 100;
                const isSelected = clip.id === selectedClipId;

                // Generate smooth stroke using shadow hack
                const strokeShadow = style.strokeWidth ? generateSmoothStroke(style.strokeWidth, style.stroke) : '';
                const dropShadow = style.shadow && style.shadow !== 'none' ? style.shadow : '';
                const combinedShadow = [strokeShadow, dropShadow].filter(Boolean).join(', ') || 'none';

                // Animation Class Map
                const animMap: Record<string, string> = {
                    'pop': 'anim-pop',
                    'fade': 'anim-fade',
                    'slide_up': 'anim-slide_up',
                    'typewriter': 'anim-typewriter',
                };
                const animClass = (style.animation && animMap[style.animation]) ? animMap[style.animation] : '';

                return (
                    <div
                        key={clip.id}
                        onMouseDown={(e) => handleTextMouseDown(e, clip)}
                        onTouchStart={(e) => handleTextTouchStart(e, clip)}
                        className={`absolute z-50 px-2 py-1 cursor-move transition-transform duration-75 select-none ${animClass}
                            ${isSelected ? 'ring-2 ring-indigo-500 rounded' : 'hover:ring-1 hover:ring-white/50 rounded'}
                        `}
                        style={{
                            left: `${x}%`,
                            top: `${y}%`,
                            transform: 'translate(-50%, -50%)', // Center pivot
                            color: style.color || '#ffffff',
                            fontSize: `${style.fontSize || 24}px`,
                            fontFamily: style.fontFamily || 'sans-serif',
                            fontWeight: style.fontWeight || 'normal',
                            fontStyle: style.fontStyle || 'normal',
                            textDecoration: style.textDecoration || 'none',
                            textTransform: style.textTransform || 'none',
                            textShadow: combinedShadow,
                            backgroundColor: style.backgroundColor || 'transparent',
                            borderRadius: style.borderRadius || '0px',
                            padding: style.padding || '0px',
                            whiteSpace: 'pre-wrap', // Enable wrapping
                            maxWidth: '90%',        // Match backend 980px limit (approx)
                            textAlign: 'center',    // Match backend centering
                            lineHeight: 1.2         // Reasonable line height
                        }}
                    >
                        {clip.text}
                    </div>
                );
            })}

            {/* 3. Audio Mixer Handlers (Invisible but Rendered) */}
            <div style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden', opacity: 0 }}>
                {audioTracks.map(track => {
                    // Apply Proxy Logic for R2 URLs (Fixes iOS/CORS issues)
                    let src = track.url;
                    if (src && (src.includes('r2.dev') || src.includes('r2.cloudflarestorage'))) {
                        try {
                            // Extract key from URL
                            let key = src.split('.dev/')[1];
                            if (!key) {
                                // Fallback for other domains or clean path
                                const urlObj = new URL(src);
                                key = urlObj.pathname.startsWith('/') ? urlObj.pathname.slice(1) : urlObj.pathname;
                            }

                            // CRITICAL: Strip any query parameters (like presigned signatures) from the KEY
                            if (key && key.includes('?')) {
                                key = key.split('?')[0];
                            }

                            // CRITICAL: Handle Bucket Name prefix (shortsalpha/) which R2 Public URLs might include
                            // If key starts with implicit bucket name but we need pure key
                            if (key) {
                                // Known folders
                                if (key.includes('stock/')) {
                                    key = key.substring(key.indexOf('stock/'));
                                } else if (key.includes('uploads/')) {
                                    key = key.substring(key.indexOf('uploads/'));
                                }
                            }

                            if (key) {
                                src = `/api/video-proxy?key=${encodeURIComponent(key)}`;
                            }
                        } catch (e) {
                            console.error("Proxy URL Generation Failed", e);
                        }
                    }

                    return (
                        <audio
                            key={track.id}
                            ref={(el) => { if (el) audioRefs.current[track.id] = el; }}
                            src={src}
                            preload="auto"
                            playsInline
                            crossOrigin="anonymous"
                            onError={(e) => console.error("Audio Playback Error:", track.id, src, e.currentTarget.error)}
                        />
                    );
                })}
            </div>
        </div >
    );
}

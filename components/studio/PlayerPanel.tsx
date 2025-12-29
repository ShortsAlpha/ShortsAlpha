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
    // Video Interaction
    onUpdateClip?: (id: string, updates: any) => void;
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
    onUpdateClip,
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

                // --- FACE TRACKING LOGIC ---
                if (clip.trackingData && containerRef.current) {
                    const data = clip.trackingData;

                    // --- STABLE STATIC CROP ---
                    // RE-CALCULATE ALWAYS: Since we reuse the video element for seamless playback,
                    // we must re-calculate the crop for every clip update (different tracking data).
                    // Calculating median of a few hundred points is instant.

                    const sortedX = [...data].map(d => d.x).sort((a, b) => a - b);
                    const medianX = sortedX[Math.floor(sortedX.length / 2)] || 0.5;

                    // Y-Axis Logic (New)
                    // If no Y data in tracking, fallback to 0.35 (Top Third) not 0.5 (Center)
                    const sortedY = [...data].map(d => d.y).filter(y => y !== undefined && y !== null).sort((a, b) => a - b);
                    const medianY = sortedY.length > 0 ? sortedY[Math.floor(sortedY.length / 2)] : 0.35;

                    const staticFaceX = medianX;
                    const staticFaceY = medianY;

                    // User Preference: "Pull to far left/right"
                    // Hard Snap Logic:
                    // If Face < 0.5 (Left) -> Snap to 0% (Far Left)
                    // If Face >= 0.5 (Right) -> Snap to 100% (Far Right)
                    // Adding a small buffer zone in center if needed, but "Far Left/Right" implies 0/100.

                    // STABLE AI FOCUS: Use the detected median face position
                    // No force snapping.
                    const percentX = Math.max(0, Math.min(100, staticFaceX * 100));
                    const percentY = Math.max(0, Math.min(100, staticFaceY * 100));

                    // Apply Static Object Position (X and Y)
                    el.style.objectPosition = `${percentX.toFixed(1)}% ${percentY.toFixed(1)}%`;

                    // SMART ZOOM: Set Transform Origin to the face position
                    // This ensures that when we scale up, we zoom INTO the face, not the center of the video.
                    el.style.transformOrigin = `${percentX.toFixed(1)}% ${percentY.toFixed(1)}%`;

                    // Ensure object-fit is cover
                    if (el.style.objectFit !== 'cover') el.style.objectFit = 'cover';

                    // Apply Scale/Rotation
                    el.style.transform = `scale(${clip.scale ?? 1}) rotate(${clip.rotation ?? 0}deg)`;

                    // --- DEBUG TEXT OVERLAY ---
                    let debugOverlay = el.parentElement?.querySelector(`.debug-overlay-${clip.id}`);
                    if (!debugOverlay) {
                        debugOverlay = document.createElement('div');
                        debugOverlay.className = `debug-overlay debug-overlay-${clip.id}`;
                        debugOverlay.style.cssText = `
                            position: absolute;
                            top: 10px;
                            left: 10px;
                            color: red;
                            background: rgba(0,0,0,0.5);
                            padding: 2px 5px;
                            font-size: 12px;
                            z-index: 10;
                            pointer-events: none;
                        `;
                        el.parentElement?.appendChild(debugOverlay);
                    }
                    debugOverlay.textContent = `Focus: ${percentX.toFixed(1)}% ${percentY.toFixed(1)}%`;

                    // Debug Log (Throttled)
                    if (Math.random() < 0.01) {
                        console.log(`[Static Focus] Track ${clip.trackIndex}: ${percentX.toFixed(1)}%`);
                    }
                }
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


    // --- Element Drag Logic (Text & Video) ---
    const [draggingElement, setDraggingElement] = useState<{
        id: string,
        type: 'text' | 'video',
        initialMouseX: number,
        initialMouseY: number,
        initialX: number,
        initialY: number
    } | null>(null);

    const handleElementMouseDown = (e: React.MouseEvent, clip: any) => {
        e.stopPropagation();
        e.preventDefault();
        if (onSelectClip) onSelectClip(clip.id);

        const style = clip.style || {};
        let currentX = style.x;
        let currentY = style.y;

        // Normalize Coords
        if (clip.type === 'text') {
            currentX = currentX !== undefined ? currentX : 0.5;
            currentY = currentY !== undefined ? currentY : 0.8;
        } else {
            // For Video, convert percentage strings to pixels if needed (approx)
            const rect = containerRef.current?.getBoundingClientRect();
            const w = rect?.width || 100;
            const h = rect?.height || 100;

            if (typeof currentX === 'string' && currentX.includes('%')) {
                currentX = (parseFloat(currentX) / 100) * w;
            } else {
                currentX = currentX || 0;
            }
            if (typeof currentY === 'string' && currentY.includes('%')) {
                currentY = (parseFloat(currentY) / 100) * h;
            } else {
                currentY = currentY || 0;
            }
        }

        setDraggingElement({
            id: clip.id,
            type: clip.type === 'text' ? 'text' : 'video',
            initialMouseX: e.clientX,
            initialMouseY: e.clientY,
            initialX: currentX!,
            initialY: currentY!
        });
    };

    // Touch Support for Mobile/iPad
    const handleTextTouchStart = (e: React.TouchEvent, clip: any) => {
        // Reusing logic for touch (simplified)
        // ... implementation for touch if needed ...
        // For now using MouseDown primarily requested by user context
    };

    // Snap Guides State
    const [snapGuides, setSnapGuides] = useState<{ x: boolean, y: boolean }>({ x: false, y: false });

    // Calculate Active Text Clips
    const activeTextClips = (textTracks || []).filter(t =>
        currentTime >= t.start && currentTime < t.start + t.duration
    );

    // Global Mouse/Touch Move for Element Dragging
    useEffect(() => {
        if (!draggingElement) return;

        const handleMove = (clientX: number, clientY: number) => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                const deltaX = clientX - draggingElement.initialMouseX;
                const deltaY = clientY - draggingElement.initialMouseY;

                let newX, newY;

                if (draggingElement.type === 'text') {
                    // TEXT: Percentage Based
                    const percentX = deltaX / rect.width;
                    const percentY = deltaY / rect.height;
                    newX = draggingElement.initialX + percentX;
                    newY = draggingElement.initialY + percentY;
                    // Clamp
                    newX = Math.max(0, Math.min(1, newX));
                    newY = Math.max(0, Math.min(1, newY));
                } else {
                    // VIDEO: Pixel Based
                    newX = draggingElement.initialX + deltaX;
                    newY = draggingElement.initialY + deltaY;
                    // No clamp, allow drag off screen
                }

                // SNAPPING LOGIC
                const SNAP_THRESHOLD_PCT = 0.03;
                const SNAP_THRESHOLD_PX = 20;

                let snappedX = false;
                let snappedY = false;

                if (draggingElement.type === 'text') {
                    if (Math.abs(newX - 0.5) < SNAP_THRESHOLD_PCT) { newX = 0.5; snappedX = true; }
                    if (Math.abs(newY - 0.5) < SNAP_THRESHOLD_PCT) { newY = 0.5; snappedY = true; }
                } else {
                    // Snap to Center (Pixel)
                    const activeClip = activeVideoClips.find(c => c.id === draggingElement.id);
                    const clipStyle = activeClip?.style || {};

                    // Determine dimensions (parse px or default)
                    let clipW = 0;
                    let clipH = 0;

                    // Helper to parse '100px', '50%', or number
                    const parseDim = (val: any, containerDim: number) => {
                        if (typeof val === 'number') return val;
                        if (typeof val === 'string') {
                            if (val.endsWith('%')) return (parseFloat(val) / 100) * containerDim;
                            return parseFloat(val) || 0;
                        }
                        // Default fallback if width is missing?
                        return containerDim; // or 0? Videos default to 100% usually in our layout
                    };

                    clipW = parseDim(clipStyle.width, rect.width);
                    clipH = parseDim(clipStyle.height, rect.height);

                    // Center of Clip based on Top-Left (newX, newY)
                    const currentCenterX = newX + (clipW / 2);
                    const currentCenterY = newY + (clipH / 2);

                    // Center of Container
                    const containerCenterX = rect.width / 2;
                    const containerCenterY = rect.height / 2;

                    // SNAP X
                    if (Math.abs(currentCenterX - containerCenterX) < SNAP_THRESHOLD_PX) {
                        newX = containerCenterX - (clipW / 2);
                        snappedX = true;
                    }

                    // SNAP Y
                    if (Math.abs(currentCenterY - containerCenterY) < SNAP_THRESHOLD_PX) {
                        newY = containerCenterY - (clipH / 2);
                        snappedY = true;
                    }
                }

                setSnapGuides({ x: snappedX, y: snappedY });

                // Update Logic
                if (draggingElement.type === 'text' && onUpdateTextTracks) {
                    const tracks = [...(textTracks || [])];
                    const index = tracks.findIndex(t => t.id === draggingElement.id);
                    if (index !== -1) {
                        // Update Text
                        tracks[index] = { ...tracks[index], style: { ...tracks[index].style, x: newX, y: newY } };
                        onUpdateTextTracks(tracks);
                    }
                } else if (draggingElement.type === 'video' && onUpdateClip) {
                    // Update Video Position
                    const currentClip = activeVideoClips.find(c => c.id === draggingElement.id);
                    if (currentClip) {
                        const oldStyle = currentClip.style || {};
                        onUpdateClip(draggingElement.id, {
                            style: { ...oldStyle, x: newX, y: newY }
                        });
                    }
                }
            }
        };

        const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
        const handleEnd = () => {
            setDraggingElement(null);
            setSnapGuides({ x: false, y: false });
        };
        // ... listeners ...
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleEnd);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleEnd);
        };
    }, [draggingElement, textTracks, activeVideoClips, onUpdateTextTracks, onUpdateClip]);

    const [showDebug, setShowDebug] = useState(false);

    // Toggle Debug with 'D' key
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'd') setShowDebug(s => !s); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    return (
        <div
            ref={containerRef}
            className="w-full h-full relative cursor-pointer group bg-black overflow-hidden"
        >
            {/* 1. Video/Image Layers */}
            {activeVideoClips.length > 0 ? (
                activeVideoClips.map((clip, index) => {
                    const trackIdx = clip.trackIndex || 0;
                    if (videoTrackState[trackIdx]?.hidden) return null;

                    // SEAMLESS PLAYBACK FIX:
                    // We use URL + TrackIndex as the key. 
                    // This way, when we switch from "Cut 1" to "Cut 2" (same video, same track), 
                    // React REUSES the <video> element and just updates the internal style/crop.
                    // This prevents unmounting/black frames/buffering gaps.
                    // We rely on the `useEffect` to handle 'time sync' if needed, but for continuous cuts it will just keep playing.
                    const mk = `seamless-${clip.url}-${trackIdx}`;

                    // Logic to handle Split Screen / Custom Layouts
                    // If style has explicit width/height/x/y, use valid CSS positioning
                    const styleProps = clip.style || {};

                    const hasExplicitLayout = styleProps.width !== undefined || styleProps.height !== undefined || styleProps.y !== undefined;

                    const getUnitVal = (val: any) => {
                        if (val === undefined) return '0px';
                        if (typeof val === 'string') return val; // Assume user handles unit (e.g. '50%')
                        return `${val}px`;
                    };

                    // Refactored Layout Logic: Split Wrapper (Position/Size) and Inner (Scale/Rotate)
                    const wrapperStyle: React.CSSProperties = {
                        zIndex: index,
                        width: styleProps.width ? getUnitVal(styleProps.width) : '100%',
                        height: styleProps.height ? getUnitVal(styleProps.height) : '100%',
                        top: getUnitVal(styleProps.y),
                        left: getUnitVal(styleProps.x),
                        position: 'absolute',
                        overflow: 'hidden', // CLIP ZOOM
                        transform: `translate3d(${clip.positionX ?? 0}px, ${clip.positionY ?? 0}px, 0)`
                    };

                    const innerStyle: React.CSSProperties = {
                        width: '100%',
                        height: '100%',
                        willChange: 'transform',
                        // Scale/Rotate applies to content only
                        transform: `scale(${clip.scale ?? 1}) rotate(${clip.rotation ?? 0}deg)`
                    };

                    const isImage = clip.type === 'image' ||
                        (clip.url && /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(clip.url.split('?')[0]));

                    const isSelected = clip.id === selectedClipId;

                    // PROXY LOGIC FOR VIDEOS (Fixes CORS/R2 issues)
                    let videoSrc = clip.url;
                    if (videoSrc && !isImage && (videoSrc.includes('r2.dev') || videoSrc.includes('r2.cloudflarestorage'))) {
                        try {
                            // Logic matches Audio Proxy logic below
                            let key = videoSrc.split('.dev/')[1];
                            if (!key) {
                                const urlObj = new URL(videoSrc);
                                key = urlObj.pathname.startsWith('/') ? urlObj.pathname.slice(1) : urlObj.pathname;
                            }
                            if (key && key.includes('?')) key = key.split('?')[0]; // Strip presigned (Server has own creds)

                            // Handle bucket prefix normalization
                            if (key) {
                                // Important: Check specific prefixes in order
                                if (key.includes('split_uploads/')) {
                                    key = key.substring(key.indexOf('split_uploads/'));
                                } else if (key.includes('stock/')) {
                                    key = key.substring(key.indexOf('stock/'));
                                } else if (key.includes('uploads/')) {
                                    key = key.substring(key.indexOf('uploads/'));
                                } else if (key.includes('auto_shorts/')) {
                                    key = key.substring(key.indexOf('auto_shorts/'));
                                }
                            }

                            if (key) {
                                videoSrc = `/api/video-proxy?key=${encodeURIComponent(key)}`;
                            }
                        } catch (e) {
                            console.warn("Video Proxy Gen Failed", e);
                        }
                    }

                    return (
                        <React.Fragment key={mk}>
                            <div
                                onMouseDown={(e) => handleElementMouseDown(e, clip)}
                                className={`absolute cursor-move ${isSelected ? 'ring-2 ring-indigo-500' : ''}`}
                                style={wrapperStyle}
                            >
                                {isImage ? (
                                    <img
                                        ref={(el) => { if (el) videoRefs.current[clip.id] = el as any; }}
                                        src={clip.url}
                                        className="w-full h-full object-contain transition-transform duration-75"
                                        style={innerStyle}
                                        alt="Visual Asset"
                                        onError={(e) => console.warn("Image Load Error:", clip.id, clip.url)}
                                    />
                                ) : clip.type === 'video' ? (
                                    <video
                                        ref={(el) => { if (el) videoRefs.current[clip.id] = el; }}
                                        src={videoSrc + "#t=0.001"}
                                        preload="metadata"
                                        className="w-full h-full object-cover transition-transform duration-75"
                                        style={innerStyle}
                                        loop={false}
                                        playsInline
                                        crossOrigin="anonymous"
                                        muted={false}
                                        onError={(e) => {
                                            // Fallback to direct URL if proxy fails
                                            const v = e.currentTarget;
                                            if (v.src.includes('/api/video-proxy') && clip.url) {
                                                console.warn("Proxy failed, falling back to direct URL:", clip.id);
                                                v.src = clip.url;
                                                return;
                                            }
                                            console.error("Video Error:", clip.id, clip.url, v.error);
                                        }}
                                    />
                                ) : null}
                            </div>


                            {/* Tracking Debug Overlay */}
                            {showDebug && clip.type === 'video' && (
                                <div className="absolute top-2 left-2 bg-black/80 text-green-400 text-xs p-1 z-50 pointer-events-none font-mono">
                                    Track: {clip.trackIndex}<br />
                                    HasData: {clip.trackingData ? 'YES' : 'NO'}<br />
                                    StaticX: {videoRefs.current[clip.id]?.dataset.staticFocus || 'N/A'}<br />
                                    ObjPos: {videoRefs.current[clip.id]?.style.objectPosition || 'N/A'}
                                </div>
                            )}

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

                // Generate stroke using native WebkitTextStroke
                const webkitTextStroke = style.strokeWidth ? `${style.strokeWidth}px ${style.stroke}` : '0px transparent';

                // Keep Drop Shadow logic
                const dropShadow = style.shadow && style.shadow !== 'none' ? style.shadow : 'none';

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
                        onMouseDown={(e) => handleElementMouseDown(e, clip)}
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
                            // Use native stroke with paint-order to simulate 'outside' stroke
                            WebkitTextStroke: webkitTextStroke,
                            paintOrder: 'stroke fill',
                            textShadow: dropShadow,
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

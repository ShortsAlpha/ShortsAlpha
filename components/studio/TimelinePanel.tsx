import { Play, Pause, SkipBack, SkipForward, Scissors, Layers, Volume2, Type, Eye, EyeOff, VolumeX, Trash2, MousePointer2, RotateCcw, RotateCw } from "lucide-react";
import React, { useState, useEffect, useRef } from "react";

interface TimelinePanelProps {
    script: any[];
    videoTracks: any[];
    audioTracks: any[];
    currentTime: number;
    duration: number;
    onSeek: (time: number) => void;
    isPlaying: boolean;
    onTogglePlay: () => void;
    onUpdateVideoTracks: (tracks: any[]) => void;
    onUpdateAudioTracks?: (tracks: any[]) => void;
    onUpdateTextTracks?: (tracks: any[]) => void; // NEW
    textTracks?: any[]; // NEW
    selectedClipId?: string | null;
    onSelectClip?: (id: string | null) => void;

    // Undo/Redo
    onUndo?: () => void;
    onRedo?: () => void;

    // Track State
    videoTrackState?: Record<number, { muted: boolean, hidden: boolean }>;
    audioTrackState?: Record<number, { muted: boolean, hidden: boolean }>;
    onToggleTrackState?: (type: 'video' | 'audio', index: number, field: 'muted' | 'hidden' | 'locked') => void;

    // Mobile Drag Props
    externalDragItem?: { url: string, type: 'video' | 'audio' | 'text', title: string } | null;
    onExternalDragEnd?: () => void;
}

// Helper to get duration (Defined outside to avoid dependency loops)
const getMediaDuration = (url: string, type: 'video' | 'audio' | 'text'): Promise<number> => {
    if (type === 'text') return Promise.resolve(5); // Default text duration
    return new Promise((resolve) => {
        const el = document.createElement(type);
        el.src = url;
        el.onloadedmetadata = () => resolve(el.duration);
        el.onerror = () => resolve(30); // Fallback
    });
};

export function TimelinePanel({
    script,
    videoTracks,
    audioTracks,
    currentTime,
    duration,
    onSeek,
    isPlaying,
    onTogglePlay,
    onUpdateVideoTracks,
    onUpdateAudioTracks,
    onUpdateTextTracks, // NEW
    textTracks = [], // NEW
    selectedClipId,
    onSelectClip,
    videoTrackState = {},
    audioTrackState = {},
    onToggleTrackState,
    externalDragItem,
    onExternalDragEnd,
    onUndo,
    onRedo
}: TimelinePanelProps) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const headerContainerRef = useRef<HTMLDivElement>(null);

    // DEBUG LOGGER
    const [logs, setLogs] = useState<string[]>([]);
    const addLog = (msg: string) => setLogs(prev => [msg, ...prev].slice(0, 5));

    // Zoom / Pixel Ratio (Zoomed Out)
    const PIXELS_PER_SECOND = 20;
    // visualWidth: Render 'infinite' length (e.g. 1 hour or dynamic)
    const visualDuration = Math.max(duration + 300, 600); // Always show at least 10 mins or duration + 5 mins
    const timelineWidth = visualDuration * PIXELS_PER_SECOND;

    // Drag & Drop State
    // Format: { id: string, type: 'video' | 'audio', offsetSeconds: number }
    const [draggedClipId, setDraggedClipId] = useState<{ id: string, type: 'video' | 'audio' | 'text', offsetSeconds: number } | null>(null);
    const draggedClipRef = useRef<{ id: string, type: 'video' | 'audio', offsetSeconds: number } | null>(null);
    // Sync ref with state is manual in handlers to ensure speed.

    // Scrubbing State
    const [isScrubbing, setIsScrubbing] = useState(false);

    // activeTool State
    const [activeTool, setActiveTool] = useState<'select' | 'razor'>('select');

    // Context Menu State
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, clipId: string, type: 'video' | 'audio' | 'text' } | null>(null);

    // Razor Hover State (for guide line)
    const [razorLineX, setRazorLineX] = useState<number | null>(null);

    // --- TOOL ACTIONS ---

    const handleDelete = () => {
        if (!selectedClipId) return;

        // Try Video
        if (videoTracks.some(t => t.id === selectedClipId)) {
            const newTracks = videoTracks.filter(t => t.id !== selectedClipId);
            onUpdateVideoTracks(newTracks);
        }
        // Try Audio
        else if (audioTracks.some(t => t.id === selectedClipId)) {
            const newTracks = audioTracks.filter(t => t.id !== selectedClipId);
            onUpdateAudioTracks && onUpdateAudioTracks(newTracks);
        }

        onSelectClip && onSelectClip(null);
        setContextMenu(null);
    };

    const handleSplit = (clipId: string, type: 'video' | 'audio' | 'text', splitTime: number) => {
        const tracks = type === 'video' ? videoTracks : (type === 'audio' ? audioTracks : (textTracks || []));
        const clipIndex = tracks.findIndex(t => t.id === clipId);
        if (clipIndex === -1) return;

        const clip = tracks[clipIndex];
        // Relative time within the clip
        const relativeSplit = splitTime - clip.start;

        if (relativeSplit <= 0.1 || relativeSplit >= clip.duration - 0.1) return; // Too close to edge

        // Create two new clips
        const clip1 = { ...clip, duration: relativeSplit, id: Math.random().toString(36).substr(2, 9) };
        const clip2 = {
            ...clip,
            id: Math.random().toString(36).substr(2, 9),
            start: clip.start + relativeSplit,
            duration: clip.duration - relativeSplit,
            // Adjust offset if it's a video/audio source
            // offset means "skip first X seconds of source"
            // So clip2 starts at offset + relativeSplit
            offset: (clip.offset || 0) + relativeSplit
        };

        const newTracks = [...tracks];
        newTracks.splice(clipIndex, 1, clip1, clip2);

        if (type === 'video') {
            onUpdateVideoTracks(newTracks);
        } else if (type === 'audio' && onUpdateAudioTracks) {
            onUpdateAudioTracks(newTracks);
        } else if (type === 'text' && onUpdateTextTracks) {
            onUpdateTextTracks(newTracks);
        }
    };

    // Close Context Menu on click elsewhere
    useEffect(() => {
        const closeMenu = () => setContextMenu(null);
        window.addEventListener('click', closeMenu);
        return () => window.removeEventListener('click', closeMenu);
    }, []);

    // Razor Guide Listener
    useEffect(() => {
        if (activeTool !== 'razor') {
            setRazorLineX(null);
            return;
        }

        // Use Window Listener for Razor Guide to ensure it tracks everywhere
        const handleGlobalMouseMove = (e: MouseEvent) => {
            if (scrollContainerRef.current) {
                const rect = scrollContainerRef.current.getBoundingClientRect();
                const scrollLeft = scrollContainerRef.current.scrollLeft;

                // Calculate cursor position in seconds
                let x = e.clientX - rect.left + scrollLeft;
                const time = x / PIXELS_PER_SECOND;

                // SNAP LOGIC
                const SNAP_THRESHOLD = 0.3; // seconds
                let bestSnapTime: number | null = null;
                let minDiff = SNAP_THRESHOLD;

                const allClips = [...videoTracks, ...audioTracks];
                const snapPoints = [0]; // Always snap to start

                // Collect snap points (start and end of all clips)
                allClips.forEach(c => {
                    snapPoints.push(c.start);
                    snapPoints.push(c.start + c.duration);
                });

                // Find nearest snap point
                for (const point of snapPoints) {
                    const diff = Math.abs(time - point);
                    if (diff < minDiff) {
                        minDiff = diff;
                        bestSnapTime = point;
                    }
                }

                // If close enough, snap!
                if (bestSnapTime !== null) {
                    x = bestSnapTime * PIXELS_PER_SECOND;
                }

                setRazorLineX(x);
            }
        };

        window.addEventListener('mousemove', handleGlobalMouseMove);

        return () => {
            window.removeEventListener('mousemove', handleGlobalMouseMove);
        };
    }, [activeTool, videoTracks, audioTracks, PIXELS_PER_SECOND]);


    // Moving State (Manual Drag)

    const [moving, setMoving] = useState<{
        id: string;
        type: 'video' | 'audio' | 'text';
        initialX: number;
        initialY: number;
        initialStart: number;
        trackIndex: number;
        originalTrackIndex: number;
    } | null>(null);

    // Resize State
    const [resizing, setResizing] = useState<{
        id: string;
        type: 'video' | 'audio' | 'text';
        edge: 'start' | 'end';
        initialX: number;
        initialStart: number;
        initialDuration: number;
        maxDuration?: number;
    } | null>(null);



    // Live Preview State (Where the clip will drop)
    const [dragPreview, setDragPreview] = useState<{ trackIndex: number, start: number, id: string, type: 'video' | 'audio' | 'text', duration: number } | null>(null);

    // Snap Line State
    const [snapLine, setSnapLine] = useState<number | null>(null);

    // Handle EXTERNAL Touch Drop
    useEffect(() => {
        if (!externalDragItem) return;

        const handleExternalTouchEnd = async (e: TouchEvent) => {
            const touch = e.changedTouches[0];
            const clientX = touch.clientX;
            const clientY = touch.clientY;

            // Check collision with Timeline Container
            if (scrollContainerRef.current) {
                const rect = scrollContainerRef.current.getBoundingClientRect();
                if (
                    clientX >= rect.left &&
                    clientX <= rect.right &&
                    clientY >= rect.top &&
                    clientY <= rect.bottom
                ) {
                    // Valid Drop!
                    const scrollLeft = scrollContainerRef.current.scrollLeft;
                    const relativeX = clientX - rect.left + scrollLeft;
                    const dropTime = Math.max(0, relativeX / PIXELS_PER_SECOND);

                    const duration = await getMediaDuration(externalDragItem.url, externalDragItem.type);

                    // Add Track
                    const newId = Math.random().toString(36).substr(2, 9);
                    const newTrack = {
                        id: newId,
                        url: externalDragItem.url,
                        type: externalDragItem.type,
                        start: dropTime,
                        duration: duration,
                        sourceDuration: duration, // Correctly set Source Duration
                        trackIndex: 0,
                        volume: 1.0
                    };

                    if (externalDragItem.type === 'video') {
                        onUpdateVideoTracks([...videoTracks, newTrack]);
                    } else {
                        onUpdateAudioTracks && onUpdateAudioTracks([...audioTracks, newTrack]);
                    }
                }
            }
            if (onExternalDragEnd) onExternalDragEnd();
        };

        window.addEventListener('touchend', handleExternalTouchEnd);
        return () => window.removeEventListener('touchend', handleExternalTouchEnd);
    }, [externalDragItem, videoTracks, audioTracks, PIXELS_PER_SECOND, onExternalDragEnd, onUpdateVideoTracks, onUpdateAudioTracks]);

    // Refs for accessing state inside event listeners without re-binding
    const videoTracksRef = useRef(videoTracks);
    const audioTracksRef = useRef(audioTracks);
    const textTracksRef = useRef(textTracks);

    useEffect(() => {
        videoTracksRef.current = videoTracks;
        audioTracksRef.current = audioTracks;
        textTracksRef.current = textTracks;
    }, [videoTracks, audioTracks, textTracks]);

    // Handle Global Mouse Move (for Dragging & Resizing)
    useEffect(() => {
        if (resizing || moving) {
            const handleMouseMove = (e: MouseEvent | TouchEvent) => {
                let allowScroll = false;

                if ('touches' in e) {
                    const touch = e.touches[0];
                    // Check Intent
                    if (resizing) {
                        // Resizing is always explicit override
                        if (e.cancelable) e.preventDefault();
                    } else if (moving) {
                        const dx = touch.clientX - moving.initialX;
                        const dy = touch.clientY - moving.initialY;

                        // If vertical movement is dominant, allow scrolling (don't prevent default)
                        // Unless we exceed a horizontal threshold first to lock it.
                        // Simple check: if ABS(dy) > ABS(dx) -> Scroll
                        if (Math.abs(dy) > Math.abs(dx)) {
                            allowScroll = true;
                        } else {
                            if (e.cancelable) e.preventDefault();
                        }
                    }
                }

                if (allowScroll) return; // Let browser handle it (likely scroll)

                const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
                const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

                // Use Refs to avoid Effect re-runs
                const currentVideoTracks = videoTracksRef.current;
                const currentAudioTracks = audioTracksRef.current;
                const currentTextTracks = textTracksRef.current || [];

                if (scrollContainerRef.current) {
                    // Auto-scroll logic could go here
                }

                if (moving) {
                    const deltaX = clientX - moving.initialX;
                    const deltaY = clientY - moving.initialY; // For track switching

                    // Calculate new start time
                    const newStartRaw = moving.initialStart + (deltaX / PIXELS_PER_SECOND);
                    let newStart = Math.max(0, newStartRaw);

                    // SNAP LOGIC (Move)
                    const SNAP_THRESHOLD = 0.3;
                    let bestSnapTime: number | null = null;
                    let minDiff = SNAP_THRESHOLD;

                    const allClips = [...currentVideoTracks, ...currentAudioTracks].filter(c => c.id !== moving.id);
                    const snapPoints = [0];
                    allClips.forEach(c => {
                        snapPoints.push(c.start);
                        snapPoints.push(c.start + c.duration);
                    });

                    // Snap Start
                    for (const point of snapPoints) {
                        const diff = Math.abs(newStart - point);
                        if (diff < minDiff) {
                            minDiff = diff;
                            bestSnapTime = point;
                        }
                    }

                    // Snap End
                    const currentDuration = moving.type === 'video'
                        ? currentVideoTracks.find(t => t.id === moving.id)?.duration || 0
                        : currentAudioTracks.find(t => t.id === moving.id)?.duration || 0;

                    for (const point of snapPoints) {
                        const diff = Math.abs((newStart + currentDuration) - point);
                        if (diff < minDiff) {
                            minDiff = diff;
                            bestSnapTime = point - currentDuration;
                        }
                    }

                    if (bestSnapTime !== null) {
                        newStart = bestSnapTime;
                        setSnapLine(newStart); // Or snap line at end? UX choice.
                    } else {
                        setSnapLine(null);
                    }

                    // Update Tracks with Collision Check
                    if (moving.type === 'video') {
                        const TRACK_HEIGHT = 64 + 4;
                        // Video Layers are rendered Reverse [2,1,0] (Top is 2, Bottom is 0) ?
                        // Wait, let's verify visual layers var.
                        // const videoLayers = [2, 1, 0]; // (Example assumption based on user report)
                        // If Visual Top = 2. Visual Bottom = 0.
                        // Drag Up (Negative Y) -> Should move to Higher Visual (Higher Index 2).
                        // So Negative Y -> Positive Index Change?
                        // Yes. Inverted.

                        const trackDiff = Math.round(deltaY / TRACK_HEIGHT);
                        // If Drag Down (+), we want Index Decrease (2->1). So Invert.
                        let newTrackIndex = (moving.originalTrackIndex || 0) - trackDiff;

                        // Limit tracks (0 to 2)
                        newTrackIndex = Math.max(0, Math.min(newTrackIndex, 2));

                        const clipIndex = currentVideoTracks.findIndex(c => c.id === moving.id);
                        if (clipIndex !== -1) {
                            // Collision Check
                            const targetTrackClips = currentVideoTracks.filter(c => c.id !== moving.id && (c.trackIndex || 0) === newTrackIndex);
                            const hasCollision = targetTrackClips.some(c => {
                                const cEnd = c.start + c.duration;
                                const newEnd = newStart + currentVideoTracks[clipIndex].duration; // Approx
                                return !(newEnd <= c.start || newStart >= cEnd);
                            });

                            if (!hasCollision) {
                                const newTracks = [...currentVideoTracks];
                                newTracks[clipIndex] = {
                                    ...newTracks[clipIndex],
                                    start: newStart,
                                    trackIndex: newTrackIndex
                                };
                                onUpdateVideoTracks(newTracks);
                            }
                        }
                    } else if (moving.type === 'text') {
                        const TRACK_HEIGHT = 48 + 4; // Text tracks height (h-12 = 48px)
                        // Text Layers are reversed [1, 0].
                        // Drag Up (Negative Y) -> Index Increase (0->1).
                        const trackDiff = Math.round(deltaY / TRACK_HEIGHT);
                        // Invert logic for reversed stack
                        let newTrackIndex = (moving.originalTrackIndex || 0) - trackDiff;
                        newTrackIndex = Math.max(0, Math.min(newTrackIndex, 4)); // Arbitrary limit 5 text tracks

                        const clipIndex = currentTextTracks.findIndex(c => c.id === moving.id);
                        if (clipIndex !== -1) {
                            const newTracks = [...currentTextTracks];
                            // Collision Check
                            const targetTrackClips = currentTextTracks.filter(c => c.id !== moving.id && (c.trackIndex || 0) === newTrackIndex);
                            const clipDuration = newTracks[clipIndex].duration;
                            const hasCollision = targetTrackClips.some(c => {
                                const cEnd = c.start + c.duration;
                                const newEnd = newStart + clipDuration;
                                return !(newEnd <= c.start || newStart >= cEnd);
                            });

                            if (!hasCollision) {
                                newTracks[clipIndex] = {
                                    ...newTracks[clipIndex],
                                    start: newStart,
                                    trackIndex: newTrackIndex
                                };
                                onUpdateTextTracks && onUpdateTextTracks(newTracks);
                            }
                        }
                    } else {
                        const TRACK_HEIGHT = 48 + 4;
                        // Audio is usually standard [0,1,2]. Top=0.
                        // Drag Down (+) -> Index Increase (0->1). Correct.
                        const trackDiff = Math.round(deltaY / TRACK_HEIGHT);
                        let newTrackIndex = (moving.originalTrackIndex || 0) + trackDiff;
                        newTrackIndex = Math.max(0, Math.min(newTrackIndex, 4));

                        const clipIndex = currentAudioTracks.findIndex(c => c.id === moving.id);
                        if (clipIndex !== -1) {
                            // Collision Check
                            const targetTrackClips = currentAudioTracks.filter(c => c.id !== moving.id && (c.trackIndex || 0) === newTrackIndex);
                            const clipDuration = currentAudioTracks[clipIndex].duration;
                            const hasCollision = targetTrackClips.some(c => {
                                const cEnd = c.start + c.duration;
                                const newEnd = newStart + clipDuration;
                                return !(newEnd <= c.start || newStart >= cEnd);
                            });

                            if (!hasCollision) {
                                const newTracks = [...currentAudioTracks];
                                newTracks[clipIndex] = {
                                    ...newTracks[clipIndex],
                                    start: newStart,
                                    trackIndex: newTrackIndex
                                };
                                onUpdateAudioTracks && onUpdateAudioTracks(newTracks);
                            }
                        }
                    }
                }

                if (resizing) {
                    const deltaX = clientX - resizing.initialX;

                    let rawNewDuration = resizing.initialDuration;
                    let rawNewStart = resizing.initialStart;
                    let activeEdgeTime = 0;

                    if (resizing.edge === 'end') {
                        rawNewDuration = Math.max(0.1, resizing.initialDuration + (deltaX / PIXELS_PER_SECOND));
                        activeEdgeTime = resizing.initialStart + rawNewDuration;
                    } else {
                        // Dragging start: Moving right (positive delta) -> Start increases, Duration decreases
                        // Moving left (negative delta) -> Start decreases, Duration increases
                        const timeChange = deltaX / PIXELS_PER_SECOND;
                        // Clamp timeChange so we don't exceed duration (cannot invert clip)
                        // Max time change = duration - 0.1
                        // Actually simple math:
                        // New Start = Initial Start + timeChange
                        // New Duration = Initial Duration - timeChange
                        rawNewStart = Math.max(0, resizing.initialStart + timeChange);
                        rawNewDuration = Math.max(0.1, resizing.initialDuration - timeChange);
                        activeEdgeTime = rawNewStart;
                    }

                    // SNAP LOGIC (Resize)
                    const SNAP_THRESHOLD = 0.3;
                    let bestSnapTime: number | null = null;
                    let minDiff = SNAP_THRESHOLD;

                    const allClips = [...currentVideoTracks, ...currentAudioTracks].filter(c => c.id !== resizing.id);
                    const snapPoints = [0];
                    allClips.forEach(c => {
                        snapPoints.push(c.start);
                        snapPoints.push(c.start + c.duration);
                    });

                    for (const point of snapPoints) {
                        const diff = Math.abs(activeEdgeTime - point);
                        if (diff < minDiff) {
                            minDiff = diff;
                            bestSnapTime = point;
                        }
                    }

                    let finalStart = rawNewStart;
                    let finalDuration = rawNewDuration;

                    if (bestSnapTime !== null) {
                        setSnapLine(bestSnapTime);
                        if (resizing.edge === 'start') {
                            const originalEndTime = resizing.initialStart + resizing.initialDuration;
                            finalStart = bestSnapTime;
                            finalDuration = originalEndTime - finalStart;
                        } else {
                            finalDuration = bestSnapTime - resizing.initialStart;
                        }
                    } else {
                        setSnapLine(null);
                    }

                    if (resizing.type === 'video') {
                        const clipIndex = currentVideoTracks.findIndex(t => t.id === resizing.id);
                        if (clipIndex === -1) return;
                        const newTracks = [...currentVideoTracks];
                        const clip = newTracks[clipIndex];

                        if (finalDuration < 0.1) finalDuration = 0.1;

                        // Check Source Duration Cap
                        // For video, we don't have sourceDuration in type explicitly but it's passed in resizing state?
                        // Actually handleResizeStart passes it. But here we need to enforce it.
                        // Wait, resizing state HAS maxDuration.
                        const maxDuration = resizing.maxDuration || 9999;

                        // Check logic:
                        // If edge==end: new duration cannot exceed max
                        // If edge==start: we are cutting from left. Duration decreases. 
                        // BUT if we were already cropped, and we drag start LEFT, we are revealing more. 
                        // The 'duration' is the visible duration.
                        // 'maxDuration' usually refers to the source file length.
                        // This logic is tricky. 
                        // Simplification: We assume maxDuration is the CLIP SOURCE LENGTH.
                        // If we drag END right, we are limited by (Start Offset + Duration) <= Source Length?
                        // No. usually we don't track start offset here.
                        // We track sourceDuration as 'Constrained Resize' where we can't make it longer than the file.
                        // If we drag start left, we can't go before 0 relative to source.
                        // Current implementation assumes we can resize FREELY up to maxDuration (looping? or just clamped?).
                        // User wants 'Infinite Resize Bug' fixed -> means Clamped.

                        if (finalDuration > maxDuration) {
                            finalDuration = maxDuration;
                            if (resizing.edge === 'start') {
                                finalStart = resizing.initialStart + resizing.initialDuration - maxDuration;
                            }
                        }

                        clip.start = finalStart;
                        clip.duration = finalDuration;
                        onUpdateVideoTracks(newTracks);

                    } else if (resizing.type === 'text') {
                        const clipIndex = currentTextTracks.findIndex(t => t.id === resizing.id);
                        if (clipIndex === -1) return;
                        const newTracks = [...currentTextTracks];
                        const clip = newTracks[clipIndex];

                        if (finalDuration < 0.1) finalDuration = 0.1;
                        // No max duration for text (or maybe infinite?)

                        clip.start = finalStart;
                        clip.duration = finalDuration;
                        onUpdateTextTracks && onUpdateTextTracks(newTracks);

                    } else {
                        const clipIndex = currentAudioTracks.findIndex(t => t.id === resizing.id);
                        if (clipIndex === -1) return;
                        const newTracks = [...currentAudioTracks];
                        const clip = newTracks[clipIndex];

                        if (finalDuration < 0.1) finalDuration = 0.1;

                        const maxDuration = resizing.maxDuration || 9999;

                        if (finalDuration > maxDuration) {
                            finalDuration = maxDuration;
                            if (resizing.edge === 'start') {
                                finalStart = resizing.initialStart + resizing.initialDuration - maxDuration;
                            }
                        }

                        clip.start = finalStart;
                        clip.duration = finalDuration;
                        onUpdateAudioTracks && onUpdateAudioTracks(newTracks);
                    }
                }
            };

            const handleMouseUp = () => {
                setResizing(null);
                setMoving(null); // Clear moving too
                setSnapLine(null);
            };

            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            window.addEventListener('touchmove', handleMouseMove as any, { passive: false });
            window.addEventListener('touchend', handleMouseUp);
            window.addEventListener('touchcancel', handleMouseUp);

            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
                window.removeEventListener('touchmove', handleMouseMove as any);
                window.removeEventListener('touchend', handleMouseUp);
                window.removeEventListener('touchcancel', handleMouseUp);
            };
        }
        // Dependency Array: ONLY stable things + resizing/moving state (which triggers mount/unmount ONCE per drag start)
        // REMOVED videoTracks, audioTracks. Included refs (stable) or nothing.
    }, [resizing, moving, onUpdateVideoTracks, onUpdateAudioTracks, PIXELS_PER_SECOND]);

    // Handle Scrubbing (Global Mouse Move)
    useEffect(() => {
        if (isScrubbing) {
            const handleScrubMove = (e: MouseEvent | TouchEvent) => {
                const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;

                if (scrollContainerRef.current) {
                    const rect = scrollContainerRef.current.getBoundingClientRect();
                    const scrollLeft = scrollContainerRef.current.scrollLeft;
                    const offsetX = clientX - rect.left + scrollLeft;
                    const newTime = offsetX / PIXELS_PER_SECOND;
                    onSeek(Math.min(Math.max(0, newTime), duration + 300));
                }
            };

            const handleScrubUp = () => {
                setIsScrubbing(false);
            };

            window.addEventListener('mousemove', handleScrubMove);
            window.addEventListener('mouseup', handleScrubUp);
            window.addEventListener('touchmove', handleScrubMove, { passive: false });
            window.addEventListener('touchend', handleScrubUp);

            return () => {
                window.removeEventListener('mousemove', handleScrubMove);
                window.removeEventListener('mouseup', handleScrubUp);
                window.removeEventListener('touchmove', handleScrubMove);
                window.removeEventListener('touchend', handleScrubUp);
            };
        }
    }, [isScrubbing, onSeek, duration, PIXELS_PER_SECOND]);

    // Handle Start Move (Mouse/Touch Down on Clip Body)
    const handleMoveStart = (e: React.MouseEvent | React.TouchEvent, clipId: string, type: 'video' | 'audio' | 'text', start: number, trackIndex: number) => {
        // e.preventDefault(); // Don't prevent default immediately if we want scrolling, but for DND we usually do.
        e.stopPropagation();

        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

        // Only left click for mouse
        if ('button' in e && (e as React.MouseEvent).button !== 0) return;

        addLog(`MOVE START: ${clipId}`);
        setMoving({
            id: clipId,
            type,
            initialX: clientX,
            initialY: clientY,
            initialStart: start,
            trackIndex,
            originalTrackIndex: trackIndex
        });

        onSelectClip && onSelectClip(clipId);
    };

    const handleResizeStart = (e: React.MouseEvent | React.TouchEvent, id: string, type: 'video' | 'audio' | 'text', edge: 'start' | 'end', start: number, duration: number, maxDuration?: number) => {
        // IMPORTANT: Prevent scrolling or other gestures
        // e.preventDefault(); // React synthetic events might warn, but let's try just stopPropagation first.
        // Actually for direct touch manipulation we often want preventDefault to stop scrolling.
        if (e.cancelable && 'touches' in e) e.preventDefault();
        e.stopPropagation();

        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;

        setResizing({
            id,
            type,
            edge,
            initialX: clientX,
            initialStart: start,
            initialDuration: duration,
            maxDuration: maxDuration || 120 // Default 2 mins cap if unknown, or infinite
        });
    };

    const handleDragStart = (e: React.DragEvent, clipId: string, type: 'video' | 'audio' | 'text', duration: number, trackIndex: number) => {
        console.log("DRAG START", clipId, type, trackIndex);

        // REMOVED LOCK STATE CHECK
        /*
        const trackState = type === 'video' ? videoTrackState : audioTrackState;
        if (trackState && trackState[trackIndex]?.locked) {
            e.preventDefault();
            return;
        }
        */

        // Calculate offset from the start of the clip to the mouse position
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const offsetSeconds = offsetX / PIXELS_PER_SECOND;

        setDraggedClipId({ id: clipId, type, offsetSeconds });

        // Hide default drag image for clearer custom custom UI (optional, but requested for "pro" look)
        // e.dataTransfer.setDragImage(new Image(), 0, 0); // This hides it completely. User might want to see cursor.
        // Let's keep default but make the on-track preview the main focus.

        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", clipId); // Required for Firefox
    };

    const handleDragOver = (e: React.DragEvent, trackIndex: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (!draggedClipId) return;

        // Calculate Potential New Start Time (Live Preview)
        const rect = e.currentTarget.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseSeconds = mouseX / PIXELS_PER_SECOND;

        // Raw position based on mouse offset
        let newStartTime = Math.max(0, mouseSeconds - draggedClipId.offsetSeconds);

        // --- REUSE SNAPPING LOGIC FOR PREVIEW ---
        const SNAP_THRESHOLD = 0.5; // seconds
        let bestSnapTime: number | null = null;
        let minDiff = SNAP_THRESHOLD;

        // 1. Snap to 0
        if (newStartTime < SNAP_THRESHOLD) {
            newStartTime = 0;
            bestSnapTime = 0;
            minDiff = 0;
        } else {
            const targetTracks = draggedClipId.type === 'video' ? videoTracks : audioTracks;
            const trackClips = targetTracks.filter(t => (t.trackIndex || 0) === trackIndex && t.id !== draggedClipId.id);

            for (const clip of trackClips) {
                const end = clip.start + clip.duration;
                if (Math.abs(newStartTime - end) < minDiff) {
                    bestSnapTime = end;
                    minDiff = Math.abs(newStartTime - end);
                }
            }
        }

        // OPTIMIZATION: Only update state if changed significantly
        if (bestSnapTime !== snapLine) {
            setSnapLine(bestSnapTime);
        }

        // Get duration for preview
        const relevantTracks = draggedClipId.type === 'video' ? videoTracks : audioTracks;
        const draggedClip = relevantTracks.find(c => c.id === draggedClipId.id);
        const duration = draggedClip ? draggedClip.duration : 5; // Default fallback

        // Check if we really need to update dragPreview
        if (
            !dragPreview ||
            dragPreview.trackIndex !== trackIndex ||
            Math.abs(dragPreview.start - newStartTime) > 0.01
        ) {
            setDragPreview({
                trackIndex,
                start: newStartTime,
                id: draggedClipId.id,
                type: draggedClipId.type,
                duration
            });
        }
    };

    const handleDragLeave = () => {
        // Optional: Clear preview if leaving timeline area. 
        // But often tricky due to bubbling. Keeping it simple for now.
    };

    const handleDragEnd = () => {
        setDraggedClipId(null);
        draggedClipRef.current = null;
        setDragPreview(null);
        setSnapLine(null);
    };

    const handleDrop = (e: React.DragEvent, targetTrackIndex: number) => {
        console.log("DROP", targetTrackIndex);
        e.preventDefault();

        const dragging = draggedClipRef.current;
        if (!dragging || !dragPreview) {
            setDraggedClipId(null);
            draggedClipRef.current = null;
            setDragPreview(null);
            setSnapLine(null);
            return;
        }

        // Use the calculated PREVIEW start time (which already includes offset & snapping)
        const newStartTime = dragPreview.start;

        if (dragging.type === 'video') {
            const clipIndex = videoTracks.findIndex(t => t.id === dragging.id);
            if (clipIndex === -1) return;

            const newTracks = [...videoTracks];
            const clip = newTracks[clipIndex];
            clip.trackIndex = targetTrackIndex;
            clip.start = newStartTime;
            onUpdateVideoTracks(newTracks);

        } else if (dragging.type === 'audio' && onUpdateAudioTracks) {
            const clipIndex = audioTracks.findIndex(t => t.id === dragging.id);
            if (clipIndex === -1) return;

            const newTracks = [...audioTracks];
            const clip = newTracks[clipIndex];
            clip.trackIndex = targetTrackIndex;
            clip.start = newStartTime;
            onUpdateAudioTracks(newTracks);
        }

        setDraggedClipId(null);
        draggedClipRef.current = null;
        setDragPreview(null);
        setSnapLine(null);
    };

    // Dynamic Track Calculation
    // Logic: Normally show [0..Max]. If dragging, show [0..Max+1] to allow "New Track".

    // Video
    const maxVideoTrack = Math.max(0, ...videoTracks.map(t => t.trackIndex || 0));
    const showExtraVideo = draggedClipId?.type === 'video';
    const videoLayerCount = showExtraVideo ? maxVideoTrack + 2 : maxVideoTrack + 1;
    const videoLayers = Array.from({ length: videoLayerCount }, (_, i) => i).reverse();

    // Audio
    const maxAudioTrack = Math.max(0, ...audioTracks.map(t => t.trackIndex || 0));
    const showExtraAudio = draggedClipId?.type === 'audio';
    const audioLayerCount = showExtraAudio ? maxAudioTrack + 2 : maxAudioTrack + 1;
    const audioLayers = Array.from({ length: audioLayerCount }, (_, i) => i);

    // Text (Subtitles)
    const maxTextTrack = Math.max(0, ...(textTracks || []).map(t => t.trackIndex || 0));
    const showExtraText = draggedClipId?.type === 'text';
    const textLayerCount = showExtraText ? maxTextTrack + 2 : maxTextTrack + 1;
    const textLayers = Array.from({ length: textLayerCount }, (_, i) => i).reverse(); // Stack up? Or down? Usually up.


    return (
        <div className="h-full flex flex-col bg-[#1e1e1e] border-t border-[#333] relative">

            {/* 1. Toolbar (Top) */}
            <div className="h-10 border-b border-[#333] flex items-center justify-between px-4 bg-[#1e1e1e] shrink-0 z-30">
                <div className="flex items-center gap-2 text-zinc-400">
                    <button
                        onClick={onUndo}
                        className="p-1.5 hover:text-white hover:bg-white/10 rounded disabled:opacity-30"
                        title="Undo (Ctrl+Z)"
                    >
                        <RotateCcw className="w-4 h-4" />
                    </button>
                    <button
                        onClick={onRedo}
                        className="p-1.5 hover:text-white hover:bg-white/10 rounded disabled:opacity-30"
                        title="Redo (Ctrl+Y)"
                    >
                        <RotateCw className="w-4 h-4" />
                    </button>
                    <div className="w-px h-4 bg-zinc-700 mx-1" />
                    <button
                        onClick={() => setActiveTool('select')}
                        className={`p-1.5 rounded transition-colors ${activeTool === 'select' ? 'bg-indigo-600 text-white shadow-lg' : 'hover:text-white hover:bg-white/10'}`}
                        title="Select Tool (V)"
                    >
                        <MousePointer2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setActiveTool('razor')}
                        className={`p-1.5 rounded transition-colors ${activeTool === 'razor' ? 'bg-rose-600 text-white shadow-lg' : 'hover:text-white hover:bg-white/10'}`}
                        title="Razor/Split Tool (C)"
                    >
                        <Scissors className="w-4 h-4" />
                    </button>
                    <div className="w-px h-4 bg-zinc-700 mx-1" />
                    <button
                        onClick={handleDelete}
                        disabled={!selectedClipId}
                        className={`p-1.5 rounded transition-colors ${selectedClipId ? 'text-red-400 hover:bg-red-500/20' : 'opacity-30 cursor-not-allowed'}`}
                        title="Delete Selected (Del)"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={onTogglePlay}
                        className="w-8 h-8 flex items-center justify-center bg-white text-black rounded-full hover:scale-105 transition-transform"
                    >
                        {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                    </button>
                </div>

                <div className="flex items-center gap-3 text-xs font-mono text-zinc-500">
                    <span>{new Date(currentTime * 1000).toISOString().substr(14, 5)}</span>
                    <span className="text-zinc-700">/</span>
                    <span>
                        {new Date(Math.max(0, ...videoTracks.map(t => t.start + t.duration), ...audioTracks.map(t => t.start + t.duration)) * 1000).toISOString().substr(14, 5)}
                    </span>
                </div>
            </div>

            {/* 2. Main Timeline Area */}
            <div className="flex-1 flex flex-col min-h-0 relative">

                {/* Ruler Row (Fixed Top) */}
                <div className="h-6 flex border-b border-[#333] bg-[#1e1e1e] shrink-0 z-40">
                    {/* Ruler Scroll Area (Synced) */}
                    {/* We used to have a 120px spacer here. Removed per user request to 'extend timeline up'. */}
                    {/* However, we must ensure 0s tick aligns with track start. Tracks start AFTER the 120px header panel. */}
                    {/* So the Ruler SCROLL view must be offset or padded by 120px visually? */}
                    {/* Actually, the Track View (Right Side) occupies the space AFTER the 120px Header View (Left Side). */}
                    {/* If we make the Ruler Row full width, the Ruler Scroll View effectively sits above BOTH Headers and Tracks. */}
                    {/* But the Ticks should only start where tracks start. */}
                    {/* So we need a 120px 'blank' area in the Ruler Row Left side. */}
                    {/* The user said 'timeline ı aynı boyutta yukarı büyüt', meaning he wants the ruler to cover the gap. */}
                    {/* I will keep the layout but maybe change the background or border? */}
                    {/* Wait, 'sadece timeline yazan boş gri barı sil' -> 'Delete just the empty gray bar that says Timeline'. */}
                    {/* That bar is likely the 120px header-top-spacer. */}
                    {/* If he wants the Timeline Ruler to extend over it, I can just make the Ruler Container span full width, */}
                    {/* AND have the ticks start at 120px? */}
                    {/* Or maybe he WANTS the ticks to start at 0px relative to window? No, that desyncs time. */}
                    {/* Let's try: Make 120px area PART of the Ruler div, so it looks unified, but keeps the offset. */}

                    <div className="w-[120px] shrink-0 border-r border-[#333] bg-[#1e1e1e] flex items-end justify-center pb-1">
                        <span className="text-[9px] text-zinc-600 font-mono">00:00</span>
                    </div>

                    <div
                        className="flex-1 overflow-hidden relative"
                        ref={(ref) => {
                            if (ref) ref.id = 'timeline-ruler';
                        }}
                    >
                        <div
                            className="h-full relative cursor-col-resize hover:bg-[#252525]"
                            style={{ width: `${timelineWidth}px` }}
                            onMouseDown={(e) => {
                                if (isPlaying) onTogglePlay();
                                setIsScrubbing(true);
                                const rect = e.currentTarget.getBoundingClientRect();
                                const newTime = (e.clientX - rect.left) / PIXELS_PER_SECOND;
                                onSeek(Math.min(Math.max(0, newTime), Math.max(duration, newTime)));
                            }}
                        >
                            {Array.from({ length: Math.ceil(visualDuration / 5) }).map((_, i) => (
                                <div key={i} className="absolute bottom-0 flex items-end pb-1 border-l border-[#333]"
                                    style={{ left: `${i * 5 * PIXELS_PER_SECOND}px`, height: '50%' }}>
                                    <span className="pl-1 text-[9px] text-zinc-500 font-mono select-none">{i * 5}s</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Split View (Headers | Tracks) */}
                <div className="flex-1 flex min-h-0 overflow-hidden relative">
                    {/* LEFT: Track Headers */}
                    <div ref={headerContainerRef} className="w-[120px] bg-[#1e1e1e] border-r border-[#333] flex flex-col shrink-0 z-20 overflow-hidden">
                        <div className="flex-1 overflow-hidden flex flex-col py-4 space-y-4">

                            {/* Text Headers */}
                            {textTracks.length > 0 && (
                                <div className="flex flex-col gap-1 pb-4 border-b border-[#333]">
                                    {textLayers.map(trackIdx => (
                                        <div key={`theader-${trackIdx}`} className="h-12 flex flex-col justify-center px-2">
                                            <div className="flex items-center justify-between text-zinc-500 mb-1">
                                                <span className="text-[10px] font-bold text-orange-400">T{trackIdx}</span>
                                                <div className="flex items-center gap-2">
                                                    {/* Hide Toggle? Locked? */}
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-end gap-2">
                                                <button className="text-zinc-600 hover:text-white" title="Lock Track">
                                                    {/* Lock Icon */}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Video Headers (Reverse Order: Top Layer First) */}
                            <div className="flex flex-col gap-1">
                                {videoLayers.map(trackIdx => (
                                    <div key={`vheader-${trackIdx}`} className="h-16 flex flex-col justify-center px-2 relative group">
                                        <div className="flex items-center justify-between text-zinc-500 mb-1">
                                            <span className="text-[10px] font-bold text-teal-500/80">V{trackIdx}</span>
                                            {/* Status Indicators (Mini) */}
                                            <div className="flex items-center gap-2">
                                                {videoTrackState[trackIdx]?.hidden && <EyeOff className="w-2.5 h-2.5 text-zinc-400" />}
                                            </div>
                                        </div>
                                        {/* Interaction Row */}
                                        <div className="flex items-center justify-end gap-2">
                                            {/* Hide Toggle */}
                                            <button
                                                onClick={() => onToggleTrackState && onToggleTrackState('video', trackIdx, 'hidden')}
                                                className={`hover:text-white ${videoTrackState[trackIdx]?.hidden ? 'text-zinc-400' : 'text-zinc-600'}`}
                                                title={videoTrackState[trackIdx]?.hidden ? "Show Track" : "Hide Track"}
                                            >
                                                {videoTrackState[trackIdx]?.hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                            </button>

                                            {/* Lock Toggle Removed */}

                                            {/* Mute Toggle */}
                                            <button
                                                onClick={() => onToggleTrackState && onToggleTrackState('video', trackIdx, 'muted')}
                                                className={`hover:text-white ${videoTrackState[trackIdx]?.muted ? 'text-red-400' : 'text-zinc-600'}`}
                                                title={videoTrackState[trackIdx]?.muted ? "Unmute Track" : "Mute Track"}
                                            >
                                                {videoTrackState[trackIdx]?.muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Audio Headers */}
                            <div className="flex flex-col gap-1 pt-4 border-t border-[#333]">
                                {audioLayers.map(trackIdx => (
                                    <div key={`aheader-${trackIdx}`} className="h-12 flex flex-col justify-center px-2">
                                        <div className="flex items-center justify-between text-zinc-500 mb-1">
                                            <span className="text-[10px] font-bold text-indigo-400">A{trackIdx}</span>
                                            {/* Status Indicators */}
                                            <div className="flex gap-1 opacity-50">
                                                {audioTrackState[trackIdx]?.muted && <VolumeX className="w-2.5 h-2.5 text-zinc-400" />}
                                            </div>
                                        </div>
                                        {/* Interaction Row */}
                                        <div className="flex items-center justify-end gap-2">
                                            {/* Lock Toggle Removed */}

                                            {/* Mute Toggle */}
                                            <button
                                                onClick={() => onToggleTrackState && onToggleTrackState('audio', trackIdx, 'muted')}
                                                className={`hover:text-white ${audioTrackState[trackIdx]?.muted ? 'text-red-400' : 'text-zinc-600'}`}
                                                title={audioTrackState[trackIdx]?.muted ? "Unmute Track" : "Mute Track"}
                                            >
                                                {audioTrackState[trackIdx]?.muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Script Header */}
                            {script.length > 0 && (
                                <div className="h-8 mt-4 flex items-center px-2 text-orange-400/50">
                                    <Type className="w-3 h-3 mr-2" />
                                    <span className="text-[9px] uppercase font-bold">Subs</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT: Timeline Scroll Area */}
                    <div
                        ref={scrollContainerRef}
                        className="flex-1 overflow-x-auto overflow-y-auto relative bg-[#131313] custom-scrollbar flex flex-col"
                        onScroll={(e) => {
                            // Sync Vertical Scroll with Headers
                            if (headerContainerRef.current) {
                                headerContainerRef.current.scrollTop = e.currentTarget.scrollTop;
                            }
                            // Sync Horizontal Scroll with Ruler Top Bar
                            const ruler = document.getElementById('timeline-ruler');
                            if (ruler) {
                                ruler.scrollLeft = e.currentTarget.scrollLeft;
                            }
                        }}
                    >
                        <div
                            className="min-h-full relative flex flex-col min-w-full"
                            style={{ width: `${timelineWidth}px` }}
                        >
                            {/* Old Ruler Removed */}

                            {/* Tracks Content */}
                            <div className="p-4 pt-4 space-y-4 flex-1">

                                {/* Text Tracks */}
                                {textTracks.length > 0 && (
                                    <div className="flex flex-col gap-1 pb-4 border-b border-[#333]">
                                        {textLayers.map(trackIdx => (
                                            <div
                                                key={`ttrack-${trackIdx}`}
                                                className="h-12 relative w-full transition-colors bg-[#1e1e1e]/30 border-b border-[#333]/30 hover:bg-[#333]/20"
                                                onDragOver={(e) => handleDragOver(e, trackIdx)}
                                                onDrop={(e) => handleDrop(e, trackIdx)}
                                            >
                                                {/* Ghost / Preview Clip */}
                                                {dragPreview && dragPreview.type === 'text' && dragPreview.trackIndex === trackIdx && (
                                                    <div
                                                        className="absolute top-0.5 bottom-0.5 rounded-sm bg-orange-500/30 border border-orange-400/50 z-20 pointer-events-none"
                                                        style={{
                                                            left: `${dragPreview.start * PIXELS_PER_SECOND}px`,
                                                            width: `${dragPreview.duration * PIXELS_PER_SECOND}px`,
                                                        }}
                                                    />
                                                )}

                                                {(textTracks || []).filter(t => (t.trackIndex || 0) === trackIdx).map((clip) => (
                                                    <div
                                                        key={clip.id}
                                                        onContextMenu={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            onSelectClip && onSelectClip(clip.id);
                                                            setContextMenu({ x: e.clientX, y: e.clientY, clipId: clip.id, type: 'text' });
                                                        }}
                                                        onMouseDown={(e) => {
                                                            if (activeTool === 'razor') return;
                                                            handleMoveStart(e, clip.id, 'text', clip.start, trackIdx);
                                                        }}
                                                        onTouchStart={(e) => {
                                                            if (activeTool === 'razor') return;
                                                            handleMoveStart(e, clip.id, 'text', clip.start, trackIdx);
                                                        }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                        }}
                                                        className={`absolute top-0.5 bottom-0.5 rounded-sm bg-[#5E2A1E] border border-[#7A3A2A] overflow-hidden z-10 select-none group touch-pan-y
                                                ${activeTool === 'razor' ? 'cursor-[url(/scissors.svg),_crosshair]' : 'cursor-move active:cursor-grabbing'}
                                                ${selectedClipId === clip.id ? 'ring-2 ring-orange-300 z-20' : ''}
                                                ${draggedClipId?.id === clip.id ? 'opacity-50' : 'opacity-100'}
                                                `}
                                                        style={{
                                                            left: `${clip.start * PIXELS_PER_SECOND}px`,
                                                            width: `${clip.duration * PIXELS_PER_SECOND}px`,
                                                        }}
                                                    >
                                                        {/* Resize Handles */}
                                                        <div
                                                            className={`absolute -left-6 top-0 bottom-0 w-12 cursor-ew-resize z-50 flex items-center justify-center group/handle outline-none touch-none ${selectedClipId === clip.id ? 'opacity-100' : 'opacity-0 hover:opacity-100'}`}
                                                            onMouseDown={(e) => handleResizeStart(e, clip.id, 'text', 'start', clip.start, clip.duration, clip.duration)}
                                                        >
                                                            <div className="w-2 h-6 bg-white rounded shadow-lg border border-black/20" />
                                                        </div>

                                                        <div className="relative px-2 h-full flex items-center pointer-events-none">
                                                            <span className="text-[10px] text-orange-100 truncate">{clip.text || "Subtitle"}</span>
                                                        </div>

                                                        <div
                                                            className={`absolute -right-6 top-0 bottom-0 w-12 cursor-ew-resize z-50 flex items-center justify-center group/handle outline-none touch-none ${selectedClipId === clip.id ? 'opacity-100' : 'opacity-0 hover:opacity-100'}`}
                                                            onMouseDown={(e) => handleResizeStart(e, clip.id, 'text', 'end', clip.start, clip.duration, clip.duration)}
                                                        >
                                                            <div className="w-2 h-6 bg-white rounded shadow-lg border border-black/20" />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Video Tracks (Reverse Order to Match Headers) */}
                                <div className="flex flex-col gap-1">
                                    {videoLayers.map(trackIdx => (
                                        <div
                                            key={`vtrack-${trackIdx}`}
                                            className={`h-16 relative w-full transition-colors border-b border-[#333]/30 ${videoTracks.some(t => (t.trackIndex || 0) == trackIdx) ? 'bg-[#1e1e1e]/50' : 'bg-transparent hover:bg-[#333]/10'
                                                }`}
                                            onDragOver={(e) => handleDragOver(e, trackIdx)}
                                            onDrop={(e) => handleDrop(e, trackIdx)}
                                        >
                                            {/* Ghost / Preview Clip */}
                                            {dragPreview && dragPreview.type === 'video' && dragPreview.trackIndex === trackIdx && (
                                                <div
                                                    className="absolute top-0.5 bottom-0.5 rounded-sm bg-teal-500/30 border border-teal-400/50 z-20 pointer-events-none"
                                                    style={{
                                                        left: `${dragPreview.start * PIXELS_PER_SECOND}px`,
                                                        width: `${dragPreview.duration * PIXELS_PER_SECOND}px`,
                                                    }}
                                                >
                                                    <div className="text-[9px] text-teal-200/50 px-2 truncate">
                                                        {new Date(dragPreview.start * 1000).toISOString().substr(14, 5)}
                                                    </div>
                                                </div>
                                            )}

                                            {videoTracks.filter(t => (t.trackIndex || 0) === trackIdx).map((clip) => {
                                                return (
                                                    <div
                                                        key={clip.id}
                                                        onContextMenu={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            onSelectClip && onSelectClip(clip.id);
                                                            setContextMenu({ x: e.clientX, y: e.clientY, clipId: clip.id, type: 'video' });
                                                        }}
                                                        onMouseDown={(e) => {
                                                            if (activeTool === 'razor') return; // Don't drag in razor mode
                                                            handleMoveStart(e, clip.id, 'video', clip.start, trackIdx);
                                                        }}
                                                        onTouchStart={(e) => {
                                                            if (activeTool === 'razor') {
                                                                // Touch Split immediately? Or wait for tap?
                                                                // Usually tap. TouchStart might be drag.
                                                                // Let's split on Click (Tap) for consistency.
                                                                return;
                                                            }
                                                            handleMoveStart(e, clip.id, 'video', clip.start, trackIdx);
                                                        }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (activeTool === 'razor') {
                                                                // SPLIT ACTION
                                                                const rect = e.currentTarget.getBoundingClientRect();
                                                                const clickX = e.clientX - rect.left; // x relative to clip start visually?
                                                                // No, clientX is screen. rect.left is clip start screen x.
                                                                // So clickX is pixel offset into clip.
                                                                const splitTime = clip.start + (clickX / PIXELS_PER_SECOND);
                                                                handleSplit(clip.id, 'video', splitTime);
                                                            } else {
                                                                // Select
                                                                // Don't need to do anything as onMouseDown usually handles select/drag start
                                                                // But explicit select is good.
                                                            }
                                                        }}
                                                        // CAPCUT STYLE: Teal/Cyber colors
                                                        className={`absolute top-0.5 bottom-0.5 rounded-sm overflow-hidden clip-item z-10 select-none group touch-pan-y
                                                    ${activeTool === 'razor' ? 'cursor-[url(/scissors.svg),_crosshair]' : 'cursor-move active:cursor-grabbing'}
                                                    ${selectedClipId === clip.id ? 'ring-2 ring-white z-20' : ''}
                                                    ${draggedClipId?.id === clip.id ? 'opacity-50' : 'opacity-100'} 
                                                    `}
                                                        // Setting opacity-0 on dragged item effectively "hides" the original while relying on Preview + Browser Drag Image
                                                        // Or we can keep it 0.5. User didn't like "hiding" maybe? 
                                                        // Actually user showed an image of the browser drag image being blurry. 
                                                        // If I set opacity-0, the browser drag image is derived from a transparent element -> invisible!
                                                        // So I must NOT set opacity-0 if I want standard DnD, OR I must rely ONLY on my Preview.
                                                        // Let's try: Hide Original (opacity-0 or display-none) -> Browser Ghost is Invisible -> User sees ONLY my Custom Preview.
                                                        // BUT browsers take the snapshot on dragStart. If I change state on dragStart to hide it, sometimes it captures the hidden state.
                                                        // Trick: Change opacity AFTER timeout.

                                                        style={{
                                                            left: `${clip.start * PIXELS_PER_SECOND}px`,
                                                            width: `${clip.duration * PIXELS_PER_SECOND}px`,
                                                            backgroundColor: '#1E5E5E', // Teal Background
                                                            border: '1px solid #2A7A7A'
                                                        }}
                                                    >
                                                        {/* Left Handle - Touch Friendly & Visible */}
                                                        <div
                                                            className={`absolute -left-6 top-0 bottom-0 w-12 cursor-ew-resize z-50 flex items-center justify-center group/handle outline-none touch-none
                                                            ${selectedClipId === clip.id ? 'opacity-100' : 'opacity-0 hover:opacity-100'} transition-opacity
                                                        `}
                                                            onMouseDown={(e) => handleResizeStart(e, clip.id, 'video', 'start', clip.start, clip.duration, (clip as any).sourceDuration)}
                                                            onTouchStart={(e) => handleResizeStart(e, clip.id, 'video', 'start', clip.start, clip.duration, (clip as any).sourceDuration)}
                                                        >
                                                            {/* Visible Bar */}
                                                            <div className="w-2 h-8 bg-white rounded shadow-lg border border-black/20" />
                                                        </div>

                                                        {/* Thumbnails Strip (Mock) */}
                                                        <div className="absolute inset-0 opacity-20 flex overflow-hidden pointer-events-none">
                                                            {Array.from({ length: Math.ceil(clip.duration / 5) }).map((_, i) => (
                                                                <div key={i} className="flex-1 border-r border-black/20 bg-emerald-900/50" />
                                                            ))}
                                                        </div>
                                                        <div className="relative px-2 h-full flex items-center pointer-events-none">
                                                            <span className="text-[10px] font-medium text-teal-100 truncate drop-shadow-md">{clip.id}</span>
                                                        </div>

                                                        {/* Right Handle - Touch Friendly & Visible */}
                                                        <div
                                                            className={`absolute -right-6 top-0 bottom-0 w-12 cursor-ew-resize z-50 flex items-center justify-center group/handle outline-none touch-none
                                                            ${selectedClipId === clip.id ? 'opacity-100' : 'opacity-0 hover:opacity-100'} transition-opacity
                                                        `}
                                                            onMouseDown={(e) => handleResizeStart(e, clip.id, 'video', 'end', clip.start, clip.duration, (clip as any).sourceDuration)}
                                                            onTouchStart={(e) => handleResizeStart(e, clip.id, 'video', 'end', clip.start, clip.duration, (clip as any).sourceDuration)}
                                                        >
                                                            {/* Visible Bar */}
                                                            <div className="w-2 h-8 bg-white rounded shadow-lg border border-black/20" />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ))}
                                </div>

                                {/* Audio Tracks */}
                                <div className="flex flex-col gap-1 pt-4 border-t border-[#333]">
                                    {audioLayers.map(trackIdx => (
                                        <div
                                            key={`atrack-${trackIdx}`}
                                            className="h-12 relative w-full transition-colors bg-[#1e1e1e]/30 border-b border-[#333]/30 hover:bg-[#333]/20"
                                            onDragOver={(e) => handleDragOver(e, trackIdx)}
                                            onDrop={(e) => handleDrop(e, trackIdx)}
                                        >
                                            {/* Ghost / Preview Clip */}
                                            {dragPreview && dragPreview.type === 'audio' && dragPreview.trackIndex === trackIdx && (
                                                <div
                                                    className="absolute top-0.5 bottom-0.5 rounded-sm bg-indigo-500/30 border border-indigo-400/50 z-20 pointer-events-none"
                                                    style={{
                                                        left: `${dragPreview.start * PIXELS_PER_SECOND}px`,
                                                        width: `${dragPreview.duration * PIXELS_PER_SECOND}px`,
                                                    }}
                                                >
                                                    <div className="text-[9px] text-indigo-200/50 px-2 pt-1 truncate">
                                                        {new Date(dragPreview.start * 1000).toISOString().substr(14, 5)}
                                                    </div>
                                                </div>
                                            )}

                                            {audioTracks.filter(t => (t.trackIndex || 0) === trackIdx).map((clip) => {
                                                return (
                                                    <div
                                                        key={clip.id}
                                                        onContextMenu={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            onSelectClip && onSelectClip(clip.id);
                                                            setContextMenu({ x: e.clientX, y: e.clientY, clipId: clip.id, type: 'audio' });
                                                        }}
                                                        onMouseDown={(e) => {
                                                            if (activeTool === 'razor') return;
                                                            handleMoveStart(e, clip.id, 'audio', clip.start, trackIdx);
                                                        }}
                                                        onTouchStart={(e) => {
                                                            if (activeTool === 'razor') return;
                                                            handleMoveStart(e, clip.id, 'audio', clip.start, trackIdx);
                                                        }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (activeTool === 'razor') {
                                                                const rect = e.currentTarget.getBoundingClientRect();
                                                                const clickX = e.clientX - rect.left;
                                                                const splitTime = clip.start + (clickX / PIXELS_PER_SECOND);
                                                                handleSplit(clip.id, 'audio', splitTime);
                                                            }
                                                        }}
                                                        className={`absolute top-px bottom-px rounded-sm bg-[#3b4d80] border border-[#5b6da0] overflow-hidden z-10 select-none group touch-pan-y
                                                    ${activeTool === 'razor' ? 'cursor-[url(/scissors.svg),_crosshair]' : 'cursor-move active:cursor-grabbing'}
                                                    ${selectedClipId === clip.id ? 'ring-2 ring-indigo-300 z-20' : ''}
                                                        ${draggedClipId?.id === clip.id ? 'opacity-50' : 'opacity-100'}
                                                        `}
                                                        style={{
                                                            left: `${clip.start * PIXELS_PER_SECOND}px`,
                                                            width: `${clip.duration * PIXELS_PER_SECOND}px`,
                                                            border: '1px solid #5b6da0'
                                                        }}
                                                    >
                                                        {/* Left Handle - Touch Friendly */}
                                                        <div
                                                            className={`absolute -left-6 top-0 bottom-0 w-12 cursor-ew-resize z-50 flex items-center justify-center group/handle outline-none touch-none
                                                            ${selectedClipId === clip.id ? 'opacity-100' : 'opacity-0 hover:opacity-100'} transition-opacity
                                                        `}
                                                            onMouseDown={(e) => handleResizeStart(e, clip.id, 'audio', 'start', clip.start, clip.duration, (clip as any).sourceDuration)}
                                                            onTouchStart={(e) => {
                                                                e.preventDefault();
                                                                handleResizeStart(e, clip.id, 'audio', 'start', clip.start, clip.duration, (clip as any).sourceDuration);
                                                            }}
                                                        >
                                                            <div className="w-2 h-6 bg-white rounded shadow-lg border border-black/20" />
                                                        </div>

                                                        {/* Waveform Mock - Static & Angular */}
                                                        <div className="absolute inset-x-0 bottom-0 h-1/2 flex items-end opacity-30 px-1 pointer-events-none gap-0.5">
                                                            {Array.from({ length: 20 }).map((_, i) => (
                                                                <div key={i} className="flex-1 bg-indigo-200" style={{ height: `${30 + ((i % 3) * 20)}%` }} />
                                                            ))}
                                                        </div>
                                                        <div className="relative px-2 h-full flex items-start pt-1 pointer-events-none">
                                                            <span className="text-[9px] font-medium text-indigo-100 truncate shadow-black drop-shadow-md">Audio {trackIdx}</span>
                                                        </div>

                                                        {/* Right Handle - Touch Friendly */}
                                                        <div
                                                            className={`absolute -right-6 top-0 bottom-0 w-12 cursor-ew-resize z-50 flex items-center justify-center group/handle outline-none touch-none
                                                            ${selectedClipId === clip.id ? 'opacity-100' : 'opacity-0 hover:opacity-100'} transition-opacity
                                                        `}
                                                            onMouseDown={(e) => handleResizeStart(e, clip.id, 'audio', 'end', clip.start, clip.duration, (clip as any).sourceDuration)}
                                                            onTouchStart={(e) => {
                                                                e.preventDefault(); // Stop bubbling immediately
                                                                handleResizeStart(e, clip.id, 'audio', 'end', clip.start, clip.duration, (clip as any).sourceDuration);
                                                            }}
                                                        >
                                                            <div className="w-2 h-6 bg-white rounded shadow-lg border border-black/20" />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ))}
                                </div>



                            </div>

                            {/* Snap Line */}
                            {snapLine !== null && (
                                <div
                                    className="absolute top-0 bottom-0 w-px bg-yellow-400 z-40 pointer-events-none shadow-[0_0_10px_rgba(250,204,21,0.5)]"
                                    style={{ left: `${snapLine * PIXELS_PER_SECOND}px` }}
                                />
                            )}

                            {/* Razor Guide Line */}
                            {activeTool === 'razor' && razorLineX !== null && (
                                <div
                                    className="absolute top-0 bottom-0 w-px bg-rose-500 z-50 pointer-events-none border-l border-dashed border-rose-200"
                                    style={{ left: `${razorLineX}px` }}
                                >
                                    <div className="absolute top-8 -left-3 bg-rose-600/90 text-[9px] text-white px-1 py-0.5 rounded shadow-sm flex items-center justify-center">
                                        <Scissors className="w-3 h-3" />
                                    </div>
                                </div>
                            )}

                            {/* Playhead Line */}
                            <div
                                className="absolute top-0 bottom-0 w-px bg-white z-50 pointer-events-none"
                                style={{ left: `${currentTime * PIXELS_PER_SECOND}px` }}
                            >
                                <div className="absolute -top-0 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-white" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

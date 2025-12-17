import { Play, Pause, SkipBack, SkipForward, Scissors, Layers, Volume2, Type, Eye, EyeOff, VolumeX } from "lucide-react";
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
    selectedClipId?: string | null;
    onSelectClip?: (id: string | null) => void;
    // Track State
    videoTrackState?: Record<number, { muted: boolean, hidden: boolean }>;
    audioTrackState?: Record<number, { muted: boolean, hidden: boolean }>;
    onToggleTrackState?: (type: 'video' | 'audio', index: number, field: 'muted' | 'hidden' | 'locked') => void;

    // Mobile Drag Props
    externalDragItem?: { url: string, type: 'video' | 'audio', title: string } | null;
    onExternalDragEnd?: () => void;
}

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
    selectedClipId,
    onSelectClip,
    videoTrackState = {},
    audioTrackState = {},
    onToggleTrackState,
    externalDragItem,
    onExternalDragEnd
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
    const [draggedClipId, setDraggedClipId] = useState<{ id: string, type: 'video' | 'audio', offsetSeconds: number } | null>(null);
    const draggedClipRef = useRef<{ id: string, type: 'video' | 'audio', offsetSeconds: number } | null>(null);
    // Sync ref with state is manual in handlers to ensure speed.

    // Scrubbing State
    const [isScrubbing, setIsScrubbing] = useState(false);

    // Moving State (Manual Drag)

    const [moving, setMoving] = useState<{
        id: string;
        type: 'video' | 'audio';
        initialX: number;
        initialY: number;
        initialStart: number;
        trackIndex: number;
        originalTrackIndex: number;
    } | null>(null);

    // Resize State
    const [resizing, setResizing] = useState<{
        id: string;
        type: 'video' | 'audio';
        edge: 'start' | 'end';
        initialX: number;
        initialStart: number;
        initialDuration: number;
    } | null>(null);



    // Live Preview State (Where the clip will drop)
    const [dragPreview, setDragPreview] = useState<{ trackIndex: number, start: number, id: string, type: 'video' | 'audio', duration: number } | null>(null);

    // Snap Line State
    const [snapLine, setSnapLine] = useState<number | null>(null);

    // Handle EXTERNAL Touch Drop
    useEffect(() => {
        if (!externalDragItem) return;

        const handleExternalTouchEnd = (e: TouchEvent) => {
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

                    // Add Track
                    const newId = Math.random().toString(36).substr(2, 9);
                    const newTrack = {
                        id: newId,
                        url: externalDragItem.url,
                        type: externalDragItem.type,
                        start: dropTime,
                        duration: 5, // Default
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
            // Always clear drag state
            onExternalDragEnd && onExternalDragEnd();
        };

        window.addEventListener('touchend', handleExternalTouchEnd);
        return () => window.removeEventListener('touchend', handleExternalTouchEnd);
    }, [externalDragItem, videoTracks, audioTracks, onUpdateVideoTracks, onUpdateAudioTracks, onExternalDragEnd, PIXELS_PER_SECOND]);

    // Internal Drag Logic
    useEffect(() => {
        if (moving) {
            const handleMouseMove = (e: MouseEvent | TouchEvent) => {
                // IMPORTANT: Prevent scrolling while dragging
                if (e.cancelable) e.preventDefault();

                const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
                const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

                const deltaX = clientX - moving.initialX;
                const deltaY = clientY - moving.initialY;
                const deltaSeconds = deltaX / PIXELS_PER_SECOND;

                // 1. Calculate New Start Time
                let newStart = Math.max(0, moving.initialStart + deltaSeconds);

                // --- SNAP LOGIC ---
                const SNAP_THRESHOLD = 0.3; // seconds
                let bestSnapTime: number | null = null;
                let minDiff = SNAP_THRESHOLD;

                // Collect all snap points
                const allClips = [...videoTracks, ...audioTracks].filter(c => c.id !== moving.id);
                const snapPoints = [0];
                allClips.forEach(c => {
                    snapPoints.push(c.start);
                    snapPoints.push(c.start + c.duration);
                });

                for (const point of snapPoints) {
                    const diff = Math.abs(newStart - point);
                    if (diff < minDiff) {
                        minDiff = diff;
                        bestSnapTime = point;
                    }
                }

                if (bestSnapTime !== null) {
                    newStart = bestSnapTime;
                    setSnapLine(bestSnapTime);
                } else {
                    setSnapLine(null);
                }

                // 2. Calculate New Track Index (Vertical Drag)
                // Assuming Track Height is approx 64px (h-16) + margins
                const TRACK_HEIGHT = 64;
                const trackDiff = Math.round(deltaY / TRACK_HEIGHT);

                let newTrackIndex = moving.originalTrackIndex;

                if (moving.type === 'video') {
                    // Video Tracks are rendered in REVERSE order (Higher index on top).
                    // Moving mouse DOWN (positive deltaY) means going to LOWER track index.
                    // Moving mouse UP (negative deltaY) means going to HIGHER track index.
                    newTrackIndex = moving.originalTrackIndex - trackDiff;
                    // Clamp
                    if (newTrackIndex < 0) newTrackIndex = 0;
                    // Allow creating +1 new track
                    const maxTrack = Math.max(0, ...videoTracks.map(t => t.trackIndex || 0));
                    if (newTrackIndex > maxTrack + 1) newTrackIndex = maxTrack + 1;

                } else {
                    // Audio Tracks are rendered normally (Index 0 on top).
                    // Moving mouse DOWN (positive deltaY) means going to HIGHER track index.
                    newTrackIndex = moving.originalTrackIndex + trackDiff;
                    if (newTrackIndex < 0) newTrackIndex = 0;
                    const maxTrack = Math.max(0, ...audioTracks.map(t => t.trackIndex || 0));
                    if (newTrackIndex > maxTrack + 1) newTrackIndex = maxTrack + 1;
                }

                // Update CLIP Position LIVE
                if (moving.type === 'video') {
                    const clipIndex = videoTracks.findIndex(t => t.id === moving.id);
                    if (clipIndex !== -1) {
                        const newTracks = [...videoTracks];
                        newTracks[clipIndex].start = newStart;
                        if (newTracks[clipIndex].trackIndex !== newTrackIndex) {
                            newTracks[clipIndex].trackIndex = newTrackIndex;
                        }
                        onUpdateVideoTracks(newTracks);
                    }
                } else {
                    const clipIndex = audioTracks.findIndex(t => t.id === moving.id);
                    if (clipIndex !== -1) {
                        const newTracks = [...audioTracks];
                        newTracks[clipIndex].start = newStart;
                        if (newTracks[clipIndex].trackIndex !== newTrackIndex) {
                            newTracks[clipIndex].trackIndex = newTrackIndex;
                        }
                        onUpdateAudioTracks && onUpdateAudioTracks(newTracks);
                    }
                }
            };

            const handleMouseUp = () => {
                setMoving(null);
                setSnapLine(null);
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
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

        if (resizing) {

            const handleMouseMove = (e: MouseEvent) => {
                const deltaX = e.clientX - resizing.initialX;
                const deltaSeconds = deltaX / PIXELS_PER_SECOND;

                // Calculate raw target times first
                let rawNewStart = resizing.initialStart;
                let rawNewDuration = resizing.initialDuration;
                let activeEdgeTime = 0;

                if (resizing.edge === 'start') {
                    rawNewStart = Math.min(Math.max(0, resizing.initialStart + deltaSeconds), resizing.initialStart + resizing.initialDuration - 0.1);
                    rawNewDuration = Math.max(0.1, resizing.initialDuration - (rawNewStart - resizing.initialStart));
                    activeEdgeTime = rawNewStart;
                } else {
                    rawNewDuration = Math.max(0.1, resizing.initialDuration + deltaSeconds);
                    activeEdgeTime = resizing.initialStart + rawNewDuration;
                }

                // SNAP LOGIC
                const SNAP_THRESHOLD = 0.3; // seconds
                let bestSnapTime: number | null = null;
                let minDiff = SNAP_THRESHOLD;

                // Collect all snap points (start and end of ALL other clips)
                const allClips = [...videoTracks, ...audioTracks].filter(c => c.id !== resizing.id);
                const snapPoints = [0]; // Always snap to 0
                allClips.forEach(c => {
                    snapPoints.push(c.start);
                    snapPoints.push(c.start + c.duration);
                });

                // Find closest snap point
                for (const point of snapPoints) {
                    const diff = Math.abs(activeEdgeTime - point);
                    if (diff < minDiff) {
                        minDiff = diff;
                        bestSnapTime = point;
                    }
                }

                // Apply Snap
                let finalStart = rawNewStart;
                let finalDuration = rawNewDuration;

                if (bestSnapTime !== null) {
                    setSnapLine(bestSnapTime);
                    if (resizing.edge === 'start') {
                        // Adjust start to snap point, maintain end point if possible or just adjust start
                        // If moving start, end stays fixed in time (usually). 
                        // New Start = Snap Point. 
                        // Previous End = initialStart + initialDuration.
                        // New Duration = Previous End - New Start.
                        const originalEndTime = resizing.initialStart + resizing.initialDuration;
                        finalStart = bestSnapTime;
                        finalDuration = originalEndTime - finalStart;
                    } else {
                        // Moving end. Start stays fixed.
                        // New End = Snap Point.
                        // New Duration = Snap Point - Start.
                        finalDuration = bestSnapTime - resizing.initialStart;
                    }
                } else {
                    setSnapLine(null);
                }

                // Apply changes to tracks
                if (resizing.type === 'video') {
                    const clipIndex = videoTracks.findIndex(t => t.id === resizing.id);
                    if (clipIndex === -1) return;
                    const newTracks = [...videoTracks];
                    const clip = newTracks[clipIndex];

                    // Safety check
                    if (finalDuration < 0.1) finalDuration = 0.1;

                    clip.start = finalStart;
                    clip.duration = finalDuration;
                    onUpdateVideoTracks(newTracks);

                } else {
                    const clipIndex = audioTracks.findIndex(t => t.id === resizing.id);
                    if (clipIndex === -1) return;
                    const newTracks = [...audioTracks];
                    const clip = newTracks[clipIndex];

                    if (finalDuration < 0.1) finalDuration = 0.1;

                    clip.start = finalStart;
                    clip.duration = finalDuration;
                    onUpdateAudioTracks && onUpdateAudioTracks(newTracks);
                }
            };

            const handleMouseUp = () => {
                setResizing(null);
                setSnapLine(null);
            };

            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            window.addEventListener('touchmove', handleMouseMove as any, { passive: false });
            window.addEventListener('touchend', handleMouseUp);
            // Also need to handle touchcancel
            window.addEventListener('touchcancel', handleMouseUp);

            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
                window.removeEventListener('touchmove', handleMouseMove as any);
                window.removeEventListener('touchend', handleMouseUp);
                window.removeEventListener('touchcancel', handleMouseUp);
            };
        }
    }, [resizing, moving, videoTracks, audioTracks, onUpdateVideoTracks, onUpdateAudioTracks, PIXELS_PER_SECOND]);

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
    const handleMoveStart = (e: React.MouseEvent | React.TouchEvent, clipId: string, type: 'video' | 'audio', start: number, trackIndex: number) => {
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

    const handleResizeStart = (e: React.MouseEvent | React.TouchEvent, id: string, type: 'video' | 'audio', edge: 'start' | 'end', start: number, duration: number) => {
        e.stopPropagation();
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;

        setResizing({
            id,
            type,
            edge,
            initialX: clientX,
            initialStart: start,
            initialDuration: duration
        });
    };

    const handleDragStart = (e: React.DragEvent, clipId: string, type: 'video' | 'audio', duration: number, trackIndex: number) => {
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

    return (
        <div className="h-full flex flex-col bg-[#1e1e1e] border-t border-[#333] relative">
            {/* DEBUG OVERLAY - PURPLE CONFIRMS UPDATE */}
            <div className="absolute top-0 right-0 z-50 bg-purple-900/90 text-white text-[10px] p-2 pointer-events-none font-mono">
                <div>BUILD UPDATED</div>
                {logs.map((l, i) => <div key={i}>{l}</div>)}
            </div>

            {/* 1. Toolbar (Top) */}
            <div className="h-10 border-b border-[#333] flex items-center justify-between px-4 bg-[#1e1e1e] shrink-0 z-30">
                <div className="flex items-center gap-2 text-zinc-400">
                    <button className="p-1.5 hover:text-white hover:bg-white/10 rounded"><Scissors className="w-4 h-4" /></button>
                    <button className="p-1.5 hover:text-white hover:bg-white/10 rounded"><Layers className="w-4 h-4" /></button>
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
                    <span>{new Date(currentTime * 1000).toISOString().substr(11, 8)}</span>
                    <span className="text-zinc-700">/</span>
                    <span>{new Date(duration * 1000).toISOString().substr(11, 8)}</span>
                </div>
            </div>

            {/* 2. Main Split View (Headers | Tracks) */}
            <div className="flex-1 flex min-h-0 overflow-hidden relative">

                {/* LEFT: Track Headers (Fixed Width) */}
                <div ref={headerContainerRef} className="w-[120px] bg-[#1e1e1e] border-r border-[#333] flex flex-col shrink-0 z-20 mt-[24px] overflow-hidden" /* mt-6 matches timeline ruler height */>
                    <div className="flex-1 overflow-hidden flex flex-col py-4 space-y-4"> {/* Padding matches timeline content padding */}

                        {/* Video Headers (Reverse Order: Top Layer First) */}
                        <div className="flex flex-col gap-1">
                            {videoLayers.map(trackIdx => (
                                <div key={`vheader-${trackIdx}`} className="h-16 flex flex-col justify-center px-2 relative group">
                                    <div className="flex items-center justify-between text-zinc-500 mb-1">
                                        <span className="text-[10px] font-bold text-teal-500/80">V{trackIdx}</span>
                                        {/* Status Indicators (Mini) */}
                                        <div className="flex gap-1 opacity-50">
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
                    }}
                >
                    <div
                        className="h-full relative flex flex-col min-w-full"
                        style={{ width: `${timelineWidth}px` }}
                    >
                        {/* Time Ruler */}
                        <div
                            className="h-6 border-b border-[#333] flex items-end text-[9px] text-zinc-500 font-mono select-none bg-[#1e1e1e] sticky top-0 z-10 w-full cursor-col-resize hover:bg-[#252525]"
                            onMouseDown={(e) => {
                                // Start Scrubbing
                                if (isPlaying) onTogglePlay(); // Pause if playing
                                setIsScrubbing(true);

                                // Initial Seek
                                const rect = e.currentTarget.getBoundingClientRect();
                                const clickX = e.clientX - rect.left + e.currentTarget.scrollLeft;
                                // Note: currentTarget is the sticky header. We need global offset relative to scrollContainer.
                                // Actually, simpler: e.nativeEvent.offsetX is relative to the target (Ruler div). 
                                // Since Ruler div spans the FULL width (min-w-full), offsetX is correct map to time.
                                const newTime = (e.nativeEvent.offsetX / PIXELS_PER_SECOND);
                                onSeek(Math.min(Math.max(0, newTime), Math.max(duration, newTime)));
                            }}
                            onTouchStart={(e) => {
                                if (isPlaying) onTogglePlay();
                                setIsScrubbing(true);
                                // Initial touch logic handled by move/click usually, 
                                // but for instant reaction we can calculate here if needed.
                                // Let's rely on the Move effect for continuous updates.
                            }}
                        >
                            {Array.from({ length: Math.ceil(visualDuration / 5) }).map((_, i) => (
                                <div key={i} className="absolute bottom-0 flex items-end pb-1 border-l border-[#333]" style={{ left: `${i * 5 * PIXELS_PER_SECOND}px`, height: '50%' }}>
                                    <span className="pl-1 text-zinc-600">{i * 5}s</span>
                                </div>
                            ))}
                        </div>

                        {/* Tracks Content */}
                        <div className="p-4 pt-4 space-y-4 flex-1">

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
                                                    onMouseDown={(e) => handleMoveStart(e, clip.id, 'video', clip.start, trackIdx)}
                                                    onTouchStart={(e) => handleMoveStart(e, clip.id, 'video', clip.start, trackIdx)}
                                                    onClick={(e) => {
                                                        // Selection handles in MoveStart now
                                                        e.stopPropagation();
                                                    }}
                                                    // CAPCUT STYLE: Teal/Cyber colors
                                                    className={`absolute top-0.5 bottom-0.5 rounded-sm overflow-hidden cursor-move active:cursor-grabbing clip-item z-10 select-none group
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
                                                    {/* Left Handle */}
                                                    <div
                                                        className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/50 z-30 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        onMouseDown={(e) => handleResizeStart(e, clip.id, 'video', 'start', clip.start, clip.duration)}
                                                        onTouchStart={(e) => handleResizeStart(e, clip.id, 'video', 'start', clip.start, clip.duration)}
                                                    />

                                                    {/* Thumbnails Strip (Mock) */}
                                                    <div className="absolute inset-0 opacity-20 flex overflow-hidden pointer-events-none">
                                                        {Array.from({ length: Math.ceil(clip.duration / 5) }).map((_, i) => (
                                                            <div key={i} className="flex-1 border-r border-black/20 bg-emerald-900/50" />
                                                        ))}
                                                    </div>
                                                    <div className="relative px-2 h-full flex items-center pointer-events-none">
                                                        <span className="text-[10px] font-medium text-teal-100 truncate drop-shadow-md">{clip.id}</span>
                                                    </div>

                                                    {/* Right Handle */}
                                                    <div
                                                        className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/50 z-30 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        onMouseDown={(e) => handleResizeStart(e, clip.id, 'video', 'end', clip.start, clip.duration)}
                                                        onTouchStart={(e) => handleResizeStart(e, clip.id, 'video', 'end', clip.start, clip.duration)}
                                                    />
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
                                                    onMouseDown={(e) => handleMoveStart(e, clip.id, 'audio', clip.start, trackIdx)}
                                                    onTouchStart={(e) => handleMoveStart(e, clip.id, 'audio', clip.start, trackIdx)}
                                                    onClick={(e) => {
                                                        // Selection handled in MoveStart
                                                        e.stopPropagation();
                                                    }}
                                                    // CAPCUT STYLE: Blue colors
                                                    className={`absolute top-0.5 bottom-0.5 rounded-sm overflow-hidden cursor-move active:cursor-grabbing clip-item z-10 select-none group
                                                        ${selectedClipId === clip.id ? 'ring-2 ring-white z-20' : ''}
                                                        ${draggedClipId?.id === clip.id ? 'opacity-50' : 'opacity-100'}
                                                        `}
                                                    style={{
                                                        left: `${clip.start * PIXELS_PER_SECOND}px`,
                                                        width: `${clip.duration * PIXELS_PER_SECOND}px`,
                                                        backgroundColor: '#1E3A5E', // Navy Blue
                                                        border: '1px solid #2A4A7A'
                                                    }}
                                                >
                                                    {/* Left Handle */}
                                                    <div
                                                        className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/50 z-30 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        onMouseDown={(e) => handleResizeStart(e, clip.id, 'audio', 'start', clip.start, clip.duration)}
                                                        onTouchStart={(e) => handleResizeStart(e, clip.id, 'audio', 'start', clip.start, clip.duration)}
                                                    />

                                                    {/* Waveform Mock */}
                                                    <div className="absolute inset-x-0 bottom-0 h-1/2 flex items-end gap-px opacity-50 px-1 pointer-events-none">
                                                        {Array.from({ length: 20 }).map((_, i) => (
                                                            <div key={i} className="flex-1 bg-indigo-300" style={{ height: `${Math.random() * 80 + 20}%` }} />
                                                        ))}
                                                    </div>
                                                    <div className="relative px-2 h-full flex items-start pt-1 pointer-events-none">
                                                        <span className="text-[9px] font-medium text-indigo-100 truncate shadow-black drop-shadow-md">Audio {trackIdx}</span>
                                                    </div>

                                                    {/* Right Handle */}
                                                    <div
                                                        className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/50 z-30 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        onMouseDown={(e) => handleResizeStart(e, clip.id, 'audio', 'end', clip.start, clip.duration)}
                                                        onTouchStart={(e) => handleResizeStart(e, clip.id, 'audio', 'end', clip.start, clip.duration)}
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>

                            {/* Subtitles Track */}
                            {script.length > 0 && (
                                <div className="h-8 mt-4 relative w-full">
                                    {script.map((scene, i) => (
                                        <div
                                            key={i}
                                            className="absolute top-0.5 bottom-0.5 rounded-sm bg-[#5E2A1E] border border-[#7A3A2A] flex items-center justify-center px-2 cursor-pointer hover:brightness-110"
                                            style={{
                                                left: `${(i * 3) * PIXELS_PER_SECOND}px`,
                                                width: `${3 * PIXELS_PER_SECOND}px`
                                            }}
                                        >
                                            <span className="text-[9px] text-orange-100 truncate">{scene.text}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                        </div>

                        {/* Snap Guide Line */}
                        {snapLine !== null && (
                            <div
                                className="absolute top-0 bottom-0 w-px bg-yellow-400 z-[100] pointer-events-none shadow-[0_0_10px_rgba(250,204,21,0.8)]"
                                style={{ left: `${snapLine * PIXELS_PER_SECOND}px` }}
                            >
                                <div className="absolute top-0 -translate-x-1/2 text-[9px] bg-yellow-400 text-black px-1 rounded-b font-bold">
                                    SNAP
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
    );
}

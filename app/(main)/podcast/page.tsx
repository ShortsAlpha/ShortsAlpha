"use client"

import { AutoShortsView } from "@/components/AutoShortsView"
import { useRouter } from "next/navigation"
import { useProject } from "@/components/providers/project-provider"

export default function PodcastPage() {
    const router = useRouter()
    const { setProjectData } = useProject()

    const handleAnalyze = (result: any) => {
        console.log("Analysis Result:", result);

        let multiCamTracks: any[] = [];

        if (result.multiCamTracks) {
            // EDIT MODE SELECTOR:
            // 'focus' = Active Speaker (Cuts)
            // 'split' = Split Screen (Grid)
            const isFocusMode = result.layout === 'focus';
            const segments = result.diarization || [];

            if (isFocusMode && segments.length > 0) {
                // MODE: Active Speaker Focus
                // Dynamic cuts based on diarization
                console.log("Applying Active Speaker Edit...", segments);

                segments.forEach((seg: any, idx: number) => {
                    // Determine Speaker
                    const label = String(seg.speaker).toLowerCase();
                    const isRight = label.includes('b') || label.includes('1') || label.includes('right');

                    // SEAMLESS FIX: Always use Track 0 to keep the same Video Element mounted.
                    // Visual distinction is handled solely by 'trackingData' (Crop).
                    const trackIndex = 0;

                    const start = parseFloat(seg.start);
                    const end = parseFloat(seg.end);
                    const duration = end - start;

                    multiCamTracks.push({
                        id: `cut_${idx}_${trackIndex}`,
                        url: result.url,
                        type: 'video',
                        start: start,
                        offset: start,
                        duration: duration,
                        trackIndex: trackIndex,
                        volume: 1.0,
                        scale: 1.05,
                        trackingData: isRight ? result.multiCamTracks.right : result.multiCamTracks.left,
                        style: { width: '100%', height: '100%', x: '0%', y: '0%', zIndex: idx }
                    });
                });

                // Correction for Sync
                multiCamTracks = multiCamTracks.map(c => ({ ...c }));

            } else if (isFocusMode) {
                // SYNTHETIC SWITCHING: Cut every 4.0 seconds (User Preference)
                // FORCE: If diarization fails, we MUST cut to keep the video dynamic.
                console.warn("Active Speaker: No Diarization found. Using Synthetic 4.0s Cuts.");

                // RE-FOCUS LOGIC (2s check, 4s switch)
                const cutDuration = 2.0;
                const totalDuration = result.duration || 60;
                let currentTime = 0;
                let toggle = 0; // 0 = Left, 1 = Right
                let subClipCount = 0;

                // SMART FACE DETECTION LOGIC
                const allFaces = result.multiCamTracks?.left || [];
                // 2. Identify "Left Side" speakers (x < 0.5) and "Right Side" speakers (x >= 0.5)
                // REVERT OVERLAP: Strict split is safer to avoid averaging Left+Right speakers into "Center" empty space.
                const leftFaces = allFaces.filter((d: any) => d && d.x < 0.5);
                const rightFaces = allFaces.filter((d: any) => d && d.x >= 0.5);

                const leftXs = leftFaces.map((d: any) => d.x);
                const rightXs = rightFaces.map((d: any) => d.x);

                const leftYs = leftFaces.map((d: any) => d.y);
                const rightYs = rightFaces.map((d: any) => d.y);

                const getMedian = (arr: number[]) => {
                    if (arr.length === 0) return null;
                    const sorted = [...arr].sort((a, b) => a - b);
                    return sorted[Math.floor(sorted.length / 2)];
                };

                const globalLeftX = getMedian(leftXs);
                const globalRightX = getMedian(rightXs);

                // Y-Axis Medians (Vertical Center of Face)
                const globalLeftY = getMedian(leftYs);
                const globalRightY = getMedian(rightYs);

                // Fallback defaults (ORIGINAL)
                const fallbackLeftX = globalLeftX !== null ? globalLeftX : 0.25;
                const fallbackRightX = globalRightX !== null ? globalRightX : 0.75;

                // Y-Axis Fallback: 0.35 (Top Third) is much safer for faces than 0.50 (Center)
                // If we miss the face, aim high, not at the feet.
                // Y-Axis Fallback: 0.20 (High Top)
                // 0.35 was showing feet. 0.20 forces the camera to look UP at the heads.
                const fallbackLeftY = globalLeftY !== null ? globalLeftY : 0.20;
                const fallbackRightY = globalRightY !== null ? globalRightY : 0.20;

                // START ZOOM: Use a balanced portrait crop (1.60)
                // 1.50 was allowing knees. 1.60 combined with Y=0.22 clamp ensures we only see waist-up.
                let currentScale = 1.60;


                while (currentTime < totalDuration) {
                    const nextTime = Math.min(currentTime + cutDuration, totalDuration);
                    const dur = nextTime - currentTime;

                    // SEAMLESS FIX: Always Track 0
                    const trackIndex = 0;
                    const isRight = toggle === 1;
                    // Safe ID
                    const safeTimeId = currentTime.toFixed(1).replace('.', '_');

                    // 1. DETERMINE SPEAKER (Every 4s block)
                    if (subClipCount === 0) {
                        // Fixed Zoom (Reverted Adaptive)
                        currentScale = 1.60;
                    }

                    // 2. FINE-GRAINED TRACKING (Local Analysis)
                    const localFaces = allFaces.filter((d: any) => d.t >= currentTime && d.t < nextTime);
                    // Get faces for CURRENT side (STRICT SPLIT REVERTED)
                    const relevantFaces = localFaces.filter((d: any) => isRight ? d.x >= 0.5 : d.x < 0.5);

                    const localMedianX = getMedian(relevantFaces.map((d: any) => d.x));
                    const localMedianY = getMedian(relevantFaces.map((d: any) => d.y));

                    // TARGET SELECTION: Use local -> global -> fallback
                    // X AXIS
                    let rawTargetX = localMedianX !== null ? localMedianX : (isRight ? fallbackRightX : fallbackLeftX);

                    // PODCAST BIAS REMOVED: Trust Gemini 2.5 Pro.
                    // Strict split (0.5) is enough.
                    // If we clamp, we might cut off a person sitting slightly central (40%).
                    let targetX = rawTargetX;

                    // Y AXIS
                    let rawTargetY = localMedianY !== null ? localMedianY : (isRight ? fallbackRightY : fallbackLeftY);
                    // FORCE HIGH FOCUS: Clamp Y to max 0.22.
                    // 0.35 allowed knees. 0.22 forces focus on FACE/NECK.
                    // View Range (1.6x): Top to ~53% (Waist). Legs are geometrically impossible to see.
                    let targetY = Math.min(rawTargetY, 0.22);

                    const forcedTracking = [{ x: targetX, y: targetY }];

                    multiCamTracks.push({
                        id: `cut_synth_${safeTimeId}_${trackIndex}`,
                        url: result.url,
                        type: 'video',
                        start: currentTime,
                        // MISSING OFFSET FIX: Without this, video restarts from 0 each clip!
                        offset: currentTime,
                        duration: dur,
                        trackIndex: trackIndex,
                        volume: 1.0,
                        scale: currentScale, // DYNAMIC ZOOM
                        trackingData: forcedTracking,
                        style: { width: '100%', height: '100%', x: '0%', y: '0%', zIndex: 1 }
                    });

                    currentTime = nextTime;

                    // Logic to toggle every 2 clips
                    subClipCount++;
                    if (subClipCount >= 2) {
                        subClipCount = 0;
                        toggle = 1 - toggle;
                    }
                }
            } else {
                // Fallback to Split Screen
                multiCamTracks.push({
                    id: `cam_left_${Date.now()}`,
                    url: result.url,
                    type: 'video',
                    start: 0,
                    duration: result.duration,
                    trackIndex: 0,
                    volume: 1.0,
                    scale: 1.4,
                    trackingData: result.multiCamTracks.left,
                    style: { width: 'auto', height: '50%', x: '0%', y: '0%' }
                });
                multiCamTracks.push({
                    id: `cam_right_${Date.now()}`,
                    url: result.url,
                    type: 'video',
                    start: 0,
                    duration: result.duration,
                    trackIndex: 1,
                    volume: 0,
                    scale: 1.4,
                    trackingData: result.multiCamTracks.right,
                    style: { width: 'auto', height: '50%', x: '0%', y: '50%' }
                });
            }

            const autoShortsScript = {
                script: [],
                metadata: {
                    projectType: 'podcast',
                    mainVideo: {
                        id: `main_vid_${Date.now()}`,
                        url: result.url,
                        duration: result.duration,
                    },
                    multiCamTracks: multiCamTracks.length > 0 ? multiCamTracks : undefined,
                    analysis: result
                }
            };

            setProjectData({ analysisResult: autoShortsScript });
            router.push('/studio');
        }
    }

    return (
        <div className="flex-1 p-6 md:p-12 overflow-y-auto h-screen">
            <AutoShortsView
                onBack={() => router.push('/home')}
                onAnalyze={handleAnalyze}
            />
        </div>
    )
}

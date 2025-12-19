// Singleton AudioContext to prevent hitting browser limits (max 6 usually)
let sharedAudioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
    if (!sharedAudioContext) {
        sharedAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return sharedAudioContext;
}

/**
 * Extracts a sequence of peak values (0.0 to 1.0) from an audio URL.
 * @param audioUrl URL of the audio file
 * @param samples Number of total bars to generate (resolution)
 * @returns Array of normalized amplitude values
 */
export async function extractAudioPeaks(audioUrl: string, samples: number = 100): Promise<number[]> {
    try {
        // Use local proxy to bypass CORS issues on external storage
        const proxyUrl = `/api/audio-proxy?url=${encodeURIComponent(audioUrl)}`;

        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error("Network response was not ok");

        const arrayBuffer = await response.arrayBuffer();

        const audioContext = getAudioContext();
        // Decode can be CPU intensive, but doing it on the shared context is standard
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        const rawData = audioBuffer.getChannelData(0); // Use first channel
        const blockSize = Math.floor(rawData.length / samples);
        const peaks = [];

        for (let i = 0; i < samples; i++) {
            const start = i * blockSize;
            let sum = 0;
            // Root Mean Square (RMS) for better volume perception
            for (let j = 0; j < blockSize; j++) {
                sum += rawData[start + j] * rawData[start + j];
            }
            const rms = Math.sqrt(sum / blockSize);
            peaks.push(rms);
        }

        // Normalize to 0-1 range with a boost for visibility
        const max = Math.max(...peaks);
        const output = peaks.map(p => {
            if (max === 0) return 0;
            const norm = p / max;
            // Apply non-linear boost (sqrt) to make quiet sounds more visible
            return Math.sqrt(norm);
        });

        return output;
    } catch (e) {
        console.warn(`Waveform extraction failed for ${audioUrl}:`, e);
        // Fallback: Return 0 (Silence) so it doesn't look like a glitchy fake waveform.
        return Array(samples).fill(0);
    }
}

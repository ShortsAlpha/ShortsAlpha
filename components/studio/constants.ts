
// Helper to generate smooth text outlines using text-shadow (avoids blocky WebkitTextStroke)
export function generateSmoothStroke(width: number, color: string) {
    if (width <= 0) return 'none';
    const layers = [];
    const steps = 16; // 16 angles for smoothness
    // Create multiple rings for thickness
    for (let r = 1; r <= width; r++) {
        for (let i = 0; i < steps; i++) {
            const angle = (i * 2 * Math.PI) / steps;
            const x = Math.round(Math.cos(angle) * r * 10) / 10;
            const y = Math.round(Math.sin(angle) * r * 10) / 10;
            layers.push(`${x}px ${y}px 0 ${color}`);
        }
    }
    return layers.join(', ');
}

export const FONT_FAMILIES = [
    { name: 'Inter', value: 'Inter' },
    { name: 'Roboto', value: 'Roboto' },
    { name: 'Montserrat', value: 'Montserrat' },
    { name: 'Open Sans', value: 'Open Sans' },
    { name: 'Lato', value: 'Lato' },
    { name: 'Oswald', value: 'Oswald' },
    { name: 'Raleway', value: 'Raleway' },
    { name: 'Poppins', value: 'Poppins' },
    { name: 'Bebas Neue', value: 'Bebas Neue' },
    { name: 'Anton', value: 'Anton' },
];

export const SUBTITLE_PRESETS = [
    // --- STROKED & SHADOWED (The "Viral" Look) ---
    {
        id: 'capcut-yellow',
        name: 'Viral Yellow',
        style: {
            color: '#FFD700', // Gold/Yellow
            fontSize: 48,
            fontWeight: '900',
            stroke: '#000000',
            strokeWidth: 6,
            shadow: '4px 4px 0px rgba(0,0,0,1)', // Hard black shadow
            backgroundColor: 'transparent',
            fontFamily: 'Montserrat',
            textTransform: 'uppercase'
        },
        previewBg: '#1e1e1e'
    },
    {
        id: 'capcut-white',
        name: 'Classic White',
        style: {
            color: '#FFFFFF',
            fontSize: 48,
            fontWeight: '900',
            stroke: '#000000',
            strokeWidth: 6,
            shadow: '4px 4px 0px rgba(0,0,0,0.8)',
            backgroundColor: 'transparent',
            fontFamily: 'Montserrat',
            textTransform: 'uppercase'
        },
        previewBg: '#555'
    },
    {
        id: 'capcut-black',
        name: 'Bold Black',
        style: {
            color: '#000000',
            fontSize: 48,
            fontWeight: '900',
            stroke: '#FFFFFF',
            strokeWidth: 6,
            shadow: '4px 4px 0px rgba(255,255,255,0.4)',
            backgroundColor: 'transparent',
            fontFamily: 'Montserrat',
            textTransform: 'uppercase'
        },
        previewBg: '#333'
    },
    {
        id: 'capcut-red',
        name: 'Impact Red',
        style: {
            color: '#EF4444', // Red-500
            fontSize: 52,
            fontWeight: '900',
            stroke: '#FFFFFF',
            strokeWidth: 6,
            shadow: '3px 3px 0px #000000',
            backgroundColor: 'transparent',
            fontFamily: 'Anton',
            textTransform: 'uppercase'
        },
        previewBg: '#111'
    },
    {
        id: 'capcut-blue',
        name: 'Electric Blue',
        style: {
            color: '#3B82F6', // Blue-500
            fontSize: 48,
            fontWeight: '900',
            stroke: '#FFFFFF',
            strokeWidth: 6,
            shadow: '3px 3px 0px #000000',
            backgroundColor: 'transparent',
            fontFamily: 'montserrat',
            textTransform: 'uppercase'
        },
        previewBg: '#111'
    },
    {
        id: 'capcut-green',
        name: 'Money Green',
        style: {
            color: '#22C55E', // Green-500
            fontSize: 48,
            fontWeight: '900',
            stroke: '#000000',
            strokeWidth: 6,
            shadow: '0px 0px 20px rgba(34, 197, 94, 0.6)', // Glowish
            backgroundColor: 'transparent',
            fontFamily: 'Montserrat',
            textTransform: 'uppercase'
        },
        previewBg: '#111'
    },

    // --- BOXED STYLES ---
    {
        id: 'box-black-bg',
        name: 'Black Box',
        style: {
            color: '#FFFFFF',
            fontSize: 32,
            fontWeight: '700',
            stroke: 'none',
            strokeWidth: 0,
            shadow: 'none',
            backgroundColor: '#000000',
            borderRadius: '8px',
            padding: '8px 16px', // Renderer logic might need to support padding if possible, or we rely on font spacing
            fontFamily: 'Roboto',
            textTransform: 'none'
        },
        previewBg: '#888'
    },
    {
        id: 'box-white-bg',
        name: 'White Box',
        style: {
            color: '#000000',
            fontSize: 32,
            fontWeight: '700',
            stroke: 'none',
            strokeWidth: 0,
            shadow: 'none',
            backgroundColor: '#FFFFFF',
            borderRadius: '8px',
            fontFamily: 'Roboto',
            textTransform: 'none'
        },
        previewBg: '#333'
    },
    {
        id: 'box-purple-bg',
        name: 'Vibe Box',
        style: {
            color: '#FFFFFF',
            fontSize: 36,
            fontWeight: '800',
            stroke: 'none',
            strokeWidth: 0,
            shadow: '4px 4px 0px rgba(0,0,0,0.4)',
            backgroundColor: '#8B5CF6', // Violet-500
            borderRadius: '12px',
            fontFamily: 'Poppins',
            textTransform: 'uppercase'
        },
        previewBg: '#111'
    },
    {
        id: 'neon-glow-cyan',
        name: 'Neon Cyan',
        style: {
            color: '#06b6d4', // Cyan-500
            fontSize: 48,
            fontWeight: 'bold',
            stroke: '#FFFFFF',
            strokeWidth: 2,
            shadow: '0 0 15px #06b6d4',
            backgroundColor: 'transparent',
            fontFamily: 'Oswald',
            textTransform: 'uppercase'
        },
        previewBg: '#000'
    },
];

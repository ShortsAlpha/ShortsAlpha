
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
    {
        id: 'classic-white',
        name: 'Classic',
        style: {
            color: '#FFFFFF',
            fontSize: 32,
            fontWeight: '800', // Extra Bold
            stroke: '#000000',
            strokeWidth: 4, // Thicker stroke (Hormozi standard)
            shadow: '2px 2px 0px #000000', // Sharp shadow
            backgroundColor: 'transparent',
            fontFamily: 'Montserrat'
        },
        previewBg: '#333'
    },
    {
        id: 'hormozi-yellow',
        name: 'Hormozi',
        style: {
            color: '#FFD700',
            fontSize: 36,
            fontWeight: '900',
            stroke: '#000000',
            strokeWidth: 4,
            shadow: '4px 4px 0px #000000', // Hard drop shadow
            backgroundColor: 'transparent',
            fontFamily: 'Anton'
        },
        previewBg: '#333'
    },
    {
        id: 'clean-black',
        name: 'Clean',
        style: {
            color: '#000000',
            fontSize: 30,
            fontWeight: '800',
            stroke: '#FFFFFF',
            strokeWidth: 3,
            shadow: 'none',
            backgroundColor: 'transparent',
            fontFamily: 'Roboto'
        },
        previewBg: '#888'
    },
    {
        id: 'neon-green',
        name: 'Neon',
        style: {
            color: '#00FF00',
            fontSize: 28,
            fontWeight: 'bold',
            stroke: 'none',
            strokeWidth: 0,
            shadow: '0 0 8px #00FF00, 0 0 16px #00FF00', // Stronger glow
            backgroundColor: 'transparent',
            fontFamily: 'Montserrat'
        },
        previewBg: '#111'
    },
    {
        id: 'red-alert',
        name: 'Alert',
        style: {
            color: '#FF0000',
            fontSize: 36,
            fontWeight: '900',
            stroke: '#FFFFFF',
            strokeWidth: 3,
            shadow: '4px 4px 0px #000000',
            backgroundColor: 'transparent',
            fontFamily: 'Bebas Neue'
        },
        previewBg: '#111'
    },
    {
        id: 'box-black',
        name: 'Boxed',
        style: {
            color: '#FFFFFF',
            fontSize: 24,
            fontWeight: '600',
            stroke: 'none',
            strokeWidth: 0,
            shadow: 'none',
            backgroundColor: '#000000',
            borderRadius: '8px',
            padding: '8px 16px',
            fontFamily: 'Inter'
        },
        previewBg: '#888'
    },
    {
        id: 'karaoke-blue',
        name: 'Karaoke',
        style: {
            color: '#00FFFF',
            fontSize: 30,
            fontWeight: 'bold',
            stroke: '#000080',
            strokeWidth: 3,
            shadow: '3px 3px 0px #000080',
            backgroundColor: 'transparent',
            fontFamily: 'Poppins'
        },
        previewBg: '#111'
    },
    {
        id: 'minimal-grey',
        name: 'Minimal',
        style: {
            color: '#F0F0F0',
            fontSize: 24,
            fontWeight: '500',
            stroke: 'none',
            strokeWidth: 0,
            shadow: '0px 1px 2px rgba(0,0,0,0.5)',
            backgroundColor: 'transparent',
            fontFamily: 'Raleway'
        },
        previewBg: '#333'
    }
];

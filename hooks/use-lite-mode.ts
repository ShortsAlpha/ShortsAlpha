import { useState, useEffect } from 'react';

export function useLiteMode() {
    const [isLiteMode, setIsLiteMode] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem('shorts-alpha-lite-mode');
        if (saved) {
            setIsLiteMode(JSON.parse(saved));
        }
    }, []);

    const toggleLiteMode = () => {
        const newVal = !isLiteMode;
        setIsLiteMode(newVal);
        localStorage.setItem('shorts-alpha-lite-mode', JSON.stringify(newVal));
    };

    return { isLiteMode, toggleLiteMode };
}

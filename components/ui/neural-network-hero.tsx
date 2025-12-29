import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';

import { useLiteMode } from '@/hooks/use-lite-mode';
import { ShaderBackground } from '@/components/ui/shader-background';
import { GlassNavbar } from '@/components/ui/glass-navbar';

// Ensure GSAP plugins are registered
try {
    gsap.registerPlugin(useGSAP);
} catch (e) {
    console.warn("GSAP Plugin registration failed", e);
}

// ===================== HERO =====================
interface HeroProps {
    title: string;
    description: string;
    badgeText?: string;
    badgeLabel?: string;
    ctaButtons?: Array<{ text: string; href: string; primary?: boolean }>;
    microDetails?: Array<string>;
}

export default function Hero({
    title,
    description,
    badgeText,
    badgeLabel,
    ctaButtons = [
        { text: "Get started", href: "#get-started", primary: true },
        { text: "View showcase", href: "#showcase" }
    ],
    microDetails
}: HeroProps) {
    const { isLiteMode, toggleLiteMode } = useLiteMode();

    const sectionRef = useRef<HTMLElement | null>(null);
    const headerRef = useRef<HTMLHeadingElement | null>(null);
    const paraRef = useRef<HTMLParagraphElement | null>(null);
    const ctaRef = useRef<HTMLDivElement | null>(null);
    const badgeRef = useRef<HTMLDivElement | null>(null);
    const microRef = useRef<HTMLUListElement | null>(null);

    useGSAP(
        () => {
            // Basic fadeIn for simplicity on re-renders, or full seq if first load
            // Keeping it simple since verifying layout is priority
            if (!headerRef.current) return;

            gsap.to([headerRef.current, paraRef.current, ctaRef.current, badgeRef.current], {
                autoAlpha: 1,
                y: 0,
                stagger: 0.1,
                duration: 0.8,
                ease: 'power2.out'
            })
        },
        { scope: sectionRef },
    );

    return (
        <section ref={sectionRef} className="relative h-screen w-screen overflow-hidden bg-black text-white">
            <ShaderBackground isLiteMode={isLiteMode} />
            <GlassNavbar isLiteMode={isLiteMode} toggleLiteMode={toggleLiteMode} />

            <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-start gap-6 px-6 pb-24 pt-24 sm:gap-8 sm:pt-32 md:px-10 lg:px-16">
                {badgeText && (
                    <div ref={badgeRef} className="opacity-0 translate-y-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 backdrop-blur-sm">
                        <span className="text-[10px] font-light uppercase tracking-[0.08em] text-white/70">{badgeLabel}</span>
                        <span className="h-1 w-1 rounded-full bg-white/40" />
                        <span className="text-xs font-light tracking-tight text-white/80">{badgeText}</span>
                    </div>
                )}

                <h1 ref={headerRef} className="opacity-0 translate-y-4 max-w-2xl text-left text-5xl font-extralight leading-[1.05] tracking-tight text-white sm:text-6xl md:text-7xl">
                    {title}
                </h1>

                <p ref={paraRef} className="opacity-0 translate-y-4 max-w-xl text-left text-base font-light leading-relaxed tracking-tight text-white/75 sm:text-lg">
                    {description}
                </p>

                <div ref={ctaRef} className="opacity-0 translate-y-4 flex flex-wrap items-center gap-3 pt-2">
                    {ctaButtons.map((button, index) => (
                        <a
                            key={index}
                            href={button.href}
                            className={`rounded-2xl border border-white/10 px-5 py-3 text-sm font-light tracking-tight transition-colors focus:outline-none focus:ring-2 focus:ring-white/30 duration-300 ${button.primary
                                ? "bg-white/10 text-white backdrop-blur-sm hover:bg-white/20"
                                : "text-white/80 hover:bg-white/5"
                                }`}
                        >
                            {button.text}
                        </a>
                    ))}
                </div>

                {microDetails && microDetails.length > 0 && (
                    <ul ref={microRef} className="mt-8 flex flex-wrap gap-6 text-xs font-extralight tracking-tight text-white/60">
                        {/* Micro details static for now or animated if needed */}
                        {microDetails.map((detail, index) => (
                            <li key={index} className="flex items-center gap-2">
                                <span className="h-1 w-1 rounded-full bg-white/40" /> {detail}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/40 to-transparent" />
        </section>
    );
}

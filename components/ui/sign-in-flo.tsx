"use client";

import React, { useState, useEffect, useRef } from "react";
import { Eye, EyeOff, Github, Twitter, Linkedin, Mail, Lock, User } from "lucide-react";
import { useSignIn, useSignUp } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { OAuthStrategy } from "@clerk/types";

interface FormFieldProps {
    type: string;
    placeholder: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    icon: React.ReactNode;
    showToggle?: boolean;
    onToggle?: () => void;
    showPassword?: boolean;
}

const AnimatedFormField: React.FC<FormFieldProps> = ({
    type,
    placeholder,
    value,
    onChange,
    icon,
    showToggle,
    onToggle,
    showPassword
}) => {
    const [isFocused, setIsFocused] = useState(false);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const [isHovering, setIsHovering] = useState(false);

    const handleMouseMove = (e: React.MouseEvent) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setMousePosition({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        });
    };

    return (
        <div className="relative group">
            <div
                className="relative overflow-hidden rounded-lg border border-border bg-background transition-all duration-300 ease-in-out"
                onMouseMove={handleMouseMove}
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
            >
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors duration-200 group-focus-within:text-primary">
                    {icon}
                </div>

                <input
                    type={type}
                    value={value}
                    onChange={onChange}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    className="w-full bg-transparent pl-10 pr-12 pt-6 pb-2 text-foreground placeholder:text-muted-foreground focus:outline-none"
                    placeholder=""
                />

                <label className={`absolute left-10 transition-all duration-200 ease-in-out pointer-events-none ${isFocused || value
                    ? 'top-2 text-xs text-primary font-medium'
                    : 'top-1/2 -translate-y-1/2 text-sm text-muted-foreground'
                    }`}>
                    {placeholder}
                </label>

                {showToggle && (
                    <button
                        type="button"
                        onClick={onToggle}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                )}

                {isHovering && (
                    <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                            background: `radial-gradient(200px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(59, 130, 246, 0.1) 0%, transparent 70%)`
                        }}
                    />
                )}
            </div>
        </div>
    );
};

const SocialButton: React.FC<{ icon: React.ReactNode; name: string; onClick: () => void }> = ({ icon, name, onClick }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <button
            type="button"
            onClick={onClick}
            className="relative group p-3 rounded-lg border border-border bg-background hover:bg-accent transition-all duration-300 ease-in-out overflow-hidden flex justify-center items-center"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            title={`Sign in with ${name}`}
        >
            <div className={`absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 transition-transform duration-500 ${isHovered ? 'translate-x-0' : '-translate-x-full'
                }`} />
            <div className="relative text-foreground group-hover:text-primary transition-colors">
                {icon}
            </div>
        </button>
    );
};

const FloatingParticles: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const setCanvasSize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        setCanvasSize();
        window.addEventListener('resize', setCanvasSize);

        class Particle {
            x: number;
            y: number;
            size: number;
            speedX: number;
            speedY: number;
            opacity: number;
            canvas: HTMLCanvasElement;

            constructor(canvas: HTMLCanvasElement) {
                this.canvas = canvas;
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.size = Math.random() * 2 + 1;
                this.speedX = (Math.random() - 0.5) * 0.5;
                this.speedY = (Math.random() - 0.5) * 0.5;
                this.opacity = Math.random() * 0.3;
            }

            update() {
                this.x += this.speedX;
                this.y += this.speedY;

                if (this.x > this.canvas.width) this.x = 0;
                if (this.x < 0) this.x = this.canvas.width;
                if (this.y > this.canvas.height) this.y = 0;
                if (this.y < 0) this.y = this.canvas.height;
            }

            draw(ctx: CanvasRenderingContext2D) {
                ctx.fillStyle = `rgba(59, 130, 246, ${this.opacity})`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        const particles: Particle[] = [];
        const particleCount = 50;

        for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle(canvas));
        }

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            particles.forEach(particle => {
                particle.update();
                particle.draw(ctx);
            });

            requestAnimationFrame(animate);
        };

        animate();

        return () => {
            window.removeEventListener('resize', setCanvasSize);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 pointer-events-none"
            style={{ zIndex: 1 }}
        />
    );
};

export const AuthComponent: React.FC<{ initialMode?: 'signin' | 'signup' }> = ({ initialMode = 'signin' }) => {
    const { isLoaded: isSignInLoaded, signIn, setActive } = useSignIn();
    const { isLoaded: isSignUpLoaded, signUp, setActive: setActiveSignUp } = useSignUp();
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState(""); // Used for first/last name
    const [showPassword, setShowPassword] = useState(false);
    const [isSignUp, setIsSignUp] = useState(initialMode === 'signup');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pendingVerification, setPendingVerification] = useState(false);
    const [code, setCode] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isSignInLoaded && !isSignUpLoaded) return;
        setIsSubmitting(true);
        setError(null);

        try {
            if (isSignUp) {
                // Handle Sign Up
                await signUp!.create({
                    emailAddress: email,
                    password,
                    firstName: name.split(' ')[0],
                    lastName: name.split(' ').slice(1).join(' '),
                });

                // Send email verification
                await signUp!.prepareEmailAddressVerification({ strategy: "email_code" });
                setPendingVerification(true);
            } else {
                // Handle Sign In - Identify First Flow
                const identification = await signIn!.create({
                    identifier: email,
                });

                if (identification.status === "needs_first_factor") {
                    const firstFactors = identification.supportedFirstFactors || [];

                    // Check if password is a valid strategy
                    const passwordFactor = firstFactors.find((f: any) => f.strategy === "password");

                    if (passwordFactor) {
                        // Step 2: Attempt Password
                        const result = await signIn!.attemptFirstFactor({
                            strategy: "password",
                            password,
                        });

                        if (result.status === "complete") {
                            await setActive!({ session: result.createdSessionId });
                            router.push("/home");
                        } else {
                            console.log(result);
                            setError("Something went wrong during sign in.");
                        }
                    } else {
                        const googleFactor = firstFactors.find((f: any) => f.strategy === "oauth_google");
                        // Check for email code strategy
                        const emailCodeFactor = firstFactors.find((f: any) => f.strategy === "email_code");

                        if (emailCodeFactor) {
                            // Attempt to send email code
                            await signIn!.prepareFirstFactor({
                                strategy: "email_code",
                                emailAddressId: (emailCodeFactor as any).emailAddressId,
                            });
                            setPendingVerification(true);
                            // We are reusing the verification UI, but for sign-in we need to handle it in handleVerify
                        } else if (googleFactor) {
                            setError("⚠️ This account uses Google Sign-In. Please use the Google button below.");
                        } else {
                            setError("Please use the correct login method for this account.");
                        }
                    }
                } else if (identification.status === "complete") {
                    await setActive!({ session: identification.createdSessionId });
                    router.push("/home");
                }
            }
        } catch (err: any) {
            console.error("Auth error:", err);
            const errors = err.errors || [];
            const msg = errors[0]?.message || "An error occurred";

            if (msg.toLowerCase().includes("verification strategy is not valid") || msg.toLowerCase().includes("strategy is not valid")) {
                setError("⚠️ This account uses Google Sign-In. Please use the Google button below.");
            } else {
                setError(msg);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        // Check loading states based on mode
        if (isSignUp && !isSignUpLoaded) return;
        if (!isSignUp && !isSignInLoaded) return;

        setIsSubmitting(true);
        setError(null);

        try {
            if (isSignUp) {
                const completeSignUp = await signUp!.attemptEmailAddressVerification({
                    code,
                });
                if (completeSignUp.status === "complete") {
                    await setActiveSignUp!({ session: completeSignUp.createdSessionId });
                    router.push("/home");
                } else {
                    console.log(JSON.stringify(completeSignUp, null, 2));
                    setError("Verification incomplete.");
                }
            } else {
                // Handle Sign In Verification (OTP)
                const result = await signIn!.attemptFirstFactor({
                    strategy: "email_code",
                    code,
                });

                if (result.status === "complete") {
                    await setActive!({ session: result.createdSessionId });
                    router.push("/home");
                } else {
                    console.log(result);
                    setError("Verification incomplete.");
                }
            }
        } catch (err: any) {
            console.error(err);
            setError(err.errors?.[0]?.message || "Verification failed");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleOAuth = async (strategy: OAuthStrategy) => {
        if (!isSignInLoaded) return;
        try {
            await signIn!.authenticateWithRedirect({
                strategy,
                redirectUrl: "/sso-callback",
                redirectUrlComplete: "/home",
            });
        } catch (err: any) {
            console.error(err);
            setError(err.errors?.[0]?.message || "OAuth failed");
        }
    };

    const toggleMode = () => {
        setIsSignUp(!isSignUp);
        setEmail("");
        setPassword("");
        setName("");
        setShowPassword(false);
        setError(null);
    };

    if (pendingVerification) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
                <FloatingParticles />
                <div className="relative z-10 w-full max-w-md">
                    <div className="bg-card/80 backdrop-blur-xl border border-border rounded-2xl p-8 shadow-2xl">
                        <h1 className="text-2xl font-bold text-center mb-4">Verify Email</h1>
                        <p className="text-center text-muted-foreground mb-6">Enter the code sent to {email}</p>
                        <form onSubmit={handleVerify} className="space-y-4">
                            <AnimatedFormField
                                type="text"
                                placeholder="Verification Code"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                icon={<Lock size={18} />}
                            />
                            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-primary text-primary-foreground py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                {isSubmitting ? "Verifying..." : "Verify"}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden text-white">
            <FloatingParticles />

            <div className="relative z-10 w-full max-w-md">
                <div className="bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500/10 rounded-full mb-4">
                            <User className="w-8 h-8 text-blue-500" />
                        </div>
                        <h1 className="text-3xl font-bold text-white mb-2">
                            {isSignUp ? 'Create Account' : 'Welcome Back'}
                        </h1>
                        <p className="text-zinc-400">
                            {isSignUp ? 'Sign up to get started' : 'Sign in to continue'}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {isSignUp && (
                            <AnimatedFormField
                                type="text"
                                placeholder="Full Name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                icon={<User size={18} />}
                            />
                        )}

                        <AnimatedFormField
                            type="email"
                            placeholder="Email Address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            icon={<Mail size={18} />}
                        />

                        <AnimatedFormField
                            type={showPassword ? "text" : "password"}
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            icon={<Lock size={18} />}
                            showToggle
                            onToggle={() => setShowPassword(!showPassword)}
                            showPassword={showPassword}
                        />

                        <div className="flex items-center justify-between">
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="w-4 h-4 text-blue-500 bg-zinc-800 border-zinc-700 rounded focus:ring-blue-500 focus:ring-2"
                                />
                                <span className="text-sm text-zinc-400">Remember me</span>
                            </label>

                            {!isSignUp && (
                                <button
                                    type="button"
                                    className="text-sm text-blue-500 hover:underline"
                                >
                                    Forgot password?
                                </button>
                            )}
                        </div>

                        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full relative group bg-blue-600 text-white py-3 px-4 rounded-lg font-medium transition-all duration-300 ease-in-out hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
                        >
                            <span className={`transition-opacity duration-200 ${isSubmitting ? 'opacity-0' : 'opacity-100'}`}>
                                {isSignUp ? 'Create Account' : 'Sign In'}
                            </span>

                            {isSubmitting && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                </div>
                            )}
                        </button>
                    </form>

                    <div className="mt-8">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-white/10" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-zinc-900 text-zinc-400">Or continue with</span>
                            </div>
                        </div>

                        <div className="mt-6 grid grid-cols-1 gap-3">
                            <SocialButton
                                icon={
                                    <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
                                        <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                                            <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z" />
                                            <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z" />
                                            <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.734 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z" />
                                            <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.799 L -6.734 42.379 C -8.804 40.439 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -22.424 46.099 -25.074 43.989 -14.754 43.989 Z" />
                                        </g>
                                    </svg>
                                }
                                name="Google"
                                onClick={() => handleOAuth('oauth_google')}
                            />
                        </div>
                    </div>

                    <div className="mt-8 text-center">
                        <p className="text-sm text-zinc-400">
                            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                            <button
                                type="button"
                                onClick={toggleMode}
                                className="text-blue-500 hover:underline font-medium"
                            >
                                {isSignUp ? 'Sign in' : 'Sign up'}
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

"use client";

import { useEffect } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

export function OnboardingTour() {
    useEffect(() => {
        // Check if tour already completed
        const isTourCompleted = localStorage.getItem("shorts-tour-completed");
        if (isTourCompleted) return;

        // Small delay to ensure DOM is ready
        const timeout = setTimeout(() => {
            const driverObj = driver({
                showProgress: true,
                animate: true,
                allowClose: true,
                popoverClass: 'driverjs-theme',
                doneBtnText: "Done",
                nextBtnText: "Next",
                prevBtnText: "Previous",
                onDestroyed: () => {
                    localStorage.setItem("shorts-tour-completed", "true");
                },
                steps: [
                    {
                        element: "#tour-welcome-hidden", // Virtual element or popover with no element
                        popover: {
                            title: "Welcome to ShortsAlpha! 🚀",
                            description: "Let's take a quick tour to help you create your first viral video.",
                            side: "bottom",
                            align: 'center'
                        }
                    },
                    {
                        element: "#tour-nav-studio",
                        popover: {
                            title: "The Studio",
                            description: "This is where the magic happens. Edit your videos, adjust subtitles, and add effects.",
                            side: "right",
                            align: 'start'
                        }
                    },
                    {
                        element: "#tour-nav-stats",
                        popover: {
                            title: "Channel Stats",
                            description: "Track your growth and video performance here.",
                            side: "right",
                            align: 'start'
                        }
                    },
                    {
                        element: "#tour-nav-rendered",
                        popover: {
                            title: "Rendered Videos",
                            description: "Access your generation history and download finished videos.",
                            side: "right",
                            align: 'start'
                        }
                    },
                    {
                        element: "#tour-nav-settings",
                        popover: {
                            title: "Settings",
                            description: "Manage your account, subscription, and avatars.",
                            side: "right",
                            align: 'start'
                        }
                    },
                    {
                        element: "#tour-card-remix",
                        popover: {
                            title: "Create from Zero",
                            description: "Start empty. Upload your own assets and build from scratch.",
                            side: "bottom",
                            align: 'start'
                        }
                    },
                    {
                        element: "#tour-card-create",
                        popover: {
                            title: "Reddit Stories",
                            description: "Generate viral stories automatically from Reddit posts.",
                            side: "bottom",
                            align: 'start'
                        }
                    },
                    {
                        element: "#tour-card-chat",
                        popover: {
                            title: "Fake Chat Stories",
                            description: "Create engaging text message videos with realistic voices.",
                            side: "bottom",
                            align: 'start'
                        }
                    },
                    {
                        element: "#tour-card-split",
                        popover: {
                            title: "Gameplay Split",
                            description: "Combine your video with viral gameplay clips (Minecraft, GTA) to boost retention.",
                            side: "top", // Adjusted to top as it's usually lower on screen
                            align: 'start'
                        }
                    },
                    {
                        element: "#tour-card-auto_shorts",
                        popover: {
                            title: "Auto Podcast Shorts",
                            description: "Turn podcasts into shorts with AI face tracking.",
                            side: "top",
                            align: 'start'
                        }
                    }
                ]
            });

            driverObj.drive();
        }, 1500); // 1.5s delay for page load animations

        return () => clearTimeout(timeout);
    }, []);

    return null; // This component renders nothing visible itself
}

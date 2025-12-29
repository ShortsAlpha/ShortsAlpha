"use client";
import React from "react";
import Hero from "@/components/ui/neural-network-hero";

export default function LandingPage() {
    return (
        <Hero
            title="Create Viral Shorts in Seconds"
            description="Professional AI Video Editor for creators. Generate captions and add stock footage with one click."
            ctaButtons={[
                { text: "Get Started Free", href: "/sign-up", primary: true },
                { text: "Pricing", href: "/pricing" }
            ]}
        />
    );
}

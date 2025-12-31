"use client"

import { Clapperboard, Home, LayoutDashboard, Settings, Shield, Video } from "lucide-react"
import { useUser } from "@clerk/nextjs"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
} from "@/components/ui/sidebar"

export function AppSidebar() {
    const { user, isLoaded } = useUser()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const currentView = searchParams.get('view')

    const items = [
        {
            title: "Home",
            url: "/home",
            id: "home",
            icon: Home,
        },
        {
            title: "Studio",
            url: "/studio",
            id: "studio",
            icon: Clapperboard,
        },
        {
            title: "Rendered Videos",
            url: "/studio?view=rendered",
            id: "rendered",
            icon: Video,
        },
        {
            title: "Channel Stats",
            url: "/studio?view=stats",
            id: "stats",
            icon: LayoutDashboard,
        },
    ]

    if (isLoaded && user?.publicMetadata?.plan === 'admin') {
        items.push({
            title: "Admin Panel",
            url: "/admin",
            id: "admin",
            icon: Shield,
        })
    }

    return (
        <Sidebar collapsible="icon">
            <SidebarHeader>
                <div className="flex items-center gap-2 px-2 py-1">

                    <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
                        <span className="font-semibold">ShortsAlpha</span>
                        <span className="text-xs text-muted-foreground">v0.1</span>
                    </div>
                </div>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Menu</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {items.map((item) => {
                                let isActive = false;
                                if (item.id === "home") {
                                    isActive = pathname === "/home";
                                } else if (item.id === "studio") {
                                    isActive = pathname === "/studio" && (!currentView || currentView === "studio");
                                } else if (item.id === "admin") {
                                    isActive = pathname === "/admin";
                                } else {
                                    // For rendered, stats etc.
                                    isActive = pathname === "/studio" && currentView === item.id;
                                }

                                return (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton asChild isActive={isActive} tooltip={item.title} id={`tour-nav-${item.id}`}>
                                            <Link href={item.url}>
                                                <item.icon />
                                                <span>{item.title}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                )
                            })}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild tooltip="Settings" isActive={pathname === "/settings"} id="tour-nav-settings">
                            <Link href="/settings">
                                <Settings />
                                <span>Settings</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    )
}

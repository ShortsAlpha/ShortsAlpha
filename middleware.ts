import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
    '/',
    '/api/upload(.*)',
    '/api/status(.*)',
    '/api/render/(.*)',
    '/api/history(.*)',
    '/sign-in(.*)',
    '/sign-up(.*)',
    '/api/tts(.*)',
    '/api/debug-env',
    '/api/webhooks(.*)',
    '/pricing',
    '/api/debug-lemon'
])

export default clerkMiddleware(async (auth, request) => {
    if (!isPublicRoute(request)) {
        const { userId, redirectToSignIn } = await auth()
        if (!userId) return redirectToSignIn()
    }
}, {
    publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "pk_test_b2JsaWdpbmctd3Jlbi0wLmNsZXJrLmFjY291bnRzLmRldiQ"
})

export const config = {
    matcher: [
        // Skip Next.js internals and all static files, unless found in search params
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
    ],
}

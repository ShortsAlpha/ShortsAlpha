import { SignIn, SignedIn, SignedOut, UserButton, SignOutButton } from "@clerk/nextjs";

export default function Page() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black gap-6">
            <SignedIn>
                <div className="text-center space-y-4">
                    <p className="text-xl font-medium text-white">You are already logged in!</p>
                    <div className="flex justify-center">
                        <UserButton showName />
                    </div>
                    <div className="pt-4 flex flex-col gap-3">
                        <a href="/studio" className="bg-white text-black px-6 py-2 rounded-lg font-bold hover:bg-zinc-200 transition-colors w-full">
                            Go to Studio
                        </a>
                        <SignOutButton>
                            <button className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 px-6 py-2 rounded-lg font-medium transition-colors text-sm">
                                Sign Out
                            </button>
                        </SignOutButton>
                    </div>
                </div>
            </SignedIn>
            <SignedOut>
                <SignIn forceRedirectUrl="/studio" />
            </SignedOut>
        </div>
    );
}

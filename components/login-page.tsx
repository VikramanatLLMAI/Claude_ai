"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type AuthMode = "signin" | "signup"

const AUTH_SESSION_KEY = "athena_auth_session"
const AUTH_USER_KEY = "athena_auth_user"

export function LoginPage() {
    const router = useRouter()
    const [mode, setMode] = React.useState<AuthMode>("signin")
    const [error, setError] = React.useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = React.useState(false)

    React.useEffect(() => {
        if (typeof window === "undefined") return
        const session = window.localStorage.getItem(AUTH_SESSION_KEY)
        if (session) {
            router.replace("/solutions")
        }
    }, [router])

    const normalizeEmail = (value: string) => value.trim().toLowerCase()

    const readStoredUser = () => {
        const raw = window.localStorage.getItem(AUTH_USER_KEY)
        if (!raw) return null
        try {
            return JSON.parse(raw) as { email: string; password: string }
        } catch {
            return null
        }
    }

    const writeSession = (email: string) => {
        window.localStorage.setItem(
            AUTH_SESSION_KEY,
            JSON.stringify({ email, signedInAt: new Date().toISOString() })
        )
    }

    const handleModeChange = (nextMode: AuthMode) => {
        setMode(nextMode)
        setError(null)
    }

    const handleSignIn = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setError(null)
        setIsSubmitting(true)

        const formData = new FormData(event.currentTarget)
        const email = normalizeEmail(String(formData.get("email") || ""))
        const password = String(formData.get("password") || "")

        if (!email || !password) {
            setError("Please enter your email and password.")
            setIsSubmitting(false)
            return
        }

        const storedUser = readStoredUser()
        if (!storedUser) {
            setError("No account found. Please sign up first.")
            setIsSubmitting(false)
            return
        }

        if (storedUser.email !== email || storedUser.password !== password) {
            setError("Invalid email or password.")
            setIsSubmitting(false)
            return
        }

        writeSession(email)
        router.push("/solutions")
    }

    const handleSignUp = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setError(null)
        setIsSubmitting(true)

        const formData = new FormData(event.currentTarget)
        const firstName = String(formData.get("firstName") || "").trim()
        const lastName = String(formData.get("lastName") || "").trim()
        const email = normalizeEmail(String(formData.get("email") || ""))
        const password = String(formData.get("password") || "")
        const acceptedTerms = Boolean(formData.get("terms"))

        if (!firstName || !lastName || !email || !password) {
            setError("Please complete all required fields.")
            setIsSubmitting(false)
            return
        }

        if (!acceptedTerms) {
            setError("Please accept the terms to continue.")
            setIsSubmitting(false)
            return
        }

        window.localStorage.setItem(
            AUTH_USER_KEY,
            JSON.stringify({ email, password, firstName, lastName })
        )
        writeSession(email)
        router.push("/solutions")
    }

    return (
        <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-amber-50 via-orange-50 to-emerald-50">
            <div className="pointer-events-none absolute -top-28 right-12 h-72 w-72 rounded-full bg-emerald-300/30 blur-3xl" />
            <div className="pointer-events-none absolute bottom-10 left-6 h-80 w-80 rounded-full bg-amber-300/40 blur-3xl" />
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-200/50 blur-3xl" />

            <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-12">
                <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
                    <section className="flex flex-col gap-8 rounded-3xl border border-white/70 bg-white/70 p-8 shadow-xl backdrop-blur">
                        <div className="animate-in fade-in slide-in-from-left-6 duration-700">
                            <span className="inline-flex items-center rounded-full bg-emerald-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-50">
                                Athena
                            </span>
                            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
                                Calm onboarding for fast-moving teams.
                            </h1>
                            <p className="mt-4 text-base text-slate-600">
                                Keep your workspace crisp and focused. Sign in to pick up where you left off, or
                                create a new account in under a minute.
                            </p>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            {[
                                {
                                    title: "Smart context",
                                    body: "Your workspace remembers the last project, task, and message trail.",
                                },
                                {
                                    title: "Fast setup",
                                    body: "Invite teammates, set roles, and start collaborating right away.",
                                },
                                {
                                    title: "No distractions",
                                    body: "Stay focused with a minimal UI that highlights what matters.",
                                },
                                {
                                    title: "Private by default",
                                    body: "Control access with tight scopes and clear ownership.",
                                },
                            ].map((feature, index) => (
                                <div
                                    key={feature.title}
                                    className={cn(
                                        "rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm text-slate-600 shadow-sm",
                                        "animate-in fade-in slide-in-from-bottom-4 duration-700",
                                        index === 0 && "delay-100",
                                        index === 1 && "delay-150",
                                        index === 2 && "delay-200",
                                        index === 3 && "delay-250"
                                    )}
                                >
                                    <p className="text-sm font-semibold text-slate-900">{feature.title}</p>
                                    <p className="mt-2 text-sm text-slate-600">{feature.body}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="animate-in fade-in slide-in-from-right-6 duration-700">
                        <div className="rounded-3xl border border-white/70 bg-white/80 p-8 shadow-2xl backdrop-blur">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-700">
                                        Access
                                    </p>
                                    <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                                        {mode === "signin" ? "Welcome back." : "Create your account."}
                                    </h2>
                                    <p className="mt-2 text-sm text-slate-600">
                                        {mode === "signin"
                                            ? "Sign in with your email and password."
                                            : "Use your work email to get started."}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-6 rounded-full border border-slate-200 bg-white/70 p-1">
                                <div className="flex gap-1">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        className={cn(
                                            "h-9 flex-1 rounded-full text-sm",
                                            mode === "signin"
                                                ? "bg-white text-slate-900 shadow-sm"
                                                : "text-slate-500 hover:text-slate-800"
                                        )}
                                        aria-pressed={mode === "signin"}
                                        onClick={() => handleModeChange("signin")}
                                    >
                                        Sign in
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        className={cn(
                                            "h-9 flex-1 rounded-full text-sm",
                                            mode === "signup"
                                                ? "bg-white text-slate-900 shadow-sm"
                                                : "text-slate-500 hover:text-slate-800"
                                        )}
                                        aria-pressed={mode === "signup"}
                                        onClick={() => handleModeChange("signup")}
                                    >
                                        Sign up
                                    </Button>
                                </div>
                            </div>

                            <div className="mt-6">
                                {mode === "signin" ? (
                                    <form className="space-y-5" onSubmit={handleSignIn}>
                                        {error ? (
                                            <div
                                                role="alert"
                                                className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
                                            >
                                                {error}
                                            </div>
                                        ) : null}
                                        <div className="space-y-2">
                                            <label htmlFor="signin-email" className="text-sm font-medium text-slate-700">
                                                Email
                                            </label>
                                            <Input
                                                id="signin-email"
                                                name="email"
                                                type="email"
                                                placeholder="you@company.com"
                                                autoComplete="email"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label
                                                htmlFor="signin-password"
                                                className="text-sm font-medium text-slate-700"
                                            >
                                                Password
                                            </label>
                                            <Input
                                                id="signin-password"
                                                name="password"
                                                type="password"
                                                placeholder="Enter your password"
                                                autoComplete="current-password"
                                                required
                                            />
                                        </div>
                                        <div className="flex items-center justify-between text-sm text-slate-500">
                                            <label className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    className="size-4 rounded border border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                                />
                                                Remember me
                                            </label>
                                            <button
                                                type="button"
                                                className="font-medium text-slate-700 underline underline-offset-4"
                                            >
                                                Forgot password?
                                            </button>
                                        </div>
                                        <Button type="submit" className="h-11 w-full text-base" disabled={isSubmitting}>
                                            {isSubmitting ? "Signing in..." : "Sign in"}
                                        </Button>
                                        <p className="text-center text-sm text-slate-500">
                                            New here?{" "}
                                            <button
                                                type="button"
                                                className="font-medium text-slate-700 underline underline-offset-4"
                                                onClick={() => handleModeChange("signup")}
                                            >
                                                Create an account
                                            </button>
                                        </p>
                                    </form>
                                ) : (
                                    <form className="space-y-5" onSubmit={handleSignUp}>
                                        {error ? (
                                            <div
                                                role="alert"
                                                className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
                                            >
                                                {error}
                                            </div>
                                        ) : null}
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div className="space-y-2">
                                                <label
                                                    htmlFor="signup-first-name"
                                                    className="text-sm font-medium text-slate-700"
                                                >
                                                    First name
                                                </label>
                                                <Input
                                                    id="signup-first-name"
                                                    name="firstName"
                                                    type="text"
                                                    placeholder="Sam"
                                                    autoComplete="given-name"
                                                    required
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label
                                                    htmlFor="signup-last-name"
                                                    className="text-sm font-medium text-slate-700"
                                                >
                                                    Last name
                                                </label>
                                                <Input
                                                    id="signup-last-name"
                                                    name="lastName"
                                                    type="text"
                                                    placeholder="Rivera"
                                                    autoComplete="family-name"
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label
                                                htmlFor="signup-email"
                                                className="text-sm font-medium text-slate-700"
                                            >
                                                Work email
                                            </label>
                                            <Input
                                                id="signup-email"
                                                name="email"
                                                type="email"
                                                placeholder="sam@company.com"
                                                autoComplete="email"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label
                                                htmlFor="signup-password"
                                                className="text-sm font-medium text-slate-700"
                                            >
                                                Password
                                            </label>
                                            <Input
                                                id="signup-password"
                                                name="password"
                                                type="password"
                                                placeholder="Create a password"
                                                autoComplete="new-password"
                                                required
                                            />
                                        </div>
                                        <label className="flex items-start gap-2 text-sm text-slate-500">
                                            <input
                                                name="terms"
                                                type="checkbox"
                                                required
                                                className="mt-1 size-4 rounded border border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                            />
                                            I agree to the terms and privacy policy.
                                        </label>
                                        <Button type="submit" className="h-11 w-full text-base" disabled={isSubmitting}>
                                            {isSubmitting ? "Creating account..." : "Create account"}
                                        </Button>
                                        <p className="text-center text-sm text-slate-500">
                                            Already have an account?{" "}
                                            <button
                                                type="button"
                                                className="font-medium text-slate-700 underline underline-offset-4"
                                                onClick={() => handleModeChange("signin")}
                                            >
                                                Sign in
                                            </button>
                                        </p>
                                    </form>
                                )}
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    )
}

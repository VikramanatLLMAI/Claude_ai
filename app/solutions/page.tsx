"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    BarChart3,
    Wrench,
    HeadphonesIcon,
    GitBranch,
    TrendingUp,
    ClipboardList,
    MessageSquare,
    LogOut,
    ChevronRight,
} from "lucide-react"
import { motion } from "motion/react"

const AUTH_SESSION_KEY = "athena_auth_session"
const AUTH_TOKEN_KEY = "athena_auth_token"

type SolutionCard = {
    id: string
    title: string
    description: string
    icon: React.ComponentType<{ className?: string }>
    features: string[]
}

const SOLUTIONS: SolutionCard[] = [
    {
        id: "manufacturing",
        title: "Manufacturing (Report & Insights)",
        description: "Production visibility, analytics, and reporting",
        icon: BarChart3,
        features: [
            "Real-time production tracking",
            "Natural language analytics",
            "Drill-down views (Plant → Line → Equipment)",
            "Automated reporting (daily/weekly/monthly)",
            "Yield analysis & forecasting",
        ],
    },
    {
        id: "maintenance",
        title: "Maintenance (Report & Insights)",
        description: "Reliability metrics and failure prediction",
        icon: Wrench,
        features: [
            "MTBF/MTTR calculation from MES logs",
            "Failure probability prediction",
            "Recurring failure mode detection",
            "Maintenance dashboards & trends",
            "Supplier evaluation recommendations",
        ],
    },
    {
        id: "support",
        title: "Support",
        description: "Incident management and troubleshooting",
        icon: HeadphonesIcon,
        features: [
            "Ticket auto-classification & assignment",
            "Root cause analysis with past references",
            "Resolution time prediction",
            "Knowledge base (auto-learning)",
            "RCA enforcement & alert prioritization",
        ],
    },
    {
        id: "change-management",
        title: "Change Management",
        description: "ECO tracking and workflow management",
        icon: GitBranch,
        features: [
            "Natural language workflow queries",
            "Object-to-revision mapping",
            "Shared specs & overrides detection",
            "Path Expression update identification",
            "Redline document generation",
        ],
    },
    {
        id: "impact-analysis",
        title: "Impact Analysis",
        description: "Dependencies, WIP status, and cross-functional insights",
        icon: TrendingUp,
        features: [
            "Dependent object visualization",
            "Current WIP with status",
            "Where-used natural language queries",
            "Path Expression impact analysis",
            "Affected Work Orders list",
        ],
    },
    {
        id: "requirements",
        title: "Requirements",
        description: "Requirements analysis and process mapping",
        icon: ClipboardList,
        features: [
            "Industry-specific templates",
            "As-Is / To-Be process flow generation",
            "Use case & test case generation",
            "MES-ERP touchpoint mapping",
            "Gap & customization identification",
        ],
    },
]

function hasValidSession() {
    if (typeof window === "undefined") return false
    const session = window.localStorage.getItem(AUTH_SESSION_KEY)
    const token = window.localStorage.getItem(AUTH_TOKEN_KEY)
    return !!(session && token)
}

function getUserName() {
    if (typeof window === "undefined") return "User"
    try {
        const sessionData = window.localStorage.getItem(AUTH_SESSION_KEY)
        if (sessionData) {
            const parsed = JSON.parse(sessionData)
            // Get name from user object in session
            if (parsed.user?.name) {
                return parsed.user.name.split(' ')[0] || "User"
            }
        }
    } catch {
        // ignore
    }
    return "User"
}

// Animation variants
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.08,
            delayChildren: 0.1,
        },
    },
}

const cardVariants = {
    hidden: {
        opacity: 0,
        y: 20,
        scale: 0.95,
    },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            type: "spring" as const,
            stiffness: 100,
            damping: 15,
        },
    },
}

const headerVariants = {
    hidden: { opacity: 0, y: -10 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.4,
            ease: [0.25, 0.46, 0.45, 0.94] as const,
        },
    },
}

const titleVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
        opacity: 1,
        x: 0,
        transition: {
            duration: 0.5,
            ease: [0.25, 0.46, 0.45, 0.94] as const,
        },
    },
}

export default function SolutionsPage() {
    const router = useRouter()
    const [session, setSession] = useState<string | null>(null)
    const [userName, setUserName] = useState("User")
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        if (typeof window === "undefined") return

        const currentSession = window.localStorage.getItem(AUTH_SESSION_KEY)
        const token = window.localStorage.getItem(AUTH_TOKEN_KEY)
        if (!currentSession || !token) {
            router.replace("/")
            return
        }

        setSession(currentSession)
        setUserName(getUserName())
        setIsLoading(false)
    }, [router])

    const handleSignOut = () => {
        window.localStorage.removeItem(AUTH_SESSION_KEY)
        window.localStorage.removeItem(AUTH_TOKEN_KEY)
        router.push("/")
    }

    if (isLoading || !session) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                >
                    <p className="text-sm text-muted-foreground">Loading...</p>
                </motion.div>
            </div>
        )
    }

    return (
        <div className="h-screen overflow-y-auto bg-background">
            {/* Header */}
            <motion.header
                variants={headerVariants}
                initial="hidden"
                animate="visible"
                className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur"
            >
                <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold">Athena</span>
                        <span className="text-muted-foreground">/</span>
                        <span className="text-sm text-muted-foreground">Solutions</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.push("/chat")}
                                className="gap-2"
                            >
                                <MessageSquare className="size-4" />
                                <span className="hidden sm:inline">General Chat</span>
                            </Button>
                        </motion.div>
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleSignOut}
                                className="gap-2 text-muted-foreground"
                            >
                                <LogOut className="size-4" />
                                <span className="hidden sm:inline">Sign out</span>
                            </Button>
                        </motion.div>
                    </div>
                </div>
            </motion.header>

            {/* Main Content */}
            <main className="mx-auto max-w-6xl px-4 py-8">
                <motion.div
                    variants={titleVariants}
                    initial="hidden"
                    animate="visible"
                    className="mb-8"
                >
                    <h1 className="text-2xl font-semibold tracking-tight">
                        Welcome back, {userName}
                    </h1>
                    <p className="mt-1 text-muted-foreground">
                        Select a solution to start a specialized conversation.
                    </p>
                </motion.div>

                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
                >
                    {SOLUTIONS.map((solution) => {
                        const Icon = solution.icon
                        return (
                            <motion.div
                                key={solution.id}
                                variants={cardVariants}
                                whileHover={{
                                    y: -4,
                                    transition: { duration: 0.2 }
                                }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <Card
                                    className="group flex h-full flex-col cursor-pointer border-border/50 transition-colors hover:border-border hover:shadow-md"
                                    onClick={() => router.push(`/solutions/${solution.id}`)}
                                >
                                    <CardHeader className="pb-2 pt-4 px-4">
                                        <div className="flex items-start justify-between">
                                            <motion.div
                                                className="flex size-8 items-center justify-center rounded-md bg-primary/10"
                                                whileHover={{
                                                    scale: 1.1,
                                                    rotate: 5,
                                                    transition: { type: "spring" as const, stiffness: 400 }
                                                }}
                                            >
                                                <Icon className="size-4 text-primary" />
                                            </motion.div>
                                            <motion.div
                                                initial={{ opacity: 0, x: -5 }}
                                                whileHover={{ opacity: 1, x: 0 }}
                                                className="opacity-0 group-hover:opacity-100"
                                            >
                                                <ChevronRight className="size-3.5 text-muted-foreground" />
                                            </motion.div>
                                        </div>
                                        <CardTitle className="mt-2 text-sm font-semibold">
                                            {solution.title}
                                        </CardTitle>
                                        <CardDescription className="text-xs">
                                            {solution.description}
                                        </CardDescription>
                                    </CardHeader>

                                    <CardContent className="flex-1 pt-0 px-4 pb-2">
                                        <ul className="space-y-1 text-xs text-muted-foreground">
                                            {solution.features.map((feature, index) => (
                                                <motion.li
                                                    key={feature}
                                                    className="flex items-center gap-1.5"
                                                    initial={{ opacity: 0, x: -10 }}
                                                    whileInView={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: index * 0.05 }}
                                                    viewport={{ once: true }}
                                                >
                                                    <span className="size-1 rounded-full bg-muted-foreground/50" />
                                                    {feature}
                                                </motion.li>
                                            ))}
                                        </ul>
                                        <p className="mt-1.5 text-xs text-primary/70 font-medium">
                                            and more...
                                        </p>
                                    </CardContent>

                                    <CardFooter className="pt-2 pb-4 px-4">
                                        <motion.div
                                            className="w-full"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                className="w-full h-8 text-xs"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    router.push(`/solutions/${solution.id}`)
                                                }}
                                            >
                                                Interact with Agent
                                            </Button>
                                        </motion.div>
                                    </CardFooter>
                                </Card>
                            </motion.div>
                        )
                    })}
                </motion.div>

                {/* Copyright Footer */}
                <motion.footer
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8, duration: 0.5 }}
                    className="mt-12 border-t pt-6 text-center"
                >
                    <p className="text-xs text-muted-foreground">
                        © 2026 LLM at Scale.AI. All Rights Reserved. Confidential and Proprietary Information. Version 1.0
                    </p>
                </motion.footer>
            </main>
        </div>
    )
}

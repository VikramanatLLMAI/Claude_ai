"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

const AUTH_SESSION_KEY = "athena_auth_session"

type SolutionCard = {
    id: string
    title: string
    subtitle: string
    image: string
    useCases: string[]
}

const SOLUTIONS: SolutionCard[] = [
    {
        id: "manufacturing",
        title: "AI for Manufacturing Reports & Insights",
        subtitle: "MES + Engineering",
        image: "https://images.unsplash.com/photo-1565793298595-6a879b1d9492?w=800&h=400&fit=crop&q=80",
        useCases: [
            "📊 Real-time production visibility & traceability",
            "💬 Natural Language Analytics with drill-down",
            "📝 Automated reporting & distribution",
            "🎯 Yield loss identification & trend analysis",
            "🔮 Production forecasting & performance insights",
        ],
    },
    {
        id: "maintenance",
        title: "AI for Maintenance & Reliability",
        subtitle: "MTBF / MTTR",
        image: "https://images.unsplash.com/photo-1581094271901-8022df4466f9?w=800&h=400&fit=crop&q=80",
        useCases: [
            "🧮 Automatic MTBF calculation",
            "🧯 MTTR calculation",
            "🚨 Failure prediction",
            "🔁 Recurring failure detection",
            "📊 Maintenance dashboards",
        ],
    },
    {
        id: "support",
        title: "AI for Support & Incident Management",
        subtitle: "Tickets + RCA + Ops",
        image: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&h=400&fit=crop&q=80",
        useCases: [
            "🎟 Intelligent ticket classification & assignment",
            "🔍 Root cause analysis with past incident reference",
            "🛠 AI troubleshooting & resolution prediction",
            "📖 Self-learning knowledge base & training",
            "🔌 MES integration actions with approvals",
        ],
    },
    {
        id: "change-management",
        title: "AI for Change Management",
        subtitle: "ECOs + Process Changes",
        image: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=400&fit=crop&q=80",
        useCases: [
            "🔄 Change impact tracking",
            "📢 Change communication",
        ],
    },
    {
        id: "impact-analysis",
        title: "AI for Impact Analysis",
        subtitle: "Yield + Cost + Delivery",
        image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=400&fit=crop&q=80",
        useCases: [
            "📉 Operational impact analysis",
            "🔗 Cross-functional insights",
        ],
    },
    {
        id: "requirements",
        title: "AI for Requirements Management",
        subtitle: "Engineering + IT",
        image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&h=400&fit=crop&q=80",
        useCases: [
            "📋 Requirements analysis & validation",
            "🔍 Gap and dependency detection",
        ],
    },
]

function getSession() {
    if (typeof window === "undefined") return null
    return window.localStorage.getItem(AUTH_SESSION_KEY)
}

export default function SolutionsPage() {
    const router = useRouter()
    const session = getSession()

    useEffect(() => {
        if (typeof window === "undefined") return
        if (!window.localStorage.getItem(AUTH_SESSION_KEY)) {
            router.replace("/")
        }
    }, [router])

    if (!session) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <p className="text-sm text-muted-foreground">Checking session...</p>
            </div>
        )
    }

    return (
        <main className="min-h-screen bg-background px-6 py-12">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-10">
                <div className="flex flex-col gap-3">
                    <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">
                        Athena Solutions
                    </p>
                    <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                        Choose what you want AI to accelerate.
                    </h1>
                    <p className="max-w-3xl text-lg text-muted-foreground">
                        Each solution is tailored for manufacturing operations. Start with one and jump into the
                        chatbot to explore deeper insights.
                    </p>
                </div>

                <section className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
                    {SOLUTIONS.map((solution) => (
                        <Card
                            key={solution.id}
                            className="group relative flex h-full flex-col overflow-hidden bg-card shadow-lg card-hover"
                        >
                            {/* Image Header */}
                            <div className="relative h-48 w-full overflow-hidden">
                                <img
                                    src={solution.image}
                                    alt={solution.title}
                                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

                                {/* Badge on Image */}
                                <div className="absolute left-4 top-4">
                                    <Badge className="glass shadow-lg">
                                        {solution.subtitle}
                                    </Badge>
                                </div>
                            </div>

                            {/* Card Content */}
                            <CardHeader className="pb-3">
                                <CardTitle className="text-xl font-bold leading-tight text-card-foreground">
                                    {solution.title}
                                </CardTitle>
                                <CardDescription className="text-sm font-medium">
                                    Key Capabilities
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="flex-1">
                                <ul className="space-y-2.5 text-sm text-muted-foreground">
                                    {solution.useCases.map((useCase) => (
                                        <li key={useCase} className="flex items-start gap-2.5 leading-relaxed">
                                            <span className="mt-0.5 text-base text-primary">•</span>
                                            <span>{useCase}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>

                            <CardFooter className="pt-4">
                                <Button
                                    className="w-full shadow-md"
                                    onClick={() => router.push(`/chat?solution=${solution.id}`)}
                                >
                                    Open in Chatbot
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </section>
            </div>
        </main>
    )
}


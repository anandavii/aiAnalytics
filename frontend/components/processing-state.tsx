"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

interface ProcessingStateProps {
    steps?: string[]
    message?: string
}

const defaultSteps = [
    "Uploading data...",
    "Profiling dataset columns...",
    "Analyzing data patterns...",
    "Generating insights...",
    "Preparing dashboard..."
]

export function ProcessingState({
    steps = defaultSteps,
    message = "Processing your dataset"
}: ProcessingStateProps) {
    const [currentStepIndex, setCurrentStepIndex] = useState(0)
    const [dots, setDots] = useState("")

    // Cycle through steps
    useEffect(() => {
        const stepInterval = setInterval(() => {
            setCurrentStepIndex((prev) => (prev + 1) % steps.length)
        }, 2500)

        return () => clearInterval(stepInterval)
    }, [steps.length])

    // Animate dots
    useEffect(() => {
        const dotsInterval = setInterval(() => {
            setDots((prev) => (prev.length >= 3 ? "" : prev + "."))
        }, 400)

        return () => clearInterval(dotsInterval)
    }, [])

    return (
        <Card className="p-12 max-w-md mx-auto mt-20">
            <div className="flex flex-col items-center gap-6 text-center">
                {/* Animated spinner */}
                <div className="relative">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-600 to-violet-600 animate-spin-slow flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-white dark:bg-neutral-900" />
                    </div>
                    <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin" />
                </div>

                {/* Main message */}
                <div className="space-y-3">
                    <h3 className="text-xl font-semibold text-neutral-800 dark:text-neutral-100">
                        {message}{dots}
                    </h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 min-h-[20px] transition-opacity duration-300">
                        {steps[currentStepIndex]}
                    </p>
                </div>

                {/* Progress steps indicator */}
                <div className="flex items-center gap-2 mt-2">
                    {steps.map((_, index) => (
                        <div
                            key={index}
                            className={`h-1.5 rounded-full transition-all duration-300 ${index === currentStepIndex
                                    ? "w-6 bg-blue-600"
                                    : index < currentStepIndex
                                        ? "w-2 bg-blue-400"
                                        : "w-2 bg-neutral-300 dark:bg-neutral-700"
                                }`}
                        />
                    ))}
                </div>

                {/* Subtle hint */}
                <p className="text-xs text-neutral-400 mt-4">
                    This may take a few seconds depending on your dataset size
                </p>
            </div>
        </Card>
    )
}

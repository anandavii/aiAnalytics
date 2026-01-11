import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <div className="text-center space-y-6 max-w-2xl px-4">
        <h1 className="text-5xl font-bold tracking-tighter sm:text-6xl bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
          AI Analytics Dashboard
        </h1>
        <p className="text-lg text-neutral-600 dark:text-neutral-400">
          Upload your data, clean it with AI, and ask questions in plain English.
          Experience the future of data analytics.
        </p>
        <div className="flex gap-4 justify-center">
          <Button
            size="lg"
            className="rounded-full px-8 bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-[0.98] transition-all duration-200 focus:ring-4 focus:ring-blue-300/50 border-0"
            asChild
            suppressHydrationWarning
          >
            <Link href="/dashboard">
              Get Started →
            </Link>
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="rounded-full px-8 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all duration-200"
            suppressHydrationWarning
          >
            Learn More
          </Button>
        </div>
      </div>

      <div className="mt-16 p-4 rounded-xl border bg-white shadow-xl dark:bg-neutral-800 dark:border-neutral-700 w-[90%] max-w-4xl h-64 flex items-center justify-center text-neutral-400">
        Dashboard Preview Image / Placeholder
      </div>
    </div>
  );
}

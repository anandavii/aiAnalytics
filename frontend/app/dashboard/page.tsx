import { Suspense } from "react"
import DashboardClient from "./DashboardClient"
import DashboardLoading from "./DashboardLoading"

export default function DashboardPage() {
    return (
        <Suspense fallback={<DashboardLoading />}>
            <DashboardClient />
        </Suspense>
    )
}

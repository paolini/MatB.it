import { SyncLoader } from "react-spinners"

export function Loading() {
    return <SyncLoader />
}

export function Error({ error }: { error: any }) {
    return <div className="flex justify-center items-center h-screen">
        <div className="text-red-500">
            <h1 className="text-2xl font-bold">Error</h1>
            <p>{error.message}</p>
        </div>
    </div>
}


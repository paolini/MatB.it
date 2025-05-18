import { SyncLoader } from "react-spinners"
import { ApolloError } from "@apollo/client"

export function Loading() {
    return <SyncLoader />
}

export function Error({ error }: { error: ApolloError }) {
    return <div className="flex justify-center items-center h-screen">
        <div className="text-red-500">
            <h1 className="text-2xl font-bold">Error</h1>
            <p>{error.message}</p>
        </div>
    </div>
}

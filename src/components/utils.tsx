import { SyncLoader } from "react-spinners"
import { ApolloError } from "@apollo/client"

interface GraphQLErrorExtension {
  code?: string;
  stacktrace?: string[];
}

interface GraphQLError {
  message: string;
  extensions?: GraphQLErrorExtension;
  locations?: { line: number; column: number }[];
}

export function Loading() {
    return <SyncLoader />
}
 
export function Error({ error }: { error: ApolloError|string }) {
    const { message, details } = typeof error === 'string'
        ? stringError(error)
        : apolloError(error)
        
    return <div className="text-red-500">
        <h1 className="text-2xl font-bold">Error</h1>
        <p>{message}</p>
        {details}
    </div>

    function stringError(error: string) {
        return {message: error, details: null}
    }

    function apolloError(error: ApolloError) {
        let causeDetails = null
        // Try to extract GraphQL error details if present
        const cause = error.cause as { result?: { errors?: GraphQLError[] } } | undefined
        const gqlErrors = cause && cause.result && Array.isArray(cause.result.errors)
            ? cause.result.errors
            : null
        if (gqlErrors) {
            causeDetails = gqlErrors.map((err, idx) => (
                <div key={idx} className="mb-2">
                    <div className="font-bold">{err.message}</div>
                    {err.extensions?.code && <div className="text-xs">Codice: {err.extensions.code}</div>}
                    {err.locations && <pre className="text-xs">{JSON.stringify(err.locations, null, 2)}</pre>}
                    {err.extensions?.stacktrace && (
                        <details>
                            <summary>Stacktrace</summary>
                            <pre className="text-xs overflow-x-auto">{err.extensions.stacktrace.join('\n')}</pre>
                        </details>
                    )}
                </div>
            ))
        } else if (cause) {
            causeDetails = <pre className="bg-red-100 text-red-700 p-2 mt-2 rounded text-xs overflow-x-auto">{typeof cause === 'string' ? cause : JSON.stringify(cause, null, 2)}</pre>
        }
        return {message: error.message, details: causeDetails}
    }
}

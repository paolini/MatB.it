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

export type ErrorType = Error

export function Error({ error }: { error: ErrorType|string|null|undefined }) {
    if (!error) return null // No error to display

    const { message, details } = parse(error)

    return <div className="text-red-500">
        <p>{message}</p>
        {details}
    </div>

    function parse(error: ErrorType|string) {
        if (typeof error === 'string') {
            return { message: error, details: null }
        } else if (error instanceof ApolloError) {
            return apolloError(error)
        } else {
            return { message: error.message, details: error.stack }
        }
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

const COMMON_BUTTON_CLASS = "mt-2 px-4 py-2 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"

export const SAVE_BUTTON_CLASS   = `${COMMON_BUTTON_CLASS} bg-green-600 text-white hover:bg-green-800`
export const BUTTON_CLASS        = `${COMMON_BUTTON_CLASS} bg-gray-200 text-gray-800 hover:bg-gray-300`
export const EDIT_BUTTON_CLASS   = `${COMMON_BUTTON_CLASS} bg-blue-500 text-white hover:bg-blue-600`
export const CANCEL_BUTTON_CLASS = `${COMMON_BUTTON_CLASS} bg-gray-300 text-gray-800 hover:bg-gray-400`
export const DELETE_BUTTON_CLASS = `${COMMON_BUTTON_CLASS} bg-red-400 text-white hover:bg-red-500`

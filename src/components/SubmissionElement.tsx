import { Submission } from '@/app/graphql/generated'
import { myTimestamp, formatDuration } from '@/lib/utils'
import { BUTTON_CLASS } from '@/components/utils'

export default function SubmissionElement({submission, accessToken}: {
    submission: Submission,
    accessToken?: string | null
}) {
    // Costruisci il link con il token se presente
    const getSubmissionLink = () => {
        if (accessToken) {
            return `/submission/${submission._id}?token=${accessToken}`
        }
        return `/submission/${submission._id}`
    }
    // Calcola durata
    const getDuration = () => {
        if (!submission.started_on || !submission.completed_on) return null
        const start = new Date(submission.started_on)
        const end = new Date(submission.completed_on)
        const diffMs = end.getTime() - start.getTime()
        return formatDuration(diffMs)
    }
    return <a key={submission._id.toString()} className={BUTTON_CLASS} href={getSubmissionLink()}>
        { submission.completed_on 
            ? `visualizza test completato il ${myTimestamp(submission.completed_on)}`
            : `riprendi test del ${myTimestamp(submission.started_on)}`
        }
        {/* Informazioni sintetiche */}
        {submission.score != null && (
            <span className="ml-2 text-blue-700 font-semibold">Punti: {submission.score.toFixed(1)}</span>
        )}
        {getDuration() && (
            <span className="ml-2 text-gray-600">Tempo: {getDuration()}</span>
        )}
    </a>
}

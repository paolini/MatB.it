import { Submission } from '@/app/graphql/generated'
import { myTimestamp } from '@/lib/utils'
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
    return <a key={submission._id} className={BUTTON_CLASS} href={getSubmissionLink()}>
        { submission.completed_on 
            ? `visualizza test completato il ${myTimestamp(submission.completed_on)}`
            : `riprendi test del ${myTimestamp(submission.started_on)}`
        }
    </a>
}

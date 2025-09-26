import { Submission } from '@/app/graphql/generated'
import SubmissionTable from './SubmissionTable'

export default function TestSubmissionsTab({submissions, accessToken}: {
    submissions: Submission[], 
    accessToken?: string | null
}) {
    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold mb-4">Elenco consegne</h3>
                <SubmissionTable submissions={submissions} accessToken={accessToken} />
            </div>
        </div>
    )
}

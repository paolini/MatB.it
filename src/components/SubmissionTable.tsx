import Link from 'next/link'
import { useState } from 'react'
import { Submission, AnswerItem } from '@/app/graphql/generated'
import { myTimestamp, formatDuration } from '@/lib/utils'

const COMMON_CLASSNAME = "px-2 py-1 border border-black"

export default function SubmissionTable({submissions, accessToken}: {submissions: Submission[], accessToken?: string | null}) {
    const [sortColumn, setSortColumn] = useState<string>('started_on')
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
    
    const headers: string[] = []
    submissions.forEach(submission => {
        submission.answers.forEach(answer => {
            const note_id = answer.note_id.toString()
            if (answer.note_id && !headers.includes(note_id)) {
                headers.push(note_id)
            }
        })
    })

    const handleSort = (column: string) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
        } else {
            setSortColumn(column)
            setSortDirection('asc')
        }
    }

    const sortedSubmissions = [...submissions].sort((a, b) => {
        let valueA: any = ''
        let valueB: any = ''

        switch (sortColumn) {
            case 'rank':
                // Per il rank, ordiniamo prima per punteggio (desc) poi per durata (asc)
                const getRankValue = (submission: Submission) => {
                    const score = submission.score || 0
                    const duration = submission.started_on && submission.completed_on 
                        ? new Date(submission.completed_on).getTime() - new Date(submission.started_on).getTime()
                        : Number.MAX_SAFE_INTEGER
                    // Creiamo un valore composito: punteggio negativo (per desc) + durata normalizzata
                    return -score * 1000000 + duration / 1000
                }
                valueA = getRankValue(a)
                valueB = getRankValue(b)
                break
            case 'started_on':
                valueA = new Date(a.started_on || 0).getTime()
                valueB = new Date(b.started_on || 0).getTime()
                break
            case 'completed_on':
                valueA = new Date(a.completed_on || 0).getTime()
                valueB = new Date(b.completed_on || 0).getTime()
                break
            case 'duration':
                const getDurationMs = (submission: Submission) => {
                    if (!submission.started_on || !submission.completed_on) return 0
                    return new Date(submission.completed_on).getTime() - new Date(submission.started_on).getTime()
                }
                valueA = getDurationMs(a)
                valueB = getDurationMs(b)
                break
            case 'author':
                valueA = a.author?.name || ''
                valueB = b.author?.name || ''
                break
            case 'score':
                valueA = a.score || 0
                valueB = b.score || 0
                break
        }

        if (valueA < valueB) return sortDirection === 'asc' ? -1 : 1
        if (valueA > valueB) return sortDirection === 'asc' ? 1 : -1
        return 0
    })

    // Calcola i rank delle submission
    const submissionsWithRank = [...submissions]
        .filter(s => s.completed_on) // Solo submission completate per il ranking
        .sort((a, b) => {
            // Ordina per punteggio decrescente, poi per tempo crescente
            if ((a.score || 0) !== (b.score || 0)) {
                return (b.score || 0) - (a.score || 0)
            }
            const durationA = a.started_on && a.completed_on 
                ? new Date(a.completed_on).getTime() - new Date(a.started_on).getTime()
                : Number.MAX_SAFE_INTEGER
            const durationB = b.started_on && b.completed_on 
                ? new Date(b.completed_on).getTime() - new Date(b.started_on).getTime()
                : Number.MAX_SAFE_INTEGER
            return durationA - durationB
        })

    const rankMap = new Map<string, { rank: number, percentile: number }>()
    const totalCompleted = submissionsWithRank.length
    
    submissionsWithRank.forEach((submission, index) => {
        const rank = index + 1
        // Calcola il percentile: (n - rank + 1) / n * 100
        // dove n è il numero totale di submission completate
        const percentile = totalCompleted > 1 
            ? Math.round((totalCompleted - rank + 1) / totalCompleted * 100)
            : 100
        rankMap.set(submission._id.toString(), { rank, percentile })
    })

    return <table className="mt-4 border-2 border-black" style={{borderCollapse: 'collapse'}}>
        <thead className="bg-gray-100">
            <tr>
                <th className="px-2 py-1 text-left border border-black">#</th>
                <th 
                    className="px-2 py-1 text-left border border-black cursor-pointer hover:bg-gray-200"
                    onClick={() => handleSort('rank')}
                >
                    Rank{sortColumn !== 'rank' ? ' ↕' : sortDirection === 'asc' ? ' ↑' : ' ↓'}
                </th>
                <th 
                    className="px-2 py-1 text-left border border-black cursor-pointer hover:bg-gray-200"
                    onClick={() => handleSort('started_on')}
                >
                    Inizio{sortColumn !== 'started_on' ? ' ↕' : sortDirection === 'asc' ? ' ↑' : ' ↓'}
                </th>
                <th 
                    className="px-2 py-1 text-left border border-black cursor-pointer hover:bg-gray-200"
                    onClick={() => handleSort('completed_on')}
                >
                    Fine{sortColumn !== 'completed_on' ? ' ↕' : sortDirection === 'asc' ? ' ↑' : ' ↓'}
                </th>
                <th 
                    className="px-2 py-1 text-left border border-black cursor-pointer hover:bg-gray-200"
                    onClick={() => handleSort('duration')}
                >
                    Tempo{sortColumn !== 'duration' ? ' ↕' : sortDirection === 'asc' ? ' ↑' : ' ↓'}
                </th>
                <th 
                    className="px-2 py-1 text-left border border-black cursor-pointer hover:bg-gray-200"
                    onClick={() => handleSort('author')}
                >
                    Autore{sortColumn !== 'author' ? ' ↕' : sortDirection === 'asc' ? ' ↑' : ' ↓'}
                </th>
                <th 
                    className="px-2 py-1 text-left border border-black cursor-pointer hover:bg-gray-200"
                    onClick={() => handleSort('score')}
                >
                    Punti{sortColumn !== 'score' ? ' ↕' : sortDirection === 'asc' ? ' ↑' : ' ↓'}
                </th>
                {headers.map((header,i) => (
                    <th 
                        key={header.toString()} 
                        className="px-2 py-1 text-left border border-black"
                    >
                        {i+1}
                    </th>
                ))}
            </tr>
        </thead>
        <tbody>
            {sortedSubmissions.map((submission, index) => <SubmissionRow key={submission._id.toString()} submission={submission} headers={headers} index={index + 1} rankMap={rankMap} accessToken={accessToken}/>)}
        </tbody>
    </table>
}

function SubmissionRow({submission, headers, index, rankMap, accessToken}:{
    submission: Submission
    headers: string[]
    index: number
    rankMap: Map<string, { rank: number, percentile: number }>
    accessToken?: string | null
}) {
    const map = Object.fromEntries(submission.answers.map(item => [item.note_id.toString(), item]))
    
    // Costruisci il link con il token se presente
    const getSubmissionLink = () => {
        if (accessToken) {
            return `/submission/${submission._id}?token=${accessToken}`
        }
        return `/submission/${submission._id}`
    }
    
    // Calcola il tempo impiegato
    const getDuration = () => {
        if (!submission.started_on || !submission.completed_on) return '-'
        const start = new Date(submission.started_on)
        const end = new Date(submission.completed_on)
        const diffMs = end.getTime() - start.getTime()
        return formatDuration(diffMs)
    }

    const getRank = () => {
        const rankData = rankMap.get(submission._id.toString())
        return rankData ? `${rankData.rank} (${rankData.percentile}%)` : '-'
    }
    
    return (
        <tr className="hover:bg-gray-50">
            <td className={`${COMMON_CLASSNAME} text-center`}>
                <Link href={getSubmissionLink()} className="block w-full h-full" target="_blank" rel="noopener noreferrer">
                    {index} 👁
                </Link>
            </td>
            <td className={`${COMMON_CLASSNAME} text-center`}>{getRank()}</td>
            <td className={COMMON_CLASSNAME}>{myTimestamp(submission.started_on)}</td>
            <td className={COMMON_CLASSNAME}>{myTimestamp(submission.completed_on)}</td>
            <td className={COMMON_CLASSNAME}>{getDuration()}</td>
            <td className={COMMON_CLASSNAME}>{submission.author.name}</td>
            <td className={COMMON_CLASSNAME}>{submission.score ? submission.score.toFixed(1) : ''}</td>
            { headers.map(id => <AnswerItem key={id} item={map[id]} />)}
        </tr>
    )

    function AnswerItem({item}: {item: AnswerItem}) {
        if (!item || item.answer == null) return alpha(null)
        if (item.permutation && typeof(item.answer) === 'number') {
            return alpha(item.permutation[item.answer])
        }
        return alpha(item.answer)

        function alpha(n: number|null) {
            const color = 
                n === 0 ? ' bg-green-100' : 
                n == null ? '' 
                : ' bg-red-100'

            return <td className={`${COMMON_CLASSNAME}${color}`}>
                {n == null ? '-' :n === 0 ? <b>A</b> : String.fromCharCode(65 + n)}
            </td>
        }
    }
}

import { TestStats } from '@/app/graphql/generated'
import ScoreDistributionChart from './ScoreDistributionChart'

export default function TestScoresTab({stats}: {stats: TestStats}) {
    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold mb-4">Riepilogo punteggi</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{stats.completed_submissions}</div>
                        <div className="text-sm text-gray-600">Test completati</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">{stats.incompleted_submissions}</div>
                        <div className="text-sm text-gray-600">Test non completati</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">{stats.score_distribution.length}</div>
                        <div className="text-sm text-gray-600">Fasce di punteggio</div>
                    </div>
                </div>
            </div>

            {/* Grafico distribuzione punteggi */}
            {stats.score_distribution.length > 0 && (
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-semibold mb-4">Distribuzione dei punteggi</h3>
                    <ScoreDistributionChart distribution={stats.score_distribution} />
                </div>
            )}

            {stats.completed_submissions < stats.min_submissions_for_stats && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                    <p className="text-yellow-800">
                        📊 Sono necessarie almeno {stats.min_submissions_for_stats} consegne per visualizzare le statistiche dettagliate.
                        Attualmente ci sono {stats.completed_submissions} consegne.
                    </p>
                </div>
            )}
        </div>
    )
}

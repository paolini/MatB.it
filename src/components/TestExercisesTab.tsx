import { TestStats } from '@/app/graphql/generated'
import ExerciseStatsTable from './TestExerciseStatsTable'
import ExerciseStatsChart from './TestExerciseStatsChart'

export default function TestExercisesTab({stats}: {stats: TestStats}) {
    const hasDetailedStats = stats.exercises.length > 0

    if (!hasDetailedStats) {
        return <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <p className="text-yellow-800">
                    📊 Sono necessarie almeno {stats.min_submissions_for_stats} consegne per visualizzare le statistiche per esercizio.
                </p>
        </div>
    }

    return <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold mb-4">Statistiche per esercizio</h3>
            {/* Grafico statistiche per esercizio */}
            <ExerciseStatsChart exercises={stats.exercises} />
            {/* Spazio verticale tra grafico e tabella */}
            <div className="my-8" />
            {/* Tabella statistiche */}
            <ExerciseStatsTable exercises={stats.exercises} />
            <div className="mt-4 text-sm text-gray-600">
                <p>💡 <strong>Legenda:</strong></p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                    <li><strong>Risposte corrette:</strong> numero di risposte che hanno ottenuto il punteggio massimo</li>
                    <li><strong>% Successo:</strong> percentuale di risposte corrette sul totale</li>
                    <li><strong>Punteggio medio:</strong> media dei punteggi ottenuti per questo esercizio</li>
                    <li><strong>Risposte vuote:</strong> numero di esercizi lasciati senza risposta</li>
                    <li><strong>Correlazione:</strong> quanto il punteggio nell'esercizio è legato al punteggio totale del test (valori vicini a 100% indicano forte correlazione, vicini a 0% nessuna correlazione)</li>
                </ul>
            </div>
        </div>
    </div>
}

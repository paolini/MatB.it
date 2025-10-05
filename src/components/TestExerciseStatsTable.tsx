export default function ExerciseStatsTable({exercises}: {exercises: any[]}) {
    return (
        <div className="max-w-3xl overflow-x-auto mb-6">
            <table className="w-full border-collapse border border-gray-300">
                <thead>
                    <tr className="bg-gray-50">
                        <th className="border border-gray-300 px-4 py-2 text-left">Esercizio</th>
                        <th className="border border-gray-300 px-4 py-2 text-center">Risposte totali</th>
                        <th className="border border-gray-300 px-4 py-2 text-center">Risposte corrette</th>
                        <th className="border border-gray-300 px-4 py-2 text-center">Risposte vuote</th>
                        <th className="border border-gray-300 px-4 py-2 text-center">% Successo</th>
                        <th className="border border-gray-300 px-4 py-2 text-center">Punteggio medio</th>
                        <th className="border border-gray-300 px-4 py-2 text-center">Correlazione</th>
                    </tr>
                </thead>
                <tbody>
                    {exercises.map((exercise, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                            <td className="border border-gray-300 px-4 py-2 font-medium">Esercizio {index + 1}</td>
                            <td className="border border-gray-300 px-4 py-2 text-center">{exercise.total_answers}</td>
                            <td className="border border-gray-300 px-4 py-2 text-center text-green-600 font-semibold">{exercise.correct_answers}</td>
                            <td className="border border-gray-300 px-4 py-2 text-center text-red-600">{exercise.empty_answers}</td>
                            <td className="border border-gray-300 px-4 py-2 text-center">
                                {exercise.total_answers > 0 ? Math.round((exercise.correct_answers / exercise.total_answers) * 100) : 0}%
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-center">
                                {exercise.average_score !== null ? (exercise.average_score * 100).toFixed(1) + '%' : 'N/A'}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-center">
                                {typeof exercise.correlation_to_total === 'number' && exercise.correlation_to_total !== null
                                    ? (exercise.correlation_to_total * 100).toFixed(1) + '%'
                                    : 'N/A'}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

import { memo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts'

const ExerciseStatisticsChart = memo(function ExerciseStatisticsChart({ exercises }: { exercises: any[] }) {
    if (exercises.length === 0) {
        return null
    }
    const chartData = exercises.map((exercise, index) => ({
        exercise: `Es. ${index + 1}`,
        successRate: exercise.total_answers > 0 
            ? Math.round((exercise.correct_answers / exercise.total_answers) * 100)
            : 0,
        averageScore: exercise.average_score !== null 
            ? Math.round(exercise.average_score * 100)
            : 0,
        totalAnswers: exercise.total_answers,
        correctAnswers: exercise.correct_answers,
        emptyAnswers: exercise.empty_answers
    }))
    return (
        <div>
            <div className="text-sm text-gray-600 mb-4">
                Percentuale di successo e punteggio medio per ciascun esercizio
            </div>
            <div className="w-full h-80">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={chartData}
                        margin={{
                            top: 20,
                            right: 30,
                            left: 20,
                            bottom: 5,
                        }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis 
                            dataKey="exercise" 
                            stroke="#666"
                            fontSize={12}
                        />
                        <YAxis 
                            stroke="#666"
                            fontSize={12}
                            domain={[0, 100]}
                            tickFormatter={(value: any) => `${value}%`}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#f8f9fa',
                                border: '1px solid #dee2e6',
                                borderRadius: '6px',
                                fontSize: '14px'
                            }}
                            formatter={(value: any, name: any) => {
                                const label = name === 'successRate' 
                                    ? 'Percentuale successo'
                                    : 'Punteggio medio'
                                return [`${value}%`, label]
                            }}
                            labelFormatter={(label: any, payload: any) => {
                                if (payload && payload.length > 0) {
                                    const data = payload[0].payload
                                    return `${label} - Totali: ${data.totalAnswers} | Corrette: ${data.correctAnswers} | Vuote: ${data.emptyAnswers}`
                                }
                                return label
                            }}
                        />
                        <Bar 
                            dataKey="successRate" 
                            fill="#10b981"
                            name="successRate"
                            radius={[2, 2, 0, 0]}
                            stroke="#059669"
                            strokeWidth={1}
                        >
                            <LabelList 
                                dataKey="successRate" 
                                position="top" 
                                formatter={(value: any) => `${value}%`}
                                fontSize={10}
                                fill="#059669"
                            />
                        </Bar>
                        <Bar 
                            dataKey="averageScore" 
                            fill="#3b82f6"
                            name="averageScore"
                            radius={[2, 2, 0, 0]}
                            stroke="#2563eb"
                            strokeWidth={1}
                        >
                            <LabelList 
                                dataKey="averageScore" 
                                position="top" 
                                formatter={(value: any) => `${value}%`}
                                fontSize={10}
                                fill="#2563eb"
                            />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
            <div className="mt-2 flex justify-center space-x-6 text-sm">
                <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded"></div>
                    <span>Percentuale successo</span>
                </div>
                <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-500 rounded"></div>
                    <span>Punteggio medio</span>
                </div>
            </div>
        </div>
    )
})

export default function ExerciseStatsChart({exercises}: {exercises: any[]}) {
    return (
        <div>
            <h4 className="text-md font-semibold mb-3">Grafico prestazioni per esercizio</h4>
            <ExerciseStatisticsChart exercises={exercises} />
        </div>
    )
}

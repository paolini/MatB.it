import { memo } from 'react'
import { ScoreDistributionEntry } from '@/app/graphql/generated'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts'

const ScoreDistributionChart = memo(function ScoreDistributionChart({ distribution }: { distribution: ScoreDistributionEntry[] }) {
    if (distribution.length === 0) {
        return (
            <div className="text-center text-gray-500 py-4">
                Nessun dato disponibile
            </div>
        )
    }
    const chartData = distribution.map(entry => {
        const min = entry.score_min.toFixed(1);
        const max = entry.score_max.toFixed(1);
        return {
            scoreRange: max > min ? `${min}-${max}` : `${min}`,
            count: entry.count,
            label: max > min ? `${entry.score_min} - ${entry.score_max} punti` : `${entry.score_min} punti`
        }
    })
    return (
        <div>
            <div className="text-sm text-gray-600 mb-4">
                Numero di studenti per fascia di punteggio
            </div>
            <div className="w-full h-80 overflow-x-auto" style={{ width: chartData.length * 120 }}>
                <ResponsiveContainer width="100%" height={320}>
                    <BarChart
                        data={chartData}
                        margin={{
                            top: 20,
                            right: 30,
                            left: 20,
                            bottom: 60,
                        }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis 
                            dataKey="scoreRange" 
                            stroke="#666"
                            fontSize={12}
                            angle={-45}
                            textAnchor="end"
                            height={60}
                        />
                        <YAxis 
                            stroke="#666"
                            fontSize={12}
                            tickFormatter={(value) => Math.round(value).toString()}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#f8f9fa',
                                border: '1px solid #dee2e6',
                                borderRadius: '6px',
                                fontSize: '14px'
                            }}
                            formatter={(value, name) => [
                                `${value} ${value === 1 ? 'studente' : 'studenti'}`, 
                                'Numero di studenti'
                            ]}
                            labelFormatter={(label) => `Fascia: ${label} punti`}
                        />
                        <Bar 
                            dataKey="count" 
                            fill="#3b82f6"
                            radius={[4, 4, 0, 0]}
                            stroke="#2563eb"
                            strokeWidth={1}
                        >
                            <LabelList 
                                dataKey="count" 
                                position="top" 
                                fontSize={10}
                                fill="#2563eb"
                            />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
})

export default ScoreDistributionChart

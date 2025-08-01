import { Test } from '@/app/graphql/generated'

export default function TestList({ tests }: { tests: Test[] }) {
    if (!tests || tests.length === 0) return null
    return (
        <div className="mt-4">
            <h2 className="text-lg font-semibold mb-2">Test associati</h2>
            <ul className="space-y-2">
                {tests.map(test => (
                    <li key={test._id} className="border rounded p-2">
                        <span className="font-bold">Creato il:</span> {new Date(test.created_on).toLocaleString()}<br/>
                        <span className="font-bold">Autore:</span> {String(test.author_id)}<br/>
                        {test.description && <span className="font-bold">Descrizione:</span>} {test.description}
                    </li>
                ))}
            </ul>
        </div>
    )
}

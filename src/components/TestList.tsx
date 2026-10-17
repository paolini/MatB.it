import { Test } from '@/app/graphql/generated'

export default function TestList({ tests }: { tests: Test[] | null }) {
    if (!tests || tests.length === 0) return null
    return (
        <section className="mt-6 border-t border-gray-200 pt-4" aria-labelledby="note-tests-title">
            <h2 id="note-tests-title" className="text-lg font-semibold">Test associati</h2>
            <ul className="mt-2 list-disc pl-5 space-y-1">
                {tests.map(test => <TestListItem key={test._id.toString()} test={test} />)}
            </ul>
        </section>
    )
}

function TestListItem({ test }: { test: Test }) {
    return <li>
        <a href={`/test/${test._id}`} className="text-blue-600 hover:underline">
            {test.title ? `${test.title} — ` : ''}
            Test del {new Date(test.open_on || test.created_on).toLocaleString()}
        </a>
    </li>
}

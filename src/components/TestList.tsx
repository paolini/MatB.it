import { Test } from '@/app/graphql/generated'

export default function TestList({ tests }: { tests: Test[] | null }) {
    if (!tests || tests.length === 0) return null
    return (
        <div className="mt-4">
            <h2 className="text-lg font-semibold mb-2">Test associati</h2>
            <ul className="space-y-2">
                {tests.map(test => <TestListItem key={test._id.toString()} test={test} />)}
            </ul>
        </div>
    )
}

function TestListItem({ test }: { test: Test }) {
    return <li className="border rounded p-2">
        <a href={`/test/${test._id}`}><span className="font-bold">Test del </span> {new Date(test.open_on || test.created_on).toLocaleString()}<br/>
        {test.title || ""}
        </a>
    </li>
}
"use client"
import { gql, useQuery } from "@apollo/client"
import Link from 'next/link'

import { Loading, Error } from "@/components/utils"
import { Profile, Test } from "@/app/graphql/generated"
import { myTimestamp } from "@/lib/utils"

const notesQuery = gql`
    query Tests {
        tests {
            _id
            title
            created_on
            open_on
            close_on
            author_id
            author {
                name
            }
        }
        profile {
            _id    
        }
    }
`
export default function Tests() {
    const { loading, error, data } = useQuery(notesQuery)
    if (loading) return <Loading />
    if (error) return <Error error={error} />

    const {tests, profile} = data

    return <>
        { tests.length === 0 && (
            <div className="text-center text-gray-500">
                Nessun test trovato.
            </div>
        )}
        
        { tests.length > 0 && <>
                <h2 className="text-2xl font-bold text-center">Test</h2>
                <div className="flex flex-col gap-4">
                    {tests.map((test: Test) =>
                            <TestItem key={test._id} test={test} profile={profile}/>
                        )}
                </div>
            </>
        }
    </>
}

function TestItem({ test, profile }: { 
    test: Test 
    profile: Profile | null
}) {
    const now = new Date()
    const isMine = test.author_id === profile?._id
    const isOpen = (!test.open_on || new Date(test.open_on) <= now) 
        && (!test.close_on || new Date(test.close_on) >= now)
        
    return <Link href={`/test/${test._id}`}>
        <div className={`border rounded p-2 ${isMine ? "alert-color" : isOpen ? "good-color" : "default-color"}`}>
            <span className="font-bold">Test del:</span> {myTimestamp(test.open_on || test.created_on)}<br/>
            { isOpen && test.close_on && <>
                <span className="font-bold">Chiusura:</span> {myTimestamp(test.close_on)}<br/>
            </>}
            {test.title || ""}
        </div>
    </Link>
}

"use client"
import { gql, useQuery } from '@apollo/client'

import { Test, Profile } from '@/app/graphql/generated'
import { Loading, Error } from '@/components/utils'

const TestQuery = gql`
    query Test($_id: ObjectId!) {
        test(_id: $_id) {
            _id
            title
            created_on
            open_on 
            close_on
        }
        profile {
            _id
        }
    }
`

export default function TestWrapper({_id}: {_id: string}) {
    const { loading, error, data, refetch } = useQuery<{test: Test, profile: Profile}>(
        TestQuery, {variables: { _id }})

    if (error) return <Error error={error} />    
    if (loading || !data) return <Loading />

    const test = data?.test 
    const profile = data?.profile
    

    return <div className="matbit-test">
        <h1>
            {test.title || `Test ${test._id}`}
        </h1>
    </div>
}


'use client'

import { useQuery, gql } from '@apollo/client'
import { Classes } from '@/components/Classes'

const GET_PROFILE = gql`
  query GetProfile {
    profile {
      _id
      name
      email
    }
  }
`

export default function ClassesPage() {
  const { data: profileData } = useQuery(GET_PROFILE)
  const currentUserId = profileData?.profile?._id

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <Classes currentUserId={currentUserId} />
    </div>
  )
}
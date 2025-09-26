'use client'

import { useParams } from 'next/navigation'
import { useQuery, gql } from '@apollo/client'
import { Class } from '@/components/Class'

const GET_PROFILE = gql`
  query GetProfile {
    profile {
      _id
      name
      email
    }
  }
`

export default function ClassPage() {
  const params = useParams()
  const classId = params._id as string

  const { data: profileData } = useQuery(GET_PROFILE)
  const currentUserId = profileData?.profile?._id

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <Class 
        classId={classId} 
        currentUserId={currentUserId}
      />
    </div>
  )
}
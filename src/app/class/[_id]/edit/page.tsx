'use client'

import { useParams } from 'next/navigation'
import { useQuery, gql } from '@apollo/client'
import { ClassForm } from '@/components/ClassForm'
import { Error } from '@/components/utils'

const GET_CLASS_FOR_EDIT = gql`
  query GetClassForEdit($id: ObjectId!) {
    class(_id: $id) {
      _id
      name
      description
      academic_year
      active
      owner_id
    }
    profile {
      _id
    }
  }
`

export default function EditClassPage() {
  const params = useParams()
  const classId = params._id as string

  const { data, loading, error } = useQuery(GET_CLASS_FOR_EDIT, {
    variables: { id: classId },
    fetchPolicy: 'network-only',
  })

  if (loading) return <div className="p-8">Caricamento...</div>
  if (error) return <Error error={error} />
  if (!data?.class) return <div className="p-8">Classe non trovata</div>

  const classData = data.class
  if (data.profile?._id !== classData.owner_id) {
    return <div className="p-8">Solo il proprietario può modificare la classe</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <ClassForm
        isEditing
        initialData={{
          _id: classData._id,
          name: classData.name,
          description: classData.description ?? '',
          academic_year: classData.academic_year ?? '',
          active: classData.active,
        }}
      />
    </div>
  )
}

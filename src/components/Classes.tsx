import { useState } from 'react'
import { gql, useQuery } from '@apollo/client'
import Link from 'next/link'

// Componente Badge semplice
const Badge = ({ children, variant = 'default' }: { children: React.ReactNode, variant?: 'default' | 'secondary' }) => (
  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
    variant === 'secondary' 
      ? 'bg-gray-100 text-gray-600' 
      : 'bg-blue-100 text-blue-800'
  }`}>
    {children}
  </span>
)

const GET_CLASSES = gql`
  query GetClasses {
    classes {
      _id
      name
      description
      owner_id
      owner {
        _id
        name
      }
      teachers {
        _id
        name
      }
      students {
        _id
        name
      }
      created_on
      academic_year
      active
    }
  }
`

type ClassesProps = {
  currentUserId?: string
}

export function Classes({ currentUserId }: ClassesProps) {
  const { data, loading, error } = useQuery(GET_CLASSES, {
    variables: {
    }
  })

  if (loading) return <div className="p-6">Caricamento...</div>
  if (error) return <div className="p-6 text-red-500">Errore: {error.message}</div>

  const classes = data?.classes || []

  const getRoleIcon = (classData: any) => {
    const isOwner = currentUserId === classData.owner_id
    const isTeacher = classData.teachers.some((t: any) => t._id === currentUserId)
    const isStudent = classData.students.some((s: any) => s._id === currentUserId)

    if (isOwner) return '👑'
    if (isTeacher) return '👨‍🏫'
    if (isStudent) return '🎓'
    return '👤'
  }

  const getRoleText = (classData: any) => {
    const isOwner = currentUserId === classData.owner_id
    const isTeacher = classData.teachers.some((t: any) => t._id === currentUserId)
    const isStudent = classData.students.some((s: any) => s._id === currentUserId)

    if (isOwner) return 'Proprietario'
    if (isTeacher) return 'Insegnante'
    if (isStudent) return 'Studente'
    return 'Ospite'
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Le Mie Classi</h1>
        <Link
          href="/classes/new"
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
        >
          + Nuova Classe
        </Link>
      </div>

      {/* Lista classi */}
      {classes.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg mb-4">
            {'Nessuna classe'}
          </p>
          <Link
            href="/classes/new"
            className="inline-block px-6 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            Crea la tua prima classe
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((classData: any) => (
            <Link
              key={classData._id}
              href={`/class/${classData._id}`}
              className="block bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{getRoleIcon(classData)}</span>
                  <h3 className="font-semibold text-lg">{classData.name}</h3>
                </div>
                {!classData.active && (
                  <Badge variant="secondary">Archiviata</Badge>
                )}
              </div>

              {classData.description && (
                <p className="text-gray-600 mb-3 line-clamp-2">
                  {classData.description}
                </p>
              )}

              <div className="space-y-2 mb-4">
                {classData.academic_year && (
                  <div className="text-sm text-gray-500">
                    A.A. {classData.academic_year}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>{getRoleText(classData)}</span>
                <div className="flex gap-3">
                  <span>👨‍🏫 {classData.teachers.length}</span>
                  <span>🎓 {classData.students.length}</span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t text-xs text-gray-400">
                Creata il {new Date(classData.created_on).toLocaleDateString()}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
import { useState } from 'react'
import { gql, useQuery, useMutation } from '@apollo/client'

// Componente Badge semplice per le classi
const Badge = ({ children, variant = 'default' }: { children: React.ReactNode, variant?: 'default' | 'secondary' }) => (
  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
    variant === 'secondary' 
      ? 'bg-gray-100 text-gray-600' 
      : 'bg-blue-100 text-blue-800'
  }`}>
    {children}
  </span>
)

const GET_CLASS = gql`
  query GetClass($id: ObjectId!) {
    class(_id: $id) {
      _id
      name
      description
      owner_id
      owner {
        _id
        name
        email
      }
      teachers {
        _id
        name
        email
      }
      students {
        _id
        name
        email
      }
      created_on
      academic_year
      subject
      active
    }
  }
`

const ADD_STUDENT_TO_CLASS = gql`
  mutation AddStudentToClass($classId: ObjectId!, $userId: ObjectId!) {
    addStudentToClass(class_id: $classId, user_id: $userId)
  }
`

const REMOVE_STUDENT_FROM_CLASS = gql`
  mutation RemoveStudentFromClass($classId: ObjectId!, $userId: ObjectId!) {
    removeStudentFromClass(class_id: $classId, user_id: $userId)
  }
`

const ADD_TEACHER_TO_CLASS = gql`
  mutation AddTeacherToClass($classId: ObjectId!, $userId: ObjectId!) {
    addTeacherToClass(class_id: $classId, user_id: $userId)
  }
`

const REMOVE_TEACHER_FROM_CLASS = gql`
  mutation RemoveTeacherFromClass($classId: ObjectId!, $userId: ObjectId!) {
    removeTeacherFromClass(class_id: $classId, user_id: $userId)
  }
`

type ClassProps = {
  classId: string
  currentUserId?: string
}

export function Class({ classId, currentUserId }: ClassProps) {
  const [newMemberEmail, setNewMemberEmail] = useState('')
  const [memberType, setMemberType] = useState<'student' | 'teacher'>('student')

  const { data, loading, error, refetch } = useQuery(GET_CLASS, {
    variables: { id: classId }
  })

  const [addStudent] = useMutation(ADD_STUDENT_TO_CLASS, {
    onCompleted: () => refetch()
  })

  const [removeStudent] = useMutation(REMOVE_STUDENT_FROM_CLASS, {
    onCompleted: () => refetch()
  })

  const [addTeacher] = useMutation(ADD_TEACHER_TO_CLASS, {
    onCompleted: () => refetch()
  })

  const [removeTeacher] = useMutation(REMOVE_TEACHER_FROM_CLASS, {
    onCompleted: () => refetch()
  })

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>
  if (!data?.class) return <div>Classe non trovata</div>

  const classData = data.class
  const isOwner = currentUserId === classData.owner_id
  const isTeacher = classData.teachers.some((t: any) => t._id === currentUserId)
  const isStudent = classData.students.some((s: any) => s._id === currentUserId)
  const canManage = isOwner || isTeacher

  const handleRemoveMember = async (userId: string, type: 'student' | 'teacher') => {
    if (!confirm(`Sei sicuro di voler rimuovere questo ${type === 'student' ? 'studente' : 'insegnante'}?`)) {
      return
    }

    try {
      if (type === 'student') {
        await removeStudent({ variables: { classId, userId } })
      } else {
        await removeTeacher({ variables: { classId, userId } })
      }
    } catch (err) {
      alert('Errore nella rimozione del membro')
    }
  }

  const handleAddMember = async () => {
    // TODO: Implementare ricerca utente per email
    // Per ora questo è un placeholder
    alert('Funzionalità di aggiunta membri non ancora implementata')
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold">{classData.name}</h1>
          {!classData.active && (
            <Badge variant="secondary">Archiviata</Badge>
          )}
          {classData.subject && (
            <Badge>{classData.subject}</Badge>
          )}
        </div>
        
        {classData.description && (
          <p className="text-gray-600 mb-2">{classData.description}</p>
        )}
        
        <div className="flex gap-4 text-sm text-gray-500">
          {classData.academic_year && (
            <span>Anno Accademico: {classData.academic_year}</span>
          )}
          <span>Creata il: {new Date(classData.created_on).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Owner */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
          👑 Proprietario
        </h2>
        <div className="bg-yellow-50 p-3 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="font-medium">{classData.owner.name}</span>
            <span className="text-gray-500">{classData.owner.email}</span>
          </div>
        </div>
      </div>

      {/* Teachers */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
          👨‍🏫 Insegnanti ({classData.teachers.length})
        </h2>
        <div className="space-y-2">
          {classData.teachers.map((teacher: any) => (
            <div key={teacher._id} className="bg-blue-50 p-3 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="font-medium">{teacher.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">{teacher.email}</span>
                  {isOwner && (
                    <button
                      onClick={() => handleRemoveMember(teacher._id, 'teacher')}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Rimuovi
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {classData.teachers.length === 0 && (
            <p className="text-gray-500 italic">Nessun insegnante aggiunto</p>
          )}
        </div>
      </div>

      {/* Students */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
          🎓 Studenti ({classData.students.length})
        </h2>
        <div className="space-y-2">
          {classData.students.map((student: any) => (
            <div key={student._id} className="bg-green-50 p-3 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="font-medium">{student.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">{student.email}</span>
                  {canManage && (
                    <button
                      onClick={() => handleRemoveMember(student._id, 'student')}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Rimuovi
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {classData.students.length === 0 && (
            <p className="text-gray-500 italic">Nessuno studente iscritto</p>
          )}
        </div>
      </div>

      {/* Add Members - Solo per owner e teacher */}
      {canManage && (
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-3">Aggiungi Membri</h3>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Email Utente</label>
              <input
                type="email"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Ruolo</label>
              <select
                value={memberType}
                onChange={(e) => setMemberType(e.target.value as 'student' | 'teacher')}
                className="p-2 border border-gray-300 rounded-md"
              >
                <option value="student">Studente</option>
                {isOwner && <option value="teacher">Insegnante</option>}
              </select>
            </div>
            <button
              onClick={handleAddMember}
              disabled={!newMemberEmail.trim()}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
            >
              Aggiungi
            </button>
          </div>
        </div>
      )}

      {/* User Role Badge */}
      <div className="mt-6 pt-6 border-t">
        <p className="text-sm text-gray-500">
          Il tuo ruolo in questa classe: {' '}
          <Badge>
            {isOwner ? '👑 Proprietario' : isTeacher ? '👨‍🏫 Insegnante' : isStudent ? '🎓 Studente' : '👤 Ospite'}
          </Badge>
        </p>
      </div>
    </div>
  )
}
import { gql, useQuery, useMutation } from '@apollo/client'
import { useState, useEffect } from 'react'
import { ClassEnrollmentCodes } from './ClassEnrollmentCodes'
import { useSearchParams, usePathname } from 'next/navigation'
import { BUTTON_CLASS, Error } from './utils'
import { ObjectId } from 'bson'
import { myTimestamp } from '@/lib/utils'

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
      student_enrollment_url
      teacher_enrollment_url
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

const DELETE_CLASS = gql`
  mutation DeleteClass($_id: ObjectId!) {
    deleteClass(_id: $_id)
  }
`

type ClassProps = {
  classId: string
  currentUserId?: string
}

export function Class({ classId, currentUserId }: ClassProps) {
  const [newMemberEmail, setNewMemberEmail] = useState('')
  const [memberType, setMemberType] = useState<'student' | 'teacher'>('student')
  const [enrollmentCode, setEnrollmentCode] = useState('')
  const [enrollmentError, setEnrollmentError] = useState<string|null>(null)
  const [activeTab, setActiveTab] = useState<'notes' | 'tests' | 'teachers' | 'students' | 'manage'>('tests')

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

  const [deleteClassMutation, { loading: deletingClass, error: deleteError }] = useMutation(DELETE_CLASS)

  const searchParams = useSearchParams()
  const pathname = usePathname()

  useEffect(() => {
    // Path: /class/ID/CODICE
    const parts = pathname.split('/')
    // Cerca il codice dopo l'ID della classe
    const idx = parts.findIndex(p => p === classId)
    const codeFromUrl = idx !== -1 && parts.length > idx + 1 ? parts[idx + 1] : ''
    if (codeFromUrl) {
      setEnrollmentCode(codeFromUrl)
    }
  }, [pathname, classId])

  if (loading) return <div>Loading...</div>
  if (error) return <Error error={error} />
  if (!data?.class) return <div>Classe non trovata</div>

  const classData = data.class
  const isOwner = currentUserId === classData.owner_id
  const isTeacher = classData.teachers.some((t: any) => t._id === currentUserId)
  const isStudent = classData.students.some((s: any) => s._id === currentUserId)
  const canManage = isOwner || isTeacher
  const isMember = isOwner || isTeacher || isStudent

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
          {classData.description && (
            <span>{classData.description}</span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b flex gap-2">
        <button
          className={`px-4 py-2 -mb-px border-b-2 font-medium ${activeTab === 'notes' ? 'border-blue-500 text-blue-700' : 'border-transparent text-gray-500'}`}
          onClick={() => setActiveTab('notes')}
        >Note</button>
        <button
          className={`px-4 py-2 -mb-px border-b-2 font-medium ${activeTab === 'tests' ? 'border-blue-500 text-blue-700' : 'border-transparent text-gray-500'}`}
          onClick={() => setActiveTab('tests')}
        >Test</button>
        <button
          className={`px-4 py-2 -mb-px border-b-2 font-medium ${activeTab === 'teachers' ? 'border-blue-500 text-blue-700' : 'border-transparent text-gray-500'}`}
          onClick={() => setActiveTab('teachers')}
        >Docenti</button>
        <button
          className={`px-4 py-2 -mb-px border-b-2 font-medium ${activeTab === 'students' ? 'border-blue-500 text-blue-700' : 'border-transparent text-gray-500'}`}
          onClick={() => setActiveTab('students')}
        >Studenti</button>
        {canManage && (
          <button
            className={`px-4 py-2 -mb-px border-b-2 font-medium ${activeTab === 'manage' ? 'border-blue-500 text-blue-700' : 'border-transparent text-gray-500'}`}
            onClick={() => setActiveTab('manage')}
          >Gestione classe</button>
        )}
      </div>

      {/* Tab Content */}
      <div className="mt-4">
        {activeTab === 'notes' && (
          <div>
            <h2 className="text-xl font-semibold mb-3">Note della classe</h2>
            <p className="text-gray-500 italic">(Qui verranno mostrate le note della classe)</p>
          </div>
        )}
        {activeTab === 'tests' && (
          <div>
            <h2 className="text-xl font-semibold mb-3">Test della classe</h2>
            <p className="text-gray-500 italic">(Qui verranno mostrati i test della classe)</p>
          </div>
        )}
        {activeTab === 'teachers' && (
          <ClassTeachers teachers={classData.teachers} isOwner={isOwner} handleRemoveMember={handleRemoveMember} />
        )}
        {activeTab === 'students' && (
          <ClassStudents students={classData.students} canManage={canManage} handleRemoveMember={handleRemoveMember} />
        )}
        {activeTab === 'manage' && canManage && (
          <div className="border-t pt-6 space-y-8">
            <div>
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
              <ClassEnrollmentCodes
                classData={classData}
                refetch={refetch}
              />
            </div>
            {isOwner && (
              <div>
                <button
                  className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                  disabled={deletingClass}
                  onClick={async () => {
                    if (confirm('Sei sicuro di voler eliminare questa classe? L\'operazione è irreversibile.')) {
                      await deleteClassMutation({ variables: { _id: classId } })
                      window.location.href = '/classes'
                    }
                  }}
                >
                  Elimina classe
                </button>
                <Error error={deleteError} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* User Role Badge */}
      <div className="mt-6 pt-6 border-t">
        <p className="text-sm text-gray-500">
          Il tuo ruolo in questa classe: {' '}
          <Badge>
            {isOwner ? '👑 Proprietario' : isTeacher ? '👨‍🏫 Insegnante' : isStudent ? '🎓 Studente' : '👤 Ospite'}
          </Badge>
        </p>
      </div>

      <div className="mt-4 text-xs text-gray-400">
        classe creata da: {classData.owner.email}
        {' '} il: {myTimestamp(classData.created_on)}
      </div>
    </div>
  )
}

function ClassTeachers({ teachers, isOwner, handleRemoveMember }: { teachers: any[], isOwner: boolean, handleRemoveMember: (id: string, type: 'teacher') => void }) {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
        Docenti ({teachers.length})
      </h2>
      <div className="space-y-2">
        {teachers.map((teacher: any) => (
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
        {teachers.length === 0 && (
          <p className="text-gray-500 italic">Nessun insegnante aggiunto</p>
        )}
      </div>
    </div>
  );
}

function ClassStudents({ students, canManage, handleRemoveMember }: { students: any[], canManage: boolean, handleRemoveMember: (id: string, type: 'student') => void }) {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
        Studenti ({students.length})
      </h2>
      <div className="space-y-2">
        {students.map((student: any) => (
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
        {students.length === 0 && (
          <p className="text-gray-500 italic">Nessuno studente iscritto</p>
        )}
      </div>
    </div>
  );
}


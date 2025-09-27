import { useState } from 'react'
import { gql, useMutation } from '@apollo/client'
import { useRouter } from 'next/navigation'

const CREATE_CLASS = gql`
  mutation CreateClass($name: String!, $description: String, $academicYear: String) {
    newClass(name: $name, description: $description, academic_year: $academicYear)
  }
`

const UPDATE_CLASS = gql`
  mutation UpdateClass($id: ObjectId!, $name: String, $description: String, $active: Boolean) {
    updateClass(_id: $id, name: $name, description: $description, active: $active) {
      _id
      name
      description
      active
    }
  }
`

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

type ClassFormProps = {
  initialData?: {
    _id?: string
    name: string
    description?: string
    academic_year?: string
    active?: boolean
  }
  isEditing?: boolean
}

export function ClassForm({ initialData, isEditing = false }: ClassFormProps) {
  const router = useRouter()
  
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    description: initialData?.description || '',
    academic_year: initialData?.academic_year || '',
    active: initialData?.active !== false
  })

  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [createClass] = useMutation(CREATE_CLASS, {
    refetchQueries: [{ query: GET_CLASSES }],
    onCompleted: (data) => {
      router.push(`/class/${data.newClass}`)
    },
    onError: (error) => {
      setErrors({ submit: error.message })
      setIsSubmitting(false)
    }
  })

  const [updateClass] = useMutation(UPDATE_CLASS, {
    onCompleted: () => {
      router.push(`/class/${initialData?._id}`)
    },
    onError: (error) => {
      setErrors({ submit: error.message })
      setIsSubmitting(false)
    }
  })

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Il nome della classe è obbligatorio'
    } else if (formData.name.trim().length > 100) {
      newErrors.name = 'Il nome non può superare i 100 caratteri'
    }

    if (formData.description.length > 500) {
      newErrors.description = 'La descrizione non può superare i 500 caratteri'
    }

    if (formData.academic_year.length > 20) {
      newErrors.academic_year = 'L\'anno accademico non può superare i 20 caratteri'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsSubmitting(true)
    setErrors({})

    try {
      if (isEditing && initialData?._id) {
        await updateClass({
          variables: {
            id: initialData._id,
            name: formData.name.trim() || undefined,
            description: formData.description.trim() || undefined,
            active: formData.active
          }
        })
      } else {
        await createClass({
          variables: {
            name: formData.name.trim(),
            description: formData.description.trim() || undefined,
            academicYear: formData.academic_year.trim() || undefined
          }
        })
      }
    } catch (error) {
      // Errore gestito dai mutation handlers
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
      <h1 className="text-3xl font-bold mb-6">
        {isEditing ? 'Modifica Classe' : 'Crea Nuova Classe'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Nome */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Nome Classe *
          </label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="es. 3A Scientifico, Analisi I - 2024"
            className={`w-full p-3 border rounded-md ${
              errors.name ? 'border-red-300' : 'border-gray-300'
            } focus:ring-blue-500 focus:border-blue-500`}
            disabled={isSubmitting}
          />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
        </div>

        {/* Descrizione */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Descrizione
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="Descrizione opzionale della classe..."
            rows={4}
            className={`w-full p-3 border rounded-md ${
              errors.description ? 'border-red-300' : 'border-gray-300'
            } focus:ring-blue-500 focus:border-blue-500`}
            disabled={isSubmitting}
          />
          {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
          <p className="mt-1 text-sm text-gray-500">
            {formData.description.length}/500 caratteri
          </p>
        </div>

        {!isEditing && (
          <>
            {/* Anno Accademico */}
            <div>
              <label htmlFor="academic_year" className="block text-sm font-medium text-gray-700 mb-1">
                Anno Accademico
              </label>
              <input
                type="text"
                id="academic_year"
                value={formData.academic_year}
                onChange={(e) => handleInputChange('academic_year', e.target.value)}
                placeholder="es. 2023/2024"
                className={`w-full p-3 border rounded-md ${
                  errors.academic_year ? 'border-red-300' : 'border-gray-300'
                } focus:ring-blue-500 focus:border-blue-500`}
                disabled={isSubmitting}
              />
              {errors.academic_year && <p className="mt-1 text-sm text-red-600">{errors.academic_year}</p>}
            </div>
          </>
        )}

        {/* Attivo (solo in modalità editing) */}
        {isEditing && (
          <div className="flex items-center">
            <input
              type="checkbox"
              id="active"
              checked={formData.active}
              onChange={(e) => handleInputChange('active', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              disabled={isSubmitting}
            />
            <label htmlFor="active" className="ml-2 block text-sm text-gray-700">
              Classe attiva
            </label>
          </div>
        )}

        {/* Errore submit */}
        {errors.submit && (
          <div className="bg-red-50 border border-red-300 rounded-md p-3">
            <p className="text-sm text-red-700">{errors.submit}</p>
          </div>
        )}

        {/* Pulsanti */}
        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className={`flex-1 py-3 px-4 rounded-md font-medium transition-colors ${
              isSubmitting
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {isSubmitting 
              ? (isEditing ? 'Salvando...' : 'Creando...') 
              : (isEditing ? 'Salva Modifiche' : 'Crea Classe')
            }
          </button>
          
          <button
            type="button"
            onClick={() => router.back()}
            disabled={isSubmitting}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            Annulla
          </button>
        </div>
      </form>
    </div>
  )
}
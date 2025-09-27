import React, { useState } from 'react';
import { gql, useMutation } from '@apollo/client';
import { EDIT_BUTTON_CLASS, BUTTON_CLASS, DELETE_BUTTON_CLASS } from './utils';

const GENERATE_ENROLLMENT_CODE = gql`
  mutation GenerateEnrollmentCode($classId: ObjectId!, $role: String!) {
    generateEnrollmentCode(class_id: $classId, role: $role)
  }
`;

const DELETE_ENROLLMENT_CODE = gql`
  mutation DeleteEnrollmentCode($classId: ObjectId!, $role: String!) {
    deleteEnrollmentCode(class_id: $classId, role: $role)
  }
`;

interface Props {
  classData: any;
  refetch?: () => void;
}

export const ClassEnrollmentCodes: React.FC<Props> = ({ classData, refetch }) => {
  const classId = classData._id;
  const studentUrl = classData.student_enrollment_url;
  const teacherUrl = classData.teacher_enrollment_url;
  const [generateEnrollmentCode] = useMutation(GENERATE_ENROLLMENT_CODE)
  const [deleteEnrollmentCode] = useMutation(DELETE_ENROLLMENT_CODE)
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<'student' | 'teacher' | null>(null);

  const handleGenerate = async (role: 'student' | 'teacher') => {
    setLoading(true)
    try {
      await generateEnrollmentCode({ variables: { classId, role } })
      if (refetch) refetch()
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (role: 'student' | 'teacher') => {
    if (!window.confirm('Vuoi davvero cancellare il codice di arruolamento?')) return
    setLoading(true)
    try {
      await deleteEnrollmentCode({ variables: { classId, role } })
      if (refetch) refetch()
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = (code: string, role: 'student' | 'teacher') => {
    navigator.clipboard.writeText(code);
    setCopied(role);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="p-4 border rounded bg-gray-50 mt-4">
      <h2 className="font-bold mb-2">Codici di arruolamento</h2>
      <div className="mb-4">
        <div className="font-semibold">Studenti</div>
        {studentUrl ? (
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm bg-white px-2 py-1 rounded border">{studentUrl}</span>
            <button className={BUTTON_CLASS} onClick={() => handleCopy(studentUrl, 'student')}>Copia</button>
            <button className={DELETE_BUTTON_CLASS} onClick={() => handleDelete('student')}>Cancella</button>
            {copied === 'student' && <span className="text-green-600 ml-2">Copiato!</span>}
          </div>
        ) : (
          <button className={EDIT_BUTTON_CLASS} onClick={() => handleGenerate('student')} disabled={loading}>Genera nuovo codice</button>
        )}
      </div>
      <div>
        <div className="font-semibold">Docenti</div>
        {teacherUrl ? (
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm bg-white px-2 py-1 rounded border">{teacherUrl}</span>
            <button className={BUTTON_CLASS} onClick={() => handleCopy(teacherUrl, 'teacher')}>Copia</button>
            <button className={DELETE_BUTTON_CLASS} onClick={() => handleDelete('teacher')}>Cancella</button>
            {copied === 'teacher' && <span className="text-green-600 ml-2">Copiato!</span>}
          </div>
        ) : (
          <button className={EDIT_BUTTON_CLASS} onClick={() => handleGenerate('teacher')} disabled={loading}>Genera nuovo codice</button>
        )}
      </div>
    </div>
  );
};

export default ClassEnrollmentCodes;

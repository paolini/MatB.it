"use client";
import { use, useEffect, useState } from 'react';
import { gql, useQuery, useMutation } from '@apollo/client';
import { Error, Loading } from '@/components/utils';
import { useRouter } from 'next/navigation';

const ENROLL_WITH_CODE = gql`
  mutation EnrollWithCode($code: String!) {
    enrollWithCode(code: $code)
  }
`;

const ACCESS_TOKEN_QUERY = gql`
  query AccessToken($secret: String!) {
    accessToken(secret: $secret) {
      resource_id
      permission
      secret
      class {
        name
        academic_year
        description
      }
    }
  }
`;

const GET_PROFILE_QUERY = gql`
  query Profile {
    profile {
      _id
    }
  }
`

export default function SecretPage({ params }: { params: Promise<{ secret: string }> }) {
  const { secret } = use(params);
  const { data, loading: loadingToken, error: errorToken } = useQuery(ACCESS_TOKEN_QUERY, {
    variables: { secret }
  });
  const { data: profileData, loading: profileLoading, error: profileError } = useQuery(GET_PROFILE_QUERY)

  if (loadingToken || profileLoading) return <Loading />
  if (errorToken) return <Error error={errorToken} />
  if (profileError) {} // ignore this error, profile will be undefined 

  if (["student_enrollment", "teacher_enrollment"].includes(data.accessToken.permission)) {
    return <Enroll accessToken={data.accessToken} profile={profileData.profile} />
  }

  return <div>
    invalid token permission: {JSON.stringify({data})}
  </div>
}

function Enroll({ accessToken, profile }: { accessToken: any, profile: any }) {
  const router = useRouter();
  const [enrollWithCode, { loading: loadingEnroll, error: errorEnroll }] = useMutation(ENROLL_WITH_CODE);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!profile) {
      const nextUrl = typeof window !== 'undefined' ? window.location.href : '';
      router.push(`/auth/signin?callbackUrl=${encodeURIComponent(nextUrl)}`);
    }
  }, [profile, router]);

  // Mostra i dati della classe e il pulsante di iscrizione
  return <div className="max-w-lg mx-auto p-6 bg-white rounded shadow mt-8 text-green-700">
    <h2 className="text-xl font-bold mb-2">
      {accessToken.permission === 'teacher_enrollment' ? 'Iscriviti come docente' : 'Iscrizione'}
    </h2>
    <div className="mb-4">
      <div className="text-lg font-semibold">{accessToken.class?.name || "classe senza nome"}</div>
      <div className="text-gray-600">Anno accademico: {accessToken.class?.academic_year || "non disponibile"}</div>
      <div className="text-gray-600">Descrizione: {accessToken.class?.description || "non disponibile"}</div>
    </div>
    <button
      className="w-full py-3 px-6 bg-blue-600 text-white font-bold rounded-lg shadow hover:bg-blue-700 transition"
      disabled={loadingEnroll}
      onClick={async () => {
        try {
          await enrollWithCode({ variables: { code: accessToken.secret } });
          router.push(`/class/${accessToken.resource_id}`);
        } catch (e) {
          // gestisci errore
          alert('Errore durante l\'iscrizione');
        }
      }}
    >
      {loadingEnroll ? 'Iscrizione in corso...' : 'Iscriviti'}
    </button>
    {errorEnroll && <div className="text-red-600 mt-2">{errorEnroll.message}</div>}
  </div>
}
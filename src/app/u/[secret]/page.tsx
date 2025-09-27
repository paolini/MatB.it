"use client";
import { use, useEffect, useState } from 'react';
import { gql, useQuery, useMutation } from '@apollo/client';
import { Error, Loading } from '@/components/utils';
import { access } from 'fs';
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
    }
  }
`;

const GET_CLASS_QUERY = gql`
  query Class($classId: ObjectId!) {
    class(_id: $classId) {
      _id
      name
      description
      academic_year
    }
  }
`

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
  const {data, loading, error} = useQuery(GET_CLASS_QUERY, {
    variables: {
      classId: accessToken.resource_id
    }
  })
  const [enrollWithCode, { loading: loadingEnroll, error: errorEnroll }] = useMutation(ENROLL_WITH_CODE);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!profile) {
      const nextUrl = typeof window !== 'undefined' ? window.location.href : '';
      router.push(`/auth/signin?callbackUrl=${encodeURIComponent(nextUrl)}`);
    }
  }, [profile, router]);

  if (loading) return <Loading />
  if (error) return <Error error={error} />

  return <div>
    { accessToken.permission === 'teacher_enrollment'  
       ? <h2>iscriviti come docente</h2>
       : <h2>iscrizione</h2>
      }
    <h2>Enroll with Access Token</h2>
    <p>Resource ID: {accessToken.resource_id}</p>
    <p>Permission: {accessToken.permission}</p>
  </div>
}
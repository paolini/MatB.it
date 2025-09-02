"use client"
import { useState } from 'react'
import { gql, useQuery, useMutation } from '@apollo/client'
import { AccessToken, Note, Test } from '@/app/graphql/generated'
import { Loading, Error } from '@/components/utils'

const ACCESS_TOKENS_QUERY = gql`
    query AccessTokens($resource_id: ObjectId!) {
        accessTokens(resource_id: $resource_id) {
            _id
            resource_id
            secret
            permission
            created_on
        }
    }
`

const NEW_ACCESS_TOKEN_MUTATION = gql`
    mutation NewAccessToken($resource_id: ObjectId!, $permission: String!) {
        newAccessToken(resource_id: $resource_id, permission: $permission) {
            _id
            resource_id
            secret
            permission
            created_on
        }
    }
`

const DELETE_ACCESS_TOKEN_MUTATION = gql`
    mutation DeleteAccessToken($_id: ObjectId!) {
        deleteAccessToken(_id: $_id)
    }
`

interface ShareModalProps {
    resource: Note | Test
    isOpen: boolean
    onClose: () => void
}

export default function ShareModal({ resource, isOpen, onClose }: ShareModalProps) {
    const [newPermission, setNewPermission] = useState<'read' | 'write'>('read')
    
    const { data, loading, error, refetch } = useQuery<{ accessTokens: AccessToken[] }>(
        ACCESS_TOKENS_QUERY,
        { 
            variables: { resource_id: resource._id },
            skip: !isOpen 
        }
    )
    
    const [createToken, { loading: creating }] = useMutation(NEW_ACCESS_TOKEN_MUTATION, {
        onCompleted: () => refetch()
    })
    
    const [deleteToken, { loading: deleting }] = useMutation(DELETE_ACCESS_TOKEN_MUTATION, {
        onCompleted: () => refetch()
    })
    
    if (!isOpen) return null
    
    const handleCreateToken = async () => {
        await createToken({
            variables: {
                resource_id: resource._id,
                permission: newPermission
            }
        })
    }
    
    const handleDeleteToken = async (tokenId: string) => {
        if (confirm('Sei sicuro di voler eliminare questo token?')) {
            await deleteToken({ variables: { _id: tokenId } })
        }
    }
    
    const generateShareUrl = (token: AccessToken) => {
        const baseUrl = window.location.origin
        const resourceType = 'note' in resource ? 'note' : 'test'
        return `${baseUrl}/${resourceType}/${resource._id}?token=${token.secret}`
    }
    
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
        alert('Link copiato negli appunti!')
    }
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Condividi {resource.title}</h2>
                    <button 
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 text-2xl"
                    >
                        ×
                    </button>
                </div>
                
                {/* Crea nuovo token */}
                <div className="mb-6 p-4 border rounded-lg">
                    <h3 className="font-semibold mb-3">Crea nuovo link di condivisione</h3>
                    <div className="flex gap-3 items-center">
                        <select 
                            value={newPermission}
                            onChange={(e) => setNewPermission(e.target.value as 'read' | 'write')}
                            className="border rounded px-3 py-2"
                        >
                            <option value="read">Solo lettura</option>
                            <option value="write">Lettura e modifica</option>
                        </select>
                        <button
                            onClick={handleCreateToken}
                            disabled={creating}
                            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                        >
                            {creating ? 'Creazione...' : 'Crea link'}
                        </button>
                    </div>
                </div>
                
                {/* Lista token esistenti */}
                <div>
                    <h3 className="font-semibold mb-3">Link di condivisione attivi</h3>
                    
                    {loading && <Loading />}
                    {error && <Error error={error} />}
                    
                    {data?.accessTokens && data.accessTokens.length === 0 && (
                        <p className="text-gray-500">Nessun link di condivisione attivo</p>
                    )}
                    
                    {data?.accessTokens?.map((token) => (
                        <div key={token._id} className="border rounded-lg p-4 mb-3">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <span className={`inline-block px-2 py-1 rounded text-sm ${
                                        token.permission === 'read' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                                    }`}>
                                        {token.permission === 'read' ? 'Solo lettura' : 'Lettura e modifica'}
                                    </span>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Creato il {new Date(token.created_on).toLocaleDateString()}
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleDeleteToken(token._id)}
                                    disabled={deleting}
                                    className="text-red-500 hover:text-red-700 text-sm"
                                >
                                    Elimina
                                </button>
                            </div>
                            
                            <div className="bg-gray-50 p-3 rounded border break-all text-sm">
                                {generateShareUrl(token)}
                            </div>
                            
                            <button
                                onClick={() => copyToClipboard(generateShareUrl(token))}
                                className="mt-2 px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                            >
                                Copia link
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

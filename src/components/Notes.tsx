"use client"
import React, { useState, useEffect } from 'react'
import Badge from "@/components/Badge"
import { gql, useQuery, NetworkStatus } from "@apollo/client"
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

import { Loading, Error } from "@/components/utils"
import { Note, Profile } from "@/app/graphql/generated"
import NewNoteButton from "./NewNoteButton"
import { myTimestamp } from "@/lib/utils"
import { VARIANT_NAMES } from "@/lib/models"

const notesQuery = gql`
    query Notes($mine: Boolean, $private: Boolean, $title: String, $variant: String, $limit: Int, $skip: Int) {
        notes(mine: $mine, private: $private, title: $title, variant: $variant, limit: $limit, skip: $skip) {
            _id
            title
            private
            created_on
            updated_on
            author_id
            author {
                name
            }
        }
        profile {
            _id    
        }
    }
`
export default function Notes() {
    const router = useRouter()
    const searchParams = useSearchParams()
    
    // Mapping per i testi di visualizzazione
    const filterLabels = {
        'all': 'Tutte',
        'mine': 'Mie',
        'private': 'Private'
    } as const
    
    // Inizializza i filtri dai parametri URL
    const [filter, setFilter] = useState<'all' | 'mine' | 'private'>(() => {
        const urlFilter = searchParams.get('filter') as 'all' | 'mine' | 'private'
        return (urlFilter === 'mine' || urlFilter === 'private') ? urlFilter : 'all'
    })
    const [titleFilter, setTitleFilter] = useState(() => searchParams.get('title') || '')
    const [variantFilter, setVariantFilter] = useState(() => searchParams.get('variant') || '')
    const [debouncedTitleFilter, setDebouncedTitleFilter] = useState(() => searchParams.get('title') || '')
    
    const NOTES_PER_PAGE = 20
    
    // Funzione per aggiornare l'URL con i parametri di filtro
    const updateUrl = (newFilter: 'all' | 'mine' | 'private', newTitle: string, newVariant: string) => {
        const params = new URLSearchParams()
        if (newFilter !== 'all') params.set('filter', newFilter)
        if (newTitle.trim()) params.set('title', newTitle.trim())
        if (newVariant) params.set('variant', newVariant)
        
        const newUrl = params.toString() ? `?${params.toString()}` : ''
        router.replace(newUrl, { scroll: false })
    }
    
    // Debounce per il filtro del titolo
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedTitleFilter(titleFilter)
        }, 500)
        
        return () => clearTimeout(timer)
    }, [titleFilter])
    
    // Aggiorna l'URL quando cambiano i filtri
    useEffect(() => {
        updateUrl(filter, debouncedTitleFilter, variantFilter)
    }, [filter, debouncedTitleFilter, variantFilter, router])
    
    // Funzioni helper per cambiare i filtri
    const handleFilterChange = (newFilter: 'all' | 'mine' | 'private') => {
        setFilter(newFilter)
    }
    
    const handleTitleFilterChange = (newTitle: string) => {
        setTitleFilter(newTitle)
    }
    
    const handleVariantFilterChange = (newVariant: string) => {
        setVariantFilter(newVariant)
    }
    
    const { loading, error, data, fetchMore, networkStatus, refetch } = useQuery(notesQuery, {
        variables: { 
            mine: filter === 'mine', 
            private: filter === 'private',
            title: debouncedTitleFilter || undefined,
            variant: variantFilter || undefined,
            limit: NOTES_PER_PAGE,
            skip: 0
        },
        notifyOnNetworkStatusChange: true
    })
    
    const notes = data?.notes || []
    const profile = data?.profile
    const isAuthenticated = !!profile?._id
    
    const hasMore = notes.length % NOTES_PER_PAGE === 0 && notes.length > 0
    const loadingMore = networkStatus === NetworkStatus.fetchMore

    const loadMore = async () => {
        if (loadingMore || !hasMore) return
        
        await fetchMore({
            variables: {
                mine: filter === 'mine',
                private: filter === 'private',
                title: debouncedTitleFilter || undefined,
                variant: variantFilter || undefined,
                limit: NOTES_PER_PAGE,
                skip: notes.length
            },
            updateQuery: (prev, { fetchMoreResult }) => {
                if (!fetchMoreResult) return prev
                return {
                    ...prev,
                    notes: [...prev.notes, ...fetchMoreResult.notes]
                }
            }
        })
    }

    return <>
        <div className="flex flex-col items-start gap-2 w-full">
            <div className="flex items-center gap-3 w-full justify-start">
                <h2 className="text-2xl font-bold">Note</h2>
                {isAuthenticated && <NewNoteButton />}
            </div>
            <div className="flex items-center justify-between w-full gap-4">
                <div className="flex gap-2">
                    <Badge active={filter === 'all'} onClick={() => handleFilterChange('all')}>{filterLabels.all}</Badge>
                    {isAuthenticated && (
                        <>
                            <Badge active={filter === 'mine'} onClick={() => handleFilterChange('mine')}>{filterLabels.mine}</Badge>
                            <Badge active={filter === 'private'} onClick={() => handleFilterChange('private')}>{filterLabels.private}</Badge>
                        </>
                    )}
                </div>
                
                <div className="flex items-center gap-3">
                    {/* Filtro per variante */}
                    <select
                        value={variantFilter}
                        onChange={(e) => handleVariantFilterChange(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    >
                        <option value="">Tutte le varianti</option>
                        {Object.entries(VARIANT_NAMES).map(([key, label]) => 
                            (
                                <option key={key} value={key}>
                                    {label || "nota generica"}
                                </option>
                            )
                        )}
                    </select>
                    
                    {/* Campo di filtro per titolo */}
                    <div className="w-full max-w-sm">
                        <input
                            type="text"
                            placeholder="Filtra per titolo..."
                            value={titleFilter}
                            onChange={(e) => handleTitleFilterChange(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                </div>
            </div>
        </div>

        {loading && <Loading />}
        <Error error={error} />
        { notes && notes.length === 0 &&
            <div className="text-center text-gray-500">
                Nessuna nota trovata.
            </div>
        }

        { notes && notes.length > 0 && <>
                <div className="flex flex-col gap-4">
                    {notes.map((note: Note) =>
                        (<NoteItem note={note} profile={profile} key={note._id} />)
                    )}
                </div>
                
                { notes.length } note visualizzate.
                {/* Pulsante Carica di più */}
                {hasMore && (
                    <div className="flex justify-center">
                        <button
                            onClick={loadMore}
                            disabled={loadingMore}
                            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            carica altre...
                        </button>
                    </div>
                )}
            </>
        }
    </>
}

function NoteItem({ note, profile }: { note: Note, profile: Profile }) {
    const isPrivate = note.private
    const isMine = note.author_id === profile?._id

    return <Link
                href={`/note/${note._id}`}
                className={`border p-4 rounded-md block ${
                    isPrivate ? "alert-color"
                    : isMine ? "good-color"
                    : "default-color"}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
            >
            <h3 className="text-xl font-bold">
                {note.title}
            </h3>
            <p className="text-gray-500">
                {note.author && <span>di {note.author.name}</span>}
                {' '}creata il {myTimestamp(new Date(note.created_on))}
                {' '}modificata il {myTimestamp(new Date(note.updated_on))}
            </p>
    </Link>
}
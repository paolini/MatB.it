import { gql, useQuery } from '@apollo/client'
import { useMemo } from 'react'
import { ObjectId } from 'bson'

const NoteVersionsQuery = gql`
  query NoteVersions($note_version_id: ObjectId!) {
    noteVersion(_id: $note_version_id) {
      _id
      title
      created_on
      author_id
      parent_version_id
      second_parent_version_id
      message
    }
    parentVersions(_id: $note_version_id) {
      _id
      title
      created_on
      author_id
      parent_version_id
      second_parent_version_id
      message
    }
  }
`

export default function NoteVersionTree({ note_version_id }: { note_version_id: string }) {
  const { loading, error, data } = useQuery(NoteVersionsQuery, { variables: { note_version_id } })

  // Ricostruisci l'albero delle versioni (semplificato: lista cronologica)
  const versions = useMemo(() => {
    if (!data) return []
    const all = [data.noteVersion, ...(data.parentVersions || [])]
    // Ordina per data di creazione (dal più vecchio al più recente)
    return all.sort((a, b) => new Date(a.created_on).getTime() - new Date(b.created_on).getTime())
  }, [data])

  if (loading) return <div>Caricamento versioni...</div>
  if (error) return <div>Errore: {error.message}</div>
  if (!data) return <div>Nessun dato sulle versioni</div>
  
  return (
    <div className="note-version-tree">
      <h3>Storico modifiche</h3>
      <ul>
        {versions.map(v => (
          <li key={v._id.toString()}>
            <b>{v.title}</b> - {new Date(v.created_on).toLocaleString()}<br/>
            <span>Autore: {v.author_id.toString()}</span>
            {v.message && <div>Messaggio: {v.message}</div>}
          </li>
        ))}
      </ul>
    </div>
  )
}

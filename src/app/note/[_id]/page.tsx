import Note from '@/components/Note'

export default async function Page({params}: {
    params: { _id: string }
}) {
    const { _id } = await params
    return <Note _id={_id} />
}


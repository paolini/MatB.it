import Note from '@/components/Note'

export default async function Page({ params }: { params: Promise<{ _id: string }> }) {
    // Await params per accedere ai suoi valori
    const { _id } = await params;
    return <Note _id={_id} />;
}
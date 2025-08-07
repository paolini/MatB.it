import Submission from '@/components/Submission'

export default async function Page({ params }: { params: Promise<{ _id: string }> }) {
    // Await params per accedere ai suoi valori
    const { _id } = await params;
    return <Submission _id={_id} />;
}
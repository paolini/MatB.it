import Test from '@/components/Test'

export default async function Page({ params }: { params: Promise<{ _id: string }> }) {
    // Await params per accedere ai suoi valori
    const { _id } = await params;
    return <Test _id={_id} />;
}
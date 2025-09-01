import Notes from "@/components/Notes"

export default function NotesPage() {
  return (
    <div className="min-h-screen font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-[32px] items-center sm:items-start">
        <Notes />
      </main>
    </div>
  )
}

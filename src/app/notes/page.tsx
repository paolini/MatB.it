import Notes from "@/components/Notes"
import { Suspense } from "react"
import { Loading } from "@/components/utils"

export default function NotesPage() {
  return (
    <div className="min-h-screen font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-[32px] items-center sm:items-start">
        <Suspense fallback={<Loading />}>
          <Notes />
        </Suspense>
      </main>
    </div>
  )
}

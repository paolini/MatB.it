import Notes from "@/components/Notes"
import Tests from "@/components/Tests"

export default function Home() {
  return (
    <div className="min-h-screen p-4 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-[32px] items-center sm:items-start">
        <Tests />
        <Notes />
      </main>
    </div>
  )
}

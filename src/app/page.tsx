import Notes from "@/components/Notes"

export default function Home() {
  return (
    <div className="grid min-h-screen p-4 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <Notes />
      </main>
    </div>
  )
}

import Tests from "@/components/Tests"

export default function TestsPage() {
  return (
    <div className="min-h-screen font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-[32px] items-center sm:items-start">
        <Tests />
      </main>
    </div>
  )
}
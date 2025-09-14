export function assert(condition: unknown, msg?: string): asserts condition {
    if (!condition) throw new Error(msg || "Assertion failed");
}

export function myTimestamp(date: Date | undefined | null): string {
    if (date === undefined) return '???'
    if (date === null) return '---'
    date = new Date(date)
    if (isNaN(date.getTime())) return '???'
    const day = date.getDate()
    const month = date.getMonth() + 1
    const year = date.getFullYear()
    const hour = date.getHours()
    const minute = date.getMinutes()
    return `${day}.${month}.${year}, ${hour}:${minute < 10 ? '0' : ''}${minute}`
}

export function formatDuration(durationMs: number): string {
    if (durationMs < 0) return '0 secondi'
    
    const seconds = Math.floor(durationMs / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    
    const remainingSeconds = seconds % 60
    const remainingMinutes = minutes % 60
    
    const parts: string[] = []
    
    if (hours > 0) {
        parts.push(`${hours} ${hours === 1 ? 'ora' : 'ore'}`)
    }
    
    if (remainingMinutes > 0) {
        parts.push(`${remainingMinutes} ${remainingMinutes === 1 ? 'minuto' : 'minuti'}`)
    }
    
    if (remainingSeconds > 0 || parts.length === 0) {
        parts.push(`${remainingSeconds} ${remainingSeconds === 1 ? 'secondo' : 'secondi'}`)
    }
    
    return parts.join(', ')
}
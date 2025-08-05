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
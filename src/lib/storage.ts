import { get, update } from 'idb-keyval'
import { defaultJournal } from './journal'
import type { Journal } from './journal'

const key = 'feel-journal-v1'

export async function readJournal() {
  return await get<Journal>(key) ?? defaultJournal
}

export async function writeJournal(change: (journal: Journal) => Journal) {
  let next = defaultJournal
  await update<Journal>(key, (current) => {
    next = change(current ?? defaultJournal)
    return next
  })
  return next
}

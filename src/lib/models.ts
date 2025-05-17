import { Db, ObjectId } from 'mongodb'

export type MongoNote = {
    author_id: ObjectId
    title: string
    updated_on: Date
    created_on: Date
    text: string
    private: boolean
}

export type MongoUser = {
    displayName: string
    email: string
    emailVerified: boolean
    first_login: Date
    last_login: Date
    photoURL: string
    pro: boolean
    createdAt: Date
}

export function getNotesCollection(db: Db) {
    return db.collection<MongoNote>('notes')
}

export function getUsersCollection(db: Db) {
    return db.collection<MongoUser>('users')
}

  



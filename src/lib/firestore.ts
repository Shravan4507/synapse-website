import {
    collection,
    doc,
    getDoc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    setDoc,
    serverTimestamp
} from 'firebase/firestore'
import type { DocumentData, QueryConstraint } from 'firebase/firestore'
import { db } from './firebase'

// Collection references
export const Collections = {
    USERS: 'users',
    EVENTS: 'events',
    COMPETITIONS: 'competitions',
    REGISTRATIONS: 'registrations'
} as const

// Generic CRUD operations

// Get a single document
export const getDocument = async <T = DocumentData>(
    collectionName: string,
    docId: string
): Promise<T | null> => {
    const docRef = doc(db, collectionName, docId)
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as T
    }
    return null
}

// Get all documents from a collection
export const getDocuments = async <T = DocumentData>(
    collectionName: string,
    ...queryConstraints: QueryConstraint[]
): Promise<T[]> => {
    const collectionRef = collection(db, collectionName)
    const q = query(collectionRef, ...queryConstraints)
    const querySnapshot = await getDocs(q)

    return querySnapshot.docs.map((docSnapshot) => ({
        id: docSnapshot.id,
        ...docSnapshot.data()
    })) as T[]
}

// Add a new document
export const addDocument = async <T extends DocumentData>(
    collectionName: string,
    data: T
): Promise<string> => {
    const collectionRef = collection(db, collectionName)
    const docRef = await addDoc(collectionRef, {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    })
    return docRef.id
}

// Set a document with specific ID
export const setDocument = async <T extends DocumentData>(
    collectionName: string,
    docId: string,
    data: T,
    merge: boolean = true
): Promise<void> => {
    const docRef = doc(db, collectionName, docId)
    await setDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp()
    }, { merge })
}

// Update a document
export const updateDocument = async <T extends Partial<DocumentData>>(
    collectionName: string,
    docId: string,
    data: T
): Promise<void> => {
    const docRef = doc(db, collectionName, docId)
    await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp()
    })
}

// Delete a document
export const deleteDocument = async (
    collectionName: string,
    docId: string
): Promise<void> => {
    const docRef = doc(db, collectionName, docId)
    await deleteDoc(docRef)
}

// Query helpers
export { where, orderBy, limit, query, collection }

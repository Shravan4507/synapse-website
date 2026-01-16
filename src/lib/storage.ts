import {
    ref,
    uploadBytes,
    uploadBytesResumable,
    getDownloadURL,
    deleteObject,
    listAll
} from 'firebase/storage'
import type { UploadTaskSnapshot, StorageReference } from 'firebase/storage'
import { storage } from './firebase'

// Storage folder paths
export const StorageFolders = {
    PROFILE_IMAGES: 'profile-images',
    EVENT_IMAGES: 'event-images',
    COMPETITION_IMAGES: 'competition-images',
    DOCUMENTS: 'documents'
} as const

// Upload a file
export const uploadFile = async (
    path: string,
    file: File
): Promise<string> => {
    const storageRef = ref(storage, path)
    await uploadBytes(storageRef, file)
    return getDownloadURL(storageRef)
}

// Upload with progress tracking
export const uploadFileWithProgress = (
    path: string,
    file: File,
    onProgress?: (progress: number) => void
): Promise<string> => {
    return new Promise((resolve, reject) => {
        const storageRef = ref(storage, path)
        const uploadTask = uploadBytesResumable(storageRef, file)

        uploadTask.on(
            'state_changed',
            (snapshot: UploadTaskSnapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
                onProgress?.(progress)
            },
            (error: Error) => {
                reject(error)
            },
            async () => {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref)
                resolve(downloadURL)
            }
        )
    })
}

// Get download URL
export const getFileURL = async (path: string): Promise<string> => {
    const storageRef = ref(storage, path)
    return getDownloadURL(storageRef)
}

// Delete a file
export const deleteFile = async (path: string): Promise<void> => {
    const storageRef = ref(storage, path)
    await deleteObject(storageRef)
}

// List all files in a folder
export const listFiles = async (folderPath: string): Promise<string[]> => {
    const folderRef = ref(storage, folderPath)
    const result = await listAll(folderRef)

    const urls = await Promise.all(
        result.items.map((item: StorageReference) => getDownloadURL(item))
    )

    return urls
}

// Generate unique file path
export const generateFilePath = (
    folder: string,
    userId: string,
    fileName: string
): string => {
    const timestamp = Date.now()
    const extension = fileName.split('.').pop()
    return `${folder}/${userId}/${timestamp}.${extension}`
}

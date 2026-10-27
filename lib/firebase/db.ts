import { getFirestore, type Firestore } from "firebase/firestore"
import { app } from "./config"

let db: Firestore

// Separate from config.ts so pages that never read data don't download the Firestore SDK.
if (typeof window !== "undefined") db = getFirestore(app)

export { db }

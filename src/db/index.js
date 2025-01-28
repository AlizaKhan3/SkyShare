import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue, remove } from "firebase/database";
// import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL, getStorage } from "firebase/storage";
import { getFirestore, collection, addDoc, getDoc, getDocs} from "firebase/firestore";
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage'; // Correct import


// Initialize Firebase
const app = initializeApp(firebaseConfig);

const database = getDatabase();

const storage = getStorage();

const db = getFirestore(app);

export {
    app,
    database,
    ref,
    set,
    onValue,
    remove,
    storage,
    storageRef,  //ref
    getDownloadURL,
    uploadBytesResumable,
    db,
    collection,
    addDoc,
    getDoc,
    getStorage,
    getDocs
}
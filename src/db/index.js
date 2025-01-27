import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue, remove } from "firebase/database";
// import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL, getStorage } from "firebase/storage";
import { getFirestore, collection, addDoc, getDoc, getDocs} from "firebase/firestore";
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage'; // Correct import

// const firebaseConfig = {
//     apiKey: "AIzaSyDUef_wqO6cD5qcJQBiXXO8Oo6Md1vOK2c",
//     authDomain: "skyy-share.firebaseapp.com",
//     projectId: "skyy-share",
//     storageBucket: "skyy-share.firebasestorage.app",
//     messagingSenderId: "407752094853",
//     appId: "1:407752094853:web:ccec24896337453a00a5ec",
//     databaseURL: "https://skyy-share-default-rtdb.asia-southeast1.firebasedatabase.app",
// };

const firebaseConfig = {
    apiKey: "AIzaSyDzpnkFF0DiZ32MVAUaMiTEu83A7QAUnx8",
    authDomain: "onlinefood-7799a.firebaseapp.com",
    databaseURL: "https://onlinefood-7799a-default-rtdb.firebaseio.com",
    projectId: "onlinefood-7799a",
    storageBucket: "onlinefood-7799a.appspot.com",
    messagingSenderId: "119235898205",
    appId: "1:119235898205:web:9a6ca0302608a92a7556b4",
    databaseURL: "https://onlinefood-7799a-default-rtdb.firebaseio.com"
}

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
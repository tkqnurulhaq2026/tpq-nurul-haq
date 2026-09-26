import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAjo6djzBiq7ug1r24l7-j4inlDDsTR7LM",
  authDomain: "tpq-nurul-haq.firebaseapp.com",
  projectId: "tpq-nurul-haq",
  storageBucket: "tpq-nurul-haq.firebasestorage.app",
  messagingSenderId: "754274350752",
  appId: "1:754274350752:web:c174fcc9f43e95f9a67bc5"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

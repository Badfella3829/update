import { initializeApp } from
"https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from
"https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from
"https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAaLJsNcgxRa_lGMOxJnwrcttt_m5MtwBM",
  authDomain: "techvyro-saas.firebaseapp.com",
  projectId: "techvyro-saas",
  storageBucket: "techvyro-saas.appspot.com",
  messagingSenderId: "684333859256",
  appId: "1:684333859256:web:ae0852528ac177a7c08f4d"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

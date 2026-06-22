// Inicialización de Firebase para la tienda. ÚNICO lugar donde se ponen las
// llaves del cliente (Firebase + ImgBB). Se compila como PRIMER archivo de los
// bundles que usan Firestore (dist/app.js, dist/product.js, dist/checkout.js),
// de modo que define los globals (db, IMGBB_API_KEY) antes de que utils.js /
// los demás módulos los usen.
//
// PLANTILLA: reemplaza estos placeholders con el proyecto Firebase y la key de
// ImgBB del cliente (ver TEMPLATE.md, paso 4). Requiere que firebase-app-compat
// y firebase-firestore-compat ya se hayan cargado (scripts defer en el HTML).
var firebaseConfig = {
    apiKey: "TU_FIREBASE_API_KEY",
    authDomain: "TU_PROYECTO.firebaseapp.com",
    projectId: "TU_PROYECTO"
};
var IMGBB_API_KEY = "TU_IMGBB_API_KEY";
if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
var db = firebase.firestore();

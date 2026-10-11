import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const $ = (id) => document.getElementById(id);
const signedOutView = $("signedOutView");
const signedInView = $("signedInView");
const loginForm = $("loginForm");
const signInButton = $("signInButton");
const notice = $("notice");

let auth;
let db;
let configReady = false;

try {
  configReady = Object.values(firebaseConfig).every((v) =>
    typeof v === "string" && v.trim() && !v.startsWith("REPLACE_WITH_"));
  if (configReady) {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  }
} catch (error) {
  console.error("Firebase initialization failed:", error);
}

function setNotice(message = "") { notice.textContent = message; }
function showSignedOut() {
  signedOutView.hidden = false;
  signedInView.hidden = true;
}
function showSignedIn() {
  signedOutView.hidden = true;
  signedInView.hidden = false;
}

if (!configReady) {
  setNotice("Setup needed: replace the placeholders in firebase-config.js with the Members Portal web app config, then reload.");
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setNotice("");
  if (!configReady) {
    setNotice("Firebase config is not filled in yet. Update firebase-config.js first.");
    return;
  }
  signInButton.disabled = true;
  signInButton.textContent = "Signing in…";
  try {
    await signInWithEmailAndPassword(auth, $("email").value.trim(), $("password").value);
  } catch (error) {
    console.error("Sign-in failed:", error);
    const messages = {
      "auth/invalid-credential": "The email or password is incorrect.",
      "auth/user-not-found": "No account was found for that email.",
      "auth/wrong-password": "The email or password is incorrect.",
      "auth/too-many-requests": "Too many attempts. Wait a while before trying again.",
      "auth/invalid-api-key": "The Firebase API key in firebase-config.js is invalid."
    };
    setNotice(messages[error.code] || `Sign-in failed (${error.code || "unknown error"}). Check the console and Firebase configuration.`);
  } finally {
    signInButton.disabled = false;
    signInButton.innerHTML = 'Sign in securely <span aria-hidden="true">→</span>';
  }
});

$("signOutButton").addEventListener("click", async () => {
  if (!auth) return;
  try {
    await signOut(auth);
    setNotice("");
  } catch (error) {
    console.error("Sign-out failed:", error);
    setNotice("Sign-out failed. Please try again.");
  }
});

if (configReady) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      showSignedOut();
      $("accountDetails").hidden = true;
      return;
    }
    showSignedIn();
    $("statusTitle").textContent = "Checking your access…";
    $("statusMessage").textContent = "Checking the role record for this signed-in account.";
    $("accountDetails").hidden = true;
    try {
      const roleSnapshot = await getDoc(doc(db, "userRoles", user.uid));
      if (!roleSnapshot.exists()) {
        $("statusTitle").textContent = "Access not approved";
        $("statusMessage").textContent = "No member role record exists for this account. Contact the authorized S.H.I.E.L.D. administrator if you believe this is an error.";
        return;
      }
      const roleData = roleSnapshot.data();
      const role = typeof roleData.role === "string" ? roleData.role : "unknown";
      const approved = roleData.approved === true;
      $("accountEmail").textContent = user.email || "Email unavailable";
      $("accountRole").textContent = role;
      $("accountApproval").textContent = approved ? "Approved" : "Not approved";
      $("accountDetails").hidden = false;

      if (approved && ["admin", "intake", "reviewer", "panel", "finance"].includes(role)) {
        $("statusTitle").textContent = "Member role recognized";
        $("statusMessage").textContent = "Your role record is readable. This is only a connection test; no case-management tools are enabled yet.";
      } else {
        $("statusTitle").textContent = "Member access not active";
        $("statusMessage").textContent = "This account does not currently have an approved members-portal role. The members tools remain unavailable.";
      }
    } catch (error) {
      console.error("Role check failed:", error);
      $("statusTitle").textContent = "Could not verify access";
      $("statusMessage").textContent = error.code === "permission-denied"
        ? "Firestore denied the role lookup. Review the userRoles rules before proceeding."
        : "The role lookup failed. Check the Firebase configuration and connection, then try again.";
    }
  });
}

import serviceAccount from "firebase/autotms-108b3-firebase-adminsdk-zjj0d-06194fd20d.json";
import { cert, getApps, initializeApp, ServiceAccount } from "firebase-admin/app";

/**
 * Initializes the Firebase Admin SDK if no Firebase apps are currently running.
 * This function is typically called during the initialization phase of the application.
 */
export function initFirebaseAdmin() {
  // Check if there are any existing Firebase apps
  const apps = getApps();

  // Initialize Firebase Admin SDK if no apps are running
  if (apps.length === 0) {
    initializeApp({
      credential: cert(serviceAccount as ServiceAccount),
    });
  }
}

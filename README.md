# S.H.I.E.L.D. Members Portal — Connection Test (Alpha)

This is a plain HTML/CSS/JavaScript connection test using the Firebase Web SDK from Google's CDN. It is intentionally not a production case-management portal.

## Included
- Email/password sign-in (no public member registration)
- Reads only `userRoles/{signedInUserUid}` after sign-in
- Displays the role and approval flag from that user's own role record
- Sign-out
- No case intake, document upload, role editing, appeals, financial data, or member administration

## Configure Firebase
1. Open Firebase Console → Project settings → General → Your apps.
2. Select **S.H.I.E.L.D. Members Portal** and choose **Config**.
3. Copy the exact values into `firebase-config.js` (`apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, and `appId`). Do not change the project ID or app ID manually.
4. Serve this through a web host such as a separate GitHub Pages repository. Do not test via `file://`; browser modules and Firebase web features need a served origin.
5. The domain hosting this app must be listed in Firebase Authentication → Settings → Authorized domains.

## Expected access
The account only passes the basic gate if its own `userRoles/{uid}` document exists, has `approved: true`, and its role is one of `admin`, `intake`, `reviewer`, `panel`, or `finance`.

This visual gate is not the security boundary. Firestore Security Rules remain authoritative. The current starter rules should continue denying access to all collections other than the explicitly configured `userRoles` records.

## Do not use with real case data
This alpha is for verifying authentication and reading the signed-in user's role document. It does not securely implement S.H.I.E.L.D.'s operational workflows, audit logging, review independence, data retention, or safeguarding controls.


jhjhufhekhajhsidhj

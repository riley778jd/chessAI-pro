# ChessAI Pro Firestore Security Specification

## 1. Data Invariants
1. Every `/users/{userId}` document contains PII (`email`) and may only be read or written by the authenticated, email-verified user whose `request.auth.uid == userId`.
2. Subcollections (`/users/{userId}/games/{gameId}`, `/users/{userId}/analyses/{analysisId}`, `/users/{userId}/training/{progressId}`) require an existing parent `/users/{userId}` document (Master Gate) on creation/mutation and enforce `ownerId == request.auth.uid == userId`.
3. `ownerId`, `uid`, `id`, and `createdAt` are immutable after creation; `createdAt` and `updatedAt` must equal `request.time`.
4. All document IDs must match `^[a-zA-Z0-9_\-]+$` and be at most 128 characters.
5. No shadow/ghost fields are allowed (`keys().hasOnly(...)` on create, `affectedKeys().hasOnly(...)` on update).

## 2. Adversarial Test Payloads ("Dirty Dozen")
1. **Cross-user profile read**: `GET /users/other_uid` as `user_a` -> `PERMISSION_DENIED`.
2. **Cross-user game list**: `LIST /users/other_uid/games` as `user_a` -> `PERMISSION_DENIED`.
3. **Unverified email write**: `CREATE /users/user_a` with `email_verified: false` -> `PERMISSION_DENIED`.
4. **UID spoofing in profile**: `CREATE /users/user_a` with `uid: "user_b"` -> `PERMISSION_DENIED`.
5. **Shadow field injection**: `CREATE /users/user_a` with extra `isAdmin: true` -> `PERMISSION_DENIED`.
6. **Oversized PGN payload**: `CREATE /users/user_a/games/g1` with 25KB `pgn` (> 20000) -> `PERMISSION_DENIED`.
7. **ID poisoning**: `CREATE /users/user_a/games/bad..id!` -> `PERMISSION_DENIED`.
8. **Orphaned subcollection write**: `CREATE /users/user_a/games/g1` when `/users/user_a` does not exist -> `PERMISSION_DENIED`.
9. **Immutable ownerId mutation**: `UPDATE /users/user_a/games/g1` changing `ownerId` -> `PERMISSION_DENIED`.
10. **Client-forged timestamp**: `CREATE /users/user_a/analyses/a1` with `createdAt` != `request.time` -> `PERMISSION_DENIED`.
11. **Unbounded topLines array**: `CREATE /users/user_a/analyses/a1` with 6 items in `topLines` (> 5) -> `PERMISSION_DENIED`.
12. **Invalid training category enum**: `CREATE /users/user_a/training/p1` with `category: "hacking"` -> `PERMISSION_DENIED`.

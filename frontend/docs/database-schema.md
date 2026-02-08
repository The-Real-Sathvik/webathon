# CollabX – Firestore Database Schema

CollabX uses **Firebase Firestore** as a managed NoSQL database.

## Collections

### users
Document ID: Firebase Auth UID

Fields:
- name: string
- email: string
- role: "user" | "admin"
- status: "active" | "suspended" | "banned"
- createdAt: timestamp

### requests
Document ID: auto-generated

Fields:
- fromUserId: string
- toUserId: string
- status: "pending" | "accepted" | "rejected"
- createdAt: timestamp

### reports
Document ID: auto-generated

Fields:
- reporterId: string
- reportedUserId: string
- reason: string
- createdAt: timestamp

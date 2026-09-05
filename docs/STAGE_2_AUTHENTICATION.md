## Vision2Real Stage 2 — Authentication & Founder Access

**Stage:** 2
**Status:** Approved
**Version:** 1.0
**Last Updated:** August 2026

## Depends On
- Stage 1
- BUILD_RULES.md
- VISION2REAL_BIBLE.md

## Enables
- Stage 3 Founder Workspace
- Stage 4 Idea Management
- Stage 5 Reality Sprint



## 1. Core Philosophy

This section defines the principles.

Not just features.

## Examples:

- Authentication is never presented as a barrier.

- Authentication is presented as access to the Founder Workspace.

- Guest-first experience.

- Zero data loss.

- Continuity over registration.

- Premium experience equal to the public website.

- One authentication system shared across the entire platform.

## 2. Complete User Journeys

Every possible flow.

For example:

- Homepage → Login

- Homepage → Signup

- Validate → Signup

- Validate → Login

- Build → Signup

- Build → Login

- Reality Sprint → Signup

- Reality Sprint → Login

- Forgot Password

- Google Login

- Google Signup

- Logout

- Session Expiry

Every journey documented.


## 3. Information Architecture

Authentication ecosystem.

Authentication

├── Login

├── Create Account

├── Google Authentication

├── Forgot Password

├── Reset Password

├── Email Verification

├── Guest Session Transfer

└── Founder Workspace Entry

## 4. UX Design Specification

This section will lock every screen.

## Including:

- Hero

- Background animation

- Form layout

- Right information panel

- Tabs

- Buttons

- Motion

- Mobile behavior

## 5. Component Architecture

Like our previous implementation plans.


features/auth/

components/

pages/

hooks/

context/

services/

types/

utils/

Every component defined.

## 6. Authentication Pages

Separate specifications for Login Signup Forgot Password Reset Password Verify Email

## 7. Google Authentication

Dedicated section. Flow. States. Errors. Success. Guest merge.

## 8. Guest Session Transfer


Probably the biggest section. Exactly how guest data becomes founder data. Validation. Build Request. Reality Sprint. Files. Reports.

Everything.

## 9. Backend Architecture

User Model Session Model OAuth Tokens Database API

Everything.

## 10. Security

Password hashing JWT Refresh Cookies Rate limiting CSRF Email verification Password reset Session invalidation

## 11. Route Protection

Public


Protected

Admin

Future expansion.

## 12. State Management

Authentication Context

Session Context

Loading

Caching

Persistence

## 13. Error Handling

Every possible error.

Wrong password.

Email exists.

Google cancelled.

Expired token.

Network failure.

Verification failed.

Everything.

## 14. Responsive Behaviour

Desktop Tablet Mobile Animations Reduced motion.

## 15. Verification Plan

Like our previous plans.

Manual testing.


Automated testing.

API testing.

Guest transfer testing.

## 16. Definition of Done

Everything that must exist before Stage 2 is considered complete.

## 14. Frontend ↔ Backend Integration Contract

Authentication is the first Vision2Real stage where the frontend and backend become tightly integrated. This section defines the contract between both layers to ensure consistent implementation, maintainability, and future scalability. All authentication- related communication must follow these contracts.

## Authentication Architecture

```
Frontend (React)
↓
Auth Context
↓
API Service Layer
↓
Authentication API
↓
Database
↓
Founder Workspace
```

The frontend must never communicate directly with the database. All authentication operations flow through the API layer.


## API Endpoints

## POST /auth/signup

Creates a new founder account using email and password.

## Request

```
{
"fullName": "John Doe",
"email": "john@example.com",
"password": "********"
}
```

## Response

```
{
"success": true,
"user": {},
"accessToken": "...",
"refreshToken": "...",
"requiresEmailVerification": true
}
```

## POST /auth/login

Authenticates an existing founder.

## Request

```
{
"email": "john@example.com",
"password": "********"
}
```

## Response

```
{
"success": true,
"user": {},
"accessToken": "...",
"refreshToken": "..."
}
```


## POST /auth/google

Authenticates using Google OAuth.

Possible outcomes:

- Existing account → Login

- New account → Create Founder Account

- Existing guest session → Merge automatically

## POST /auth/logout

Invalidates the current session.

## GET /auth/me

Returns the authenticated founder profile.

Used on:

- Page refresh

- Initial application load

- Workspace initialization

## POST /auth/forgot-password

Sends password reset email.

## POST /auth/reset-password

Updates password using reset token.

## POST /auth/verify-email

Marks email as verified.

## POST /auth/refresh

Refreshes expired access tokens using refresh tokens.

## POST /auth/transfer-guest

Transfers guest activity into the authenticated founder account.

Transferred data includes:

- Idea Validations

- Validation Reports


- Uploaded Files

- Build Requests

- Reality Sprint Requests

- Generated PDFs

- Future Drafts

## Frontend Responsibilities

The frontend is responsible for:

- Form validation

- User interactions

- Loading states

- Success states

- Error presentation

- Route protection

- Token lifecycle handling

- Calling backend APIs

- Persisting only the minimum required session data

The frontend must never implement authentication logic independently.

## Backend Responsibilities

The backend is responsible for:

- Authentication

- Authorization

- Password hashing

- Google OAuth

- JWT/session generation

- Refresh token validation

- Email verification

- Password reset

- Guest session migration

- User ownership validation

- Database persistence

- Security enforcement


The backend is the single source of truth for user identity.

## Loading States

Every authentication request must expose consistent loading states.

## Examples:

## Login

Signing you in...

## Create Account

Creating your Founder Workspace...

## Google Authentication

Connecting with Google...

## Guest Session Transfer

Saving your previous activity...

↓

Preparing your Founder Workspace...

↓

Almost ready...

## Password Reset

Updating password...

## Success Handling

Successful authentication should always follow the same sequence.

Authentication Successful


```
↓
Store Session
↓
Retrieve Founder Profile
↓
Transfer Guest Session (if applicable)
↓
Initialize Workspace
↓
Redirect to Founder Workspace
```

No intermediate confirmation pages should interrupt this flow unless email verification is required.

## Error Handling Contract

Every authentication error must be mapped to a clear, user-friendly message.

Examples include:


|   | already |
| --- | --- |
|   | exists. |
| Weak | Please |
| Password | choose a |
|   | stronger |
|   | password. |
| Google | Google |
| Authentic | sign-in |
| ation | could not |
| Failed | be |
|   | completed |
|   | . Please |
|   | try again. |
| Expired | This |
| Reset | password |
| Token | reset link |
|   | has |
|   | expired. |
| Email Not | Please |
| Verified | verify your |
|   | email |
|   | before |
|   | signing in. |
| Network | Unable to |
| Failure | connect. |
|   | Please |
|   | check |
|   | your |
|   | internet |


connectio

n.

Internal server errors must never expose technical implementation details.

## Authentication State Management

The frontend Auth Context should maintain:

- Current Founder

- Authentication Status

- Loading State

- Access Token

- Session Expiry

- Guest Session ID

- Workspace Initialization Status

This context becomes the single source of truth for authentication across the application.

## Session Lifecycle

```
Guest
↓
Login / Sign Up
↓
Session Created
↓
Guest Data Merged
↓
Founder Workspace
↓
```


```
Session Refresh
↓
Logout
↓
Guest State Cleared
```

## Security Requirements

Authentication implementation must include:

- Password hashing

- Secure JWT handling

- Refresh token rotation

- Rate limiting

- CSRF protection (where applicable)

- Secure cookie support (if cookie-based auth is used)

- Email verification

- Password reset protection

- Session invalidation on logout

- HTTPS-only communication in production

## Future Compatibility

The authentication architecture must be extensible without major refactoring.

Future integrations may include:

- Apple Sign-In

- GitHub Authentication

- Microsoft Authentication

- Two-Factor Authentication (2FA)

- Multi-device session management

- Organization and team accounts

- Role-Based Access Control (RBAC)


- Single Sign-On (SSO) for enterprise customers

The Stage 2 implementation should establish a modular foundation so these capabilities can be added incrementally without redesigning the authentication system.

## MORE ADDITIONS

## 1. Authentication State Matrix (Recommended)

Add a table describing what the UI should show for every authentication state.

| State | User | Redirect |
| --- | --- | --- |
|   | Sees |   |
| Guest | Public | None |
|   | website |   |
| Logged In Founder |   | /founde |
|   | Workspac | r |
|   | e |   |
| Email | Verificatio | Stay on |
| Unverified | n prompt | verificatio |
|   |   | n page |
| Password | Reset | Login |
| Reset | form | after |
|   |   | success |
| Session | Session | Login |
| Expired | expired |   |
|   | message |   |
| Loading | Full- | Wait |
|   | screen |   |
|   | loader |   |


| Google | Loading | Workspac |
| --- | --- | --- |
| Callback | screen | e |

This prevents inconsistent behavior later.

## 2. Route Protection Matrix

Instead of just saying "protected routes," define exactly which routes require authentication.

| Route | Guest | Logged |
| --- | --- | --- |
|   |   | In |
| / | ✅ ✅ |   |
| /about | ✅ ✅ |   |
|   | /valida ✅ ✅ |   |
| te-idea |   |   |
|   | /build- ✅ ✅ |   |
| product |   |   |
| /login |   | Redirect if |
|   |   | already |
|   |   | logged in |
| /signup |   | Redirect if |
|   |   | already |
|   |   | logged in |
|   | /founde ❌ ✅ |   |
| r |   |   |
|   | /founde ❌ ✅ |   |
| r/* |   |   |


## 3. Folder Structure

Lock the authentication module structure so it doesn't drift during implementation.

```
src/features/auth/
components/
pages/
hooks/
context/
services/
types/
schemas/
utils/
LoginPage.tsx
SignupPage.tsx
ForgotPassword.tsx
ResetPassword.tsx
VerifyEmail.tsx
GoogleCallback.tsx
```

## 4. Authentication Flow Diagram

```
Guest
↓
Login / Google
↓
Authentication API
↓
Access Token
```


```
↓
Refresh Token
↓
Get User Profile
↓
Transfer Guest Data
↓
Initialize Founder Workspace
↓
Redirect to /founder
```

This helps both frontend and backend developers.

## 5. Definition of Done

Make the completion criteria measurable.

Stage 2 should not be considered complete until:

- Email/password signup works.

- Email/password login works.

- Google Sign-In works.

- Forgot Password works.

- Reset Password works.

- Email verification works.

- Guest session transfer works.

- Protected routes work.

- Session persistence works.

- Refresh token flow works.

- Logout works.

- Mobile responsive.


- Dark theme consistent.

- Accessibility checks pass.

- npm run build passes with zero errors.

- Backend authentication APIs integrated.

- Authentication state persists after page refresh.

- Founder Workspace opens immediately after successful authentication.

## 6. Backend API Readiness Checklist

Before coding, define the APIs Stage 2 depends on.

- POST /auth/signup

- POST /auth/login

- POST /auth/google

- POST /auth/logout

- GET /auth/me

- POST /auth/forgot-password

- POST /auth/reset-password

- POST /auth/verify-email

- POST /auth/refresh

- POST /auth/transfer-guest

## Mark each as:

- Planned

- In Development

- Ready

- Tested

This helps coordinate frontend and backend work.

## Add one final section: Authentication Sequence

## Diagrams

Right now you describe the flows, but sequence diagrams make implementation much easier for both frontend and backend.

For example:

## Email Signup


Founder

↓

Fill Form

↓

Frontend Validation

↓

POST /auth/signup

↓

Backend

↓

Create User

↓

Hash Password

↓

Generate Verification Token

↓

Send Verification Email

↓

Return Success

↓

Frontend


```
↓
Show "Check your email"
↓
Founder verifies email
↓
Login
↓
Founder Workspace
```

## Google Login

```
Founder
↓
Continue with Google
↓
Google OAuth
↓
Backend
↓
User Exists?
↓
YES → Login
```


NO → Create Account

↓

Merge Guest Session

↓

Return Tokens

↓

Frontend

↓

Initialize Workspace

↓

Redirect

## Guest Session Merge

Guest

↓

Validate Idea

↓

Generate Report

↓

Guest Session Created

↓

Signup


↓

Backend

↓

Transfer Validation

↓

Transfer Reports

↓

Transfer Build Requests

↓

Transfer Files

↓

Transfer Sprint Requests

↓

Create Founder Workspace

↓

Redirect

## Token Refresh

Access Token Expired

↓

Frontend detects 401


↓

POST /auth/refresh

↓

New Access Token

↓

Retry Original Request

↓

Continue

## Logout

Logout

↓

POST /auth/logout

↓

Invalidate Refresh Token

↓

Clear Local Session

↓

Redirect Homepage

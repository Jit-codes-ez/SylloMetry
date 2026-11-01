# SylloMetry Backend - Authentication & Sign-Up Service

This directory contains the FastAPI backend for **SylloMetry** (an AI-powered curriculum-to-industry skill-gap analysis application), implementing the backend contracts for the **Create Your Account** signup screen.

It delegates identity, password hashing, email OTP verification, and OAuth workflows strictly to **Supabase Auth**.

---

## Architecture Overview

```
Backend/
├── app/
│   ├── __init__.py
│   ├── main.py                  # FastAPI app entry point, CORS, lifespan & error handlers
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py            # Environment-based settings via Pydantic BaseSettings
│   │   └── supabase.py          # Supabase client singleton & dependency providers
│   ├── routes/
│   │   ├── __init__.py
│   │   └── signup.py            # Endpoints: /api/auth/signup/...
│   ├── schemas/
│   │   ├── __init__.py
│   │   └── signup.py            # Pydantic validation models for requests & responses
│   └── services/
│       ├── __init__.py
│       └── signup_service.py    # Business logic, Supabase Auth integration & error handling
├── tests/
│   ├── __init__.py
│   ├── conftest.py              # TestClient & mock Supabase fixtures
│   └── test_signup.py           # 23 automated unit & validation tests
├── .env.example                 # Example environment variables with placeholders
├── .gitignore                   # Ignores .env, virtualenvs, pycache, caches
├── requirements.txt             # Project dependencies
└── README.md                    # Documentation & setup guide
```

---

## 1. Signup Flow Sequence

The backend supports the exact signup workflow presented in the SylloMetry registration UI:

```
[User Interface]                     [Backend API]                    [Supabase Auth]
       |                                   |                                |
       |--- 1. POST /signup/otp/send ----->|                                |
       |    { email }                      |-- Check public.users in DB --->|
       |                                   |   (Reject 409 if exists)       |
       |                                   |-- sign_in_with_otp() --------->|
       |                                   |   (should_create_user=True)    |
       |<-- 200 OK (Code sent) ------------|                                |
       |                                   |                                |
       |--- 2. POST /signup/otp/verify --->|                                |
       |    { email, token: "123456" }     |-- verify_otp(type="email") --->|
       |                                   |<-- Session & confirmed user ---|
       |<-- 200 OK (is_verified: true, ----|                                |
       |            session: { ... })      |                                |
       |                                   |                                |
       |--- 3. POST /signup -------------->|                                |
       |    { full_name, email, password,  |-- Verify user was confirmed -->|
       |      confirm_password, terms: true|-- Set password & metadata ---->|
       |      optional access_token }      |-- Sign in for fresh session -->|
       |<-- 201 Created (user & session) --|                                |
```

### Flow Sequence Details:
1. **Email OTP Request (`POST /api/auth/signup/otp/send`)**:
   - The user inputs their full name and email in the frontend, then clicks the inline **Verify** button.
   - The backend checks if a registered user with this email already exists in `public.users` or `auth.users`. If found, it immediately responds with `HTTP 409 Conflict: "User already exists with this email address. Please sign in instead."`
   - If new, Supabase sends a 6-digit numeric OTP code to the user's inbox (`sign_in_with_otp` with `should_create_user=True`).
2. **OTP Verification (`POST /api/auth/signup/otp/verify`)**:
   - The user inputs the 6-digit code into the three-digit / separator / three-digit input component.
   - The backend verifies the token via Supabase Auth (`verify_otp`).
   - On success, the email is confirmed and Supabase issues an authenticated session (`access_token`, `refresh_token`).
3. **Registration Completion (`POST /api/auth/signup`)**:
   - The user enters their password (minimum 8 characters), confirms password, and accepts the Terms of Service and Privacy Policy.
   - The backend enforces that `password == confirm_password`, `len(password) >= 8`, and `terms_accepted == true`.
   - The backend verifies that the email was indeed confirmed in Supabase Auth (or checks the bearer access token).
   - The backend sets the password and safe user metadata (`full_name`, `terms_accepted`, timestamp) in Supabase Auth.
   - Supabase executes the database trigger to populate `public.users` with the user profile (`id`, `full_name`, `email`).
   - The endpoint authenticates the user and returns the safe profile and session credentials.

---

## 2. API Endpoints and Payloads

All endpoints are prefixed with `/api/auth`.

### A. Request Email OTP
- **URL**: `POST /api/auth/signup/otp/send`
- **Request Body**:
  ```json
  {
    "email": "student@university.edu"
  }
  ```
- **Responses**:
  - `200 OK`:
    ```json
    {
      "success": true,
      "message": "A 6-digit verification code has been sent to your email address.",
      "email": "student@university.edu"
    }
    ```
  - `409 Conflict`:
    ```json
    {
      "detail": "User already exists with this email address. Please sign in instead."
    }
    ```
  - `422 Unprocessable Entity`: Invalid email format.
  - `429 Too Many Requests`: Supabase rate limit exceeded.

---

### B. Verify Email OTP
- **URL**: `POST /api/auth/signup/otp/verify`
- **Request Body**:
  ```json
  {
    "email": "student@university.edu",
    "token": "482910"
  }
  ```
- **Responses**:
  - `200 OK`:
    ```json
    {
      "success": true,
      "message": "Email verified successfully.",
      "email": "student@university.edu",
      "is_verified": true,
      "session": {
        "access_token": "eyJhbGciOi...",
        "refresh_token": "v1.mr_...",
        "token_type": "bearer",
        "expires_in": 3600,
        "expires_at": 1793328000,
        "user": {
          "id": "e4b2d35c-8971-482a-9cb2-9382f7182901",
          "email": "student@university.edu",
          "full_name": null,
          "created_at": "2026-10-30T02:00:00Z",
          "email_confirmed": true
        }
      }
    }
    ```
  - `400 Bad Request`: Invalid or expired OTP code.
  - `422 Unprocessable Entity`: Token not exactly 6 digits.
  - `429 Too Many Requests`: Too many verification attempts.

---

### C. Complete Registration
- **URL**: `POST /api/auth/signup`
- **Headers (Optional)**: `Authorization: Bearer <access_token>`
- **Request Body**:
  ```json
  {
    "full_name": "Jane Doe",
    "email": "student@university.edu",
    "password": "SecurePassword123!",
    "confirm_password": "SecurePassword123!",
    "terms_accepted": true,
    "access_token": "optional-token-from-verify-step"
  }
  ```
- **Responses**:
  - `201 Created`:
    ```json
    {
      "success": true,
      "message": "Account created successfully.",
      "user": {
        "id": "e4b2d35c-8971-482a-9cb2-9382f7182901",
        "email": "student@university.edu",
        "full_name": "Jane Doe",
        "created_at": "2026-10-30T02:00:00Z",
        "email_confirmed": true
      },
      "session": {
        "access_token": "eyJhbGciOi...",
        "refresh_token": "v1.mr_...",
        "token_type": "bearer",
        "expires_in": 3600,
        "expires_at": 1793328000,
        "user": {
          "id": "e4b2d35c-8971-482a-9cb2-9382f7182901",
          "email": "student@university.edu",
          "full_name": "Jane Doe",
          "created_at": "2026-10-30T02:00:00Z",
          "email_confirmed": true
        }
      }
    }
    ```
  - `400 Bad Request`: Email not yet verified or session invalid.
  - `409 Conflict`: User already completed registration.
  - `422 Unprocessable Entity`: Password < 8 characters, password mismatch, or terms not accepted.

---

### D. Initiate Google OAuth Signup
- **URL**: `GET /api/auth/signup/google`
- **Query Parameters**:
  - `redirect_to` *(optional)*: Frontend callback URL (defaults to `{FRONTEND_URL}/auth/callback`).
  - `redirect` *(optional, bool)*: If `true`, returns an HTTP 307 redirect directly to Google.
- **Response (`200 OK`)**:
  ```json
  {
    "authorization_url": "https://your-project.supabase.co/auth/v1/authorize?provider=google&redirect_to=http%3A%2F%2Flocalhost%3A5173%2Fauth%2Fcallback",
    "provider": "google",
    "redirect_to": "http://localhost:5173/auth/callback"
  }
  ```

---

## 3. Supabase Configuration & SQL Setup

### A. Environment Variables (`.env`)
Create a `.env` file in `/Backend` based on `.env.example`:

```ini
# Supabase Project Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_PUBLISHABLE_KEY=sbp_your-publishable-key-here

# Backend-only Secret Key (NEVER expose to frontend)
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key-here

# Frontend Application Origin
FRONTEND_URL=http://localhost:5173

# Server Environment
ENVIRONMENT=development
PORT=8000
```

### B. Supabase Dashboard Settings

1. **Email Provider Configuration**:
   - Navigate to **Authentication > Providers > Email**.
   - Enable **Email provider**.
   - Enable **Confirm email**.
   - Under **Email OTP Expiry**, configure your desired timeout (e.g., 300 seconds / 5 minutes).

2. **Email Templates**:
   - Navigate to **Authentication > Email Templates > Magic Link / Confirmation**.
   - Ensure the template includes `{{ .Token }}` as the 6-digit code for users to type in the OTP input slots:
     ```html
     <h2>Your SylloMetry Verification Code</h2>
     <p>Enter the following 6-digit code to verify your account:</p>
     <h1 style="letter-spacing: 5px;">{{ .Token }}</h1>
     <p>This code expires in 5 minutes.</p>
     ```

3. **Google OAuth Provider Configuration**:
   - In Google Cloud Console:
     - Create an OAuth 2.0 Client ID (Web application).
     - Set **Authorized redirect URIs** to your Supabase Auth callback:
       `https://<your-project-ref>.supabase.co/auth/v1/callback`
   - In Supabase Dashboard:
     - Navigate to **Authentication > Providers > Google**.
     - Enable Google.
     - Paste **Client ID** and **Client Secret** obtained from Google Cloud Console.
   - In Supabase **Authentication > URL Configuration**:
     - Set **Site URL** to `http://localhost:5173` (or your production frontend URL).
     - Add `http://localhost:5173/**` to **Redirect URLs**.

4. **Database Table & Trigger Setup (`public.users`)**:
   Run the following SQL script in your Supabase SQL Editor:

```sql
-- 1. Create or update the public.users table
create table if not exists public.users (
  id uuid not null references auth.users(id) on delete cascade,
  full_name text,
  email text primary key,
  password text,
  registration_by text not null check (registration_by in ('Email', 'Google'))
);

-- 2. Enable Row Level Security (RLS)
alter table public.users enable row level security;

-- 3. Row Level Security policies
drop policy if exists "Users can read own profile" on public.users;
drop policy if exists "Users can update own profile" on public.users;

create policy "Users can read own profile"
  on public.users for select
  to authenticated
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.users for update
  to authenticated
  using (auth.uid() = id);

-- 4. PostgreSQL Trigger Function (public.handle_new_user)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_provider text;
  v_reg_by text;
begin
  v_provider := lower(coalesce(new.raw_app_meta_data->>'provider', 'email'));
  if v_provider = 'google' then
    v_reg_by := 'Google';
  else
    v_reg_by := 'Email';
  end if;

  insert into public.users (
    id,
    full_name,
    email,
    password,
    registration_by
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    new.email,
    new.encrypted_password,
    v_reg_by
  )
  on conflict (email) do update set
    id = excluded.id,
    full_name = case 
      when excluded.full_name is not null and excluded.full_name <> '' then excluded.full_name 
      else public.users.full_name 
    end,
    password = coalesce(excluded.password, public.users.password),
    registration_by = excluded.registration_by;

  return new;
end;
$$;

-- 5. Attach triggers to auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update on auth.users
  for each row execute function public.handle_new_user();
```

---

## 4. How to Run and Test the Backend

### Prerequisites
- Python 3.10+ (or 3.13)
- pip

### Install Dependencies
```bash
cd Backend
python -m pip install -r requirements.txt
```

### Start Development Server
Run FastAPI via Uvicorn:
```bash
uvicorn app.main:app --reload --port 8000
```
- Interactive Swagger UI: `http://localhost:8000/docs`
- ReDoc Documentation: `http://localhost:8000/redoc`
- Health Check: `http://localhost:8000/health`


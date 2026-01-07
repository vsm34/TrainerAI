# TrainerAI 🏋️‍♂️🤖

**TrainerAI** is a full-stack fitness training platform designed for personal trainers and serious lifters. It combines structured workout management, client tracking, analytics, and AI-assisted workout generation into a clean, production-ready web application.

🔗 **Live App:** https://trainer-ai-rouge.vercel.app/

---

##  Features

###  Authentication & Accounts
- Secure authentication with **Firebase Auth**
- Email/password signup & login
- Forgot password flow
- Automatic trainer account provisioning on first login
- Full trainer isolation (no cross-user data leakage)

---

###  Client Management
- Create, edit, and delete clients
- Each client is scoped to the logged-in trainer
- Clean empty states for new users

---

###  Workout Builder
- Create workouts manually or via AI
- Modular block-based workout editor
- Add/remove exercises, sets, reps, weight, tempo, rest
- Reorder blocks and sets
- Workout status tracking (draft, planned, in progress, completed)
- Fully persisted and editable workouts

---

###  AI Workout Generation
- Generate structured workouts using **Google Gemini**
- Uses existing exercise database (global + user exercises)
- Graceful handling of partial/invalid AI outputs
- Generated workouts are editable before saving

---

###  Dashboard & Analytics
- Clean dashboard with:
  - Total workouts
  - Total exercises
  - Total clients
  - Recent workouts
  - Weekly status breakdown
  - Most-used exercises
- Smart empty-state UX for new users

---

###  Exercise System
- ~44 **globally seeded exercises** available to all users
- Trainers can create their own custom exercises
- Global exercises are read-only, trainer exercises are editable
- Safe validation to prevent accidental global edits

---

###  Error Handling & UX
- Centralized API error parsing
- Actionable, user-friendly error messages
- No generic “Network Error” screens
- Safe behavior when backend is temporarily unavailable
- Clean loading & empty states

---

##  Tech Stack

### Frontend
- **Next.js (App Router)**
- **TypeScript**
- **Tailwind CSS**
- **Axios**
- **Firebase Auth (Client SDK)**

### Backend
- **FastAPI**
- **SQLAlchemy**
- **Pydantic v2**
- **Firebase Admin SDK**
- **Google Gemini API**

### Database
- **PostgreSQL (Render)**
- Trainer-scoped relational data model
- Global + trainer-specific exercise support

### Deployment
- **Frontend:** Vercel  
- **Backend:** Render  
- **Auth:** Firebase  
- **AI:** Gemini  

---

##  Security & Isolation
- All API routes protected with Firebase ID tokens
- Trainer resolved server-side on every request
- Strict trainer scoping at the database layer
- No client-side trust for user identity

---

##  Deployment Notes
- Backend cold starts handled gracefully (Render free tier)
- CORS configured for Vercel domains
- Environment-based configuration for all secrets
- Production-ready build with strict TypeScript checks

---

##  Testing Coverage
- Multi-account isolation verified
- CRUD flows tested for:
  - Clients
  - Workouts
  - Exercises
- AI generation tested end-to-end
- Dashboard analytics validated
- Auth flows tested (signup, login, logout, reset)

---

##  Future Improvements
- Program templates
- Workout scheduling/calendar
- Client-side progress tracking
- Export/share workouts
- Mobile-first polish
- Role-based permissions (coach vs athlete)

---

##  Why This Project Matters
TrainerAI is built to demonstrate:
- Production-grade **full-stack architecture**
- Secure auth & multi-tenant data isolation
- Real-world AI integration (not a demo toy)
- Clean UX with attention to edge cases
- Deployment, debugging, and hardening experience

---

##  Author
Built by **Varun Mantha**  
Computer Engineering @ Rutgers University  
Focus areas: Full-stack engineering, AI systems, production software

---

If you find bugs, edge cases, or have ideas — feel free to open an issue or reach out.


# JobAssist – AI-Powered Job Recommendation Platform 💼🤖

🚧 **Note: This project is currently under active development. Features and UI are subject to change.**

JobAssist is an AI-powered web application that helps job seekers discover personalized job opportunities based on their resume, skills, and preferences. Designed for efficiency and scalability, the platform leverages vector search, modern LLMs, and cloud technologies to deliver real-time, relevant recommendations.

---

## 🚀 Features

- 🔍 **Smart Job Matching** – Matches user resumes with 300+ job descriptions using vector similarity.
- 📄 **Resume Upload** – Extracts skills and experience from uploaded PDF resumes.
- 💬 **LLM Integration** – Uses Gemini for extracting structured info and summarizing job roles.
- 📦 **MongoDB Vector Search** – Stores job embeddings and performs fast similarity queries.
- 🌐 **Frontend** – Built with React and Vite for a responsive user experience.
- ☁️ **Backend & Hosting** – FastAPI backend deployed via Google Cloud Run; data stored on GCS and MongoDB Atlas.

---

## 🧱 Tech Stack

| Layer       | Tools / Libraries                           |
|-------------|---------------------------------------------|
| Frontend    | React, TypeScript, Vite                     |
| Backend     | FastAPI, Pydantic, Uvicorn                  |
| AI/ML       | Gemini 1.5 API, Sentence Transformers       |
| Database    | MongoDB Atlas (with vector search)          |
| Cloud       | Google Cloud Run, Google Cloud Storage      |
| DevOps      | GitHub, Postman, VS Code                    |

---

## 🗂️ Project Structure

```bash
jobassist/
│
├── backend/
│   ├── main.py                  # FastAPI app
│   ├── config.py                # Configuration setup
│   ├── utils/                   # Embedding, similarity logic
│   └── job-assist-svc.json      # Service account for GCP
│
├── frontend/
│   ├── public/
│   ├── src/
│   └── package.json
│
├── .gitignore
├── requirements.txt
└── README.md
````

---

## ⚙️ Setup Instructions

### 1. Clone the repo

```bash
git clone https://github.com/MeghaCNair/JobAssist.git
cd JobAssist
```

### 2. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # or .\venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn main:app --reload
```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

---

## 🧠 How It Works

1. User uploads a resume (PDF).
2. Gemini API extracts skills, experience, and preferences.
3. Job descriptions from MongoDB are embedded using a transformer model.
4. Cosine similarity is computed between resume and jobs.
5. Top 5–10 matching jobs are returned and displayed on the frontend.

---

## 🔐 Environment Variables

Create a `.env` file in both `backend/` and `frontend/` as needed:

### `.env` (Backend)

```env
GEMINI_API_KEY=your_google_api_key
MONGODB_URI=your_mongo_connection_string
BUCKET_NAME=your_gcs_bucket
```

---

## 🛣️ Future Enhancements

* 🧠 Chatbot to answer job-related queries
* 📥 One-click application autofill
* 📈 Skill gap analysis and learning recommendations
* 🔄 Daily job update notifications via email or SMS

---

---

Let me know if you’d like:
- A one-liner for recruiters on top (like a TL;DR).
- Deployment instructions (e.g., how to run it on GCP).
- A shorter "student version" of the README.
```

# Noar Personal Hub (NPH)

Welcome to **Noar Personal Hub**! 

Hello, I'm **Noar**, a Data Analyst.  
I created this project as a personal working hub to streamline and facilitate my daily tasks, automate processes, and organize my work efficiently.

## 🚀 Features

This application serves as a centralized dashboard and toolkit:

- **CV & Profile (`/cv`)**: A digital interactive resume showcasing my skills, experience, and projects.
- **Automation Logs (`/dashboard`)**: A monitoring dashboard to track my automated workflows (such as those running via n8n or Python scripts), reporting successes, errors, and running states.
- **Tasks & Schedules (`/tasks`)**: A personal task management system with calendar integration, allowing me to organize to-do lists, schedule events, and push schedules directly to Google Calendar.
- **Snippets Library (`/snippets`)**: A curated collection of frequently used code (Python, SQL, JavaScript), AI prompts, and n8n JSON workflows, complete with syntax highlighting and one-click copy functionality.

## 🛠️ Tech Stack

This project is built with modern web technologies:
- **Framework**: [Next.js](https://nextjs.org/) (React)
- **Styling**: Custom modern CSS with a clean, green-themed Corporate Identity (CI)
- **Database & Auth**: [Supabase](https://supabase.com/) (PostgreSQL + Authentication)
- **Deployment**: [Vercel](https://vercel.com/)

## 💻 Getting Started (Local Development)

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🔒 Authentication
The platform uses Supabase Authentication. Certain features (like adding/editing tasks, snippets, or viewing private logs) are restricted to authenticated users (myself) to keep my personal workspace secure.

---
*Built with ❤️ to make data analysis and automation work a little bit easier.* 

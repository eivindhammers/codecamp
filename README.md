# CodeCamp

Open-source gamified courses in R and Python for economists and data scientists — inspired by Datacamp.

## Features

- 🎮 **Gamified learning** — earn XP and level up as you complete exercises
- 💻 **Interactive code editor** — Monaco Editor (same as VS Code) embedded in every exercise
- 📚 **Structured courses** — chapters, exercises, hints, and sample solutions
- 📈 **Economics-focused** — domain-specific content for economists alongside general programming courses
- 🔓 **Free & open-source**

## Courses

| Course | Language | Level | XP |
|--------|----------|-------|----|
| Introduction to R | R | Beginner | 300 |
| Introduction to Python | Python | Beginner | 300 |
| Intermediate R (tidyverse) | R | Intermediate | 400 |
| Intermediate Python (pandas/NumPy) | Python | Intermediate | 400 |
| Economics & Data Science | Python | Intermediate | 500 |
| R for Economists | R | Intermediate | 450 |

## Tech Stack

- **Next.js 16** (App Router, TypeScript)
- **Tailwind CSS v4**
- **Monaco Editor** (`@monaco-editor/react`)
- Progress persisted via `localStorage`

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Async Grading Worker (Redis + BullMQ)

Server-side grading for queued submissions requires Redis and the worker process.

1. Start Redis:

```bash
npm run redis:up
```

2. In one terminal, run the Next.js app:

```bash
npm run dev
```

3. In a second terminal, run the worker:

```bash
npm run worker
```

Optional:

```bash
npm run redis:down
```

## Project Structure

```
app/
  page.tsx                          # Course catalog (home)
  courses/[slug]/page.tsx           # Course detail with chapter list
  courses/[slug]/[chapter]/
    exercise/[id]/page.tsx          # Interactive exercise page
components/
  CourseCard.tsx                    # Course card with progress bar
  ExerciseEditor.tsx                # Monaco editor + submit/hint/solution
  XPBar.tsx                         # XP & level display in the header
lib/
  types.ts                          # TypeScript interfaces
  courses.ts                        # All course & exercise content
  ProgressContext.tsx               # Client-side XP & progress state
```

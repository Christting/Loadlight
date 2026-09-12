# LoadLight by Team roti canAI

Team: Mia, [Member 2], [Member 3], [Member 4]

Problem Statement: Stress & Workload Manager

Video Presentation: TBD - unlisted YouTube link

Presentation Slides: TBD - public Canva link

Live Demo: TBD - deployed app link

## 1. Project Overview

### The problem

Students are not only stressed because they have tasks. They are stressed because commitments from different parts of life build up quietly until the week becomes too heavy to carry.

Assignments, revision, group meetings, part-time shifts, club work, errands, social pressure, and personal wellbeing needs are usually scattered across different places. A normal to-do list can show what must be done, and a calendar can show when something happens, but neither clearly answers the question students actually need:

> Can I still carry one more thing this week?

Existing tools such as Google Calendar, Notion, Todoist, and basic planner apps help users organize tasks and time. However, they often fall short for student stress management because they do not translate tasks into workload, do not show the emotional cost of saying yes, and do not help users recover or set boundaries when the load becomes too high.

### Our solution

LoadLight is a student workload and stress management prototype that helps students see their current load, test new commitments before accepting them, and rebalance their week before overload turns into burnout.

The app combines task planning with emotional support. Students add their tasks, LoadLight calculates workload from those tasks, and Lumi helps guide the user through planning, reflection, recovery, and boundary-setting.

### Feature set

| Feature | What it does | Why it matters |
|---|---|---|
| Dashboard | Shows current week workload and the biggest load sources. | Gives one quick answer: how heavy is this week? |
| To-do list | Stores open tasks with category, dates, time estimate, priority, flexibility, and reminder. | Tasks become workload inputs, not just checklist items. |
| Add task form | Lets users add title, category, start date, due date, estimated time, priority, flexibility, and reminder. | Gives the app enough information to calculate load properly. |
| Day plan | Shows work active on a selected day. | Helps users understand daily focus. |
| Weekly plan | Shows workload across a selected week. | Helps users understand how pressure builds across the week. |
| Workload calculation | Converts task details into load points and a workload percentage. | Makes stress more visible and explainable. |
| What-if | Lets users test a possible new commitment before saying yes. | Prevents overload before it happens. |
| Balance | Lets users move, keep, or drop tasks when a week is too full. | Turns overload into clear next actions. |
| AI auto plan | Suggests a lighter plan, then asks for confirmation before applying changes. | Keeps AI helpful without taking control away from the student. |
| Lumi chatbot | Gives quick support when the user feels stuck or overloaded. | Makes the experience warmer and less cold. |
| Journal | Lets users write about mood and stress. | Lumi can analyze emotion, pressure source, and next steps. |
| Stress review history | Lets users look back at past stress patterns. | Helps users notice repeated overload triggers. |
| Recovery actions | Includes small reset tools such as breathing or mini-game style relief. | Helps users calm down before returning to tasks. |
| Reflect | Helps users understand what is causing pressure. | Supports emotional clarity. |
| Boundary | Helps users write calmer replies when they need to say no or move something. | Treats boundaries as part of workload protection. |
| Community | Secondary peer support area. | Useful, but kept secondary so the core product stays focused. |

## 2. Ideation & Process

### 2.1 Ideas We Considered

Chosen ideas are listed first, followed by reduced and dropped ideas.

| Idea | Kept / dropped / reduced | Why it was dropped / kept |
|---|---|---|
| LoadLight workload manager | Kept | This became the strongest direction because it connects planning with emotional capacity and answers whether a student can still carry more. |
| Task-based workload calculation | Kept | Mentor feedback pushed us to make workload explainable. The score should come from tasks, not from a random number. |
| Dashboard | Kept | It gives one quick answer: how heavy is this week? |
| To-do list with day and weekly plan | Kept | A task list is useful only when it feeds into workload awareness. Day and week views help users see when pressure happens. |
| Add task form | Kept | LoadLight needs structured task details such as category, start date, due date, time estimate, priority, flexibility, and reminder. |
| What-if feature | Kept | It lets students test the cost of a new commitment before they say yes. |
| Balance flow | Kept | Overload needs action, not just warning text. Move, keep, and drop gives the user practical choices. |
| AI auto plan | Kept with guardrails | It can suggest a lighter plan, but the user must confirm before changes happen. |
| Journal stress analysis | Kept | Stress is not only scheduling. Journal entries help Lumi identify mood, pressure source, and possible next steps. |
| Lumi chatbot | Kept | Students may need quick support when they feel stuck, guilty, or overloaded. |
| Recovery actions / mini-game style relief | Kept | Quick reset actions can help users calm down before returning to work. |
| Reflect | Kept | Users may not know whether they need rest, a boundary, or schedule changes. Reflect helps identify the pressure source. |
| Boundary replies | Kept | Many students become overloaded because they do not know how to say no. |
| Stress review history | Kept | Looking back at stress patterns helps users understand repeated overload triggers. |
| Community support | Reduced | Peer support is useful, but making community the main feature made the product too broad. It stays secondary. |
| Pure to-do list | Dropped | It only records tasks and does not show capacity or overload. |
| Pure calendar planner | Dropped | It shows time, but not mental, social, physical, or errand load. |
| Pure wellness chatbot | Dropped | It can comfort users, but without task action it becomes generic advice. |
| Mood-only tracker | Dropped | It records emotion, but does not help users reduce workload. |
| Pomodoro timer | Dropped | It helps focus, but does not show whether the student is overloaded. |
| Anonymous confession wall | Dropped | It gives emotional release, but could become unfocused and hard to moderate. |
| Reward shop / points system | Dropped | It made the app feel like a game instead of solving capacity planning. |
| Study group matching | Dropped | Useful for academics, but not directly connected to workload balance. |
| AI therapist chatbot | Dropped | Too risky and too broad. LoadLight supports stress, but does not replace professional help. |
| Forced automatic scheduling | Dropped | It could feel controlling. The final app suggests plans but lets users decide. |
| Static workload percentage | Dropped | Hardcoded numbers made pages inconsistent. Shared workload logic is more trustworthy. |

### 2.2 Ideation Boards

Editable mindmap source:

- [Team ideation mindmap - editable draw.io file](docs/loadlight-team-ideation-mindmap.drawio)
- [Team ideation mindmap - HTML preview](docs/loadlight-ideas-mindmap.html)
- [Detailed ideation notes and tables](docs/ideation-mindmap-and-tables.md)

When the final diagram is exported from diagrams.net, save it as `docs/loadlight-ideation-mindmap.png` and embed it here:

```md
![LoadLight ideation mindmap](docs/loadlight-ideation-mindmap.png)
```

This mindmap shows how our team started from different directions: stress support, planning, decision support, and reflection. We then compared which ideas were kept, merged, reduced, or dropped before combining the strongest parts into LoadLight.

### 2.3 Mentor Consultation

| Date | Mentor / source | Feedback received | What was changed |
|---|---|---|---|
| 2026-09-12 | Mentor consultation / handwritten feedback | The dashboard should clearly explain how workload is calculated. | We connected Dashboard, Tasks, What-if, and Balance to shared workload logic so the numbers stay consistent. |
| 2026-09-12 | Mentor consultation / handwritten feedback | Dashboard should be one of the remaining core features. | We kept Dashboard as the first warning screen for current week load. |
| 2026-09-12 | Mentor consultation / handwritten feedback | Balance should be used when the user is really overloaded. | We made Balance week-based and focused it on move, keep, or drop decisions. |
| 2026-09-12 | Mentor consultation / handwritten feedback | Care should be for users who feel really stressed and need help managing it. | We grouped Recovery, Reflect, and Boundary under Care so emotional support is separate from task balancing. |
| 2026-09-12 | Mentor consultation / handwritten feedback | Recovery should let users pick one small reset. | We kept quick reset actions such as breathing and mini-game style relief. |
| 2026-09-12 | Mentor consultation / handwritten feedback | Boundary should help students who do not know how to reject someone. | We added a Boundary flow where Lumi helps generate calmer replies. |
| 2026-09-12 | Mentor consultation / handwritten feedback | There were too many pages and priorities. | We simplified the main demo flow to Tasks -> Dashboard -> What-if -> Balance -> Care. |
| 2026-09-12 | Team feedback | Users should be able to reschedule if they dislike the app's suggested plan. | We added Edit controls in the task list, day plan, and weekly plan. |
| 2026-09-12 | Team feedback | Users should be able to set reminders before tasks. | We added reminder options during task creation and editing. |
| 2026-09-12 | Team feedback | Workload data should not be hardcoded separately on each page. | We aligned the app around one shared workload calculation. |

## 3. Design & Prototype

UI Prototype: TBD - public design or live demo link

The prototype focuses on an end-to-end student workflow:

1. Add real commitments in Tasks.
2. See the current week workload on Dashboard.
3. Use What-if before accepting a new commitment.
4. Use Balance when the week becomes too full.
5. Use Lumi Care, Journal, Reflect, Recovery, or Boundary when the stress is emotional.

Key screens to include in the final README:

| Screen | Interaction to show |
|---|---|
| Dashboard | Current week load, heaviest load categories, and Lumi status. |
| Tasks | Add task form, to-do list, day plan, weekly plan, edit, reschedule, reminders. |
| What-if | Test a new commitment and preview projected workload. |
| Balance | Move, keep, drop, and AI auto plan with confirmation. |
| Care | Recover, Reflect, Boundary, and Journal support. |
| Me | Load preference settings and user controls. |

## 4. What Makes It Different

| Existing approach | Limitation | LoadLight's difference |
|---|---|---|
| Normal to-do list | Shows tasks but not capacity. | Converts tasks into workload and shows whether the week can carry more. |
| Calendar planner | Shows time but not emotional or effort load. | Includes mental, time, physical, social, and errand pressure. |
| Wellness chatbot | Gives advice but may not change the overloaded plan. | Connects support to task actions such as moving, keeping, dropping, and setting boundaries. |
| Focus timer / Pomodoro | Helps work sessions but does not prevent overcommitment. | Helps students check capacity before accepting more work. |

Novel features:

- Capacity-first planning: LoadLight asks whether the week can carry more before asking students to do more.
- What-if sandbox: Students can test a new task before accepting it.
- Shared workload logic: Dashboard, Tasks, What-if, and Balance read from the same calculation.
- Week-based Balance: Users reduce overload by moving flexible tasks to another week, keeping important work, or dropping what is unnecessary.
- Lumi Care: Emotional support is connected to real workload moments through Journal, Reflect, Recovery, and Boundary.

## 5. Technical Architecture & Feasibility

### Tech stack

| Layer | Technology | Why we chose it | Constraints |
|---|---|---|---|
| Frontend | Next.js / React | Good for building an interactive prototype quickly with reusable components. | Needs careful state management so pages stay consistent. |
| Language | TypeScript | Helps keep task and workload data safer as the app grows. | Requires stricter typing and more setup. |
| Styling | CSS with local component styling | Lets us match the soft LoadLight + Lumi visual style. | Requires manual consistency checks. |
| Prototype storage | localStorage | Fast and free for a working live demo without a backend. | Data stays on one browser and does not sync across devices. |
| AI service | Gemini API route for Lumi support | Allows Lumi to generate chat support, boundary replies, and guided reflection. | Needs an API key and safety guardrails. |
| Hosting plan | Vercel or similar app hosting | Fast deployment from GitHub and easy for judges to try. | Serverless API setup must protect keys. |
| Future database | Firebase or Supabase | Suitable for authentication, synced tasks, journal history, and user data. | Requires privacy, auth, and data protection work. |

### Architecture overview

```text
User actions
  -> React screens
  -> Shared workload logic
  -> localStorage prototype state
  -> Dashboard / Tasks / What-if / Balance update consistently

Lumi support
  -> User message or journal/boundary prompt
  -> API route
  -> Gemini response
  -> Supportive reply shown in app
```

### Workload calculation approach

LoadLight calculates workload from tasks instead of using hardcoded percentages. Each task contributes load based on factors such as estimated time, category, priority, flexibility, start date, and due date. Multi-day tasks are spread across the active date range, so day and week views can show workload more realistically.

### Build plan & scope

For the prototype phase, our scope is:

- Complete the main student workflow: add task, view load, test What-if, rebalance, and use Care.
- Keep data in localStorage so the demo is deployable without a full backend.
- Use shared workload logic so every page shows consistent workload numbers.
- Provide editable planning controls: edit task, reschedule, reminder, priority, and flexibility.
- Include Lumi support for chat, journal analysis, reflection, and boundary replies.
- Deploy a live demo so judges can open the app and try the flow.

Future build scope:

- Add authentication and cloud sync.
- Store tasks and journal history in Firebase or Supabase.
- Integrate calendar apps, school deadlines, and task platforms.
- Improve personalization so LoadLight learns which types of load affect each student most.
- Explore university partnerships as part of student wellbeing support.

## 6. Impact

### Target users

LoadLight is designed for university students who juggle academic work, group projects, part-time work, clubs, errands, social pressure, and personal wellbeing.

### Before and after

| Before LoadLight | After LoadLight |
|---|---|
| Students see a list of tasks but not the total load. | Students see how heavy the current week is. |
| Students say yes before understanding the cost. | Students use What-if to test a commitment first. |
| Overload becomes panic or missed deadlines. | Balance gives concrete move, keep, or drop options. |
| Emotional stress is separated from planning. | Lumi Care connects recovery, reflection, boundaries, and journal support. |

### Scalability

LoadLight can start as a freemium student app where basic workload tracking is free. Premium features could include AI planning, calendar sync, deeper insights, and personalized recovery.

The bigger opportunity is with universities. Schools already invest in student wellbeing, but support often arrives after stress becomes serious. LoadLight can help students notice overload earlier and give schools a practical tool for prevention-focused wellbeing support.

## 7. Demo Guide

Suggested judge flow:

1. Open Tasks and add a new task with start date, due date, estimated time, and reminder.
2. Go to Dashboard and show that this week's workload updates automatically.
3. Open What-if and test an extra commitment before accepting it.
4. If the projected load is too high, go to Balance.
5. Move, keep, or drop tasks, or try AI auto plan and confirm changes.
6. Open Care and show Boundary or Journal to explain how Lumi supports emotional stress.

## 8. Setup

```bash
npm install
npm run dev
```

## 9. Repository Notes

The prototype uses shared workload logic so Home, Tasks, What-if, and Balance should not hardcode separate load values.

Before final submission, replace all `TBD` items with public links and export the editable mindmap as `docs/loadlight-ideation-mindmap.png` so it appears directly inside this README.

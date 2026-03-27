// ── Mock data (replace each with real API calls per session doc Step E) ──────

export const MOCK_TASKS = [
  { id:1, task:"Finish API Integration",          meeting:"Q1 Engineering Sync", deadline:"2026-03-27", priority:"high",   status:"pending",   score:72, confidence:95, transcript:"Reno, we need the FastAPI endpoints secured before the demo. Can you finish the API integration by Friday?",                                   submission:null },
  { id:2, task:"Draft Q2 Marketing Copy",         meeting:"Marketing Weekly",    deadline:"2026-03-26", priority:"medium", status:"rejected",  score:55, confidence:88, transcript:"Someone needs to draft the Q2 copy — Reno, can you take that? Focus on the new product launch.",                                             submission:{ file:"marketing_draft.docx", note:"Missing the section on the new product launch. Please revise." } },
  { id:3, task:"Update Database Schema",          meeting:"Infra Standup",       deadline:"2026-03-28", priority:"high",   status:"approved",  score:90, confidence:97, transcript:"Reno please update the schema to include the correction_signals table before EOD.",                                                          submission:{ file:"schema_v2.sql", note:"" } },
  { id:4, task:"Write Unit Tests for Auth Module",meeting:"Q1 Engineering Sync", deadline:"2026-03-29", priority:"low",   status:"submitted", score:65, confidence:82, transcript:"We also need test coverage on the auth module. Reno can you handle that this sprint?",                                                        submission:{ file:"auth_tests.py", note:"" } },
];

export const MOCK_SUBMISSIONS = [
  { id:1, employee:"Reno Red",     task:"Finish API Integration",                file:"api_integration.zip", validationFlag:false, validationScore:92, submittedAt:"2h ago", priority:"high" },
  { id:2, employee:"Mukil Dharan", task:"Frontend React Setup",                  file:"package.json",        validationFlag:true,  validationScore:65, submittedAt:"5h ago", priority:"medium" },
  { id:3, employee:"Bala Ashwath", task:"Write Test Cases for Submission Module", file:"test_cases.py",      validationFlag:false, validationScore:88, submittedAt:"1d ago",  priority:"high" },
];

export const MOCK_TEAM = [
  { id:1, name:"Reno Red",     score:78, total:8, completed:6, pending:1, submitted:1 },
  { id:2, name:"Mukil Dharan", score:65, total:7, completed:4, pending:2, submitted:1 },
  { id:3, name:"Bala Ashwath", score:82, total:9, completed:7, pending:1, submitted:1 },
];

export const MOCK_ESCALATIONS = [
  { id:1, employee:"Mukil Dharan", task:"Prepare Pitch Deck",  level:"L2", daysOverdue:2, score:45 },
  { id:2, employee:"Reno Red",     task:"MailHog Setup",       level:"L1", daysOverdue:1, score:60 },
  { id:3, employee:"Bala Ashwath", task:"Folder Watcher Impl", level:"L3", daysOverdue:4, score:22 },
];

export const MOCK_QUEUE = [
  { id:1, task:"Update presentation slides", owner:"Unknown",        confidence:42, meeting:"Marketing Sync", context:'"...so we need the slides updated. Anyone want to take that? [Silence] Okay let\'s figure it out later."' },
  { id:2, task:"Review the financial report", owner:"Possibly Hari", confidence:58, meeting:"Finance Review", context:'"Someone should look at the numbers before Thursday — I think Hari mentioned it earlier."' },
];

export const MOCK_MEETINGS = [
  { id:1, title:"Q1 Engineering Sync", date:"2026-03-24", tasks:4, summary:"Discussed API integration timeline, database schema updates, and test coverage goals for Sprint 4.", speakers:["Hari","Reno Red","Bala Ashwath"] },
  { id:2, title:"Marketing Weekly",    date:"2026-03-22", tasks:2, summary:"Reviewed Q2 campaign strategy and assigned copy drafting responsibilities for the new product launch.", speakers:["Hari","Mukil Dharan"] },
];

export const MOCK_ACTIVITY = [
  { id:1, text:"Qwen2.5 extracted 4 tasks from Q1 Engineering Sync",       time:"2m ago", color:"#2563eb" },
  { id:2, text:"L1 escalation fired for Reno Red — MailHog Setup overdue", time:"1h ago", color:"#d97706" },
  { id:3, text:"Bala Ashwath submitted Folder Watcher Implementation",      time:"3h ago", color:"#16a34a" },
  { id:4, text:"Weekly prompt refinement job ran — confidence +4%",         time:"1d ago", color:"#7c3aed" },
];
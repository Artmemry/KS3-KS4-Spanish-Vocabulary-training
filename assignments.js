// TASK OF THE WEEK — KS3 & KS4 Spanish.
//
// You will not usually edit this file: the teacher dashboard builds a link
// that carries the task, and that link is what you post to the class.
//
//   label    what the student sees, e.g. "Semana del 21 de septiembre"
//   lessons  the list ids to do, as the site shows them, e.g. ["Y8U4.3","Y8U4.4"]
//   since    the date from which a practice counts, YYYY-MM-DD (usually today)
//   due      the date it is due, YYYY-MM-DD — shown to the student; not a lock
//
// One task for everyone, or one per class:
//   window.ASSIGNMENT = { Y7:{ label:"…", lessons:[…], since:"…", due:"…" },
//                         Y8:{ label:"…", lessons:[…], since:"…", due:"…" } };
//
// A lesson counts as done once the student has played it through since `since`.
// Leave label:"" to show no task. Nothing here ever blocks a student.
window.ASSIGNMENT = { label:"", lessons:[], since:"", due:"" };

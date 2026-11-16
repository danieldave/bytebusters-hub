/* =====================================================================
   BYTEBUSTERS REPORT DESK  ·  Google Sheet + Gmail  ·  version 1
   ---------------------------------------------------------------------
   This script turns this Google Sheet into the Report Desk's storage,
   and sends reports to your Gmail.

   ONE-TIME SETUP (full steps are in HOW-TO-SET-UP.html):
   1. Paste this whole file into Extensions > Apps Script (replace everything).
   2. At the top, choose the function "setup", click Run, and allow access.
   3. Deploy > New deployment > Web app.
        Execute as: Me    ·    Who has access: Anyone
   4. Copy the web app URL into index.html (window.RD_API = "...").

   Your PINs, report email address and term dates are in the "Settings" tab.
   Every logged session is a row in the "Sessions" tab.
   ===================================================================== */

const COLS = {
  Sessions: ["id", "date", "centre", "className", "classId", "term", "year", "curriculumId", "topic", "week", "status", "present", "enrolled",
    "presentations", "activities", "win", "challenge", "support", "next", "evidence", "loggedBy", "createdAt", "updatedAt"],
  Classes: ["id", "centre", "name", "cyear", "enrolled", "order"],
  Curriculum: ["id", "cyear", "term", "track", "level", "weeks", "title", "content", "objective", "project", "missing"]
};
const NUMERIC = ["term", "week", "present", "enrolled", "presentations", "cyear", "order", "createdAt", "updatedAt"];
const STATUS = { met: "Met", partly: "Partly met", notyet: "Not yet met" };
const TERMS = { 1: "First Term", 2: "Second Term", 3: "Third Term" };
const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

/* The 4-year ByteBusters curriculum (from the four curriculum PDFs). setup() copies it into the Curriculum tab. */
const CURRICULUM = [
  {"id": "y1t1-1", "cyear": 1, "term": 1, "track": "Scratch", "level": "Beginner", "weeks": "1-3", "title": "Introduction to Scratch", "content": "Week 1-2: Understanding the Scratch interface. Grasping basic blocks and stage elements.\nWeek 3: Basic animations and simple storytelling.", "objective": "Grasp Scratch basics and block programming.", "project": "Create a simple animation/story using Scratch.", "missing": false},
  {"id": "y1t1-2", "cyear": 1, "term": 1, "track": "Scratch", "level": "Beginner", "weeks": "4-6", "title": "Basic Game Development", "content": "Week 4: Introduction to sprites and movements.\nWeek 5-6: Implementing basic game mechanics, like scoring and collisions.", "objective": "Utilize loops, conditionals, and variables.", "project": "Develop a basic interactive game.", "missing": false},
  {"id": "y1t1-3", "cyear": 1, "term": 1, "track": "Scratch", "level": "Beginner", "weeks": "7-10", "title": "Game Development Concepts", "content": "Week 7-8: Exploring game design elements (levels, characters).\nWeek 9-10: Applying user interactions and refining game mechanics.", "objective": "Understand game development concepts.", "project": "Design and code a simple game project.", "missing": false},
  {"id": "y1t2-1", "cyear": 1, "term": 2, "track": "HTML & CSS", "level": "Beginner", "weeks": "1-3", "title": "Introduction to HTML/CSS", "content": "Week 1-2: Understanding HTML structure and basic tags.\nWeek 3: Basic CSS styling and formatting.", "objective": "Grasp fundamental HTML/CSS concepts.", "project": "Build a simple webpage using HTML and CSS.", "missing": false},
  {"id": "y1t2-2", "cyear": 1, "term": 2, "track": "HTML & CSS", "level": "Beginner", "weeks": "4-6", "title": "Basic Styling Techniques", "content": "Week 4: Advanced CSS: Box model and positioning.\nWeek 5-6: Responsive design basics with media queries.", "objective": "Implement advanced CSS styling techniques.", "project": "", "missing": false},
  {"id": "y1t2-3", "cyear": 1, "term": 2, "track": "HTML & CSS", "level": "Beginner", "weeks": "7-10", "title": "Building Interactive Pages", "content": "Week 7-8: HTML forms and input handling.\nWeek 9-10: Introduction to basic JavaScript for interactivity.", "objective": "Understand interactive web elements.", "project": "Develop a form with basic validation using JS.", "missing": false},
  {"id": "y1t3-1", "cyear": 1, "term": 3, "track": "JavaScript", "level": "Beginner", "weeks": "1-3", "title": "Introduction to JavaScript", "content": "Week 1-2: Basic syntax, variables, and data types.\nWeek 3: Conditional statements and loops.", "objective": "Understand fundamental JavaScript concepts.", "project": "Build simple programs using basic JS concepts.", "missing": false},
  {"id": "y1t3-2", "cyear": 1, "term": 3, "track": "JavaScript", "level": "Beginner", "weeks": "4-6", "title": "Implementing Interactivity", "content": "Week 4: Functions and scope.\nWeek 5-6: DOM manipulation and basic event handling.", "objective": "Apply JS to manipulate web elements.", "project": "Create interactive elements on a webpage.", "missing": false},
  {"id": "y1t3-3", "cyear": 1, "term": 3, "track": "PHP", "level": "Beginner", "weeks": "7-10", "title": "Introduction to PHP", "content": "Week 7-8: Basic PHP syntax and variables.\nWeek 9-10: Control structures and functions in PHP.", "objective": "Understand fundamental PHP concepts.", "project": "Create simple programs using basic PHP.", "missing": false},
  {"id": "y2t1-1", "cyear": 2, "term": 1, "track": "HTML & CSS", "level": "Intermediate", "weeks": "1-3", "title": "Advanced CSS Layouts", "content": "Week 1-2: CSS Grid and Flexbox layouts.\nWeek 3: Mastering responsive design strategies.", "objective": "Implement complex layouts using CSS.", "project": "Design a portfolio with advanced CSS layouts.", "missing": false},
  {"id": "y2t1-2", "cyear": 2, "term": 1, "track": "HTML & CSS", "level": "Intermediate", "weeks": "4-6", "title": "CSS Animations and Effects", "content": "Week 4: CSS animations and transitions.\nWeek 5-6: Implementing CSS libraries for animations.", "objective": "Master CSS animation techniques.", "project": "Create interactive elements using CSS animations.", "missing": false},
  {"id": "y2t1-3", "cyear": 2, "term": 1, "track": "HTML & CSS", "level": "Intermediate", "weeks": "7-10", "title": "Advanced HTML/CSS Projects", "content": "Week 7-8: Implementing CSS preprocessors (e.g., SASS).\nWeek 9-10: Building complex web layouts.", "objective": "Apply advanced HTML/CSS techniques.", "project": "Develop a feature-rich website with SASS.", "missing": false},
  {"id": "y2t2-1", "cyear": 2, "term": 2, "track": "JavaScript", "level": "Intermediate", "weeks": "1-2", "title": "Developing Simple Projects", "content": "Week 1: Introduction to asynchronous JavaScript.\nWeek 2: Error handling and debugging.", "objective": "Learn asynchronous programming in JavaScript.", "project": "Develop a simple interactive web application.", "missing": false},
  {"id": "y2t2-2", "cyear": 2, "term": 2, "track": "JavaScript", "level": "Intermediate", "weeks": "3-4", "title": "Advanced DOM Manipulation", "content": "Week 3: Advanced DOM manipulation techniques.\nWeek 4: Advanced event handling and delegation.", "objective": "Master complex DOM manipulation in JS.", "project": "Create complex web interactions using JS.", "missing": false},
  {"id": "y2t2-3", "cyear": 2, "term": 2, "track": "JavaScript", "level": "Intermediate", "weeks": "5-6", "title": "Asynchronous JavaScript", "content": "Week 5: Working with promises.\nWeek 6: Introduction to AJAX and API integration.", "objective": "Understand asynchronous programming in depth.", "project": "Develop a weather app using AJAX and APIs.", "missing": false},
  {"id": "y2t2-4", "cyear": 2, "term": 2, "track": "JavaScript", "level": "Intermediate", "weeks": "7-10", "title": "JavaScript Frameworks", "content": "Week 7-8: Introduction to popular JS frameworks (e.g., React, Vue).\nWeek 9-10: Basic React/Vue projects.", "objective": "Gain familiarity with popular JS frameworks.", "project": "Create a simple web app using a JS framework.", "missing": false},
  {"id": "y2t3-1", "cyear": 2, "term": 3, "track": "PHP", "level": "Beginner", "weeks": "1-3", "title": "Handling Forms and Sessions", "content": "Week 1: Working with forms and handling user input.\nWeek 2-3: Session management and cookies.", "objective": "Handle user input and manage sessions.", "project": "Develop a basic web application with forms.", "missing": false},
  {"id": "y2t3-2", "cyear": 2, "term": 3, "track": "PHP", "level": "Beginner", "weeks": "4-7", "title": "Database Integration", "content": "Week 4-5: Introduction to databases and SQL queries.\nWeek 6-7: Interacting with databases using PHP.", "objective": "Understand database operations in PHP.", "project": "Create a simple CRUD application with PHP/MySQL.", "missing": false},
  {"id": "y2t3-3", "cyear": 2, "term": 3, "track": "Python", "level": "Beginner", "weeks": "8-10", "title": "Introduction to Python", "content": "Week 8-9: Basic syntax, variables, and data types.\nWeek 10: Conditional statements and loops.", "objective": "Understand fundamental Python concepts.", "project": "Create simple programs using basic Python.", "missing": false},
  {"id": "y3t1-1", "cyear": 3, "term": 1, "track": "PHP", "level": "Intermediate", "weeks": "1-3", "title": "PHP Frameworks", "content": "Week 1-2: Introduction to frameworks like Laravel or CodeIgniter.\nWeek 3: Building applications with frameworks.", "objective": "Gain familiarity with PHP frameworks.", "project": "Develop a web app using a PHP framework.", "missing": false},
  {"id": "y3t1-2", "cyear": 3, "term": 1, "track": "PHP", "level": "Intermediate", "weeks": "4-6", "title": "Advanced Web Development", "content": "Week 4: Working with APIs and web services in PHP.\nWeek 5-6: Creating RESTful APIs with PHP.", "objective": "Implement APIs and build RESTful services.", "project": "Develop a web service or integrate with an API.", "missing": false},
  {"id": "y3t1-3", "cyear": 3, "term": 1, "track": "PHP", "level": "Intermediate", "weeks": "7-10", "title": "Advanced PHP Projects", "content": "Week 7-8: Scalable application architecture.\nWeek 9-10: Integrating third-party services and payment gateways.", "objective": "Create scalable and robust PHP applications.", "project": "Develop an e-commerce platform using PHP.", "missing": false},
  {"id": "y3t2-1", "cyear": 3, "term": 2, "track": "Python", "level": "Beginner", "weeks": "1-3", "title": "Weeks 1-3 are not listed in the curriculum", "content": "", "objective": "", "project": "", "missing": true},
  {"id": "y3t2-2", "cyear": 3, "term": 2, "track": "Python", "level": "Beginner", "weeks": "4-6", "title": "Functions and Data Structures", "content": "Week 4: Functions, scope, and arguments.\nWeek 5-6: Lists, tuples, dictionaries.", "objective": "Apply functions and manage data structures.", "project": "Develop simple applications using data structures.", "missing": false},
  {"id": "y3t2-3", "cyear": 3, "term": 2, "track": "Python", "level": "Beginner", "weeks": "7-10", "title": "Working with Files", "content": "Week 7-8: Reading and writing files.\nWeek 9-10: Exception handling and debugging.", "objective": "Manipulate files and handle exceptions.", "project": "Create a text-based data processing script.", "missing": false},
  {"id": "y3t3-1", "cyear": 3, "term": 3, "track": "Python", "level": "Intermediate", "weeks": "1-3", "title": "Advanced Python Concepts", "content": "Week 1-2: Object-oriented programming in Python.\nWeek 3: Working with modules and packages.", "objective": "Understand advanced Python programming.", "project": "Develop applications using OOP concepts.", "missing": false},
  {"id": "y3t3-2", "cyear": 3, "term": 3, "track": "Python", "level": "Intermediate", "weeks": "4-6", "title": "Python for Data Analysis", "content": "Week 4: Introduction to Pandas for data manipulation.\nWeek 5-6: Data visualization with Matplotlib.", "objective": "Analyze and visualize data using Python.", "project": "Create data analysis projects with Pandas.", "missing": false},
  {"id": "y3t3-3", "cyear": 3, "term": 3, "track": "Python", "level": "Intermediate", "weeks": "7-10", "title": "Web Development with Flask", "content": "Week 7-8: Introduction to Flask and web frameworks.\nWeek 9-10: Building web applications with Flask.", "objective": "Understand web development using Python.", "project": "Develop a basic web application with Flask.", "missing": false},
  {"id": "y4t1-1", "cyear": 4, "term": 1, "track": "Python", "level": "Advanced", "weeks": "1-3", "title": "Advanced Python Libraries", "content": "Week 1-2: Exploring advanced libraries like NumPy, SciPy.\nWeek 3: Machine learning basics with scikit-learn.", "objective": "Gain proficiency in advanced Python libraries.", "project": "Create machine learning models with scikit-learn.", "missing": false},
  {"id": "y4t1-2", "cyear": 4, "term": 1, "track": "Python", "level": "Advanced", "weeks": "4-6", "title": "Web Development with Django", "content": "Week 4: Introduction to Django and its architecture.\nWeek 5-6: Building web apps with Django.", "objective": "Understand web development using Django.", "project": "Develop a web application using Django framework.", "missing": false},
  {"id": "y4t1-3", "cyear": 4, "term": 1, "track": "Python", "level": "Advanced", "weeks": "7-10", "title": "Advanced Python Projects", "content": "Week 7-8: Developing scalable applications.\nWeek 9-10: Exploring Python for automation and scripting.", "objective": "Create scalable and automated Python applications.", "project": "Develop an automation script for a specific task.", "missing": false},
  {"id": "y4t2-1", "cyear": 4, "term": 2, "track": "Java", "level": "Beginner", "weeks": "1-3", "title": "Introduction to Java", "content": "Week 1-2: Basic Java syntax, variables, and data types.\nWeek 3: Conditional statements and loops.", "objective": "Understand fundamental Java concepts.", "project": "Create simple programs using basic Java.", "missing": false},
  {"id": "y4t2-2", "cyear": 4, "term": 2, "track": "Java", "level": "Beginner", "weeks": "4-6", "title": "Object-Oriented Programming", "content": "Week 4: Classes, objects, and inheritance in Java.\nWeek 5-6: Polymorphism and interfaces.", "objective": "Grasp object-oriented concepts in Java.", "project": "Develop applications using OOP principles.", "missing": false},
  {"id": "y4t2-3", "cyear": 4, "term": 2, "track": "Java", "level": "Beginner", "weeks": "7-10", "title": "Handling Exceptions", "content": "Week 7-8: Exception handling in Java.\nWeek 9-10: File handling and I/O operations.", "objective": "Manage exceptions and work with files in Java.", "project": "Develop file-based applications with Java.", "missing": false},
  {"id": "y4t3-1", "cyear": 4, "term": 3, "track": "Capstone", "level": "", "weeks": "1-10", "title": "Capstone Projects", "content": "", "objective": "", "project": "", "missing": false}
];

/* Your centres and classes. setup() copies them into the Classes tab. Edit them there or on the desk. */
const CLASSES = [
  {"id": "unity-scratch", "centre": "Unity High School", "name": "Scratch · Year 1", "cyear": 1, "enrolled": 15, "order": 1},
  {"id": "methodist-scratch", "centre": "Methodist High School", "name": "Scratch · Year 1", "cyear": 1, "enrolled": 15, "order": 2},
  {"id": "yewa-scratch", "centre": "Yewa College", "name": "Scratch · Year 1", "cyear": 1, "enrolled": 15, "order": 3},
  {"id": "yewa-genai", "centre": "Yewa College", "name": "Generative AI · Year 2", "cyear": 1, "enrolled": 10, "order": 4},
  {"id": "yewa-web", "centre": "Yewa College", "name": "Web Development · Year 2", "cyear": 1, "enrolled": 10, "order": 5}
];

/* ===================== 1. ONE-TIME SETUP ===================== */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(COLS).forEach(function (name) { prepSheet_(ss, name, COLS[name]); });
  prepSettings_(ss);
  if (readAll_("Curriculum").length === 0) CURRICULUM.forEach(function (r) { upsert_("Curriculum", r); });
  if (readAll_("Classes").length === 0) CLASSES.forEach(function (r) { upsert_("Classes", r); });
  const blank = ss.getSheetByName("Sheet1");
  if (blank && blank.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(blank);
  installWeeklyEmail();
  const s = settings_();
  Logger.log("Setup done. Team PIN: " + s.teamPin + "  ·  Admin PIN: " + s.adminPin + "  ·  Reports go to: " + s.reportEmail);
}

function prepSheet_(ss, name, cols) {
  const sh = ss.getSheetByName(name) || ss.insertSheet(name);
  sh.getRange(1, 1, sh.getMaxRows(), Math.max(cols.length, sh.getMaxColumns())).setNumberFormat("@");
  if (sh.getLastRow() === 0) sh.getRange(1, 1, 1, cols.length).setValues([cols]);
  sh.getRange(1, 1, 1, cols.length).setFontWeight("bold").setBackground("#0F6B3E").setFontColor("#FFFFFF");
  sh.setFrozenRows(1);
  return sh;
}

function prepSettings_(ss) {
  const sh = ss.getSheetByName("Settings") || ss.insertSheet("Settings", 0);
  sh.getRange(1, 1, sh.getMaxRows(), 3).setNumberFormat("@");
  const pin = function (n) { let p = ""; for (let i = 0; i < n; i++) p += Math.floor(Math.random() * 10); return p.charAt(0) === "0" ? "7" + p.slice(1) : p; };
  const rows = [
    ["teamPin", pin(4), "Trainers and support staff type this PIN to open the desk and log sessions."],
    ["adminPin", pin(6), "Only you: opens the desk with editing rights (curriculum, classes, settings, deleting)."],
    ["reportEmail", Session.getEffectiveUser().getEmail(), "Gmail address that receives the reports. Separate several with commas."],
    ["emailEachSession", "yes", "yes = send an email every time a session is logged. no = weekly report only."],
    ["weeklyDay", "FRIDAY", "Day for the weekly report email (MONDAY to SUNDAY). After changing it, run installWeeklyEmail."],
    ["weeklyHour", "18", "Hour for the weekly report email, 0 to 23 (18 = 6pm)."],
    ["name", "", "Your name, printed on every report."],
    ["role", "Project Assistant and Centre Lead", "Your role, printed on every report."],
    ["year", "2026/2027", "Academic session."],
    ["currentTerm", "1", "1, 2 or 3."],
    ["to", "ByteBusters · Odu'a Investment Foundation", "Who the reports go to (printed on the report)."],
    ["term1Start", "", "First Term start date, as YYYY-MM-DD. Lets the desk work out the week number."],
    ["term2Start", "", "Second Term start date, as YYYY-MM-DD."],
    ["term3Start", "", "Third Term start date, as YYYY-MM-DD."]
  ];
  if (sh.getLastRow() === 0) sh.getRange(1, 1, 1, 3).setValues([["key", "value", "what it is"]]);
  const have = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().map(function (r) { return String(r[0]); }) : [];
  rows.forEach(function (r) { if (have.indexOf(r[0]) < 0) sh.appendRow(r); });
  sh.getRange(1, 1, 1, 3).setFontWeight("bold").setBackground("#0F6B3E").setFontColor("#FFFFFF");
  sh.setFrozenRows(1);
}

/** Run this after you change weeklyDay or weeklyHour in Settings. */
function installWeeklyEmail() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === "weeklyReport") ScriptApp.deleteTrigger(t); });
  const s = settings_();
  const day = DAYS.indexOf(String(s.weeklyDay).toUpperCase()) >= 0 ? String(s.weeklyDay).toUpperCase() : "FRIDAY";
  const hour = Math.min(23, Math.max(0, parseInt(s.weeklyHour, 10) || 18));
  ScriptApp.newTrigger("weeklyReport").timeBased().onWeekDay(ScriptApp.WeekDay[day]).atHour(hour).create();
}

/** Run this once to check that email works. */
function sendTestEmail() {
  const s = settings_();
  MailApp.sendEmail({ to: s.reportEmail, name: "ByteBusters Report Desk", subject: "ByteBusters Report Desk: test email",
    htmlBody: frame_("Test email", "<p style='margin:0'>Your Report Desk can send email. Weekly reports will arrive every " +
      esc_(String(s.weeklyDay).toLowerCase()) + ".</p>", s) });
}

/* ===================== 2. THE SHEET HELPERS ===================== */
function tz_() { return Session.getScriptTimeZone() || "Africa/Lagos"; }
function today_() { return Utilities.formatDate(new Date(), tz_(), "yyyy-MM-dd"); }
function sheet_(name) { return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name); }

function settings_() {
  const sh = sheet_("Settings"), out = {};
  if (!sh || sh.getLastRow() < 2) return out;
  sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues().forEach(function (r) {
    let v = r[1];
    if (v instanceof Date) v = Utilities.formatDate(v, tz_(), "yyyy-MM-dd");
    out[String(r[0]).trim()] = String(v).trim();
  });
  return out;
}

function publicSettings_(s) {
  return { name: s.name || "", role: s.role || "", year: s.year || "", currentTerm: parseInt(s.currentTerm, 10) || 1, to: s.to || "",
    termStarts: { 1: s.term1Start || "", 2: s.term2Start || "", 3: s.term3Start || "" }, reportEmail: s.reportEmail || "",
    emailEachSession: String(s.emailEachSession).toLowerCase() === "yes" ? "yes" : "no", weeklyDay: s.weeklyDay || "FRIDAY", weeklyHour: s.weeklyHour || "18" };
}

function readAll_(name) {
  const sh = sheet_(name);
  if (!sh || sh.getLastRow() < 2) return [];
  const v = sh.getDataRange().getValues(), head = v[0].map(String);
  return v.slice(1).filter(function (r) { return String(r[0]).trim() !== ""; }).map(function (r) {
    const o = {};
    head.forEach(function (h, i) {
      let x = r[i];
      if (x instanceof Date) x = Utilities.formatDate(x, tz_(), "yyyy-MM-dd");
      if (NUMERIC.indexOf(h) >= 0) o[h] = x === "" || x === null ? null : Number(x);
      else if (h === "missing") o[h] = x === true || String(x).toLowerCase() === "true";
      else if (h === "activities") o[h] = String(x) ? String(x).split(/;\s*/) : [];
      else o[h] = String(x);
    });
    return o;
  });
}

function cell_(v) {
  if (v === null || v === undefined) return "";
  if (Array.isArray(v)) v = v.join("; ");
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  let s = String(v);
  if (/^[=+\-@]/.test(s)) s = "'" + s;        // never let typed text become a formula
  return s;
}

function rowOf_(sh, id) {
  if (sh.getLastRow() < 2) return -1;
  const ids = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return i + 2;
  return -1;
}

function upsert_(name, obj) {
  const sh = sheet_(name), cols = COLS[name], row = cols.map(function (c) { return cell_(obj[c]); });
  const at = rowOf_(sh, obj.id);
  if (at > 0) sh.getRange(at, 1, 1, cols.length).setValues([row]);
  else sh.appendRow(row);
  return obj;
}

function remove_(name, id) {
  const sh = sheet_(name), at = rowOf_(sh, id);
  if (at > 0) sh.deleteRow(at);
  return at > 0;
}

function newId_(prefix) { return prefix + new Date().getTime().toString(36) + Math.floor(Math.random() * 1e6).toString(36); }
function str_(v, max) { return String(v === null || v === undefined ? "" : v).trim().slice(0, max || 200); }
function num_(v, lo, hi) { const n = parseInt(v, 10); return isNaN(n) ? null : Math.min(hi, Math.max(lo, n)); }

/* ===================== 3. THE WEB APP (the page talks to this) ===================== */
function doGet() {
  return ContentService.createTextOutput("The ByteBusters Report Desk is connected. Open the desk page to use it.");
}

function doPost(e) {
  let req;
  try { req = JSON.parse(e.postData.contents); } catch (er) { return out_({ ok: false, error: "bad_request" }); }
  const s = settings_();
  const pin = String(req.pin || ""), adminPin = String(req.adminPin || "");
  if (!pin || (pin !== String(s.teamPin) && pin !== String(s.adminPin))) return out_({ ok: false, error: "wrong_pin" });
  const admin = pin === String(s.adminPin) || (adminPin !== "" && adminPin === String(s.adminPin));
  const needAdmin = function () { if (!admin) throw new Error("admin_only"); };
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    switch (req.action) {
      case "load":
        return out_({ ok: true, admin: admin, settings: publicSettings_(s), curriculum: readAll_("Curriculum"), classes: readAll_("Classes"),
          sessions: readAll_("Sessions"), sheetUrl: admin ? SpreadsheetApp.getActiveSpreadsheet().getUrl() : "" });
      case "checkAdmin":
        return out_({ ok: true, admin: admin, sheetUrl: admin ? SpreadsheetApp.getActiveSpreadsheet().getUrl() : "" });
      case "saveSession": {
        const it = req.item || {}, old = it.id ? readAll_("Sessions").filter(function (x) { return x.id === it.id; })[0] : null;
        const k = readAll_("Classes").filter(function (x) { return x.id === it.classId; })[0];
        if (!k) throw new Error("unknown_class");
        if (!/^\d{4}-\d{2}-\d{2}$/.test(String(it.date))) throw new Error("bad_date");
        if (!STATUS[it.status]) throw new Error("bad_status");
        const d = { id: old ? old.id : newId_("s"), date: it.date, centre: k.centre, className: k.name, classId: k.id,
          term: num_(it.term, 1, 3) || 1, year: str_(it.year, 20), curriculumId: str_(it.curriculumId, 40), topic: str_(it.topic, 120),
          week: num_(it.week, 1, 14), status: it.status, present: num_(it.present, 0, 500) || 0, enrolled: num_(it.enrolled, 0, 500),
          presentations: num_(it.presentations, 0, 200) || 0, activities: (it.activities || []).slice(0, 12).map(function (a) { return str_(a, 40); }),
          win: str_(it.win), challenge: str_(it.challenge), support: str_(it.support), next: str_(it.next), evidence: str_(it.evidence, 300),
          loggedBy: str_(it.loggedBy, 60), createdAt: old ? old.createdAt : new Date().getTime(), updatedAt: new Date().getTime() };
        upsert_("Sessions", d);
        lock.releaseLock();
        if (!old && String(s.emailEachSession).toLowerCase() === "yes" && s.reportEmail) {
          try { sessionEmail_(d, s); } catch (mailErr) { Logger.log("Session email failed: " + mailErr); }
        }
        return out_({ ok: true, item: d });
      }
      case "deleteSession": needAdmin(); remove_("Sessions", req.id); return out_({ ok: true });
      case "saveClass": {
        needAdmin();
        const it = req.item || {};
        if (!str_(it.centre) || !str_(it.name)) throw new Error("missing_fields");
        const all = readAll_("Classes"), old = it.id ? all.filter(function (x) { return x.id === it.id; })[0] : null;
        const d = { id: old ? old.id : newId_("c"), centre: str_(it.centre, 80), name: str_(it.name, 80), cyear: num_(it.cyear, 1, 4),
          enrolled: num_(it.enrolled, 0, 500), order: old ? old.order : all.length + 1 };
        upsert_("Classes", d);
        return out_({ ok: true, item: d });
      }
      case "deleteClass":
        needAdmin();
        if (readAll_("Sessions").some(function (x) { return x.classId === req.id; })) throw new Error("class_in_use");
        remove_("Classes", req.id); return out_({ ok: true });
      case "saveCurriculum": {
        needAdmin();
        const it = req.item || {};
        if (!str_(it.track) || !str_(it.weeks) || !str_(it.title)) throw new Error("missing_fields");
        const d = { id: it.id && rowOf_(sheet_("Curriculum"), it.id) > 0 ? it.id : newId_("r"), cyear: num_(it.cyear, 1, 4) || 1, term: num_(it.term, 1, 3) || 1,
          track: str_(it.track, 40), level: str_(it.level, 40), weeks: str_(it.weeks, 10).replace(/\s|_/g, "-").replace(/-+/g, "-"), title: str_(it.title, 120),
          content: str_(it.content, 1500), objective: str_(it.objective, 400), project: str_(it.project, 400), missing: false };
        upsert_("Curriculum", d);
        return out_({ ok: true, item: d });
      }
      case "deleteCurriculum":
        needAdmin();
        if (readAll_("Sessions").some(function (x) { return x.curriculumId === req.id; })) throw new Error("row_in_use");
        remove_("Curriculum", req.id); return out_({ ok: true });
      case "saveSettings": {
        needAdmin();
        const it = req.settings || {}, sh = sheet_("Settings"), set = function (key, val) {
          const at = rowOf_(sh, key);
          if (at > 0) sh.getRange(at, 2).setValue(cell_(val)); else sh.appendRow([key, cell_(val), ""]);
        };
        set("name", str_(it.name, 80)); set("role", str_(it.role, 80)); set("year", str_(it.year, 20)); set("to", str_(it.to, 120));
        set("currentTerm", String(num_(it.currentTerm, 1, 3) || 1));
        ["1", "2", "3"].forEach(function (t) { const v = str_((it.termStarts || {})[t], 10); set("term" + t + "Start", /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : ""); });
        if (it.reportEmail !== undefined) set("reportEmail", str_(it.reportEmail, 300));
        if (it.emailEachSession !== undefined) set("emailEachSession", it.emailEachSession === "yes" ? "yes" : "no");
        return out_({ ok: true, settings: publicSettings_(settings_()) });
      }
      case "emailReport": {
        const o = req.report || {};
        if (!s.reportEmail) throw new Error("no_email");
        lock.releaseLock();
        const rep = buildReport_({ from: o.from, to: o.to, termly: !!o.termly, term: num_(o.term, 1, 3) || 1, centre: str_(o.centre, 80), summary: str_(o.summary, 4000), kind: str_(o.kind, 40) });
        MailApp.sendEmail({ to: s.reportEmail, name: "ByteBusters Report Desk", subject: rep.subject, htmlBody: rep.html });
        return out_({ ok: true, to: s.reportEmail });
      }
      default:
        throw new Error("unknown_action");
    }
  } catch (er) {
    return out_({ ok: false, error: String(er && er.message ? er.message : er) });
  } finally {
    try { lock.releaseLock(); } catch (x) { /* already released */ }
  }
}

function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

/* ===================== 4. EMAILS ===================== */
function esc_(s) { return String(s === null || s === undefined ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
function fmt_(d) {
  if (!d) return "";
  const p = String(d).split("-").map(Number);
  return p[2] + " " + ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][p[1] - 1] + " " + p[0];
}
function addDays_(d, n) { const p = String(d).split("-").map(Number); const x = new Date(Date.UTC(p[0], p[1] - 1, p[2] + n)); return x.toISOString().slice(0, 10); }
function pill_(k) {
  const c = { met: ["#E3F3E9", "#1F7A44"], partly: ["#FFF1CC", "#8C5F00"], notyet: ["#FCE4DF", "#B13A27"] }[k] || ["#EEE", "#555"];
  return "<span style='background:" + c[0] + ";color:" + c[1] + ";font-weight:700;font-size:12px;border-radius:99px;padding:2px 9px;white-space:nowrap'>" + (STATUS[k] || "") + "</span>";
}
function topic_(x, curById) {
  const c = curById[x.curriculumId];
  return c ? "Year " + c.cyear + " · " + c.track + ": " + c.title + " (Weeks " + c.weeks + ")" : (x.topic || "Other work");
}
function frame_(title, inner, s) {
  return "<div style='background:#F4F7F1;padding:20px 10px;font-family:Arial,Helvetica,sans-serif;color:#15231B'>" +
    "<div style='max-width:680px;margin:0 auto;background:#FFFFFF;border-radius:10px;overflow:hidden;border:1px solid #D9E2D5'>" +
    "<div style='background:#0B4F2E;color:#FFFFFF;padding:16px 22px'><div style='font-size:12px;letter-spacing:1px;color:#F3C324;font-weight:700'>BYTEBUSTERS REPORT DESK</div>" +
    "<div style='font-size:21px;font-weight:700;margin-top:3px'>" + esc_(title) + "</div></div><div style='padding:18px 22px;font-size:14.5px;line-height:1.55'>" + inner + "</div>" +
    "<div style='padding:12px 22px;background:#F4F7F1;font-size:12px;color:#59695E'>All sessions are in your Google Sheet: <a href='" + SpreadsheetApp.getActiveSpreadsheet().getUrl() + "' style='color:#0F6B3E'>open the Sheet</a>." +
    (s && s.to ? " Reports go to " + esc_(s.to) + "." : "") + "</div></div></div>";
}
function row_(label, value) {
  return value === "" || value === null || value === undefined ? "" :
    "<tr><td style='padding:7px 10px 7px 0;color:#59695E;vertical-align:top;white-space:nowrap;font-size:13px'>" + esc_(label) + "</td><td style='padding:7px 0;vertical-align:top'>" + value + "</td></tr>";
}

function sessionEmail_(d, s) {
  const curById = {}; readAll_("Curriculum").forEach(function (c) { curById[c.id] = c; });
  const c = curById[d.curriculumId];
  const inner = "<table style='border-collapse:collapse;width:100%'>" +
    row_("Date", esc_(fmt_(d.date)) + (d.week ? " · Week " + d.week + " of " + TERMS[d.term] : " · " + TERMS[d.term])) +
    row_("Centre · class", "<b>" + esc_(d.centre) + "</b> · " + esc_(d.className)) +
    row_("Topic", esc_(topic_(d, curById))) +
    row_("Objective", c && c.objective ? esc_(c.objective) : "") +
    row_("Reached?", pill_(d.status)) +
    row_("Attendance", d.present + (d.enrolled ? " of " + d.enrolled + " learners" : " learners")) +
    row_("Presentations", d.presentations ? d.presentations + " students presented their work" : "") +
    row_("What happened", esc_(d.activities.join(", "))) +
    row_("Win", esc_(d.win)) + row_("Challenge", esc_(d.challenge)) + row_("Support needed", d.support ? "<b>" + esc_(d.support) + "</b>" : "") +
    row_("Next session", esc_(d.next)) + row_("Evidence", d.evidence ? "<a href='" + esc_(d.evidence) + "' style='color:#0F6B3E'>" + esc_(d.evidence) + "</a>" : "") +
    row_("Logged by", esc_(d.loggedBy)) + "</table>";
  MailApp.sendEmail({ to: s.reportEmail, name: "ByteBusters Report Desk",
    subject: "Session logged: " + d.centre + " · " + d.className + " · " + fmt_(d.date),
    htmlBody: frame_("New session: " + d.centre, inner, s) });
}

/** Builds a report for a date range (or a whole term) as an email. */
function buildReport_(o) {
  const s = settings_(), curById = {};
  readAll_("Curriculum").forEach(function (c) { curById[c.id] = c; });
  let ss = readAll_("Sessions").filter(function (x) { return !o.centre || x.centre === o.centre; });
  ss = o.termly ? ss.filter(function (x) { return x.term === o.term && (!s.year || !x.year || x.year === s.year); })
    : ss.filter(function (x) { return x.date >= o.from && x.date <= o.to; });
  ss.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
  const kind = o.termly ? "Termly report" : (o.kind || "Report");
  const pres = ss.reduce(function (a, x) { return a + (x.present || 0); }, 0), enr = ss.reduce(function (a, x) { return a + (x.enrolled || 0); }, 0);
  const cnt = function (k) { return ss.filter(function (x) { return x.status === k; }).length; };
  const talks = ss.reduce(function (a, x) { return a + (x.presentations || 0); }, 0);
  const centres = ss.map(function (x) { return x.centre; }).filter(function (v, i, a) { return a.indexOf(v) === i; });
  const classes = ss.map(function (x) { return x.classId; }).filter(function (v, i, a) { return a.indexOf(v) === i; });
  const period = o.termly ? TERMS[o.term] + (s.year ? ", " + s.year : "") : fmt_(o.from) + " to " + fmt_(o.to);
  const auto = ss.length ? "In this period, ByteBusters held " + ss.length + " session" + (ss.length === 1 ? "" : "s") + " across " + centres.length +
    " centre" + (centres.length === 1 ? "" : "s") + " (" + centres.join(", ") + "), covering " + classes.length + " class" + (classes.length === 1 ? "" : "es") + ". " +
    (enr ? "Average attendance was " + Math.round(pres / enr * 100) + "% (" + pres + " of " + enr + " learner places). " : "") +
    "The learning objective was met in " + cnt("met") + ", partly met in " + cnt("partly") + " and not yet met in " + cnt("notyet") + " sessions." +
    (talks ? " Students gave " + talks + " presentations of their work." : "") : "No sessions were logged in this period.";
  const summary = o.summary || auto;
  const tile = function (l, v) { return "<td style='background:#EEF5EF;border-radius:8px;padding:10px;width:25%'><div style='font-size:12px;color:#4E5E53'>" + l + "</div><div style='font-size:22px;font-weight:700;color:#0B4F2E'>" + v + "</div></td>"; };
  const h = function (t) { return "<h3 style='font-size:13px;letter-spacing:1px;color:#0B4F2E;margin:22px 0 8px;text-transform:uppercase'>" + t + "</h3>"; };
  const list = function (f, empty) {
    const a = ss.filter(function (x) { return x[f]; });
    return a.length ? "<ul style='margin:0;padding-left:20px'>" + a.map(function (x) { return "<li style='margin-bottom:4px'>" + esc_(x[f]) + " <span style='color:#6A776E'>(" + esc_(x.centre) + " · " + esc_(x.className) + ", " + fmt_(x.date).slice(0, -5) + ")</span></li>"; }).join("") + "</ul>"
      : "<p style='color:#6A776E;font-style:italic;margin:0'>" + empty + "</p>";
  };
  const th = "style='text-align:left;font-size:11px;color:#4E5E53;border-bottom:2px solid #CFDACB;padding:6px'", td = "style='border-bottom:1px solid #E1E8DE;padding:6px;vertical-align:top;font-size:13px'";
  const table = ss.length ? "<table style='border-collapse:collapse;width:100%'><tr><th " + th + ">DATE</th><th " + th + ">CENTRE · CLASS</th><th " + th + ">TOPIC</th><th " + th + ">OBJECTIVE</th><th " + th + ">PRESENT</th></tr>" +
    ss.map(function (x) { return "<tr><td " + td + ">" + fmt_(x.date).slice(0, -5) + "</td><td " + td + ">" + esc_(x.centre) + " · " + esc_(x.className) + "</td><td " + td + ">" + (x.week ? "Wk " + x.week + ": " : "") + esc_(topic_(x, curById)) +
      "</td><td " + td + ">" + pill_(x.status) + "</td><td " + td + ">" + x.present + (x.enrolled ? "/" + x.enrolled : "") + "</td></tr>"; }).join("") + "</table>"
    : "<p style='color:#6A776E;font-style:italic;margin:0'>No sessions logged.</p>";
  const inner = "<div style='color:#4E5E53;font-size:13px;margin-bottom:12px'>" + esc_(period) + (o.centre ? " · " + esc_(o.centre) : " · All centres") + "</div>" +
    "<table style='width:100%;border-collapse:separate;border-spacing:6px'><tr>" + tile("Sessions", ss.length) + tile("Attendance", enr ? Math.round(pres / enr * 100) + "%" : "n/a") +
    tile("Objectives met", cnt("met") + "/" + ss.length) + tile("Presentations", talks) + "</tr></table>" +
    h("1. Summary") + summary.split(/\n+/).map(function (p) { return "<p style='margin:0 0 8px'>" + esc_(p) + "</p>"; }).join("") +
    h("2. Sessions delivered") + table + h("3. Highlights") + list("win", "No wins logged.") + h("4. Challenges") + list("challenge", "No challenges logged.") +
    h("5. Support needed") + list("support", "No support requested.") + h("6. Next steps") + list("next", "No next steps logged.") +
    "<p style='margin:24px 0 0;padding-top:10px;border-top:1px solid #CFDACB;font-size:13px'>Prepared by <b>" + esc_(s.name || "the Centre Lead") + "</b>" + (s.role ? ", " + esc_(s.role) : "") + " · " + fmt_(today_()) + "</p>";
  return { subject: "ByteBusters " + kind.toLowerCase() + ": " + (o.centre || "All centres") + " · " + period, html: frame_(kind + ": " + (o.centre || "All centres"), inner, s) };
}

/** Runs by itself every week (see installWeeklyEmail). */
function weeklyReport() {
  const s = settings_();
  if (!s.reportEmail) return;
  const to = today_(), from = addDays_(to, -6);
  const rep = buildReport_({ from: from, to: to, termly: false, centre: "", summary: "", kind: "Weekly report" });
  MailApp.sendEmail({ to: s.reportEmail, name: "ByteBusters Report Desk", subject: rep.subject, htmlBody: rep.html });
}

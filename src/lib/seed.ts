import { db } from "@/db";
import {
  users,
  tasks,
  announcements,
  taskSeen,
  announcementSeen,
  siteSettings,
  floors,
  todos,
  reminders,
  attachments,
} from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { count } from "drizzle-orm";

const now = new Date();
const days = (n: number) => new Date(now.getTime() + n * 86400000);
const hours = (n: number) => new Date(now.getTime() + n * 3600000);

type SeededUser = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: "admin" | "supervisor" | "operator" | "guard";
  title: string;
  phone: string;
};

export const DEMO_USERS: SeededUser[] = [
  {
    id: "a0000001-0000-0000-0000-000000000001",
    name: "James Hartley",
    email: "j.hartley@8bishopsgate.com",
    password: "admin123",
    role: "admin",
    title: "Security Operations Manager",
    phone: "+44 7700 900101",
  },
  {
    id: "a0000001-0000-0000-0000-000000000002",
    name: "Priya Kapoor",
    email: "p.kapoor@8bishopsgate.com",
    password: "supervisor123",
    role: "supervisor",
    title: "Senior Security Supervisor",
    phone: "+44 7700 900202",
  },
  {
    id: "a0000001-0000-0000-0000-000000000003",
    name: "Marcus Okonkwo",
    email: "m.okonkwo@8bishopsgate.com",
    password: "supervisor123",
    role: "supervisor",
    title: "Security Supervisor – Nights",
    phone: "+44 7700 900303",
  },
  {
    id: "a0000001-0000-0000-0000-000000000004",
    name: "Elena Rossi",
    email: "e.rossi@8bishopsgate.com",
    password: "supervisor123",
    role: "supervisor",
    title: "Security Supervisor – Events",
    phone: "+44 7700 900404",
  },
  {
    id: "a0000001-0000-0000-0000-000000000005",
    name: "David Chen",
    email: "d.chen@8bishopsgate.com",
    password: "operator123",
    role: "operator",
    title: "CCTV Control Room Operator",
    phone: "+44 7700 900505",
  },
  {
    id: "a0000001-0000-0000-0000-000000000006",
    name: "Sarah Ahmed",
    email: "s.ahmed@8bishopsgate.com",
    password: "guard123",
    role: "guard",
    title: "Security Officer – Front of House",
    phone: "+44 7700 900606",
  },
  {
    id: "a0000001-0000-0000-0000-000000000007",
    name: "Tom Fletcher",
    email: "t.fletcher@8bishopsgate.com",
    password: "guard123",
    role: "guard",
    title: "Security Officer – Loading Bay",
    phone: "+44 7700 900707",
  },
  {
    id: "a0000001-0000-0000-0000-000000000008",
    name: "Layla Hussain",
    email: "l.hussain@8bishopsgate.com",
    password: "supervisor123",
    role: "supervisor",
    title: "Security Supervisor – Tenant Liaison",
    phone: "+44 7700 900808",
  },
];

export async function seedDatabase() {
  await db.delete(reminders);
  await db.delete(attachments);
  await db.delete(todos);
  await db.delete(floors);
  await db.delete(siteSettings);
  await db.delete(tasks);
  await db.delete(announcements);
  await db.delete(users);

  const insertedUsers: typeof DEMO_USERS = [];
  for (const u of DEMO_USERS) {
    const [row] = await db
      .insert(users)
      .values({
        id: u.id,
        name: u.name,
        email: u.email,
        passwordHash: await hashPassword(u.password),
        role: u.role,
        title: u.title,
        phone: u.phone,
        site: "8 Bishopsgate",
        active: true,
      })
      .returning();
    insertedUsers.push({ ...u, id: row.id });
  }

  const uid = (idx: number) => insertedUsers[idx].id;
  const adminId = uid(0);

  const seedTasks = [
    {
      title: "Morning perimeter sweep – Undershaft Road",
      description:
        "Walk full perimeter including service yard, loading bay doors and basement ventilation grilles. Check for unauthorised access attempts or obstructions.",
      priority: "high",
      status: "open",
      category: "patrol",
      location: "Undershaft Road Perimeter",
      assignedTo: uid(6),
      createdBy: uid(1),
      dueAt: hours(2),
    },
    {
      title: "CCTV camera cluster audit – Level 2 concourse",
      description:
        "Verify all 14 cameras on Level 2 are online, correctly angled and recording. Test PTZ presets P1–P8. Replace any with degraded image quality.",
      priority: "medium",
      status: "in_progress",
      category: "cctv",
      location: "Level 2 Concourse",
      assignedTo: uid(4),
      createdBy: uid(1),
      dueAt: hours(6),
    },
    {
      title: "Fire panel reset – Plant Room B2",
      description:
        "Plant Room B2 reported false alarm at 04:12. Reset the fire strategy panel, liaise with building engineers and log the event in the incident register.",
      priority: "high",
      status: "open",
      category: "maintenance",
      location: "Plant Room B2",
      assignedTo: uid(2),
      createdBy: uid(1),
      dueAt: hours(3),
    },
    {
      title: "Contractor pass issuance – Skanska refurbishment",
      description:
        "12 Skanska contractors arriving at 08:00 for tenant refurbishment on Level 34. Verify ID, issue visitor passes, brief on site rules and log in the contractor management system.",
      priority: "medium",
      status: "open",
      category: "access_control",
      location: "Reception – Lobby Entrance",
      assignedTo: uid(5),
      createdBy: uid(3),
      dueAt: hours(1),
    },
    {
      title: "Incident report – package left unattended Level 12",
      description:
        "Tenant on Level 12 reported an unattended package near the lift lobby at 06:45. Package has been secured and placed in the search booth. Complete full incident report and notify Metropolitan Police liaison.",
      priority: "critical",
      status: "completed",
      category: "incident",
      location: "Level 12 – East Lift Lobby",
      assignedTo: uid(2),
      createdBy: uid(1),
      completedAt: hours(-1),
    },
    {
      title: "Weekly key handover log audit",
      description:
        "Audit the master key register. Confirm all 47 keys accounted for and sign-off sheet is current. Flag any discrepancies to the Operations Manager.",
      priority: "medium",
      status: "open",
      category: "compliance",
      location: "Control Room",
      assignedTo: uid(1),
      createdBy: uid(0),
      dueAt: days(2),
    },
    {
      title: "Fire warden briefing – Tower Evacuation Plan 2026",
      description:
        "Deliver refresher briefing to all 23 fire wardens on the updated phased evacuation plan. Attendance register required for compliance records.",
      priority: "high",
      status: "open",
      category: "training",
      location: "Auditorium – Level 1",
      assignedTo: uid(3),
      createdBy: uid(0),
      dueAt: days(1),
    },
    {
      title: "Overdue: Monthly guard licensing check",
      description:
        "Verify all security officers hold valid SIA licences. Three officers flagged – renewals pending. Chase and escalate to Operations Manager if not resolved by EOW.",
      priority: "high",
      status: "in_progress",
      category: "compliance",
      location: "Admin Office",
      assignedTo: uid(7),
      createdBy: uid(0),
      dueAt: days(-2),
    },
    {
      title: "Loading bay gate replacement – hydraulic fault",
      description:
        "Loading bay gate on Undershaft Road slow to open. Arrange engineer attendance from the gate vendor. Maintain manual control in the meantime.",
      priority: "medium",
      status: "open",
      category: "maintenance",
      location: "Loading Bay – Undershaft Road",
      assignedTo: uid(6),
      createdBy: uid(2),
      dueAt: days(3),
    },
    {
      title: "VIP visit coordination – Tenant AGM Level 48",
      description:
        "Coordinate security for tenant AGM on Level 48 tomorrow. Arrange extra static post, briefing for access control, liaise with Close Protection team for visiting board members.",
      priority: "high",
      status: "in_progress",
      category: "access_control",
      location: "Level 48 – Board Room",
      assignedTo: uid(3),
      createdBy: uid(0),
      dueAt: hours(18),
    },
    {
      title: "Rooftop access log reconciliation",
      description:
        "Reconcile rooftop access card logs for the past 30 days. Match against scheduled maintenance windows and flag unauthorised entries.",
      priority: "low",
      status: "open",
      category: "compliance",
      location: "Rooftop Access Point",
      assignedTo: uid(5),
      createdBy: uid(1),
      dueAt: days(5),
    },
    {
      title: "Night shift patrol – car park B1/B2",
      description:
        "Hourly patrols of both basement car parks between 22:00 and 06:00. Check for unauthorised vehicles, suspicious persons and report any concerns via radio.",
      priority: "medium",
      status: "completed",
      category: "patrol",
      location: "Car Park B1/B2",
      assignedTo: uid(2),
      createdBy: uid(1),
      completedAt: hours(-8),
    },
    {
      title: "Bin store inspection – pest control report",
      description:
        "Weekly bin store inspection following pest control visit last week. Check for signs of recurrence and update pest control log.",
      priority: "low",
      status: "open",
      category: "maintenance",
      location: "Bin Store – Rear of Building",
      assignedTo: uid(6),
      createdBy: uid(2),
      dueAt: days(1),
    },
    {
      title: "Test emergency call points – all floors",
      description:
        "Quarterly test of all 48 emergency call points. Coordinate with control room to verify signal received for each activation.",
      priority: "medium",
      status: "open",
      category: "compliance",
      location: "All Floors",
      assignedTo: uid(4),
      createdBy: uid(0),
      dueAt: days(7),
    },
  ];

  const insertedTaskIds: string[] = [];
  for (const t of seedTasks) {
    const [inserted] = await db
      .insert(tasks)
      .values({
        ...t,
        updatedAt: t.dueAt || now,
      })
      .returning({ id: tasks.id });
    insertedTaskIds.push(inserted.id);
  }

  const seedAnnouncements = [
    {
      title: "Undershaft Road loading bay closure – Fri 14th March",
      body:
        "Undershaft Road loading bay will be closed from 06:00 to 18:00 on Friday 14th March for resurfacing works. All deliveries must be rerouted via Leadenhall Market entrance. Please notify tenants by Wednesday.",
      priority: "urgent",
      pinned: true,
      authorId: adminId,
      createdAt: hours(-6),
      expiresAt: days(3),
    },
    {
      title: "New visitor management system – training sessions",
      body:
        "We are rolling out a new visitor management platform from 1st April. All Front of House and reception staff must complete the 90-minute training session. Book your slot via the intranet. Supervisors – please ensure your teams are covered.",
      priority: "normal",
      pinned: false,
      authorId: uid(1),
      createdAt: hours(-18),
    },
    {
      title: "CRITICAL – Suspected suspicious package protocol reminder",
      body:
        "Following last week's incident on Level 12, this is a reminder of the unattended package protocol:\n\n1. Do NOT touch or move the item\n2. Cordon a 25m perimeter\n3. Notify control room immediately on Channel 3\n4. Control room to notify City of London Police\n5. Await EOD team attendance\n\nFull SOP available in the shared drive under SOP-SEC-014.",
      priority: "critical",
      pinned: true,
      authorId: adminId,
      createdAt: days(-1),
    },
    {
      title: "Team social – Friday drinks",
      body:
        "Join us at The Counting House on Friday 21st March from 17:30 to celebrate a successful quarter. Drinks on the house for the first hour. Please RSVP to Priya by Wednesday.",
      priority: "normal",
      pinned: false,
      authorId: uid(1),
      createdAt: days(-2),
      expiresAt: days(8),
    },
    {
      title: "Shift pattern changes – April roster",
      body:
        "The April shift rota has been published. Notable changes:\n• Night team now 4-on-4-off from 1st April\n• Weekend day team increased to 3 officers\n• Control room cover extended to 24/7 from mid-April\n\nPlease review your shifts and raise any conflicts with your supervisor by 15th March.",
      priority: "normal",
      pinned: false,
      authorId: adminId,
      createdAt: days(-3),
    },
    {
      title: "Fire drill – Tuesday 18th March at 11:00",
      body:
        "A full building fire drill is scheduled for Tuesday 18th March at 11:00. All security staff must be in post and wearing high-vis. Control room to coordinate evacuation timing. Tenant liaison to brief floor wardens. Full brief at 10:30 in the control room.",
      priority: "urgent",
      pinned: true,
      authorId: adminId,
      createdAt: days(-4),
      expiresAt: days(5),
    },
    {
      title: "CCTV upgrade – Level 30 to 45 cameras being replaced",
      body:
        "Between 17th and 21st March, all cameras from Level 30 to Level 45 are being replaced with upgraded 4K units. Control room will have intermittent coverage on those floors. Operations supervisors – please deploy temporary static posts where appropriate.",
      priority: "normal",
      pinned: false,
      authorId: uid(3),
      createdAt: days(-5),
    },
  ];

  const insertedAnnouncementIds: string[] = [];
  for (const a of seedAnnouncements) {
    const [inserted] = await db
      .insert(announcements)
      .values({
        ...a,
        updatedAt: a.createdAt,
      })
      .returning({ id: announcements.id });
    insertedAnnouncementIds.push(inserted.id);
  }

  await db.insert(taskSeen).values([
    { taskId: insertedTaskIds[0], userId: uid(6), seenAt: hours(-1) },
    { taskId: insertedTaskIds[0], userId: uid(1), seenAt: hours(-1.5) },
    { taskId: insertedTaskIds[1], userId: uid(4), seenAt: hours(-2) },
    { taskId: insertedTaskIds[1], userId: uid(1), seenAt: hours(-3) },
    { taskId: insertedTaskIds[2], userId: uid(2), seenAt: hours(-2.5) },
    { taskId: insertedTaskIds[3], userId: uid(5), seenAt: hours(-0.5) },
    { taskId: insertedTaskIds[4], userId: uid(2), seenAt: hours(-4) },
    { taskId: insertedTaskIds[4], userId: uid(0), seenAt: hours(-5) },
    { taskId: insertedTaskIds[6], userId: uid(3), seenAt: hours(-8) },
    { taskId: insertedTaskIds[7], userId: uid(7), seenAt: days(-1) },
    { taskId: insertedTaskIds[9], userId: uid(3), seenAt: hours(-6) },
    { taskId: insertedTaskIds[11], userId: uid(2), seenAt: hours(-9) },
  ]);

  await db.insert(announcementSeen).values([
    { announcementId: insertedAnnouncementIds[0], userId: uid(1), seenAt: hours(-5) },
    { announcementId: insertedAnnouncementIds[0], userId: uid(2), seenAt: hours(-4) },
    { announcementId: insertedAnnouncementIds[0], userId: uid(5), seenAt: hours(-2) },
    { announcementId: insertedAnnouncementIds[0], userId: uid(6), seenAt: hours(-1) },
    { announcementId: insertedAnnouncementIds[1], userId: uid(4), seenAt: hours(-12) },
    { announcementId: insertedAnnouncementIds[1], userId: uid(5), seenAt: hours(-10) },
    { announcementId: insertedAnnouncementIds[2], userId: uid(1), seenAt: hours(-20) },
    { announcementId: insertedAnnouncementIds[2], userId: uid(2), seenAt: hours(-19) },
    { announcementId: insertedAnnouncementIds[2], userId: uid(3), seenAt: hours(-18) },
    { announcementId: insertedAnnouncementIds[2], userId: uid(4), seenAt: hours(-17) },
    { announcementId: insertedAnnouncementIds[2], userId: uid(5), seenAt: hours(-16) },
    { announcementId: insertedAnnouncementIds[2], userId: uid(6), seenAt: hours(-15) },
    { announcementId: insertedAnnouncementIds[2], userId: uid(7), seenAt: hours(-14) },
    { announcementId: insertedAnnouncementIds[3], userId: uid(1), seenAt: days(-1) },
    { announcementId: insertedAnnouncementIds[4], userId: uid(2), seenAt: days(-2) },
    { announcementId: insertedAnnouncementIds[4], userId: uid(7), seenAt: days(-2) },
    { announcementId: insertedAnnouncementIds[5], userId: uid(1), seenAt: days(-3) },
    { announcementId: insertedAnnouncementIds[5], userId: uid(3), seenAt: days(-3) },
    { announcementId: insertedAnnouncementIds[6], userId: uid(4), seenAt: days(-4) },
  ]);

  // Site settings + floor plan
  await db.insert(siteSettings).values({
    id: "site",
    siteName: "8 Bishopsgate",
    addressLine1: "8 Bishopsgate, Undershaft Road",
    addressLine2: null,
    borough: "City of London",
    city: "London",
    postcode: "EC2N 4AY",
    country: "United Kingdom",
    securityTier: "Enhanced",
    phone: "+44 20 7330 8000",
    email: "control.room@8bishopsgate.com",
    websiteUrl: "https://www.8bishopsgate.com",
    notes: "58-storey tower with viewing gallery on L55. Service yard access via Undershaft Rd.",
  }).onConflictDoNothing();

  const seedFloors = [
    { name: "Basement B2 – Plant & Car Park", level: -2 },
    { name: "Basement B1 – Car Park & Cycle Store", level: -1 },
    { name: "Ground – Lobby & Reception", level: 0 },
    { name: "Level 1 – Auditorium", level: 1 },
    { name: "Level 2 – Public Concourse", level: 2 },
    { name: "Level 12 – Tenanted", level: 12 },
    { name: "Level 34 – Tenanted (refurb)", level: 34 },
    { name: "Level 48 – Board Suite", level: 48 },
    { name: "Level 51 – Scalpel Client Suite", level: 51 },
    { name: "Level 55 – Viewing Gallery", level: 55 },
    { name: "Roof – Plant & Mast", level: 60 },
  ];
  for (const f of seedFloors) {
    await db.insert(floors).values({ ...f, sortOrder: f.level });
  }

  // Personal to-dos (visible only to their owner)
  await db.insert(todos).values([
    { userId: uid(6), title: "Collect radio #14 from control room", dueAt: hours(1) },
    { userId: uid(6), title: "Log visitor badge returns in register", done: true },
    { userId: uid(5), title: "Hand over pass drawer keys at 13:00", dueAt: hours(3) },
    { userId: uid(4), title: "Review overnight CCTV export queue" },
    { userId: uid(0), title: "Sign off April rota with HR", dueAt: days(1) },
  ]);
}

// Bootstrap sample *content* (tasks, announcements, floors, site profile)
// for a live deployment — attributed to a real user, no demo accounts.
export async function bootstrapContent(adminId: string) {
  const [taskCount] = await db.select({ value: count(tasks.id) }).from(tasks);
  const [floorCount] = await db.select({ value: count(floors.id) }).from(floors);
  if ((taskCount?.value ?? 0) > 0 || (floorCount?.value ?? 0) > 0) {
    throw new Error("Content already exists — bootstrap only runs on an empty deployment");
  }

  const sampleTasks = [
    { title: "Morning perimeter sweep – Undershaft Road", description: "Full perimeter walk including service yard, loading bay doors and basement ventilation grilles.", priority: "high", status: "open", category: "patrol", location: "Undershaft Road Perimeter", dueAt: hours(2) },
    { title: "CCTV camera cluster audit – Level 2 concourse", description: "Verify all cameras online, correctly angled and recording.", priority: "medium", status: "in_progress", category: "cctv", location: "Level 2 Concourse", dueAt: hours(6) },
    { title: "Contractor pass issuance – lobby briefing", description: "Verify ID, issue visitor passes and brief contractors on site rules.", priority: "medium", status: "open", category: "access_control", location: "Reception – Lobby Entrance", dueAt: hours(1) },
    { title: "Fire warden refresher briefing", description: "Updated phased evacuation plan refresher for all floor wardens.", priority: "high", status: "open", category: "training", location: "Auditorium – Level 1", dueAt: days(1) },
    { title: "Weekly key handover log audit", description: "Audit the master key register and sign-off sheet.", priority: "medium", status: "open", category: "compliance", location: "Control Room", dueAt: days(2) },
  ];
  for (const t of sampleTasks) {
    await db.insert(tasks).values({ ...t, description: t.description, assignedTo: adminId, createdBy: adminId });
  }

  const sampleAnnouncements = [
    { title: "Loading bay closure – maintenance window", body: "The loading bay will be closed Friday 06:00–18:00 for resurfacing. Reroute deliveries via the main entrance.", priority: "urgent", pinned: true, expiresAt: days(3) },
    { title: "Suspicious package protocol reminder", body: "Reminder: do NOT touch the item; cordon 25m; notify control room on Channel 3; await EOD attendance. Full SOP in the shared drive.", priority: "critical", pinned: true },
    { title: "Quarterly fire drill scheduled", body: "Full building fire drill Tuesday 11:00. All security staff in post wearing high-vis. Control room coordinates timing.", priority: "normal", pinned: false, expiresAt: days(5) },
  ];
  for (const a of sampleAnnouncements) {
    await db.insert(announcements).values({ ...a, body: a.body, authorId: adminId });
  }

  await db.insert(siteSettings).values({
    id: "site", siteName: "8 Bishopsgate", addressLine1: "8 Bishopsgate, Undershaft Road",
    borough: "City of London", city: "London", postcode: "EC2N 4AY", country: "United Kingdom",
    securityTier: "Enhanced", phone: "+44 20 7330 8000", email: "control.room@8bishopsgate.com",
    websiteUrl: "https://www.8bishopsgate.com",
  }).onConflictDoNothing();

  const seedFloors = [
    { name: "Basement B2 – Plant & Car Park", level: -2 }, { name: "Basement B1 – Car Park & Cycle Store", level: -1 },
    { name: "Ground – Lobby & Reception", level: 0 }, { name: "Level 1 – Auditorium", level: 1 },
    { name: "Level 2 – Public Concourse", level: 2 }, { name: "Level 12 – Tenanted", level: 12 },
    { name: "Level 34 – Tenanted (refurb)", level: 34 }, { name: "Level 48 – Board Suite", level: 48 },
    { name: "Level 55 – Viewing Gallery", level: 55 }, { name: "Roof – Plant & Mast", level: 60 },
  ];
  for (const f of seedFloors) {
    await db.insert(floors).values({ ...f, sortOrder: f.level });
  }
}

export async function getDemoAccounts() {
  return DEMO_USERS.map((u) => ({
    name: u.name,
    email: u.email,
    password: u.password,
    role: u.role,
    title: u.title,
  }));
}

// Shared mock notification source.
// Used by the Notifications page (read state can be mutated there) and by
// any page that needs to display an unread badge (e.g. the mobile nav).
export interface Notification {
  id: string;
  title: string;
  message: string;
  date: string;
  read: boolean;
}

export const sampleNotifications: Notification[] = [
  {
    id: "1",
    title: "New Student Enrolled",
    message: "John Doe has been enrolled in Class 10A.",
    date: "2025-02-15T10:30:00",
    read: false,
  },
  {
    id: "2",
    title: "Fee Payment Reminder",
    message: "Fees for Term 2 are due in 5 days.",
    date: "2025-02-14T08:15:00",
    read: false,
  },
  {
    id: "3",
    title: "Exam Schedule Published",
    message: "The final exam timetable is now available.",
    date: "2025-02-12T14:20:00",
    read: true,
  },
];

export const getUnreadNotificationCount = (
  notifications: Notification[] = sampleNotifications,
) => notifications.filter((n) => !n.read).length;

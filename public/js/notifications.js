/**
 * Notifications System
 * Handles in-app notifications, plan expiry reminders, and new feature alerts
 */

import { db } from "./firebase.js";
import { collection, addDoc, query, where, orderBy, onSnapshot, updateDoc, doc, serverTimestamp, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { logNotificationCreated, logNotificationRead, logNotificationShown } from "./logger.js";

// Notification types
export const NOTIFICATION_TYPES = {
  IN_APP: 'in_app',
  PLAN_EXPIRY: 'plan_expiry',
  NEW_FEATURE: 'new_feature'
};

// Notification priorities
export const NOTIFICATION_PRIORITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent'
};

let currentUser = null;
let notificationsListener = null;

/**
 * Initialize notifications for the current user
 */
export function initNotifications() {
  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (user) {
      setupNotificationsListener(user.uid);
    } else {
      if (notificationsListener) {
        notificationsListener();
        notificationsListener = null;
      }
    }
  });
}

/**
 * Set up real-time listener for user notifications
 */
function setupNotificationsListener(userId) {
  const notificationsRef = collection(db, 'notifications');
  const q = query(
    notificationsRef,
    where('userId', '==', userId),
    where('isRead', '==', false),
    orderBy('createdAt', 'desc')
  );

  notificationsListener = onSnapshot(q, (snapshot) => {
    const notifications = [];
    snapshot.forEach((doc) => {
      notifications.push({ id: doc.id, ...doc.data() });
    });

    // Update notification badge
    updateNotificationBadge(notifications.length);

    // Show in-app notifications if any
    notifications.forEach(notification => {
      if (notification.type === NOTIFICATION_TYPES.IN_APP && !notification.shown) {
        showInAppNotification(notification);
      }
    });
  });
}

/**
 * Create a new notification
 */
export async function createNotification(userId, type, title, message, data = {}, priority = NOTIFICATION_PRIORITIES.MEDIUM) {
  try {
    const notification = {
      userId,
      type,
      title,
      message,
      data,
      priority,
      isRead: false,
      shown: false,
      createdAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'notifications'), notification);

    // Log notification creation
    if (window.logger) {
      window.logger.info('notification_created', {
        notificationId: docRef.id,
        type,
        priority,
        category: 'notification'
      });
    }

    return docRef.id;
  } catch (error) {
    console.error('Failed to create notification:', error);
    throw error;
  }
}

/**
 * Mark notification as read
 */
export async function markAsRead(notificationId) {
  try {
    await updateDoc(doc(db, 'notifications', notificationId), {
      isRead: true,
      readAt: serverTimestamp()
    });

    // Log notification read
    logNotificationRead(notificationId);
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
  }
}

/**
 * Mark notification as shown (for in-app notifications)
 */
export async function markAsShown(notificationId) {
  try {
    await updateDoc(doc(db, 'notifications', notificationId), {
      shown: true,
      shownAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Failed to mark notification as shown:', error);
  }
}

/**
 * Get all notifications for current user
 */
export async function getNotifications() {
  if (!currentUser) return [];

  try {
    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('userId', '==', currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    const notifications = [];
    snapshot.forEach((doc) => {
      notifications.push({ id: doc.id, ...doc.data() });
    });

    return notifications;
  } catch (error) {
    console.error('Failed to get notifications:', error);
    return [];
  }
}

/**
 * Create plan expiry reminder
 */
export async function createPlanExpiryReminder(userId, planEndDate, daysUntilExpiry = 7) {
  const expiryDate = new Date(planEndDate);
  const reminderDate = new Date(expiryDate);
  reminderDate.setDate(expiryDate.getDate() - daysUntilExpiry);

  const title = `Plan Expiring Soon`;
  const message = `Your plan will expire on ${expiryDate.toLocaleDateString()}. Renew now to continue enjoying premium features.`;

  return await createNotification(
    userId,
    NOTIFICATION_TYPES.PLAN_EXPIRY,
    title,
    message,
    { planEndDate: expiryDate.toISOString(), daysUntilExpiry },
    NOTIFICATION_PRIORITIES.HIGH
  );
}

/**
 * Create new feature alert
 */
export async function createNewFeatureAlert(userIds, featureName, featureDescription) {
  const title = `New Feature: ${featureName}`;
  const message = featureDescription;

  const promises = userIds.map(userId =>
    createNotification(
      userId,
      NOTIFICATION_TYPES.NEW_FEATURE,
      title,
      message,
      { featureName },
      NOTIFICATION_PRIORITIES.MEDIUM
    )
  );

  return await Promise.all(promises);
}

/**
 * Show in-app notification
 */
function showInAppNotification(notification) {
  // Create notification element
  const notificationEl = document.createElement('div');
  notificationEl.className = `in-app-notification ${notification.priority}`;
  notificationEl.innerHTML = `
    <div class="notification-content">
      <h4>${notification.title}</h4>
      <p>${notification.message}</p>
    </div>
    <button class="notification-close" onclick="this.parentElement.remove()">&times;</button>
  `;

  // Add to page
  document.body.appendChild(notificationEl);

  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (notificationEl.parentElement) {
      notificationEl.remove();
    }
  }, 5000);

  // Mark as shown
  markAsShown(notification.id);
}

/**
 * Update notification badge count
 */
function updateNotificationBadge(count) {
  const badge = document.querySelector('.notification-badge');
  if (badge) {
    badge.textContent = count;
    badge.style.display = count > 0 ? 'block' : 'none';
  }
}

/**
 * Initialize notification UI
 */
export function initNotificationUI() {
  // This will be called when the dashboard loads
  const notificationIcon = document.querySelector('.notification-icon');
  if (notificationIcon) {
    notificationIcon.addEventListener('click', toggleNotificationDropdown);
  }
}

/**
 * Toggle notification dropdown
 */
function toggleNotificationDropdown() {
  const dropdown = document.querySelector('.notification-dropdown');
  if (dropdown) {
    dropdown.classList.toggle('show');
  }
}

// Export for global access
window.notifications = {
  createNotification,
  createPlanExpiryReminder,
  createNewFeatureAlert,
  markAsRead,
  getNotifications,
  initNotifications,
  initNotificationUI,
  showInAppNotification
};

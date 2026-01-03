// Notifications system for the dashboard
import { auth, db } from './firebase.js';
import { collection, addDoc, getDocs, updateDoc, doc, query, orderBy, where, limit } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

class NotificationManager {
  constructor() {
    this.notifications = [];
    this.unreadCount = 0;
  }

  // Initialize notifications system
  async initNotifications() {
    try {
      const user = auth.currentUser;
      if (!user) return;

      // Load notifications from Firestore
      await this.loadNotifications();

      // Set up real-time listener for new notifications (simplified)
      this.setupNotificationListener();
    } catch (error) {
      console.error('Error initializing notifications:', error);
    }
  }

  // Load notifications from Firestore
  async loadNotifications() {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const notificationsRef = collection(db, 'users', user.uid, 'notifications');
      const q = query(notificationsRef, orderBy('createdAt', 'desc'), limit(50));
      const querySnapshot = await getDocs(q);

      this.notifications = [];
      querySnapshot.forEach((doc) => {
        this.notifications.push({
          id: doc.id,
          ...doc.data()
        });
      });

      this.updateUnreadCount();
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }

  // Set up notification listener (simplified polling for demo)
  setupNotificationListener() {
    // In a real app, you'd use Firestore real-time listeners
    setInterval(async () => {
      await this.loadNotifications();
      this.updateUI();
    }, 30000); // Check every 30 seconds
  }

  // Get all notifications
  getNotifications() {
    return this.notifications;
  }

  // Mark notification as read
  async markAsRead(notificationId) {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const notificationRef = doc(db, 'users', user.uid, 'notifications', notificationId);
      await updateDoc(notificationRef, {
        isRead: true,
        readAt: new Date()
      });

      // Update local state
      const notification = this.notifications.find(n => n.id === notificationId);
      if (notification) {
        notification.isRead = true;
        this.updateUnreadCount();
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  // Add new notification
  async addNotification(title, message, type = 'info', priority = 'normal') {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const notificationData = {
        title,
        message,
        type, // 'info', 'success', 'warning', 'error'
        priority, // 'low', 'normal', 'high', 'urgent'
        isRead: false,
        createdAt: new Date(),
        userId: user.uid
      };

      const notificationsRef = collection(db, 'users', user.uid, 'notifications');
      const docRef = await addDoc(notificationsRef, notificationData);

      // Add to local state
      this.notifications.unshift({
        id: docRef.id,
        ...notificationData
      });

      this.updateUnreadCount();
      this.updateUI();

      // Show in-app notification for high priority
      if (priority === 'high' || priority === 'urgent') {
        this.showInAppNotification(title, message, priority);
      }
    } catch (error) {
      console.error('Error adding notification:', error);
    }
  }

  // Show in-app notification overlay
  showInAppNotification(title, message, priority = 'normal') {
    const notification = document.createElement('div');
    notification.className = `in-app-notification ${priority}`;
    notification.innerHTML = `
      <div class="notification-content">
        <h4>${title}</h4>
        <p>${message}</p>
      </div>
      <button class="notification-close" onclick="this.parentElement.remove()">×</button>
    `;

    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 5000);
  }

  // Update unread count
  updateUnreadCount() {
    this.unreadCount = this.notifications.filter(n => !n.isRead).length;
  }

  // Initialize notification UI
  initNotificationUI() {
    // This will be called to set up the notification dropdown and badge
    this.updateUI();
  }

  // Update notification UI elements
  updateUI() {
    const badge = document.getElementById('notificationBadge');
    const dropdown = document.getElementById('notificationDropdown');

    if (badge) {
      if (this.unreadCount > 0) {
        badge.textContent = this.unreadCount > 9 ? '9+' : this.unreadCount;
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    }

    // Update dropdown header
    const header = dropdown?.querySelector('.notification-header');
    if (header) {
      header.innerHTML = `Notifications ${this.unreadCount > 0 ? `<span style="color: var(--blue); font-size: 14px;">(${this.unreadCount} new)</span>` : ''}`;
    }
  }
}

// Create global notification manager instance
export const notifications = new NotificationManager();

// Export individual functions for backward compatibility
export { NotificationManager };

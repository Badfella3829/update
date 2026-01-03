import { auth, db } from "./firebase.js";
import { deleteUser, reauthenticateWithCredential, EmailAuthProvider } from
"https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, deleteDoc, collection, query, where, getDocs } from
"https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { showError, withErrorHandling } from "./error-handler.js";

/**
 * Account Management Utilities
 * Handles account deletion and data cleanup
 */

// Delete user account and all associated data
export async function deleteAccount(password) {
  return await withErrorHandling(async () => {
    const user = auth.currentUser;
    if (!user) {
      throw new Error("No user logged in");
    }

    // Re-authenticate user before deletion (required by Firebase)
    const credential = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, credential);

    const uid = user.uid;

    // Delete all user data from Firestore
    await deleteUserData(uid);

    // Delete the user account
    await deleteUser(user);

    // Clear local storage
    localStorage.clear();

    return true;
  }, {
    customMessage: 'Failed to delete account. Please try again or contact support.',
    showRetry: false
  });
}

// Delete all user-related data from Firestore
async function deleteUserData(uid) {
  try {
    // Delete user document
    await deleteDoc(doc(db, "users", uid));

    // Delete usage logs
    const usageQuery = query(
      collection(db, "usage_logs"),
      where("uid", "==", uid)
    );
    const usageSnap = await getDocs(usageQuery);
    const usageDeletes = usageSnap.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(usageDeletes);

    // Delete payment records if any
    const paymentQuery = query(
      collection(db, "payments"),
      where("uid", "==", uid)
    );
    const paymentSnap = await getDocs(paymentQuery);
    const paymentDeletes = paymentSnap.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(paymentDeletes);

    // Add more collections as needed (analytics, etc.)

  } catch (error) {
    console.error("Error deleting user data:", error);
    showError("Failed to delete some account data. Please contact support if issues persist.", { showRetry: false });
  }
}

// Enhanced logout with complete data cleanup
export async function logout() {
  try {
    // Sign out from Firebase
    await auth.signOut();

    // Clear all local storage data
    localStorage.clear();

    // Clear session storage if used
    sessionStorage.clear();

    // Clear any cached data
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
    }

    return true;
  } catch (error) {
    console.error("Logout error:", error);
    showError("Logout completed but some data may not have been cleared. Please refresh the page.", { showRetry: false });
  }
}

// Confirm account deletion with user
export function confirmAccountDeletion() {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.className = 'delete-confirmation-modal';
    modal.innerHTML = `
      <div class="delete-modal-content">
        <div class="delete-modal-header">
          <span class="delete-modal-title">Delete Account</span>
          <button class="delete-modal-close">&times;</button>
        </div>
        <div class="delete-modal-body">
          <div class="delete-warning-icon">⚠️</div>
          <h3>Are you sure you want to delete your account?</h3>
          <p class="delete-warning-text">
            This action <strong>cannot be undone</strong>. All your data, including:
          </p>
          <ul class="delete-data-list">
            <li>Your profile information</li>
            <li>Usage history and credits</li>
            <li>Payment records</li>
            <li>All AI interactions</li>
          </ul>
          <p class="delete-final-warning">
            <strong>Enter your password to confirm deletion:</strong>
          </p>
          <input type="password" id="deletePassword" placeholder="Enter your password" class="delete-password-input">
        </div>
        <div class="delete-modal-footer">
          <button class="delete-cancel-btn">Cancel</button>
          <button class="delete-confirm-btn" disabled>Delete Account</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const passwordInput = modal.querySelector('#deletePassword');
    const confirmBtn = modal.querySelector('.delete-confirm-btn');
    const cancelBtn = modal.querySelector('.delete-cancel-btn');
    const closeBtn = modal.querySelector('.delete-modal-close');

    const closeModal = () => {
      modal.remove();
      resolve(false);
    };

    const enableConfirm = () => {
      confirmBtn.disabled = !passwordInput.value.trim();
    };

    passwordInput.addEventListener('input', enableConfirm);
    cancelBtn.addEventListener('click', closeModal);
    closeBtn.addEventListener('click', closeModal);

    confirmBtn.addEventListener('click', async () => {
      const password = passwordInput.value.trim();
      if (password) {
        modal.remove();
        resolve(password);
      }
    });

    // Add CSS if not already present
    if (!document.querySelector('#delete-modal-styles')) {
      const styles = document.createElement('style');
      styles.id = 'delete-modal-styles';
      styles.textContent = `
        .delete-confirmation-modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .delete-modal-content {
          background: white;
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
          max-width: 500px;
          width: 90%;
          overflow: hidden;
          animation: modalSlideIn 0.3s ease-out;
        }

        @keyframes modalSlideIn {
          from { transform: translateY(-50px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        .delete-modal-header {
          background: #dc3545;
          color: white;
          padding: 16px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .delete-modal-title {
          font-weight: 600;
          margin: 0;
        }

        .delete-modal-close {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: white;
          padding: 0;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: background 0.2s;
        }

        .delete-modal-close:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .delete-modal-body {
          padding: 24px 20px;
          text-align: center;
        }

        .delete-warning-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .delete-modal-body h3 {
          color: #dc3545;
          margin: 16px 0;
          font-size: 18px;
        }

        .delete-warning-text {
          color: #495057;
          font-size: 16px;
          line-height: 1.5;
          margin: 16px 0;
        }

        .delete-data-list {
          text-align: left;
          background: #f8f9fa;
          padding: 16px;
          border-radius: 8px;
          margin: 16px 0;
          list-style-position: inside;
        }

        .delete-data-list li {
          color: #495057;
          margin: 4px 0;
        }

        .delete-final-warning {
          color: #dc3545;
          font-weight: 600;
          margin: 16px 0 8px 0;
        }

        .delete-password-input {
          width: 100%;
          padding: 12px;
          border: 2px solid #dee2e6;
          border-radius: 6px;
          font-size: 16px;
          margin-top: 8px;
          box-sizing: border-box;
        }

        .delete-password-input:focus {
          outline: none;
          border-color: #dc3545;
        }

        .delete-modal-footer {
          padding: 16px 20px;
          border-top: 1px solid #e9ecef;
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }

        .delete-modal-footer button {
          padding: 10px 20px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
        }

        .delete-cancel-btn {
          background: #6c757d;
          color: white;
        }

        .delete-cancel-btn:hover {
          background: #5a6268;
        }

        .delete-confirm-btn {
          background: #dc3545;
          color: white;
          opacity: 0.6;
        }

        .delete-confirm-btn:not(:disabled):hover {
          background: #c82333;
        }

        .delete-confirm-btn:disabled {
          cursor: not-allowed;
        }
      `;
      document.head.appendChild(styles);
    }
  });
}

import { auth, db } from "./firebase.js";
import { doc, setDoc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js";
import { showError } from "./error-handler.js";
import { logPaymentEvent, logError } from "./logger.js";

console.log("payments.js loaded");

// Helper function to get user plan
async function getUserPlan() {
    try {
        const user = auth.currentUser;
        if (!user) return null;

        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            return userDoc.data().plan || "free";
        }
        return "free";
    } catch (error) {
        logError(error, { context: 'get_user_plan', userId: auth.currentUser?.uid });
        return null;
    }
}

// ✅ Function ko global scope me rakhein (DOMContentLoaded ke bahar)
window.buyPlan = async function (plan) {

    // Log buy button click
    logPaymentEvent('buy_button_clicked', {
        plan: plan,
        userId: auth.currentUser ? auth.currentUser.uid : null,
        timestamp: new Date().toISOString()
    });

    // 0. Auth and Plan Checks (Security First)
    const user = auth.currentUser;
    if (!user) {
        logPaymentEvent('buy_failed_no_auth', {
            plan: plan,
            reason: 'user_not_logged_in'
        });
        showError("Please login first to purchase a plan.");
        return;
    }

    // Get current user plan
    const currentPlan = await getUserPlan();
    if (!currentPlan) {
        showError("Unable to verify your current plan. Please try again.");
        return;
    }

    // Prevent premium users from buying again
    if (currentPlan === "premium" || currentPlan === "admin") {
        showError("You already have premium access. No need to purchase again.", { type: 'info', showRetry: false });
        return;
    }

    // 1. Amount decide
    let amount = 0;
    let planTitle = "";

    if (plan === "pro") {
        amount = 29900; // ₹299
        planTitle = "Pro Plan";
    } else if (plan === "premium") {
        amount = 49900; // ₹499
        planTitle = "Premium Plan";
    } else {
        showError("Invalid plan selected. Please choose a valid plan.");
        return;
    }

    // 2. Razorpay SDK check
    if (typeof Razorpay === "undefined") {
        showError("Payment system is not loaded. Please check your internet connection and refresh the page.", { showRetry: true });
        return;
    }

    // 3. Options Setup
    const options = {
        key: "rzp_test_RxnWrcXyHF6JMR", // Test Key
        amount: amount,
        currency: "INR",
        name: "TechVyro",
        description: planTitle,
        image: "https://cdn-icons-png.flaticon.com/512/9382/9382189.png", // Optional: Logo for professional look

        handler: async function (response) {
            if (response.razorpay_payment_id) {
                // Check if user is logged in
                const user = auth.currentUser;
                if (!user) {
                    logError(new Error("Payment attempted without login"), {
                        context: 'payment_handler',
                        paymentId: response.razorpay_payment_id
                    });
                    showError("Please login first to complete the payment process.");
                    return;
                }

                setCurrentUser(user);

                try {
                    logPaymentEvent('payment_success', {
                        paymentId: response.razorpay_payment_id,
                        plan: plan,
                        amount: amount,
                        userId: user.uid
                    });

                    // Verify payment with Razorpay before proceeding
                    const verifyPayment = httpsCallable('verifyPayment');
                    const verificationResult = await verifyPayment({
                        paymentId: response.razorpay_payment_id
                    });

                    if (!verificationResult.data.verified) {
                        logPaymentEvent('payment_verification_failed', {
                            paymentId: response.razorpay_payment_id,
                            reason: verificationResult.data.reason,
                            userId: user.uid
                        });
                        showError("Payment verification failed. Please contact support if you were charged.", { showRetry: false });
                        return;
                    }

                    // Save payment to Firestore
                    const paymentRef = doc(db, "users", user.uid, "payments", response.razorpay_payment_id);
                    await setDoc(paymentRef, {
                        paymentId: response.razorpay_payment_id,
                        plan: plan,
                        amount: amount,
                        timestamp: new Date(),
                        status: "verified",
                        verifiedAt: new Date()
                    });

                    // Check if user already has premium plan
                    const userRef = doc(db, "users", user.uid);
                    const userSnap = await getDoc(userRef);
                    if (userSnap.exists() && userSnap.data().plan === "premium") {
                        logPaymentEvent('upgrade_already_premium', {
                            userId: user.uid,
                            attemptedPlan: plan
                        });
                        showError("You are already a premium user!", { type: 'info', showRetry: false });
                        setTimeout(() => window.location.href = "dashboard.html", 2000);
                        return;
                    }

                    // Update user plan in Firestore
                    await updateDoc(userRef, { plan: plan });

                    logPaymentEvent('upgrade_success', {
                        userId: user.uid,
                        fromPlan: userSnap.exists() ? userSnap.data().plan : 'unknown',
                        toPlan: plan,
                        paymentId: response.razorpay_payment_id
                    });

                    // Send upgrade confirmation email (non-blocking)
                    try {
                        const sendUpgradeEmail = httpsCallable('sendUpgradeEmail');
                        await sendUpgradeEmail({
                            email: user.email,
                            userName: user.email.split('@')[0], // Use email prefix as name for now
                            userId: user.uid,
                            fromPlan: userSnap.exists() ? userSnap.data().plan : 'free',
                            toPlan: plan,
                            planTitle: planTitle
                        });
                        logPaymentEvent('upgrade_email_sent', {
                            userId: user.uid,
                            email: user.email,
                            toPlan: plan
                        });
                    } catch (emailError) {
                        // Log but don't fail upgrade if email fails
                        logError(emailError, {
                            context: 'upgrade_email',
                            userId: user.uid,
                            email: user.email,
                            toPlan: plan
                        });
                    }

                    // Success Action
                    showError("Payment Successful! ID: " + response.razorpay_payment_id + ". Plan upgraded to " + planTitle, { type: 'info', showRetry: false });

                    // Redirect
                    setTimeout(() => window.location.href = "dashboard.html", 2000);
                } catch (error) {
                    logError(error, {
                        context: 'payment_processing',
                        paymentId: response.razorpay_payment_id,
                        userId: user.uid,
                        plan: plan
                    });
                    console.error("Error processing payment:", error);
                    alert("Payment successful but failed to update plan. Contact support.");
                }
            }
        },

        prefill: {
            name: "User Name", // Auto-fill fields (Optional)
            email: "user@example.com",
            contact: "9999999999"
        },

        theme: {
            color: "#3b82f6"
        }
    };

    // 4. Open Popup
    try {
        const rzp = new Razorpay(options);

        // Log popup open
        rzp.on('payment.modal.opened', function() {
            logPaymentEvent('payment_popup_opened', {
                plan: plan,
                amount: amount,
                userId: user.uid
            });
        });

        rzp.open();

        // Error handling for payment failure
        rzp.on('payment.failed', function (response){
            logPaymentEvent('payment_failed', {
                plan: plan,
                amount: amount,
                userId: user.uid,
                error: response.error.description,
                errorCode: response.error.code,
                errorSource: response.error.source,
                errorStep: response.error.step,
                errorReason: response.error.reason
            });
            showError("Payment Failed: " + response.error.description, { showRetry: true });
        });
    } catch (err) {
        logPaymentEvent('payment_popup_error', {
            plan: plan,
            amount: amount,
            userId: user.uid,
            error: err.message
        });
        console.error("Razorpay Error:", err);
        showError("Payment system encountered an error. Please try again or contact support.", { showRetry: true });
    }
};

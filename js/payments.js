import { auth, db } from "./firebase.js";
import { doc, setDoc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { showError } from "./error-handler.js";

console.log("payments.js loaded");

// ✅ Function ko global scope me rakhein (DOMContentLoaded ke bahar)
window.buyPlan = async function (plan) {

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

                    // Save payment to Firestore
                    const paymentRef = doc(db, "users", user.uid, "payments", response.razorpay_payment_id);
                    await setDoc(paymentRef, {
                        paymentId: response.razorpay_payment_id,
                        plan: plan,
                        amount: amount,
                        timestamp: new Date(),
                        status: "success"
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
                    console.error("Error saving payment:", error);
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
        rzp.open();
        
        // Error handling for payment failure
        rzp.on('payment.failed', function (response){
            logPaymentEvent('payment_failed', {
                plan: plan,
                amount: amount,
                error: response.error.description,
                errorCode: response.error.code,
                errorSource: response.error.source
            });
            showError("Payment Failed: " + response.error.description, { showRetry: true });
        });
    } catch (err) {
        console.error("Razorpay Error:", err);
        showError("Payment system encountered an error. Please try again or contact support.", { showRetry: true });
    }
};

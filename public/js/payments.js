console.log("payments.js loaded");

// ✅ Function ko global scope me rakhein (DOMContentLoaded ke bahar)
window.buyPlan = function (plan) {

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
        alert("Invalid plan selected");
        return;
    }

    // 2. Razorpay SDK check
    if (typeof Razorpay === "undefined") {
        alert("Razorpay SDK load nahi hua. Internet check karein ya page refresh karein.");
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

        handler: function (response) {
            if (response.razorpay_payment_id) {
                // Success Action
                alert("Payment Successful! ID: " + response.razorpay_payment_id);
                
                // Data save
                localStorage.setItem("paidPlan", plan);
                localStorage.setItem("paymentId", response.razorpay_payment_id);
                
                // Redirect
                window.location.href = "dashboard.html"; // Ensure dashboard.html exists
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
            alert("Payment Failed: " + response.error.description);
        });
    } catch (err) {
        console.error("Razorpay Error:", err);
        alert("Something went wrong with the payment gateway.");
    }
};
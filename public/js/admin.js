import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from
"https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, getDocs, doc, updateDoc } from
"https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 🔐 SET YOUR ADMIN EMAIL
const ADMIN_EMAIL = "badfella3829@gmail.com";

const table = document.getElementById("usersTable");
const status = document.getElementById("status");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    location.href = "login.html";
    return;
  }

  if (user.email !== ADMIN_EMAIL) {
    alert("Access denied. Admins only.");
    location.href = "dashboard.html";
    return;
  }

  const snap = await getDocs(collection(db, "users"));
  table.innerHTML = "";
  status.innerText = "Users loaded";

  snap.forEach((d) => {
    const u = d.data();
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${d.id}</td>
      <td>${u.email || "N/A"}</td>
      <td>
        <select data-uid="${d.id}" class="plan">
          <option value="free" ${u.plan==="free"?"selected":""}>free</option>
          <option value="pro" ${u.plan==="pro"?"selected":""}>pro</option>
          <option value="premium" ${u.plan==="premium"?"selected":""}>premium</option>
        </select>
      </td>
      <td>
        <input type="number" value="${u.credits}" data-uid="${d.id}" class="credits" />
      </td>
      <td>
        <button data-uid="${d.id}" class="save">Save</button>
        <button data-uid="${d.id}" class="block">
          ${u.blocked ? "Unblock" : "Block"}
        </button>
      </td>
    `;

    table.appendChild(tr);
  });

  // SAVE HANDLER
  document.querySelectorAll(".save").forEach(btn => {
    btn.onclick = async () => {
      const uid = btn.dataset.uid;
      const plan = document.querySelector(`.plan[data-uid="${uid}"]`).value;
      const credits = Number(document.querySelector(`.credits[data-uid="${uid}"]`).value);

      await updateDoc(doc(db, "users", uid), { plan, credits });
      alert("Updated!");
    };
  });

  // BLOCK / UNBLOCK
  document.querySelectorAll(".block").forEach(btn => {
    btn.onclick = async () => {
      const uid = btn.dataset.uid;
      const isBlock = btn.innerText === "Block";
      await updateDoc(doc(db, "users", uid), { blocked: isBlock });
      location.reload();
    };
  });
});

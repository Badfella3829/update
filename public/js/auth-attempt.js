const MAX_ATTEMPTS = 5;
const BLOCK_TIME = 10 * 60 * 1000; // 10 minutes

export function canLogin() {
  const blockedTill = Number(localStorage.getItem("blockedTill")) || 0;
  if (Date.now() < blockedTill) {
    alert("Too many attempts. Try again after 10 minutes.");
    return false;
  }
  return true;
}

export function recordFail() {
  let attempts = Number(localStorage.getItem("attempts")) || 0;
  attempts++;
  localStorage.setItem("attempts", attempts);

  if (attempts >= MAX_ATTEMPTS) {
    localStorage.setItem("blockedTill", Date.now() + BLOCK_TIME);
    localStorage.removeItem("attempts");
  }
}

export function resetAttempts() {
  localStorage.removeItem("attempts");
  localStorage.removeItem("blockedTill");
}

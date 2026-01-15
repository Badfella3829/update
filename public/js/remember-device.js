export function saveDevice() {
  const deviceId = btoa(navigator.userAgent);
  localStorage.setItem("trustedDevice", deviceId);
}

export function checkDevice() {
  const saved = localStorage.getItem("trustedDevice");
  const current = btoa(navigator.userAgent);

  if (saved && saved !== current) {
    alert("New device detected. Please login again.");
    localStorage.removeItem("trustedDevice");
    location.href = "login.html";
  }
}

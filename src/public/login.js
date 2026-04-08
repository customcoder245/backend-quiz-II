const loginForm = document.getElementById("loginForm");
const loginButton = document.getElementById("loginButton");
const loginMessage = document.getElementById("loginMessage");
const credentialEmail = document.getElementById("credentialEmail");
const credentialPassword = document.getElementById("credentialPassword");

const setMessage = (message, type = "") => {
  loginMessage.textContent = message;
  loginMessage.className = `message${type ? ` ${type}` : ""}`;
};

const existingToken = localStorage.getItem("adminToken");

const clearStoredSession = () => {
  localStorage.removeItem("adminToken");
  localStorage.removeItem("adminUser");
  document.cookie = "adminToken=; path=/; max-age=0; samesite=lax";
};

const storeAdminCookie = (token) => {
  document.cookie = `adminToken=${encodeURIComponent(token)}; path=/; max-age=${60 * 60 * 24 * 7}; samesite=lax`;
};

const redirectIfSessionIsValid = async () => {
  if (!existingToken) {
    return;
  }

  try {
    const response = await fetch("/api/v1/auth/me", {
      headers: {
        Authorization: `Bearer ${existingToken}`
      }
    });
    const data = await response.json();

    if (response.ok && data.user?.role === "admin") {
      storeAdminCookie(existingToken);
      window.location.replace("/dashboard");
      return;
    }
  } catch (error) {
    // A stale token should not trap the user in a redirect loop.
  }

  clearStoredSession();
};

const loadLoginHint = async () => {
  try {
    const response = await fetch("/api/v1/admin/login-hint");
    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Unable to load credentials");
    }

    credentialEmail.textContent = data.credentials?.email || "customcoder245@gmail.com";
    credentialPassword.textContent = data.credentials?.password || "Admin@12345";
  } catch (error) {
    credentialEmail.textContent = "customcoder245@gmail.com";
    credentialPassword.textContent = "Admin@12345";
  }
};

loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage("");
  loginButton.disabled = true;

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    const response = await fetch("/api/v1/admin/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Login failed");
    }

    localStorage.setItem("adminToken", data.token);
    localStorage.setItem("adminUser", JSON.stringify(data.user));
    storeAdminCookie(data.token);
    setMessage("Login successful. Redirecting to dashboard...", "success");
    window.location.replace("/dashboard");
  } catch (error) {
    setMessage(error.message || "Unable to login", "error");
  } finally {
    loginButton.disabled = false;
  }
});

redirectIfSessionIsValid();
loadLoginHint();

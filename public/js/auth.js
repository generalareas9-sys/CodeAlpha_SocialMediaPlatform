/**
 * Linkora - Authentication Controller
 * Connect. Share. Grow.
 */
document.addEventListener('DOMContentLoaded', () => {
  // Password Show / Hide Toggle Handlers
  const togglePassBtns = document.querySelectorAll('.btn-toggle-password');
  togglePassBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      if (!input) return;

      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';

      btn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
      btn.innerHTML = isPassword ? `
        <!-- Eye Off Icon -->
        <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="18" height="18">
          <path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"/>
        </svg>
      ` : `
        <!-- Eye Icon -->
        <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="18" height="18">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
          <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
        </svg>
      `;
    });
  });

  // Login Form
  const loginForm = document.getElementById('login-form');
  const loginErrorMsg = document.getElementById('login-error-msg');

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (loginErrorMsg) {
        loginErrorMsg.classList.remove('show');
        loginErrorMsg.textContent = '';
      }

      const identifier = document.getElementById('login-identifier').value.trim();
      const password = document.getElementById('login-password').value;
      const submitBtn = document.getElementById('btn-login-submit');

      if (!identifier || !password) {
        showError(loginErrorMsg, 'Please enter your username/email and password.');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Signing in...';

      try {
        await API.login(identifier, password);
        showToast('Signed in successfully', 'success');
        setTimeout(() => {
          window.location.href = '/';
        }, 300);
      } catch (err) {
        showError(loginErrorMsg, err.message);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In';
      }
    });

    // Demo user quick login buttons
    const demoButtons = document.querySelectorAll('.demo-chip');
    demoButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const username = btn.getAttribute('data-username');
        const pass = 'password123';
        document.getElementById('login-identifier').value = username;
        document.getElementById('login-password').value = pass;
        loginForm.dispatchEvent(new Event('submit'));
      });
    });
  }

  // Register Form
  const registerForm = document.getElementById('register-form');
  const registerErrorMsg = document.getElementById('register-error-msg');

  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (registerErrorMsg) {
        registerErrorMsg.classList.remove('show');
        registerErrorMsg.textContent = '';
      }

      const username = document.getElementById('reg-username').value.trim();
      const email = document.getElementById('reg-email').value.trim();
      const password = document.getElementById('reg-password').value;
      const submitBtn = document.getElementById('btn-register-submit');

      if (!username || !email || !password) {
        showError(registerErrorMsg, 'All fields are required.');
        return;
      }

      if (password.length < 6) {
        showError(registerErrorMsg, 'Password must be at least 6 characters long.');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating account...';

      try {
        await API.register(username, email, password);
        showToast('Account created successfully', 'success');
        setTimeout(() => {
          window.location.href = '/';
        }, 400);
      } catch (err) {
        showError(registerErrorMsg, err.message);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Account';
      }
    });
  }

  function showError(el, message) {
    if (el) {
      el.textContent = message;
      el.classList.add('show');
    } else {
      showToast(message, 'error');
    }
  }
});

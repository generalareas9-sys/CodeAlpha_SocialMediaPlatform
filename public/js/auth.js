/**
 * Linkora - Authentication & Carousel Controller
 * Connect. Share. Grow.
 */
document.addEventListener('DOMContentLoaded', () => {
  // 1. Feature Highlights Carousel Controller
  initAuthCarousel();

  // 2. Password Show / Hide Handlers (Lucide Icons)
  initPasswordToggles();

  // 3. Password Strength Meter & Real-time Validation
  initPasswordStrengthMeter();

  // 4. Login Form Handler
  initLoginForm();

  // 5. Register Form Handler
  initRegisterForm();

  // 6. Demo Chips Quick Login
  initDemoChips();
});

// ============================================================================
// 1. Feature Highlights Carousel
// ============================================================================
function initAuthCarousel() {
  const slides = document.querySelectorAll('.auth-carousel-slide');
  const dots = document.querySelectorAll('.auth-carousel-dot');
  if (slides.length === 0) return;

  let currentSlide = 0;
  let carouselInterval = null;

  function goToSlide(index) {
    slides.forEach((slide, i) => {
      slide.classList.toggle('active', i === index);
    });
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
    });
    currentSlide = index;
  }

  function nextSlide() {
    const next = (currentSlide + 1) % slides.length;
    goToSlide(next);
  }

  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      const idx = parseInt(dot.getAttribute('data-index'), 10);
      goToSlide(idx);
      resetAutoPlay();
    });
  });

  function startAutoPlay() {
    carouselInterval = setInterval(nextSlide, 5000);
  }

  function resetAutoPlay() {
    clearInterval(carouselInterval);
    startAutoPlay();
  }

  startAutoPlay();
}

// ============================================================================
// 2. Password Show / Hide Toggles
// ============================================================================
function initPasswordToggles() {
  const toggleBtns = document.querySelectorAll('.btn-toggle-password');
  toggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      if (!input) return;

      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';

      btn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
      btn.innerHTML = isPassword 
        ? renderIcon('eye-off', '', 'width="18" height="18"')
        : renderIcon('eye', '', 'width="18" height="18"');
    });
  });
}

// ============================================================================
// 3. Password Strength Meter
// ============================================================================
function initPasswordStrengthMeter() {
  const regPassword = document.getElementById('reg-password');
  const bars = [
    document.getElementById('bar-1'),
    document.getElementById('bar-2'),
    document.getElementById('bar-3'),
    document.getElementById('bar-4')
  ];
  const strengthText = document.getElementById('strength-text');

  if (!regPassword || !bars[0]) return;

  regPassword.addEventListener('input', () => {
    const pass = regPassword.value;
    if (!pass) {
      bars.forEach(b => {
        b.className = 'strength-bar';
      });
      strengthText.textContent = 'Password strength';
      strengthText.style.color = 'var(--text-muted)';
      return;
    }

    let score = 0;
    if (pass.length >= 6) score++;
    if (pass.length >= 10) score++;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score++;
    if (/[0-9]/.test(pass) || /[^A-Za-z0-9]/.test(pass)) score++;

    bars.forEach((b, i) => {
      b.className = 'strength-bar';
      if (i < score) {
        if (score === 1) b.classList.add('weak');
        else if (score === 2) b.classList.add('fair');
        else if (score === 3) b.classList.add('good');
        else if (score >= 4) b.classList.add('strong');
      }
    });

    const labels = ['Weak', 'Fair', 'Good', 'Strong'];
    const colors = ['var(--danger)', 'var(--warning)', 'var(--accent-violet)', 'var(--success)'];
    const idx = Math.max(0, score - 1);

    strengthText.textContent = labels[idx];
    strengthText.style.color = colors[idx];
  });
}

// ============================================================================
// 4. Login Form
// ============================================================================
function initLoginForm() {
  const loginForm = document.getElementById('login-form');
  const errorMsg = document.getElementById('login-error-msg');
  if (!loginForm) return;

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (errorMsg) {
      errorMsg.classList.remove('show');
      errorMsg.textContent = '';
    }

    const identifierInput = document.getElementById('login-identifier');
    const passwordInput = document.getElementById('login-password');
    const submitBtn = document.getElementById('btn-login-submit');

    const identifier = identifierInput.value.trim();
    const password = passwordInput.value;

    if (!identifier || !password) {
      showError(errorMsg, 'Please enter both your identifier and password.');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing in...';

    try {
      await API.login(identifier, password);
      showToast('Signed in successfully! Welcome back.', 'success');
      setTimeout(() => {
        window.location.href = '/';
      }, 350);
    } catch (err) {
      showError(errorMsg, err.message);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign In';
    }
  });
}

// ============================================================================
// 5. Register Form
// ============================================================================
function initRegisterForm() {
  const regForm = document.getElementById('register-form');
  const errorMsg = document.getElementById('register-error-msg');
  if (!regForm) return;

  const usernameInput = document.getElementById('reg-username');
  const emailInput = document.getElementById('reg-email');
  const passwordInput = document.getElementById('reg-password');
  const submitBtn = document.getElementById('btn-register-submit');

  const errUser = document.getElementById('err-reg-username');
  const errEmail = document.getElementById('err-reg-email');
  const errPass = document.getElementById('err-reg-password');

  // Real-time inline feedback
  usernameInput.addEventListener('input', () => {
    const val = usernameInput.value.trim();
    const isValid = /^[a-zA-Z0-9_]{3,30}$/.test(val);
    if (val.length > 0 && !isValid) {
      usernameInput.classList.add('error');
      if (errUser) errUser.classList.add('show');
    } else {
      usernameInput.classList.remove('error');
      if (errUser) errUser.classList.remove('show');
    }
  });

  emailInput.addEventListener('input', () => {
    const val = emailInput.value.trim();
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
    if (val.length > 0 && !isValid) {
      emailInput.classList.add('error');
      if (errEmail) errEmail.classList.add('show');
    } else {
      emailInput.classList.remove('error');
      if (errEmail) errEmail.classList.remove('show');
    }
  });

  regForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (errorMsg) {
      errorMsg.classList.remove('show');
      errorMsg.textContent = '';
    }

    const username = usernameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    let hasError = false;

    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
      usernameInput.classList.add('error');
      if (errUser) errUser.classList.add('show');
      hasError = true;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      emailInput.classList.add('error');
      if (errEmail) errEmail.classList.add('show');
      hasError = true;
    }

    if (!password || password.length < 6) {
      passwordInput.classList.add('error');
      if (errPass) errPass.classList.add('show');
      hasError = true;
    }

    if (hasError) {
      showError(errorMsg, 'Please resolve the highlighted fields.');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating account...';

    try {
      await API.register(username, email, password);
      showToast('Account created successfully! Welcome to Linkora.', 'success');
      setTimeout(() => {
        window.location.href = '/';
      }, 400);
    } catch (err) {
      showError(errorMsg, err.message);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Account';
    }
  });
}

// ============================================================================
// 6. Demo Chips Quick Login
// ============================================================================
function initDemoChips() {
  const chips = document.querySelectorAll('.demo-chip-btn');
  chips.forEach(chip => {
    chip.addEventListener('click', async () => {
      const username = chip.getAttribute('data-username');
      const password = 'password123';

      const idField = document.getElementById('login-identifier') || document.getElementById('reg-username');
      const passField = document.getElementById('login-password') || document.getElementById('reg-password');

      if (idField) idField.value = username;
      if (passField) passField.value = password;

      // If we are on the login form, auto-trigger login
      const loginForm = document.getElementById('login-form');
      if (loginForm) {
        loginForm.dispatchEvent(new Event('submit'));
      } else {
        // If on register, automatically log in as this demo user
        try {
          showToast(`Logging in as ${username}...`, 'info');
          await API.login(username, password);
          showToast('Welcome to Linkora!', 'success');
          setTimeout(() => {
            window.location.href = '/';
          }, 350);
        } catch (err) {
          showToast(err.message, 'error');
        }
      }
    });
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

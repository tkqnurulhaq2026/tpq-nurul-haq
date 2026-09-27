import { auth, db } from './firebase-config.js';
import {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { showConfirm } from './ui.js';

function showLoginOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'password-overlay';
        const eyeIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"     stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;

        const eyeOffIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;

    overlay.innerHTML = `
        <div class="password-box">
            <p>🔒 Masuk ke akun</p>
            <input type="email" id="login-email" placeholder="Email">
            <div class="password-wrapper">
                <input type="password" id="login-password" placeholder="Password">
                <button type="button" id="toggle-password">${eyeIcon}</button>
            </div>
            <button id="login-btn">Masuk</button>
            <p id="login-error" style="color:#f87171; font-size:0.8rem; margin-top:0.5rem;"></p>
        </div>
    `;
    document.body.prepend(overlay);

        document.getElementById('toggle-password').addEventListener('click', function() {
        const pwInput = document.getElementById('login-password');
        if (pwInput.type === 'password') {
            pwInput.type = 'text';
            this.innerHTML = eyeOffIcon;
        } else {
            pwInput.type = 'password';
            this.innerHTML = eyeIcon;
        }
    });

    function attemptLogin() {
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;
        const errorEl = document.getElementById('login-error');
        errorEl.textContent = '';

        signInWithEmailAndPassword(auth, email, password)
            .catch(() => {
                errorEl.textContent = 'Email atau password salah.';
            });
    }

    document.getElementById('login-btn').addEventListener('click', attemptLogin);
    document.getElementById('login-email').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') attemptLogin();
    });
    document.getElementById('login-password').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') attemptLogin();
    });
}

function addLogoutButton() {
    const btn = document.getElementById('btn-logout');
    if (!btn || btn.classList.contains('visible')) return;

    btn.classList.add('visible');
    btn.addEventListener('click', async () => {
        const ok = await showConfirm('Yakin ingin keluar?', 'Ya, Keluar');
        if (ok) {
            await signOut(auth);
            window.location.href = 'index.html';
        }
    });
}

function applyNavVisibility(role) {
    const nav = document.querySelector('nav');
    if (role === 'admin') {
        nav.classList.add('admin');
    }
}

/**
 * requireAuth({ requireRole: 'admin' }) — pass requireRole to restrict
 * a page to a specific role; viewers get redirected to index.html.
 * Omit requireRole for pages any logged-in user (any role) can view.
 */
export function requireAuth({ requireRole } = {}) {
    return new Promise((resolve) => {
        onAuthStateChanged(auth, async (user) => {
            const existingOverlay = document.getElementById('password-overlay');

            if (!user) {
                if (!existingOverlay) showLoginOverlay();
                return;
            }

            if (existingOverlay) existingOverlay.remove();

            const userDoc = await getDoc(doc(db, 'users', user.uid));
            const role = userDoc.exists() ? userDoc.data().role : 'viewer';

            if (requireRole && role !== requireRole) {
                window.location.href = 'index.html';
                return;
            }

            applyNavVisibility(role);
            addLogoutButton();
            resolve({ user, role });
        });
    });
}

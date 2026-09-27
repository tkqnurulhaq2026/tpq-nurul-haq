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
        overlay.innerHTML = `
        <div class="password-box">
            <p>🔒 Masuk ke akun</p>
            <input type="email" id="login-email" placeholder="Email">
            <div class="password-wrapper">
                <input type="password" id="login-password" placeholder="Password">
                <button type="button" id="toggle-password">👁</button>
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
            this.textContent = '🙈';
        } else {
            pwInput.type = 'password';
            this.textContent = '👁';
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

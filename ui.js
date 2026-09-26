export function showConfirm(message, confirmLabel = 'Ya, Hapus') {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'confirm-overlay';
        overlay.innerHTML = `
            <div class="confirm-box">
                <p>${message}</p>
                <div class="confirm-buttons">
                    <button class="confirm-yes">${confirmLabel}</button>
                    <button class="confirm-no">Batal</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        overlay.querySelector('.confirm-yes').addEventListener('click', () => {
            overlay.remove();
            resolve(true);
        });
        overlay.querySelector('.confirm-no').addEventListener('click', () => {
            overlay.remove();
            resolve(false);
        });
    });
}

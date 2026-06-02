// public/decrypt.js
(function() {
  let modalOverlay = null;
  let isDecrypted = false;

  function createModalOverlay() {
    if (modalOverlay) return modalOverlay;
    const overlay = document.createElement('div');
    overlay.id = 'password-modal-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
    overlay.style.backdropFilter = 'blur(8px)';
    overlay.style.zIndex = '40';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.padding = '1rem';
    document.body.appendChild(overlay);
    modalOverlay = overlay;
    return overlay;
  }

  function ensureNavbarZIndex() {
    const navbars = document.querySelectorAll('nav, .navbar, header');
    navbars.forEach(nav => {
      const zIndex = window.getComputedStyle(nav).zIndex;
      if (zIndex === 'auto' || parseInt(zIndex) < 50) {
        nav.style.position = 'relative';
        nav.style.zIndex = '50';
      }
    });
  }

  function moveCardToModal(card) {
    const overlay = createModalOverlay();
    overlay.innerHTML = '';
    card.style.margin = '0';
    card.style.maxWidth = '28rem';
    card.style.width = '100%';
    overlay.appendChild(card);
    card.style.display = 'block';
  }

  function restoreCardToOriginal(card, originalParent) {
    if (originalParent && originalParent.contains(card)) {
      originalParent.appendChild(card);
      card.style.margin = '2rem auto';
      card.style.display = '';
    }
    if (modalOverlay) {
      modalOverlay.remove();
      modalOverlay = null;
    }
  }

  // 等待元素出现（最多等待 2 秒）
  function waitForElement(selector, timeout = 2000) {
    return new Promise((resolve) => {
      const el = document.querySelector(selector);
      if (el) return resolve(el);
      const observer = new MutationObserver(() => {
        const found = document.querySelector(selector);
        if (found) {
          observer.disconnect();
          resolve(found);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, timeout);
    });
  }

  async function init() {
    if (isDecrypted) return;
    // 等待容器出现
    const container = await waitForElement('[data-encrypted]');
    if (!container) return;
    if (container.getAttribute('data-decrypted') === 'true') {
      isDecrypted = true;
      return;
    }

    const storedPassword = container.getAttribute('data-password');
    const encryptedData = container.getAttribute('data-encrypted');
    // 等待密码卡片内的元素
    const passwordCard = await waitForElement('.password-card');
    const passwordInput = await waitForElement('#password-input');
    const decryptBtn = await waitForElement('#decrypt-btn');
    const errorMsg = await waitForElement('#error-msg');
    const decryptedContent = container.querySelector('.decrypted-content');

    if (!passwordCard || !passwordInput || !decryptBtn || !errorMsg || !decryptedContent) return;

    // 避免重复移动
    if (passwordCard.parentNode === modalOverlay) return;

    const originalParent = passwordCard.parentNode;
    moveCardToModal(passwordCard);
    ensureNavbarZIndex();
    document.body.style.overflow = 'hidden';

    async function decryptWithWebCrypto(encryptedData, password) {
      const parts = encryptedData.split(':');
      if (parts.length !== 3) throw new Error('Invalid encrypted data format');
      const salt = Uint8Array.from(atob(parts[0]), c => c.charCodeAt(0));
      const iv = Uint8Array.from(atob(parts[1]), c => c.charCodeAt(0));
      const ciphertext = Uint8Array.from(atob(parts[2]), c => c.charCodeAt(0));
      
      const enc = new TextEncoder();
      const keyMaterial = await crypto.subtle.importKey(
        'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']
      );
      const key = await crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
        keyMaterial,
        { name: 'AES-CBC', length: 256 },
        false,
        ['decrypt']
      );
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-CBC', iv },
        key,
        ciphertext.buffer
      );
      return new TextDecoder().decode(decrypted);
    }

    async function decryptAndShow() {
      const userPassword = passwordInput.value;
      if (!userPassword) {
        errorMsg.textContent = '请输入密码';
        errorMsg.classList.remove('hidden');
        return;
      }
      if (userPassword === storedPassword) {
        try {
          const html = await decryptWithWebCrypto(encryptedData, userPassword);
          decryptedContent.innerHTML = `<div class="prose prose-lg prose-code:text-base max-w-none text-justify prose-headings:scroll-mt-20 prose-img:rounded-2xl prose-img:mx-auto prose-img:cursor-pointer">${html}</div>`;
          restoreCardToOriginal(passwordCard, originalParent);
          passwordCard.style.display = 'none';
          decryptedContent.style.display = 'block';
          const editButton = document.getElementById('edit-button-container');
          if (editButton) editButton.style.display = 'flex';
          container.setAttribute('data-decrypted', 'true');
          document.body.style.overflow = '';
          isDecrypted = true;
        } catch (err) {
          console.error(err);
          errorMsg.textContent = '解密失败，密码错误或内容损坏';
          errorMsg.classList.remove('hidden');
        }
      } else {
        errorMsg.textContent = '密码错误，请重试';
        errorMsg.classList.remove('hidden');
      }
    }

    decryptBtn.addEventListener('click', decryptAndShow);
    passwordInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') decryptAndShow();
    });
  }

  // 在页面加载和 Astro 导航时调用，并设置延迟确保 DOM 就绪
  function runInit() {
    setTimeout(init, 50);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runInit);
  } else {
    runInit();
  }
  document.addEventListener('astro:page-load', runInit);
})();

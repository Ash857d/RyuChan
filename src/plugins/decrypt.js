// public/decrypt.js
(function() {
  function init() {
    const container = document.querySelector('[data-encrypted]');
    if (!container) return;
    if (container.getAttribute('data-decrypted') === 'true') return;

    const storedPassword = container.getAttribute('data-password');
    const encryptedData = container.getAttribute('data-encrypted');
    const slug = container.getAttribute('data-slug'); // 获取文章 slug
    const passwordInput = document.getElementById('password-input');
    const decryptBtn = document.getElementById('decrypt-btn');
    const errorMsg = document.getElementById('error-msg');
    const passwordCard = container.querySelector('.password-card');
    const decryptedContent = container.querySelector('.decrypted-content');

    if (!passwordInput || !decryptBtn || !errorMsg || !passwordCard || !decryptedContent) return;

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

    // 添加编辑按钮到文章内容右上角
    function addEditButton(slug) {
      // 查找 MainCard 组件内的标题栏区域（第一个 flex justify-end 容器）
      const mainCard = document.querySelector('.card.bg-base-100');
      if (!mainCard) return;
      // 避免重复添加
      if (mainCard.querySelector('.edit-button-container')) return;
      
      const editContainer = document.createElement('div');
      editContainer.className = 'flex justify-end mb-4 edit-button-container';
      
      const editLink = document.createElement('a');
      editLink.href = `/write?slug=${slug}`;
      editLink.className = 'btn btn-primary btn-sm text-white';
      editLink.setAttribute('aria-label', 'Edit Article');
      
      // 图标 SVG
      const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      icon.setAttribute('class', 'w-4 h-4');
      icon.setAttribute('viewBox', '0 0 24 24');
      icon.setAttribute('fill', 'none');
      icon.setAttribute('stroke', 'currentColor');
      icon.setAttribute('stroke-width', '2');
      icon.setAttribute('stroke-linecap', 'round');
      icon.setAttribute('stroke-linejoin', 'round');
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', 'M17 3l4 4-7 7H10v-4l7-7z M14 6l4 4');
      icon.appendChild(path);
      
      const textSpan = document.createElement('span');
      textSpan.className = 'hidden sm:inline';
      textSpan.textContent = 'Edit';  // 英文
      
      editLink.appendChild(icon);
      editLink.appendChild(textSpan);
      editContainer.appendChild(editLink);
      
      // 插入到 MainCard 的第一个子元素之前
      mainCard.insertBefore(editContainer, mainCard.firstChild);
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
          passwordCard.style.display = 'none';
          decryptedContent.style.display = 'block';
          container.setAttribute('data-decrypted', 'true');
          // 添加编辑按钮
          addEditButton(slug);
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

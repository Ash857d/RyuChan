// scripts/update-passwords.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';
import matter from 'gray-matter';
import crypto from 'crypto'; // 保留原导入，但实际不再使用

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BLOG_DIR = path.resolve(__dirname, '../src/content/blog');

// 生成 4 位数字密码（范围 1000～9999）
function generatePassword() {
  return Math.floor(Math.random() * 9000 + 1000).toString();
}

async function updatePasswords() {
  console.log('🔍 扫描文章目录:', BLOG_DIR);
  
  // 查找所有 .md 和 .mdx 文件
  const files = await glob('**/*.{md,mdx}', { cwd: BLOG_DIR, absolute: true });
  console.log(`📄 找到 ${files.length} 个文件`);
  
  let updatedCount = 0;
  
  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf8');
    const { data, content: markdown } = matter(content);
    
    // 如果文章有 password 字段且不为空，则更新密码
    if (data.password && typeof data.password === 'string' && data.password.trim() !== '') {
      const oldPassword = data.password;
      const newPassword = generatePassword();
      data.password = newPassword;
      
      const newContent = matter.stringify(markdown, data);
      fs.writeFileSync(filePath, newContent, 'utf8');
      
      console.log(`✅ 更新密码: ${path.basename(filePath)} | 旧密码: ${oldPassword} → 新密码: ${newPassword}`);
      updatedCount++;
    }
  }
  
  console.log(`🎉 完成！共更新 ${updatedCount} 篇文章的密码。`);
  
  // 如果有更新，输出一个标记文件，供后续步骤判断是否需要提交
  if (updatedCount > 0) {
    fs.writeFileSync(path.join(__dirname, '../.passwords-updated'), new Date().toISOString());
  }
}

updatePasswords().catch(console.error);

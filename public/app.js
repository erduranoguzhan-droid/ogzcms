class MatrixTransition {
  constructor() {
    this.canvas = document.getElementById('matrix-canvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.animationId = null;
    this.columns = 0;
    this.drops = [];
    this.fontSize = 16;
    this.chars = "01010101ABCDEFGHIJKLMNOPQRSTUVWXYZｦｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ";
    
    window.addEventListener('resize', () => {
      if (this.canvas && this.canvas.classList.contains('active')) {
        this.resize();
      }
    });
  }
  
  resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.columns = Math.floor(this.canvas.width / this.fontSize);
    this.drops = Array(this.columns).fill(1);
  }
  
  draw() {
    this.ctx.fillStyle = 'rgba(11, 15, 25, 0.18)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.ctx.font = `${this.fontSize}px monospace`;
    
    for (let i = 0; i < this.drops.length; i++) {
      const text = this.chars[Math.floor(Math.random() * this.chars.length)];
      const x = i * this.fontSize;
      const y = this.drops[i] * this.fontSize;
      
      // Cyberpunk theme: green and indigo characters
      if (Math.random() > 0.8) {
        this.ctx.fillStyle = '#10b981'; // Green
      } else {
        this.ctx.fillStyle = '#6366f1'; // Indigo
      }
      
      this.ctx.fillText(text, x, y);
      
      if (y > this.canvas.height && Math.random() > 0.975) {
        this.drops[i] = 0;
      }
      
      this.drops[i]++;
    }
  }
  
  start() {
    if (!this.canvas) return;
    this.resize();
    this.canvas.classList.add('active');
    
    const loop = () => {
      this.draw();
      this.animationId = requestAnimationFrame(loop);
    };
    
    if (!this.animationId) {
      loop();
    }
  }
  
  stop() {
    if (!this.canvas) return;
    this.canvas.classList.remove('active');
    setTimeout(() => {
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }, 300);
  }
}

class LuminaApp {
  constructor() {
    this.posts = [];
    this.token = localStorage.getItem('admin_token') || null;
    this.currentView = 'blog-list';
    this.matrix = new MatrixTransition();
    
    // Bind UI elements
    this.init();
  }

  init() {
    // Check initial authentication state
    this.updateAuthUI();
    this.loadPosts();
  }

  // Session management UI State
  updateAuthUI() {
    const authBtn = document.getElementById('admin-action-btn');
    if (this.token) {
      authBtn.innerHTML = '<i class="fa-solid fa-right-from-bracket"></i> <span>Çıkış Yap</span>';
      authBtn.classList.remove('btn-secondary');
      authBtn.classList.add('btn-danger');
      
      // If we are logged in, make sure we show dashboard or give option
      if (this.currentView === 'blog-list') {
        this.navigateTo('admin-dashboard');
      }
    } else {
      authBtn.innerHTML = '<i class="fa-solid fa-lock"></i> <span>Yönetici Girişi</span>';
      authBtn.classList.remove('btn-danger');
      authBtn.classList.add('btn-secondary');
      
      if (this.currentView === 'admin-dashboard') {
        this.navigateTo('blog-list');
      }
    }
  }

  // Single Page View routing with animated Matrix transition
  navigateTo(viewName, params = {}) {
    if (this.matrix) {
      this.matrix.start();
      setTimeout(() => {
        this.executeNavigation(viewName, params);
        setTimeout(() => {
          this.matrix.stop();
        }, 150);
      }, 350);
    } else {
      this.executeNavigation(viewName, params);
    }
  }

  executeNavigation(viewName, params = {}) {
    this.currentView = viewName;
    
    // Deactivate all sections
    document.querySelectorAll('.view-section').forEach(section => {
      section.classList.remove('active');
    });

    // Activate target section
    if (viewName === 'blog-list') {
      document.getElementById('view-blog-list').classList.add('active');
      this.loadPosts();
    } else if (viewName === 'post-detail') {
      document.getElementById('view-post-detail').classList.add('active');
      this.renderPostDetail(params.id);
    } else if (viewName === 'admin-dashboard') {
      if (!this.token) {
        this.executeNavigation('blog-list');
        this.showToast('Lütfen önce yönetici girişi yapın.', 'error');
        return;
      }
      document.getElementById('view-admin-dashboard').classList.add('active');
      this.renderAdminDashboard();
    }
  }

  // Load posts from server
  async loadPosts() {
    try {
      const response = await fetch('/api/posts');
      const data = await response.json();
      if (data.success) {
        this.posts = data.posts;
        this.renderBlogList(this.posts);
      } else {
        this.showToast(data.error || 'İçerikler yüklenemedi.', 'error');
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      this.showToast('Sunucu bağlantı hatası.', 'error');
    }
  }

  // Render frontend card layout
  renderBlogList(postsList) {
    const container = document.getElementById('posts-container');
    if (!postsList || postsList.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <i class="fa-solid fa-folder-open"></i>
          <p>Henüz eklenmiş bir yazı bulunamadı.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = postsList.map(post => {
      const date = new Date(post.created_at).toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      return `
        <article class="post-card" onclick="app.navigateTo('post-detail', { id: ${post.id} })" style="cursor: pointer;">
          <div class="post-card-date">
            <i class="fa-regular fa-calendar"></i> ${date}
          </div>
          <h3 class="post-card-title">${this.escapeHTML(post.title)}</h3>
          <p class="post-card-summary">${this.escapeHTML(post.summary)}</p>
          <span style="color: var(--color-primary); font-size: 0.9rem; font-weight: 600; display: inline-flex; align-items: center; gap: 0.25rem; margin-top: auto;">
            Devamını Oku <i class="fa-solid fa-chevron-right" style="font-size: 0.75rem;"></i>
          </span>
        </article>
      `;
    }).join('');
  }

  // Filter posts dynamically in real-time
  filterPosts(query) {
    const filtered = this.posts.filter(post => 
      post.title.toLowerCase().includes(query.toLowerCase()) || 
      post.summary.toLowerCase().includes(query.toLowerCase()) || 
      post.content.toLowerCase().includes(query.toLowerCase())
    );
    this.renderBlogList(filtered);
  }

  // Render details page
  renderPostDetail(id) {
    const post = this.posts.find(p => p.id === id);
    const container = document.getElementById('post-detail-container');
    
    if (!post) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-circle-exclamation"></i>
          <p>Aradığınız yazı bulunamadı.</p>
        </div>
      `;
      return;
    }

    const date = new Date(post.created_at).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    container.innerHTML = `
      <div class="post-detail-meta">
        <span><i class="fa-regular fa-calendar"></i> ${date}</span>
      </div>
      <h1 class="post-detail-title">${this.escapeHTML(post.title)}</h1>
      <p class="post-detail-summary">${this.escapeHTML(post.summary)}</p>
      <div class="post-detail-content">
        ${post.content}
      </div>
    `;
  }

  // Populate Admin dashboard table
  renderAdminDashboard() {
    const tbody = document.getElementById('admin-table-body');
    if (!this.posts || this.posts.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="empty-state" style="padding: 3rem;">
            <i class="fa-solid fa-folder-open"></i>
            <p>Henüz yazı eklenmedi.</p>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = this.posts.map(post => {
      const date = new Date(post.created_at).toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      return `
        <tr>
          <td style="font-weight: 500;">${this.escapeHTML(post.title)}</td>
          <td style="color: var(--text-muted); font-size: 0.9rem; max-width: 350px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${this.escapeHTML(post.summary)}
          </td>
          <td>${date}</td>
          <td>
            <div class="actions-cell">
              <button class="btn-icon edit" onclick="app.openEditorModal(${post.id})" title="Düzenle">
                <i class="fa-solid fa-pen"></i>
              </button>
              <button class="btn-icon delete" onclick="app.deletePost(${post.id})" title="Sil">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // Auth Operations
  handleAuthButton() {
    if (this.token) {
      this.logout();
    } else {
      this.openLoginModal();
    }
  }

  openLoginModal() {
    document.getElementById('login-modal-backdrop').classList.add('show');
  }

  closeLoginModal() {
    document.getElementById('login-modal-backdrop').classList.remove('show');
    document.getElementById('login-form').reset();
  }

  async submitLogin(event) {
    event.preventDefault();
    const usernameInput = document.getElementById('login-username').value;
    const passwordInput = document.getElementById('login-password').value;

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameInput, password: passwordInput })
      });
      const data = await response.json();

      if (data.success) {
        this.token = data.token;
        localStorage.setItem('admin_token', this.token);
        this.updateAuthUI();
        this.closeLoginModal();
        this.showToast('Giriş başarılı! Yönetim paneline hoş geldiniz.', 'success');
        this.navigateTo('admin-dashboard');
      } else {
        this.showToast(data.error || 'Giriş başarısız.', 'error');
      }
    } catch (error) {
      console.error('Login error:', error);
      this.showToast('Giriş yapılırken sunucu hatası oluştu.', 'error');
    }
  }

  async logout() {
    try {
      await fetch('/api/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
    } catch (e) {
      // Clean up even if api fails or returns 401
    }
    this.token = null;
    localStorage.removeItem('admin_token');
    this.updateAuthUI();
    this.showToast('Başarıyla çıkış yapıldı.', 'success');
    this.navigateTo('blog-list');
  }

  // Create & Edit Actions
  openEditorModal(id = null) {
    const modalTitle = document.getElementById('editor-modal-title');
    const form = document.getElementById('editor-form');
    form.reset();

    if (id) {
      const post = this.posts.find(p => p.id === id);
      if (!post) return;
      modalTitle.innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Yazıyı Düzenle';
      document.getElementById('editor-post-id').value = post.id;
      document.getElementById('editor-title').value = post.title;
      document.getElementById('editor-summary').value = post.summary;
      document.getElementById('editor-content').value = post.content;
    } else {
      modalTitle.innerHTML = '<i class="fa-solid fa-plus"></i> Yeni Yazı Ekle';
      document.getElementById('editor-post-id').value = '';
    }

    document.getElementById('editor-modal-backdrop').classList.add('show');
  }

  closeEditorModal() {
    document.getElementById('editor-modal-backdrop').classList.remove('show');
  }

  async submitPost(event) {
    event.preventDefault();
    const id = document.getElementById('editor-post-id').value;
    const title = document.getElementById('editor-title').value;
    const summary = document.getElementById('editor-summary').value;
    const content = document.getElementById('editor-content').value;

    const payload = { title, summary, content };
    const url = id ? `/api/posts/${id}` : '/api/posts';
    const method = id ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json();

      if (data.success) {
        this.showToast(id ? 'Yazı başarıyla güncellendi.' : 'Yazı başarıyla eklendi.', 'success');
        this.closeEditorModal();
        await this.loadPosts();
        this.renderAdminDashboard();
      } else {
        this.showToast(data.error || 'İşlem başarısız oldu.', 'error');
      }
    } catch (error) {
      console.error('Post submit error:', error);
      this.showToast('Yazı kaydedilirken sunucu hatası oluştu.', 'error');
    }
  }

  async deletePost(id) {
    if (!confirm('Bu yazıyı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) {
      return;
    }

    try {
      const response = await fetch(`/api/posts/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      const data = await response.json();

      if (data.success) {
        this.showToast('Yazı başarıyla silindi.', 'success');
        await this.loadPosts();
        this.renderAdminDashboard();
      } else {
        this.showToast(data.error || 'Silme işlemi başarısız.', 'error');
      }
    } catch (error) {
      console.error('Delete post error:', error);
      this.showToast('Silme işlemi sırasında sunucu hatası oluştu.', 'error');
    }
  }

  // Utility to show toasts
  showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let iconClass = 'fa-circle-check';
    if (type === 'error') iconClass = 'fa-circle-exclamation';
    
    toast.innerHTML = `
      <i class="fa-solid ${iconClass}"></i>
      <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    // Slide in
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Fade out and remove
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
      tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[tag] || tag)
    );
  }
}

// Instantiate
const app = new LuminaApp();

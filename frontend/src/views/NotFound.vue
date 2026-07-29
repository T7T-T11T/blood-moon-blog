<template>
  <div class="not-found-page">
    <div class="container">
      <div class="error-code">404</div>
      <div class="error-message">
        <h1>页面不存在</h1>
        <p>您访问的页面已被移除或不存在</p>
      </div>
      <div class="actions">
        <router-link to="/" class="btn btn-primary"> 返回首页 </router-link>
        <router-link to="/admin" class="btn btn-secondary"> 进入后台 </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
/** 404 页面组件 */
</script>

<style scoped>
.not-found-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f0fdfa, #ecfeff);
}

.container {
  text-align: center;
  padding: 40px;
}

.error-code {
  font-size: 120px;
  font-weight: 800;
  background: linear-gradient(135deg, #0d9488, #0891b2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1;
  margin-bottom: 20px;
}

.error-message h1 {
  font-size: 28px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 12px;
}

.error-message p {
  font-size: 16px;
  color: #64748b;
  margin: 0 0 40px;
}

.actions {
  display: flex;
  justify-content: center;
  gap: 16px;
}

.btn {
  padding: 12px 32px;
  border-radius: 24px;
  font-size: 15px;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.3s ease;
}

.btn-primary {
  background: linear-gradient(135deg, #0d9488, #0891b2);
  color: #fff;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(13, 148, 136, 0.3);
}

.btn-secondary {
  background: #fff;
  color: #475569;
  border: 1px solid #e2e8f0;
}

.btn-secondary:hover {
  border-color: #0d9488;
  color: #0d9488;
}

@media (max-width: 480px) {
  .error-code {
    font-size: 80px;
  }

  .error-message h1 {
    font-size: 24px;
  }

  .actions {
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }
}
</style>

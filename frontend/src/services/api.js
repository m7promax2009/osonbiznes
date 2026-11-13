const API_URL = import.meta.env.VITE_API_URL || '/api'

// /uploads/... kabi nisbiy rasm yo'llarini to'ldirish
export function resolveImageUrl(src) {
  if (!src) return ''
  if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) return src
  if (src.startsWith('/uploads/')) {
    if (API_URL.startsWith('http')) {
      const origin = API_URL.replace(/\/api\/?$/, '')
      return `${origin}${src}`
    }
    return src
  }
  return src
}

class ApiService {
  constructor() {
    this.token = localStorage.getItem('token')
  }

  setToken(token) {
    this.token = token
    localStorage.setItem('token', token)
  }

  clearToken() {
    this.token = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  async request(endpoint, options = {}) {
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options.headers,
      },
      ...options,
    }

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body)
    }

    try {
      const response = await fetch(`${API_URL}${endpoint}`, config)
      const data = await response.json()

      if (!response.ok) {
        // Login/parol tiklash xatolari sahifani qayta yuklamasin (xabar ko'rinsin)
        const isAuthForm = /^\/auth\/(login|register|forgot|reset)/.test(endpoint)
        if (response.status === 401 && !isAuthForm) {
          this.clearToken()
          window.location.href = '/login'
        }
        throw new Error(data.message || 'Xatolik yuz berdi')
      }

      return data
    } catch (error) {
      if (error.message === 'Failed to fetch') {
        throw new Error('Serverga ulanishda xatolik')
      }
      throw error
    }
  }

  // Auth
  async login(email, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: { email, password },
    })
    this.setToken(data.data.token)
    localStorage.setItem('user', JSON.stringify(data.data.user))
    return data.data
  }

  async register(userData) {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: userData,
    })
    this.setToken(data.data.token)
    localStorage.setItem('user', JSON.stringify(data.data.user))
    return data.data
  }

  async verifyEmail(code) {
    const data = await this.request('/auth/verify-email', { method: 'POST', body: { code } })
    localStorage.setItem('user', JSON.stringify(data.data))
    return data.data
  }

  async resendVerifyEmail() {
    return this.request('/auth/verify-email/send', { method: 'POST' })
  }

  async forgotPassword(email) {
    return this.request('/auth/forgot', { method: 'POST', body: { email } })
  }

  async resetPassword(email, code, newPassword) {
    const data = await this.request('/auth/reset', { method: 'POST', body: { email, code, newPassword } })
    this.setToken(data.data.token)
    localStorage.setItem('user', JSON.stringify(data.data.user))
    return data.data
  }

  async getProfile() {
    const data = await this.request('/auth/me')
    return data.data
  }

  async updateProfile(profileData) {
    const data = await this.request('/auth/profile', {
      method: 'PUT',
      body: profileData,
    })
    return data.data
  }

  // Products
  async getProducts(params = {}) {
    const query = new URLSearchParams(params).toString()
    const data = await this.request(`/products${query ? `?${query}` : ''}`)
    return data
  }

  async getProduct(id) {
    const data = await this.request(`/products/${id}`)
    return data.data
  }

  async createProduct(product) {
    const data = await this.request('/products', {
      method: 'POST',
      body: product,
    })
    return data.data
  }

  async updateProduct(id, product) {
    const data = await this.request(`/products/${id}`, {
      method: 'PUT',
      body: product,
    })
    return data.data
  }

  async deleteProduct(id) {
    await this.request(`/products/${id}`, { method: 'DELETE' })
  }

  async getProductCategories() {
    const data = await this.request('/products/categories')
    return data.data
  }

  async getProductStats() {
    const data = await this.request('/products/stats')
    return data.data
  }

  // Orders
  async getOrders(params = {}) {
    const query = new URLSearchParams(params).toString()
    const data = await this.request(`/orders${query ? `?${query}` : ''}`)
    return data
  }

  async getOrder(id) {
    const data = await this.request(`/orders/${id}`)
    return data.data
  }

  async createOrder(order) {
    const data = await this.request('/orders', {
      method: 'POST',
      body: order,
    })
    return data.data
  }

  async updateOrderStatus(id, status) {
    const data = await this.request(`/orders/${id}/status`, {
      method: 'PUT',
      body: status,
    })
    return data.data
  }

  async deleteOrder(id) {
    await this.request(`/orders/${id}`, { method: 'DELETE' })
  }

  async getOrderStats() {
    const data = await this.request('/orders/stats')
    return data.data
  }

  async getOrderAnalytics(range = '7d') {
    const data = await this.request(`/orders/analytics?range=${range}`)
    return data.data
  }

  // Customers
  async getCustomers(params = {}) {
    const query = new URLSearchParams(params).toString()
    const data = await this.request(`/customers${query ? `?${query}` : ''}`)
    return data
  }

  async getCustomer(id) {
    const data = await this.request(`/customers/${id}`)
    return data.data
  }

  async createCustomer(customer) {
    const data = await this.request('/customers', {
      method: 'POST',
      body: customer,
    })
    return data.data
  }

  async updateCustomer(id, customer) {
    const data = await this.request(`/customers/${id}`, {
      method: 'PUT',
      body: customer,
    })
    return data.data
  }

  async deleteCustomer(id) {
    await this.request(`/customers/${id}`, { method: 'DELETE' })
  }

  async getCustomerStats() {
    const data = await this.request('/customers/stats')
    return data.data
  }

  async getTopCustomers() {
    const data = await this.request('/customers/top')
    return data.data
  }

  // Invoices
  async getInvoices(params = {}) {
    const query = new URLSearchParams(params).toString()
    const data = await this.request(`/invoices${query ? `?${query}` : ''}`)
    return data
  }

  async getInvoice(id) {
    const data = await this.request(`/invoices/${id}`)
    return data.data
  }

  async createInvoice(invoice) {
    const data = await this.request('/invoices', {
      method: 'POST',
      body: invoice,
    })
    return data.data
  }

  async updateInvoiceStatus(id, status) {
    const data = await this.request(`/invoices/${id}/status`, {
      method: 'PUT',
      body: status,
    })
    return data.data
  }

  async deleteInvoice(id) {
    await this.request(`/invoices/${id}`, { method: 'DELETE' })
  }

  async getInvoiceStats() {
    const data = await this.request('/invoices/stats')
    return data.data
  }

  // Subscription
  async getSubscription() {
    const data = await this.request('/subscription')
    return data.data
  }

  // Obuna: qo'lda o'tkazma qilinganini bildirish (admin tasdiqlaydi)
  async requestSubscription(payload) {
    const data = await this.request('/subscription/request', {
      method: 'POST',
      body: payload,
    })
    return data.data
  }

  async getPaymentHistory() {
    const data = await this.request('/subscription/payments')
    return data.data
  }

  async payCustomerDebt(id, amount) {
    const data = await this.request(`/customers/${id}/pay-debt`, {
      method: 'POST',
      body: { amount },
    })
    return data
  }

  // Admin
  async getAdminDashboard() {
    const data = await this.request('/admin/dashboard')
    return data.data
  }

  async getAdminUsers(params = {}) {
    const query = new URLSearchParams(params).toString()
    const data = await this.request(`/admin/users${query ? `?${query}` : ''}`)
    return data
  }

  async getAdminUser(id) {
    const data = await this.request(`/admin/users/${id}`)
    return data.data
  }

  async createAdminUser(userData) {
    const data = await this.request('/admin/users', {
      method: 'POST',
      body: userData,
    })
    return data.data
  }

  async updateAdminUser(id, userData) {
    const data = await this.request(`/admin/users/${id}`, {
      method: 'PUT',
      body: userData,
    })
    return data.data
  }

  async getAdminPayments(params = {}) {
    const query = new URLSearchParams(params).toString()
    const data = await this.request(`/admin/payments${query ? `?${query}` : ''}`)
    return data
  }

  async approveAdminPayment(id) {
    const data = await this.request(`/admin/payments/${id}/approve`, {
      method: 'PUT',
    })
    return data
  }

  async rejectAdminPayment(id) {
    const data = await this.request(`/admin/payments/${id}/reject`, {
      method: 'PUT',
    })
    return data
  }

  async getAdminSubscriptions() {
    const data = await this.request('/admin/subscriptions')
    return data.data
  }

  // Upload
  async uploadImage(file) {
    const formData = new FormData()
    formData.append('image', file)
    const response = await fetch(`${API_URL}/upload`, {
      method: 'POST',
      headers: {
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
      },
      body: formData,
    })
    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.message || 'Rasm yuklashda xatolik')
    }
    return data.data
  }

  // Cards




  // Notifications
  async getNotifications(params = {}) {
    const query = new URLSearchParams(params).toString()
    const data = await this.request(`/notifications${query ? `?${query}` : ''}`)
    return data
  }

  async getUnreadCount() {
    const data = await this.request('/notifications/unread-count')
    return data.data
  }

  async markNotificationRead(id) {
    const data = await this.request(`/notifications/${id}/read`, { method: 'PUT' })
    return data.data
  }

  async markAllNotificationsRead() {
    const data = await this.request('/notifications/read-all', { method: 'PUT' })
    return data.data
  }

  async deleteNotification(id) {
    await this.request(`/notifications/${id}`, { method: 'DELETE' })
  }

  // Marketplace (OsonBozor)
  async getMarketplaceShops(params = {}) {
    const query = new URLSearchParams(params).toString()
    const data = await this.request(`/marketplace/shops${query ? `?${query}` : ''}`)
    return data
  }

  async getFeaturedShops() {
    const data = await this.request('/marketplace/shops/featured')
    return data.data
  }

  async getMarketplaceProducts(params = {}) {
    const query = new URLSearchParams(params).toString()
    const data = await this.request(`/marketplace/products${query ? `?${query}` : ''}`)
    return data
  }

  async getMarketplaceCategories() {
    const data = await this.request('/marketplace/categories')
    return data.data
  }

  async getMarketplaceStats() {
    const data = await this.request('/marketplace/stats')
    return data.data
  }

  async getMarketplaceShopDetail(userId) {
    const data = await this.request(`/marketplace/shop/${userId}`)
    return data.data
  }

  async getMarketplaceProfile() {
    const data = await this.request('/marketplace/profile')
    return data.data
  }

  async updateMarketplaceProfile(profileData) {
    const data = await this.request('/marketplace/profile', {
      method: 'PUT',
      body: profileData,
    })
    return data.data
  }

  // AI Business Advisor
  async getAiAdvice(message = '', contextType = 'general', history = []) {
    const data = await this.request('/ai/advisor', {
      method: 'POST',
      body: { message, contextType, history },
    })
    return data.data
  }
}

export const api = new ApiService()
export default api

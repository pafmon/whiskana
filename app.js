// ==================== Data Management ====================
class WhiskanaApp {
  constructor() {
    this.storageKey = 'whiskana_reviews';
    this.mapInstance = null;
    this.markers = new Map();
    this.currentEditingId = null;
    this.sortOrder = 'recent';
    this.searchQuery = '';
    this.init();
  }

  init() {
    this.loadReviews();
    this.setupEventListeners();
    this.renderReviews();
    this.updateStats();
    this.renderDistilleryList();
  }

  // ==================== Storage ====================
  loadReviews() {
    const data = localStorage.getItem(this.storageKey);
    return data ? JSON.parse(data) : [];
  }

  saveReviews(reviews) {
    localStorage.setItem(this.storageKey, JSON.stringify(reviews));
  }

  getReviews() {
    return this.loadReviews();
  }

  // ==================== CRUD Operations ====================
  addReview(review) {
    review.id = Date.now().toString();
    review.createdAt = new Date().toISOString();
    const reviews = this.getReviews();
    reviews.push(review);
    this.saveReviews(reviews);
    return review.id;
  }

  updateReview(id, updates) {
    const reviews = this.getReviews();
    const index = reviews.findIndex(r => r.id === id);
    if (index !== -1) {
      reviews[index] = { ...reviews[index], ...updates, id };
      this.saveReviews(reviews);
      return true;
    }
    return false;
  }

  deleteReview(id) {
    const reviews = this.getReviews();
    const filtered = reviews.filter(r => r.id !== id);
    this.saveReviews(filtered);
    if (this.markers.has(id)) {
      this.mapInstance?.removeLayer(this.markers.get(id));
      this.markers.delete(id);
    }
  }

  getReviewById(id) {
    return this.getReviews().find(r => r.id === id);
  }

  // ==================== Filtering & Sorting ====================
  getFilteredReviews() {
    let reviews = this.getReviews();

    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      reviews = reviews.filter(r =>
        r.whiskyName?.toLowerCase().includes(q) ||
        r.distillery?.toLowerCase().includes(q) ||
        r.notes?.toLowerCase().includes(q)
      );
    }

    if (this.sortOrder === 'recent') {
      reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (this.sortOrder === 'oldest') {
      reviews.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else if (this.sortOrder === 'highest') {
      reviews.sort((a, b) => (b.score || 0) - (a.score || 0));
    }

    return reviews;
  }

  // ==================== UI Rendering ====================
  renderReviews() {
    const reviewList = document.getElementById('reviewList');
    const reviews = this.getFilteredReviews();

    if (reviews.length === 0) {
      reviewList.innerHTML = `
        <div class="empty">
          <strong>No hay catas registradas</strong>
          <p>Pulsa el botón + para crear tu primera cata</p>
        </div>
      `;
      return;
    }

    reviewList.innerHTML = reviews.map(review => `
      <div class="card">
        <div class="card-top">
          <div>
            <h2>${this.escapeHtml(review.whiskyName || 'Sin nombre')}</h2>
            <div class="distillery">${this.escapeHtml(review.distillery || 'Destilería desconocida')}</div>
          </div>
          ${review.score ? `<div class="score">${review.score}</div>` : ''}
        </div>

        <div class="meta">
          ${review.year ? `<span class="pill">${review.year} años</span>` : ''}
          ${review.region ? `<span class="pill">${review.region}</span>` : ''}
          <span class="pill">${this.formatDate(review.date)}</span>
          ${review.latitude && review.longitude ? '<span class="pill">📍 Con ubicación</span>' : ''}
        </div>

        ${review.type ? `<div class="notes"><strong>Tipo:</strong> ${this.escapeHtml(review.type)}</div>` : ''}
        ${review.nose ? `<div class="notes"><strong>Nariz:</strong> ${this.escapeHtml(review.nose)}</div>` : ''}
        ${review.palate ? `<div class="notes"><strong>Boca:</strong> ${this.escapeHtml(review.palate)}</div>` : ''}
        ${review.finish ? `<div class="notes"><strong>Final:</strong> ${this.escapeHtml(review.finish)}</div>` : ''}
        ${review.overall ? `<div class="notes"><strong>Sensación general:</strong> ${this.escapeHtml(review.overall)}</div>` : ''}
        ${review.place ? `<div class="notes"><strong>Lugar:</strong> ${this.escapeHtml(review.place)}</div>` : ''}
        ${review.price ? `<div class="notes"><strong>Precio:</strong> £${review.price}</div>` : ''}

        <div class="card-actions">
          <button class="btn secondary" onclick="app.openEditDialog('${review.id}')">Editar</button>
          <button class="btn danger" onclick="app.confirmDelete('${review.id}')">Eliminar</button>
        </div>
      </div>
    `).join('');
  }

  updateHeaderCount() {
    document.getElementById('headerCount').textContent = this.getReviews().length;
  }

  renderDistilleryList() {
    const distilleries = [...new Set(this.getReviews().map(r => r.distillery).filter(Boolean))];
    const datalist = document.getElementById('distilleries');
    datalist.innerHTML = distilleries.map(d => `<option value="${this.escapeHtml(d)}">`).join('');
  }

  // ==================== Dialog Management ====================
  openAddDialog() {
    this.currentEditingId = null;
    document.getElementById('dialogTitle').textContent = 'Nueva cata';
    document.getElementById('reviewForm').reset();
    document.getElementById('reviewId').value = '';
    this.resetFormFields();
    document.getElementById('reviewDialog').showModal();
  }

  openEditDialog(id) {
    const review = this.getReviewById(id);
    if (!review) return;

    this.currentEditingId = id;
    document.getElementById('dialogTitle').textContent = 'Editar cata';
    document.getElementById('reviewId').value = id;

    document.getElementById('date').value = review.date || '';
    document.getElementById('time').value = review.time || '';
    document.getElementById('distillery').value = review.distillery || '';
    document.getElementById('whisky').value = review.whiskyName || '';
    document.getElementById('age').value = review.year || '';
    document.getElementById('abv').value = review.abv || '';
    document.getElementById('type').value = review.type || '';
    document.getElementById('region').value = review.region || '';
    document.getElementById('nose').value = review.nose || '';
    document.getElementById('palate').value = review.palate || '';
    document.getElementById('finish').value = review.finish || '';
    document.getElementById('overall').value = review.overall || '';
    document.getElementById('scoreInput').value = review.score || '';
    document.getElementById('price').value = review.price || '';
    document.getElementById('place').value = review.place || '';
    document.getElementById('tags').value = review.tags || '';
    document.getElementById('latitude').value = review.latitude || '';
    document.getElementById('longitude').value = review.longitude || '';

    document.getElementById('reviewDialog').showModal();
  }

  closeDialog() {
    document.getElementById('reviewDialog').close();
    this.currentEditingId = null;
  }

  resetFormFields() {
    document.getElementById('date').value = new Date().toISOString().split('T')[0];
    document.getElementById('time').value = '';
    document.getElementById('distillery').value = '';
    document.getElementById('whisky').value = '';
    document.getElementById('age').value = '';
    document.getElementById('abv').value = '';
    document.getElementById('type').value = '';
    document.getElementById('region').value = '';
    document.getElementById('nose').value = '';
    document.getElementById('palate').value = '';
    document.getElementById('finish').value = '';
    document.getElementById('overall').value = '';
    document.getElementById('scoreInput').value = '';
    document.getElementById('price').value = '';
    document.getElementById('place').value = '';
    document.getElementById('tags').value = '';
    document.getElementById('latitude').value = '';
    document.getElementById('longitude').value = '';
  }

  handleFormSubmit(e) {
    e.preventDefault();

    const review = {
      date: document.getElementById('date').value,
      time: document.getElementById('time').value,
      distillery: document.getElementById('distillery').value,
      whiskyName: document.getElementById('whisky').value,
      year: document.getElementById('age').value,
      abv: document.getElementById('abv').value,
      type: document.getElementById('type').value,
      region: document.getElementById('region').value,
      color: '', // Not in current form - optional
      nose: document.getElementById('nose').value,
      palate: document.getElementById('palate').value,
      finish: document.getElementById('finish').value,
      overall: document.getElementById('overall').value,
      score: parseInt(document.getElementById('scoreInput').value) || null,
      price: document.getElementById('price').value,
      place: document.getElementById('place').value,
      tags: document.getElementById('tags').value,
      latitude: parseFloat(document.getElementById('latitude').value) || null,
      longitude: parseFloat(document.getElementById('longitude').value) || null,
    };

    if (this.currentEditingId) {
      this.updateReview(this.currentEditingId, review);
    } else {
      this.addReview(review);
    }

    this.closeDialog();
    this.renderReviews();
    this.updateStats();
    this.updateHeaderCount();
    this.renderDistilleryList();
    this.refreshMapMarkers();
  }

  confirmDelete(id) {
    if (confirm('¿Estás seguro de que quieres eliminar esta cata?')) {
      this.deleteReview(id);
      this.renderReviews();
      this.updateStats();
      this.updateHeaderCount();
      this.renderDistilleryList();
      this.refreshMapMarkers();
    }
  }

  // ==================== Search & Sort ====================
  handleSearch(query) {
    this.searchQuery = query;
    this.renderReviews();
  }

  handleSort(order) {
    this.sortOrder = order;
    document.getElementById('sortButton').textContent = {
      'recent': 'Recientes',
      'oldest': 'Antiguos',
      'highest': 'Mejor puntuadas'
    }[order];
    this.renderReviews();
  }

  // ==================== Statistics ====================
  updateStats() {
    const reviews = this.getReviews();

    document.getElementById('statTotal').textContent = reviews.length;

    const distilleries = new Set(reviews.map(r => r.distillery).filter(Boolean));
    document.getElementById('statDistilleries').textContent = distilleries.size;

    const withScores = reviews.filter(r => r.score);
    if (withScores.length > 0) {
      const avg = (withScores.reduce((sum, r) => sum + r.score, 0) / withScores.length).toFixed(1);
      document.getElementById('statAverage').textContent = avg;
    } else {
      document.getElementById('statAverage').textContent = '—';
    }

    const withLocation = reviews.filter(r => r.latitude && r.longitude);
    document.getElementById('statVisited').textContent = withLocation.length;
  }

  // ==================== Map Integration ====================
  initMap() {
    if (this.mapInstance) return;

    const mapEl = document.getElementById('map');
    this.mapInstance = L.map(mapEl, {
      attributionControl: true,
      zoomControl: true
    }).setView([56.5, -4], 6);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(this.mapInstance);

    this.mapInstance.on('click', (e) => {
      const { lat, lng } = e.latlng;
      document.getElementById('latitude').value = lat.toFixed(6);
      document.getElementById('longitude').value = lng.toFixed(6);
    });

    this.refreshMapMarkers();
  }

  refreshMapMarkers() {
    if (!this.mapInstance) return;

    this.markers.forEach(marker => this.mapInstance.removeLayer(marker));
    this.markers.clear();

    const reviews = this.getReviews();
    reviews.forEach(review => {
      if (review.latitude && review.longitude) {
        const marker = L.marker([review.latitude, review.longitude])
          .bindPopup(`
            <strong>${this.escapeHtml(review.whiskyName || 'Sin nombre')}</strong><br>
            ${this.escapeHtml(review.distillery || 'Destilería')}<br>
            ${this.formatDate(review.date)}<br>
            ${review.score ? `Puntuación: ${review.score}` : ''}
          `)
          .addTo(this.mapInstance);
        this.markers.set(review.id, marker);
      }
    });
  }

  locateUser() {
    if (!this.mapInstance) {
      alert('El mapa aún no está cargado');
      return;
    }

    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        this.mapInstance.setView([latitude, longitude], 15);
        L.marker([latitude, longitude], {
          title: 'Tu ubicación'
        }).addTo(this.mapInstance);

        document.getElementById('latitude').value = latitude.toFixed(6);
        document.getElementById('longitude').value = longitude.toFixed(6);
      },
      () => {
        alert('No se pudo obtener tu ubicación');
      }
    );
  }

  fitMapToMarkers() {
    if (!this.mapInstance || this.markers.size === 0) {
      alert('No hay ubicaciones que mostrar en el mapa');
      return;
    }

    const group = new L.featureGroup(Array.from(this.markers.values()));
    this.mapInstance.fitBounds(group.getBounds(), { padding: [50, 50] });
  }

  // ==================== Export/Import ====================
  exportToCSV() {
    const reviews = this.getReviews();
    const headers = ['Fecha', 'Hora', 'Destilería', 'Whisky', 'Edad', 'ABV', 'Tipo', 'Región', 'Nariz', 'Boca', 'Final', 'Sensación General', 'Puntuación', 'Precio (£)', 'Lugar', 'Etiquetas', 'Latitude', 'Longitude'];

    const rows = reviews.map(r => [
      r.date || '',
      r.time || '',
      r.distillery || '',
      r.whiskyName || '',
      r.year || '',
      r.abv || '',
      r.type || '',
      r.region || '',
      r.nose || '',
      r.palate || '',
      r.finish || '',
      r.overall || '',
      r.score || '',
      r.price || '',
      r.place || '',
      r.tags || '',
      r.latitude || '',
      r.longitude || ''
    ]);

    const csv = [
      headers.map(h => `"${h}"`).join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `whiskana-${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
  }

  exportToJSON() {
    const reviews = this.getReviews();
    const json = JSON.stringify(reviews, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `whiskana-${new Date().toISOString().split('T')[0]}.json`);
    link.click();
  }

  importFromJSON() {
    document.getElementById('importFile').click();
  }

  handleFileImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result || '[]');
        if (Array.isArray(data)) {
          this.saveReviews(data);
          this.renderReviews();
          this.updateStats();
          this.updateHeaderCount();
          this.renderDistilleryList();
          this.refreshMapMarkers();
          alert(`Se han importado ${data.length} catas correctamente`);
        } else {
          alert('El formato del archivo JSON no es válido');
        }
      } catch (err) {
        alert('Error al importar el archivo: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  // ==================== Tab Navigation ====================
  switchTab(viewName) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));

    document.getElementById(viewName)?.classList.add('active');
    document.querySelector(`[data-view="${viewName}"]`)?.classList.add('active');

    if (viewName === 'mapView') {
      setTimeout(() => this.initMap(), 100);
    }
  }

  // ==================== Event Listeners ====================
  setupEventListeners() {
    // Tab navigation
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.switchTab(tab.dataset.view);
      });
    });

    // Add/Close dialog
    document.getElementById('addButton').addEventListener('click', () => this.openAddDialog());
    document.getElementById('closeDialog').addEventListener('click', () => this.closeDialog());
    document.getElementById('cancelButton').addEventListener('click', () => this.closeDialog());

    // Form submission
    document.getElementById('reviewForm').addEventListener('submit', (e) => this.handleFormSubmit(e));

    // Use GPS button
    document.getElementById('useLocationButton').addEventListener('click', (e) => {
      e.preventDefault();
      this.locateUser();
    });

    // Search
    document.getElementById('searchInput').addEventListener('input', (e) => {
      this.handleSearch(e.target.value);
    });

    // Sort
    document.getElementById('sortButton').addEventListener('click', () => {
      const nextOrder = { 'recent': 'oldest', 'oldest': 'highest', 'highest': 'recent' }[this.sortOrder];
      this.handleSort(nextOrder);
    });

    // Map buttons
    document.getElementById('locateButton').addEventListener('click', () => this.locateUser());
    document.getElementById('fitMarkersButton').addEventListener('click', () => this.fitMapToMarkers());

    // Export/Import
    document.getElementById('exportCsvButton').addEventListener('click', () => this.exportToCSV());
    document.getElementById('exportJsonButton').addEventListener('click', () => this.exportToJSON());
    document.getElementById('importJsonButton').addEventListener('click', () => this.importFromJSON());
    document.getElementById('importFile').addEventListener('change', (e) => this.handleFileImport(e));

    // Close dialog on backdrop click
    document.getElementById('reviewDialog').addEventListener('click', (e) => {
      if (e.target.id === 'reviewDialog') {
        this.closeDialog();
      }
    });

    this.updateHeaderCount();
  }

  // ==================== Utility ====================
  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  formatDate(dateString) {
    if (!dateString) return 'Fecha desconocida';
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('es-ES', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  }
}

// ==================== Initialize App ====================
let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new WhiskanaApp();
});

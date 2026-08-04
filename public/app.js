class WhiskanaApp {
  constructor() {
    this.reviews = [];
    this.mapInstance = null;
    this.markers = new Map();
    this.currentEditingId = null;
    this.sortOrder = 'recent';
    this.searchQuery = '';
    this.summarySort = { key: 'createdAt', dir: 'desc' };
    this.summaryPage = 1;
    this.summaryPageSize = 10;
    this.ready = false;
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.audioContext = null;
    this.audioStream = null;
    this.init();
  }

  async init() {
    await this.loadReviews();
    this.setupEventListeners();
    this.renderReviews();
    this.updateStats();
    this.renderDistilleryList();
    this.resetAudioUI();
    this.ready = true;
  }

  async loadReviews() {
    try {
      const res = await fetch('/api/reviews');
      this.reviews = res.ok ? await res.json() : [];
    } catch {
      this.reviews = [];
    }
    this.updateHeaderCount();
    this.renderSummaryTable();
    this.refreshMapMarkers();
  }

  async addReview(review) {
    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(review)
    });

    if (!res.ok) {
      throw new Error('No se pudo crear la cata');
    }

    const created = await res.json();
    this.reviews.push(created);
    this.renderAll();
    return created;
  }

  async updateReview(id, updates) {
    const res = await fetch(`/api/reviews/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });

    if (!res.ok) {
      throw new Error('No se pudo actualizar la cata');
    }

    const updated = await res.json();
    this.reviews = this.reviews.map((review) => review.id === id ? updated : review);
    this.renderAll();
    return updated;
  }

  async deleteReview(id) {
    const res = await fetch(`/api/reviews/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      throw new Error('No se pudo borrar la cata');
    }

    this.reviews = this.reviews.filter((review) => review.id !== id);
    this.renderAll();
  }

  getReviews() {
    return this.reviews;
  }

  getReviewById(id) {
    return this.reviews.find((review) => review.id === id);
  }

  getFilteredReviews() {
    let reviews = [...this.reviews];

    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      reviews = reviews.filter((review) => {
        const haystack = [review.whiskyName, review.distillery, review.nose, review.palate, review.overall, ...(review.tags || [])]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      });
    }

    if (this.sortOrder === 'recent') {
      reviews.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    } else if (this.sortOrder === 'oldest') {
      reviews.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    } else if (this.sortOrder === 'highest') {
      reviews.sort((a, b) => (b.score || 0) - (a.score || 0));
    }

    return reviews;
  }

  renderReviews() {
    const reviewList = document.getElementById('reviewList');
    const reviews = this.getFilteredReviews();

    if (!reviews.length) {
      reviewList.innerHTML = `
        <div class="empty">
          <strong>${this.reviews.length ? 'No hay coincidencias' : 'Aún no hay catas'}</strong>
          <p>${this.reviews.length ? 'Prueba con otra búsqueda.' : 'Pulsa el botón + para registrar la primera cata.'}</p>
        </div>
      `;
      return;
    }

    reviewList.innerHTML = reviews.map((review) => `
      <article class="card">
        <div class="card-top">
          <div>
            <h2>${this.escapeHtml(review.whiskyName || 'Sin nombre')}</h2>
            <div class="distillery">${this.escapeHtml(review.distillery || 'Destilería desconocida')}</div>
          </div>
          <div class="score">${review.score ?? '—'}</div>
        </div>

        <div class="meta">
          ${review.year ? `<span class="pill">${review.year} años</span>` : ''}
          ${review.region ? `<span class="pill">${this.escapeHtml(review.region)}</span>` : ''}
          <span class="pill">${this.escapeHtml(this.formatDate(review.date))}</span>
          ${review.latitude && review.longitude ? '<span class="pill">📍 Con ubicación</span>' : ''}
        </div>

        ${review.nose ? `<p class="notes"><strong>Nariz:</strong> ${this.escapeHtml(review.nose)}</p>` : ''}
        ${review.palate ? `<p class="notes"><strong>Boca:</strong> ${this.escapeHtml(review.palate)}</p>` : ''}
        ${review.finish ? `<p class="notes"><strong>Final:</strong> ${this.escapeHtml(review.finish)}</p>` : ''}
        ${review.overall ? `<p class="notes"><strong>Sensación:</strong> ${this.escapeHtml(review.overall)}</p>` : ''}
        ${review.place ? `<p class="notes"><strong>Lugar:</strong> ${this.escapeHtml(review.place)}</p>` : ''}

        <div class="card-actions">
          ${review.latitude && review.longitude ? `<button class="btn secondary" data-map="${review.id}" type="button">Ver mapa</button>` : ''}
          <button class="btn secondary" data-edit="${review.id}" type="button">Editar</button>
          <button class="btn danger" data-delete="${review.id}" type="button">Borrar</button>
        </div>
      </article>
    `).join('');

    reviewList.querySelectorAll('[data-edit]').forEach((button) => {
      button.addEventListener('click', () => this.openEditDialog(button.dataset.edit));
    });

    reviewList.querySelectorAll('[data-delete]').forEach((button) => {
      button.addEventListener('click', () => this.confirmDelete(button.dataset.delete));
    });

    reviewList.querySelectorAll('[data-map]').forEach((button) => {
      button.addEventListener('click', () => this.showReviewOnMap(button.dataset.map));
    });
  }

  updateHeaderCount() {
    document.getElementById('headerCount').textContent = this.reviews.length;
  }

  renderDistilleryList() {
    const list = document.getElementById('distilleries');
    const values = [...new Set(this.reviews.map((review) => review.distillery).filter(Boolean))];
    list.innerHTML = values.map((value) => `<option value="${this.escapeHtml(value)}"></option>`).join('');
  }

  getSummarySortedReviews() {
    const reviews = [...this.reviews];
    const { key, dir } = this.summarySort;
    const direction = dir === 'asc' ? 1 : -1;

    return reviews.sort((a, b) => {
      let valueA;
      let valueB;

      if (key === 'whiskyName') {
        valueA = (a.whiskyName || '').toLowerCase();
        valueB = (b.whiskyName || '').toLowerCase();
        return valueA.localeCompare(valueB) * direction;
      }

      if (key === 'score') {
        valueA = Number(a.score) || 0;
        valueB = Number(b.score) || 0;
        return (valueA > valueB ? 1 : valueA < valueB ? -1 : 0) * direction;
      }

      if (key === 'price') {
        valueA = (a.price || '').toLowerCase();
        valueB = (b.price || '').toLowerCase();
        return valueA.localeCompare(valueB) * direction;
      }

      if (key === 'map') {
        valueA = a.latitude && a.longitude ? 1 : 0;
        valueB = b.latitude && b.longitude ? 1 : 0;
        return (valueA > valueB ? 1 : valueA < valueB ? -1 : 0) * direction;
      }

      valueA = new Date(a.createdAt || 0).getTime();
      valueB = new Date(b.createdAt || 0).getTime();
      return (valueA > valueB ? 1 : valueA < valueB ? -1 : 0) * direction;
    });
  }

  renderSummaryTable() {
    const tbody = document.getElementById('summaryTableBody');
    const pagination = document.getElementById('summaryPagination');
    if (!tbody) return;

    const sortedReviews = this.getSummarySortedReviews();
    const totalPages = Math.max(1, Math.ceil(sortedReviews.length / this.summaryPageSize));

    if (this.summaryPage > totalPages) {
      this.summaryPage = totalPages;
    }

    const startIndex = (this.summaryPage - 1) * this.summaryPageSize;
    const pageReviews = sortedReviews.slice(startIndex, startIndex + this.summaryPageSize);

    const rows = pageReviews.map((review) => `
      <tr>
        <td><a href="#" data-summary-edit="${review.id}">${this.escapeHtml(review.whiskyName || 'Sin nombre')}</a></td>
        <td>${review.score ?? '—'}</td>
        <td>${this.escapeHtml(review.price || '—')}</td>
        <td>${review.latitude && review.longitude ? `<a href="#" data-summary-map="${review.id}">Ver mapa</a>` : '—'}</td>
      </tr>
    `).join('');

    tbody.innerHTML = rows || '<tr><td colspan="4" class="summary-empty">No hay catas todavía</td></tr>';

    tbody.querySelectorAll('[data-summary-edit]').forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        this.openEditDialog(link.dataset.summaryEdit);
      });
    });

    tbody.querySelectorAll('[data-summary-map]').forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        this.showReviewOnMap(link.dataset.summaryMap);
      });
    });

    if (pagination) {
      if (sortedReviews.length <= this.summaryPageSize) {
        pagination.innerHTML = '';
      } else {
        pagination.innerHTML = `
          <button class="summary-page-button" type="button" data-summary-page="prev" ${this.summaryPage === 1 ? 'disabled' : ''}>Anterior</button>
          <span class="summary-page-info">Página ${this.summaryPage} de ${totalPages}</span>
          <button class="summary-page-button" type="button" data-summary-page="next" ${this.summaryPage === totalPages ? 'disabled' : ''}>Siguiente</button>
        `;

        pagination.querySelectorAll('[data-summary-page]').forEach((button) => {
          button.addEventListener('click', () => {
            if (button.dataset.summaryPage === 'prev' && this.summaryPage > 1) {
              this.summaryPage -= 1;
            }
            if (button.dataset.summaryPage === 'next' && this.summaryPage < totalPages) {
              this.summaryPage += 1;
            }
            this.renderSummaryTable();
          });
        });
      }
    }

    document.querySelectorAll('[data-summary-sort]').forEach((button) => {
      const isActive = this.summarySort.key === button.dataset.summarySort;
      button.classList.toggle('active', isActive);
      button.textContent = `${button.dataset.summarySort === 'whiskyName' ? 'Nombre' : button.dataset.summarySort === 'score' ? 'Puntos' : button.dataset.summarySort === 'price' ? 'Precio' : 'Mapa'}${isActive ? (this.summarySort.dir === 'asc' ? ' ↑' : ' ↓') : ''}`;
    });
  }

  handleSummarySort(key) {
    if (this.summarySort.key === key) {
      this.summarySort.dir = this.summarySort.dir === 'asc' ? 'desc' : 'asc';
    } else {
      this.summarySort.key = key;
      this.summarySort.dir = 'asc';
    }
    this.summaryPage = 1;
    this.renderSummaryTable();
  }

  renderAll() {
    this.renderReviews();
    this.updateStats();
    this.updateHeaderCount();
    this.renderDistilleryList();
    this.renderSummaryTable();
    this.refreshMapMarkers();
  }

  openAddDialog() {
    this.currentEditingId = null;
    document.getElementById('dialogTitle').textContent = 'Nueva cata';
    document.getElementById('reviewForm').reset();
    document.getElementById('reviewId').value = '';
    this.resetFormFields();
    this.resetAudioUI();
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
    document.getElementById('tags').value = Array.isArray(review.tags) ? review.tags.join(', ') : review.tags || '';
    document.getElementById('latitude').value = review.latitude || '';
    document.getElementById('longitude').value = review.longitude || '';
    document.getElementById('transcriptPreview').textContent = review.transcript || '';
    document.getElementById('transcriptPreview').hidden = !review.transcript;

    document.getElementById('reviewDialog').showModal();
  }

  closeDialog() {
    document.getElementById('reviewDialog').close();
    this.currentEditingId = null;
    this.resetAudioUI();
  }

  fillFromParsedReview(review) {
    const setValue = (id, value) => {
      const element = document.getElementById(id);
      if (element) element.value = value ?? '';
    };

    setValue('distillery', review.distillery || review.destillery || '');
    setValue('whisky', review.whiskyName || review.whisky || '');
    setValue('age', review.year || '');
    setValue('abv', review.abv || '');
    setValue('type', review.type || '');
    setValue('region', review.region || '');
    setValue('nose', review.nose || '');
    setValue('palate', review.palate || '');
    setValue('finish', review.finish || '');
    setValue('overall', review.overall || '');
    setValue('scoreInput', review.score ?? '');
    setValue('price', review.price || '');
    setValue('place', review.place || '');
    setValue('tags', Array.isArray(review.tags) ? review.tags.join(', ') : (review.tags || ''));

    const transcriptPreview = document.getElementById('transcriptPreview');
    if (transcriptPreview) {
      transcriptPreview.textContent = review.transcript || '';
      transcriptPreview.hidden = !review.transcript;
    }
  }

  resetAudioUI() {
    const status = document.getElementById('audioStatus');
    const recordButton = document.getElementById('audioRecordButton');
    const stopButton = document.getElementById('audioStopButton');
    if (recordButton) recordButton.hidden = false;
    if (stopButton) stopButton.hidden = true;
    if (status) {
      status.textContent = '';
    }
  }

  async parseAudio(file) {
    const status = document.getElementById('audioStatus');
    const transcriptPreview = document.getElementById('transcriptPreview');
    const input = document.getElementById('audioInput');
    const selectedFile = file || input.files?.[0];

    if (!selectedFile) {
      if (status) status.textContent = 'Sube un archivo de audio o graba uno directamente.';
      return;
    }

    if (transcriptPreview) {
      transcriptPreview.hidden = true;
      transcriptPreview.textContent = '';
    }

    const formData = new FormData();
    formData.append('audio', selectedFile);

    if (status) status.textContent = 'Transcribiendo…';

    try {
      const res = await fetch('/api/reviews/from-audio', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo procesar el audio');

      this.fillFromParsedReview(data.review || {});
      if (status) status.textContent = `Listo. Transcripción: ${data.transcript.slice(0, 140)}${data.transcript.length > 140 ? '…' : ''}`;
      if (transcriptPreview && data.transcript) {
        transcriptPreview.textContent = data.transcript;
        transcriptPreview.hidden = false;
      }
    } catch (error) {
      if (status) status.textContent = error.message;
    }
  }

  async startRecording() {
    const status = document.getElementById('audioStatus');
    const recordButton = document.getElementById('audioRecordButton');
    const stopButton = document.getElementById('audioStopButton');

    this.resetAudioUI();
    if (status) status.textContent = 'Preparando grabación…';

    if (!navigator.mediaDevices?.getUserMedia) {
      if (status) status.textContent = 'Tu navegador no soporta grabación de audio.';
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioStream = stream;
      this.recordedChunks = [];
      this.mediaRecorder = new MediaRecorder(stream);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) this.recordedChunks.push(event.data);
      };

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
        const file = new File([blob], 'recording.webm', { type: 'audio/webm' });
        this.parseAudio(file);
        this.audioStream?.getTracks().forEach((track) => track.stop());
        this.audioStream = null;
      };

      this.mediaRecorder.start();
      if (recordButton) recordButton.hidden = true;
      if (stopButton) stopButton.hidden = false;
      if (status) status.textContent = 'Grabando…';
    } catch (error) {
      if (status) status.textContent = 'No se pudo iniciar la grabación.';
    }
  }

  toggleAudioUploadPanel() {
    const toggle = document.getElementById('audioUploadToggle');
    const panel = document.getElementById('audioUploadPanel');
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    const next = !expanded;

    toggle.setAttribute('aria-expanded', String(next));
    panel.hidden = !next;
    const label = toggle.querySelector('.audio-toggle-label');
    if (label) label.textContent = next ? 'Cerrar subida' : 'Subir archivo';
  }

  stopRecording() {
    const recordButton = document.getElementById('audioRecordButton');
    const stopButton = document.getElementById('audioStopButton');
    const status = document.getElementById('audioStatus');

    if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
      status.textContent = 'No hay grabación activa.';
      return;
    }

    this.mediaRecorder.stop();
    recordButton.hidden = false;
    stopButton.hidden = true;
  }

  resetFormFields() {
    const now = new Date();
    const dateValue = now.toISOString().split('T')[0];
    const timeValue = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    document.getElementById('date').value = dateValue;
    document.getElementById('time').value = timeValue;
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
    document.getElementById('transcriptPreview').textContent = '';
    document.getElementById('transcriptPreview').hidden = true;
  }

  async handleFormSubmit(event) {
    event.preventDefault();

    const transcriptPreview = document.getElementById('transcriptPreview');
    const transcriptValue = transcriptPreview ? transcriptPreview.textContent.trim() : '';

    const review = {
      date: document.getElementById('date').value,
      time: document.getElementById('time').value,
      distillery: document.getElementById('distillery').value,
      whiskyName: document.getElementById('whisky').value,
      year: document.getElementById('age').value,
      abv: document.getElementById('abv').value,
      type: document.getElementById('type').value,
      region: document.getElementById('region').value,
      nose: document.getElementById('nose').value,
      palate: document.getElementById('palate').value,
      finish: document.getElementById('finish').value,
      overall: document.getElementById('overall').value,
      score: Number(document.getElementById('scoreInput').value) || null,
      price: document.getElementById('price').value,
      place: document.getElementById('place').value,
      transcript: transcriptValue,
      tags: document.getElementById('tags').value.split(',').map((item) => item.trim()).filter(Boolean),
      latitude: Number(document.getElementById('latitude').value) || null,
      longitude: Number(document.getElementById('longitude').value) || null
    };

    try {
      if (this.currentEditingId) {
        await this.updateReview(this.currentEditingId, review);
      } else {
        await this.addReview(review);
      }
      this.closeDialog();
    } catch (error) {
      alert(error.message);
    }
  }

  async reloadDemoData() {
    if (!confirm('¿Recargar los datos de demostración y reasignar sus coordenadas dentro de Escocia?')) return;

    try {
      const res = await fetch('/api/reviews/seed-demo', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudieron recargar los datos');

      await this.loadReviews();
      this.renderReviews();
      this.updateStats();
      this.renderDistilleryList();
      this.renderSummaryTable();
      this.refreshMapMarkers();
      this.updateHeaderCount();
      alert(data.message || `Se recargaron ${data.imported} catas de prueba.`);
    } catch (error) {
      alert(error.message);
    }
  }

  async confirmDelete(id) {
    const review = this.getReviewById(id);
    if (!review) return;
    if (!confirm(`¿Borrar la cata de ${review.whiskyName || 'esta review'}?`)) return;

    try {
      await this.deleteReview(id);
    } catch (error) {
      alert(error.message);
    }
  }

  handleSearch(query) {
    this.searchQuery = query;
    this.renderReviews();
  }

  handleSort(order) {
    this.sortOrder = order;
    document.getElementById('sortButton').textContent = {
      recent: 'Recientes',
      oldest: 'Antiguos',
      highest: 'Mejor puntuadas'
    }[order];
    this.renderReviews();
  }

  updateStats() {
    const reviews = this.reviews;
    document.getElementById('statTotal').textContent = reviews.length;
    document.getElementById('statDistilleries').textContent = new Set(reviews.map((review) => review.distillery).filter(Boolean)).size;

    const scored = reviews.filter((review) => review.score !== null && review.score !== undefined && review.score !== '');
    document.getElementById('statAverage').textContent = scored.length ? (scored.reduce((sum, review) => sum + Number(review.score), 0) / scored.length).toFixed(1) : '—';
    document.getElementById('statVisited').textContent = reviews.filter((review) => review.latitude && review.longitude).length;
  }

  initMap() {
    if (this.mapInstance || typeof L === 'undefined') return;

    const mapEl = document.getElementById('map');
    this.mapInstance = L.map(mapEl).setView([56.5, -4], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.mapInstance);

    this.mapInstance.on('click', (event) => {
      document.getElementById('latitude').value = event.latlng.lat.toFixed(6);
      document.getElementById('longitude').value = event.latlng.lng.toFixed(6);
    });

    this.refreshMapMarkers();
    if (this.markers.size > 0) {
      const group = new L.featureGroup(Array.from(this.markers.values()));
      this.mapInstance.fitBounds(group.getBounds().pad(0.2));
    }
  }

  refreshMapMarkers() {
    if (!this.mapInstance) return;

    this.markers.forEach((marker) => this.mapInstance.removeLayer(marker));
    this.markers.clear();

    this.reviews.forEach((review) => {
      const latitude = Number(review.latitude);
      const longitude = Number(review.longitude);

      if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
        const marker = L.marker([latitude, longitude])
          .bindPopup(`<strong>${this.escapeHtml(review.whiskyName || 'Sin nombre')}</strong><br>${this.escapeHtml(review.distillery || '')}<br>${this.escapeHtml(review.date || '')}<br><a href="#" data-map-edit="${review.id}">Editar cata</a>`)
          .addTo(this.mapInstance);

        marker.on('popupopen', () => {
          const link = marker.getPopup().getElement()?.querySelector('[data-map-edit]');
          if (link) {
            link.addEventListener('click', (event) => {
              event.preventDefault();
              this.openEditDialog(review.id);
              this.switchTab('listView');
            });
          }
        });
        this.markers.set(review.id, marker);
      }
    });
  }

  showReviewOnMap(id) {
    const review = this.getReviewById(id);
    if (!review || !review.latitude || !review.longitude) return;
    this.switchTab('mapView');
    setTimeout(() => {
      this.initMap();
      this.mapInstance.setView([review.latitude, review.longitude], 14);
      const marker = this.markers.get(id);
      if (marker) marker.openPopup();
    }, 120);
  }

  locateUser() {
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        if (!this.mapInstance) this.initMap();
        this.mapInstance.setView([latitude, longitude], 14);
        L.circleMarker([latitude, longitude], { radius: 8, color: '#a45f20' }).addTo(this.mapInstance).bindPopup('Tu ubicación').openPopup();
        document.getElementById('latitude').value = latitude.toFixed(6);
        document.getElementById('longitude').value = longitude.toFixed(6);
      },
      () => alert('No se pudo obtener la ubicación')
    );
  }

  fitMapToMarkers() {
    if (!this.mapInstance || this.markers.size === 0) {
      alert('No hay ubicaciones que mostrar');
      return;
    }
    const group = new L.featureGroup(Array.from(this.markers.values()));
    this.mapInstance.fitBounds(group.getBounds().pad(0.2));
  }

  async exportToCSV() {
    window.location.href = '/api/reviews/export/csv';
  }

  async exportToJSON() {
    window.location.href = '/api/reviews/export/json';
  }

  async importFromJSON() {
    document.getElementById('importFile').click();
  }

  async handleFileImport(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    try {
      const data = JSON.parse(text);
      const res = await fetch('/api/reviews/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!res.ok) throw new Error('No se pudo importar');
      const body = await res.json();
      await this.loadReviews();
      alert(`Se importaron ${body.imported} catas`);
    } catch (error) {
      alert(error.message);
    } finally {
      event.target.value = '';
    }
  }

  switchTab(viewName) {
    document.querySelectorAll('.view').forEach((view) => view.classList.toggle('active', view.id === viewName));
    document.querySelectorAll('.tab').forEach((tab) => tab.classList.toggle('active', tab.dataset.view === viewName));

    if (viewName === 'mapView') {
      setTimeout(() => this.initMap(), 80);
    }
  }

  setupEventListeners() {
    document.querySelectorAll('.tab').forEach((tab) => {
      tab.addEventListener('click', () => this.switchTab(tab.dataset.view));
    });

    document.getElementById('addButton').addEventListener('click', () => this.openAddDialog());
    document.getElementById('closeDialog').addEventListener('click', () => this.closeDialog());
    document.getElementById('cancelButton').addEventListener('click', () => this.closeDialog());
    document.getElementById('reviewForm').addEventListener('submit', (event) => this.handleFormSubmit(event));
    document.getElementById('useLocationButton').addEventListener('click', (event) => {
      event.preventDefault();
      this.locateUser();
    });

    document.getElementById('searchInput').addEventListener('input', (event) => this.handleSearch(event.target.value));
    document.getElementById('audioParseButton').addEventListener('click', () => this.parseAudio(document.getElementById('audioInput').files?.[0]));
    document.getElementById('audioUploadToggle').addEventListener('click', () => this.toggleAudioUploadPanel());
    document.getElementById('audioRecordButton').addEventListener('click', () => this.startRecording());
    document.getElementById('audioStopButton').addEventListener('click', () => this.stopRecording());
    document.getElementById('sortButton').addEventListener('click', () => {
      const nextOrder = { recent: 'oldest', oldest: 'highest', highest: 'recent' }[this.sortOrder];
      this.handleSort(nextOrder);
    });

    document.querySelectorAll('[data-summary-sort]').forEach((button) => {
      button.addEventListener('click', () => this.handleSummarySort(button.dataset.summarySort));
    });

    document.getElementById('locateButton').addEventListener('click', () => this.locateUser());
    document.getElementById('fitMarkersButton').addEventListener('click', () => this.fitMapToMarkers());
    document.getElementById('exportCsvButton').addEventListener('click', () => this.exportToCSV());
    document.getElementById('exportJsonButton').addEventListener('click', () => this.exportToJSON());
    document.getElementById('importJsonButton').addEventListener('click', () => this.importFromJSON());
    document.getElementById('reloadDemoButton').addEventListener('click', () => this.reloadDemoData());
    document.getElementById('importFile').addEventListener('change', (event) => this.handleFileImport(event));

    document.getElementById('reviewDialog').addEventListener('click', (event) => {
      if (event.target.id === 'reviewDialog') {
        this.closeDialog();
      }
    });
  }

  escapeHtml(text) {
    return String(text ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[char]));
  }

  formatDate(dateString) {
    if (!dateString) return 'Fecha desconocida';
    const date = new Date(`${dateString}T00:00:00`);
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  }
}

let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new WhiskanaApp();
});

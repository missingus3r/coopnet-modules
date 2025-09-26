document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('modal-overlay');
  const createBtn = document.getElementById('create-vote-btn');
  const modal = document.getElementById('createVoteModal');
  const closeBtns = modal ? modal.querySelectorAll('.close-modal') : [];

  // References for create/edit modal
  const createForm = document.getElementById('createVoteForm');
  const modalHeaderTitle = modal ? modal.querySelector('.modal-header h2') : null;
  const submitBtn = createForm ? createForm.querySelector('button[type="submit"]') : null;
  
  // Function to reset create modal to default state
  function resetCreateModal() {
    if (!modal || !createForm || !modalHeaderTitle || !submitBtn) return;
    modalHeaderTitle.textContent = 'Crear Votación';
    createForm.action = '/votaciones';
    createForm.querySelector('input[name="_method"]').value = 'POST';
    submitBtn.textContent = 'Crear';
    createForm.reset();
  }
  
  // Open create modal
  if (createBtn && modal) {
    createBtn.addEventListener('click', () => {
      resetCreateModal();
      modal.style.display = 'block';
      if (overlay) overlay.style.display = 'block';
    });
  }

  // Close create/edit modal
  closeBtns.forEach(btn => btn.addEventListener('click', () => {
    if (modal) modal.style.display = 'none';
    if (overlay) overlay.style.display = 'none';
    resetCreateModal();
  }));

  // Outside click for create/edit modal
  window.addEventListener('click', e => {
    if (modal && (e.target === modal || e.target === overlay)) {
      modal.style.display = 'none';
      if (overlay) overlay.style.display = 'none';
      resetCreateModal();
    }
  });

  // Voting
  document.querySelectorAll('.submit-vote-btn').forEach(btn => {
    btn.addEventListener('click', async function() {
      const container = this.closest('.vote-item');
      const id = container.dataset.id;
      const selected = container.querySelector(`input[name="vote_${id}"]:checked`);
      if (!selected) {
        alert('Selecciona una opción');
        return;
      }
      const option = selected.value;
      // Capture proxy representation selection if present
      const representSelect = container.querySelector(`select[name="represent_${id}"]`);
      const represent = representSelect ? representSelect.value : '';
      try {
        const res = await fetch(`/votaciones/${id}/vote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ option, represent })
        });
        const data = await res.json();
        if (data.success) {
          // update counts
          const countsDiv = container.querySelector('.vote-counts');
          countsDiv.innerHTML = `
            <span class="badge si">Sí: ${data.counts['Sí']}</span>
            <span class="badge no">No: ${data.counts['No']}</span>
            <span class="badge abst">Abstención: ${data.counts['Abstención']}</span>
          `;
        } else {
          alert(data.error || 'Error votando');
        }
      } catch (err) {
        console.error(err);
        alert('Error al enviar voto');
      }
    });
  });

  // Timer updates
  function updateTimers() {
    document.querySelectorAll('.vote-timer').forEach(timer => {
      const endTime = parseInt(timer.dataset.end);
      const now = Date.now();
      const remaining = endTime - now;
      
      if (remaining <= 0) {
        timer.textContent = 'Cerrada';
        timer.style.color = '#f44336';
      } else {
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        timer.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        if (minutes < 5) {
          timer.style.color = '#ff9800';
        }
      }
    });
  }
  
  // Update timers every second
  updateTimers();
  setInterval(updateTimers, 1000);
  
  // Delete vote buttons
  document.querySelectorAll('.delete-vote-btn').forEach(btn => {
    btn.addEventListener('click', async function() {
      if (!confirm('¿Está seguro de eliminar esta votación?')) return;
      const voteItem = this.closest('.vote-item');
      const voteId = voteItem.dataset.id;
      try {
        const res = await fetch(`/votaciones/${voteId}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
          voteItem.remove();
        } else {
          alert(data.error || 'Error al eliminar');
        }
      } catch (err) {
        console.error(err);
        alert('Error al eliminar votación');
      }
    });
  });

  // Edit vote buttons
  document.querySelectorAll('.edit-vote-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const voteItem = this.closest('.vote-item');
      const voteId = voteItem.dataset.id;
      const title = voteItem.dataset.title;
      const details = voteItem.dataset.details;
      const duration = voteItem.dataset.duration;
      const proposer = voteItem.dataset.proposer;
      
      if (!modal || !createForm) return;
      
      // Populate form with existing data
      modalHeaderTitle.textContent = 'Editar Votación';
      createForm.action = `/votaciones/${voteId}`;
      createForm.querySelector('input[name="_method"]').value = 'PUT';
      createForm.querySelector('#title').value = title;
      createForm.querySelector('#details').value = details || '';
      createForm.querySelector('#duration').value = duration;
      createForm.querySelector('#proposer').value = proposer || '';
      submitBtn.textContent = 'Actualizar';
      
      // Show modal
      modal.style.display = 'block';
      if (overlay) overlay.style.display = 'block';
    });
  });
});
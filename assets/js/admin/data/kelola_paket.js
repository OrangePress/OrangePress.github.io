
const token = localStorage.getItem('token');


let packages = [];

// === FETCH & RENDER ===
async function loadPackages() {
  try {
    const res = await fetch('https://orange-press-be.vercel.app/api/packages', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Gagal memuat paket');
    
    packages = await res.json();
    renderPackagesList();
  } catch (err) {
    console.error(err);
    document.getElementById('packagesList').innerHTML = 
      `<p class="muted" style="color:red;">Gagal memuat data paket.</p>`;
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'Tidak dapat memuat daftar paket.',
      confirmButtonColor: '#ff6b00'
    });
  }
}

function renderPackagesList() {
  const container = document.getElementById('packagesList');
  if (!container) return;

  if (!packages.length) {
    container.innerHTML = `<p class="muted">Belum ada paket yang dibuat.</p>`;
    return;
  }

  const sorted = [...packages].sort((a, b) => a.price - b.price);

  container.innerHTML = sorted.map(pkg => {
    const isActive = pkg.isActive !== false;
    // Ambil info eksemplar dari benefits (asumsi: ada teks "XX Eksemplar")
    const exemplarLine = pkg.benefits.find(b => b.includes('Eksemplar')) || '';
    const metaParts = [
      exemplarLine,
      !isActive ? 'Nonaktif' : ''
    ].filter(Boolean).join(' • ');

    const benefitsText = pkg.benefits?.length 
      ? `Fasilitas: ${pkg.benefits.join(', ')}`
      : '';

    return `
      <div class="card pkg-card">
        ${pkg.isRecommended ? 
          `<div class="muted" style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#f97316;margin-bottom:4px;">Rekomendasi Admin</div>` 
          : ''}
        <h3>${pkg.title}</h3>
        <p class="muted" style="margin-top:6px;">${pkg.description}</p>
        ${metaParts ? `<p class="muted" style="margin-top:6px;">${metaParts}</p>` : ''}
        ${benefitsText ? `<p class="muted" style="margin-top:4px;">${benefitsText}</p>` : ''}
        <div class="pkg-price">Rp ${pkg.price.toLocaleString('id-ID')}</div>
        <div class="pkg-actions">
          <button class="btn-small" onclick="openEditPackage('${pkg._id}')">Edit</button>
          <button class="btn-small danger" onclick="deletePackage('${pkg._id}')">Hapus</button>
        </div>
      </div>
    `;
  }).join('');
}

// === HAPUS PAKET ===
async function deletePackage(id) {
  const result = await Swal.fire({
    title: 'Yakin hapus paket?',
    text: "Aksi ini tidak bisa dikembalikan!",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#aaa',
    confirmButtonText: 'Ya, hapus!',
    cancelButtonText: 'Batal'
  });

  if (result.isConfirmed) {
    try {
      const res = await fetch(`https://orange-press-be.vercel.app/api/packages/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Dihapus!',
          text: 'Paket berhasil dihapus.',
          confirmButtonColor: '#ff6b00',
          timer: 1500,
          showConfirmButton: false
        });
        loadPackages();
      } else {
        throw new Error('Gagal menghapus');
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal',
        text: 'Tidak dapat menghapus paket.',
        confirmButtonColor: '#ff6b00'
      });
    }
  }
}

// === EDIT (placeholder) ===
function openEditPackage(id) {
  Swal.fire({
    title: 'Fitur Edit Belum Tersedia',
    text: 'Sedang dalam pengembangan.',
    icon: 'info',
    confirmButtonColor: '#ff6b00'
  });
}

// === TAMBAH PAKET ===
function openAddPackageModal() {
  document.getElementById('addPackageModal').style.display = 'flex';
  document.getElementById('addPackageForm').reset();
}

function closeAddPackageModal() {
  document.getElementById('addPackageModal').style.display = 'none';
}

async function submitAddPackage(e) {
  e.preventDefault();

  const title = document.getElementById('packageTitle').value.trim();
  const price = parseInt(document.getElementById('packagePrice').value);
  const description = document.getElementById('packageDescription').value.trim();
  const benefitsRaw = document.getElementById('packageBenefits').value.trim();

  if (!title || !price || !description || !benefitsRaw) {
    Swal.fire({
      icon: 'warning',
      title: 'Lengkapi Semua Field',
      text: 'Semua field bertanda * wajib diisi.',
      confirmButtonColor: '#ff6b00'
    });
    return;
  }

  if (price <= 0) {
    Swal.fire({
      icon: 'warning',
      title: 'Harga Tidak Valid',
      text: 'Harga harus lebih besar dari 0.',
      confirmButtonColor: '#ff6b00'
    });
    return;
  }

  // Pisahkan benefits per baris, lalu bersihkan
  const benefits = benefitsRaw
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  if (benefits.length === 0) {
    Swal.fire({
      icon: 'warning',
      title: 'Fasilitas Tidak Valid',
      text: 'Masukkan minimal satu fasilitas.',
      confirmButtonColor: '#ff6b00'
    });
    return;
  }

  try {
    const res = await fetch('https://orange-press-be.vercel.app/api/packages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title,
        price,
        description,
        benefits
      })
    });

    const result = await res.json();

    if (res.ok) {
      Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        text: 'Paket publikasi berhasil ditambahkan.',
        confirmButtonColor: '#ff6b00',
        timer: 2000,
        showConfirmButton: false
      }).then(() => {
        closeAddPackageModal();
        loadPackages(); // refresh daftar
      });
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Menyimpan',
        text: result.message || 'Terjadi kesalahan. Coba lagi.',
        confirmButtonColor: '#ff6b00'
      });
    }
  } catch (err) {
    console.error(err);
    Swal.fire({
      icon: 'error',
      title: 'Kesalahan Jaringan',
      text: 'Tidak dapat terhubung ke server.',
      confirmButtonColor: '#ff6b00'
    });
  }
}

// === EVENT LISTENERS ===
document.addEventListener('DOMContentLoaded', () => {
  loadPackages();

  // Tombol Tambah Paket
  const addBtn = document.getElementById('addPackageBtn');
  if (addBtn) {
    addBtn.addEventListener('click', openAddPackageModal);
  }

  // Modal controls
  document.getElementById('closeAddPackageModal')?.addEventListener('click', closeAddPackageModal);
  document.getElementById('cancelAddPackage')?.addEventListener('click', closeAddPackageModal);
  document.getElementById('addPackageForm')?.addEventListener('submit', submitAddPackage);

  // Tutup modal saat klik di luar
  document.getElementById('addPackageModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'addPackageModal') {
      closeAddPackageModal();
    }
  });
});

// Expose to global scope
window.openEditPackage = openEditPackage;
window.deletePackage = deletePackage;
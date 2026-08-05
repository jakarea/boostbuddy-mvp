/**
 * Lazy-loaded Swal (sweetalert2) wrapper
 * Defers loading ~60KB until first modal use
 */

let swalLoading = false;
let swalCache: typeof import('sweetalert2').default | null = null;

/**
 * Show a confirmation dialog using sweetalert2
 * Loads the library on first use
 */
export async function showConfirm(options: import('sweetalert2').SweetAlertOptions = {}) {
  // Prevent double-click race conditions
  if (swalLoading) {
    return { isConfirmed: false };
  }

  try {
    swalLoading = true;

    // Load sweetalert2 dynamically
    if (!swalCache) {
      const Swal = await import('sweetalert2');
      swalCache = Swal.default || Swal;

      // Set default theme to match your app
      if (swalCache.mixin) {
        swalCache.mixin({
          confirmButtonColor: '#168BB0',
          cancelButtonColor: '#64748b',
          confirmButtonText: 'Confirm',
          cancelButtonText: 'Cancel',
          customClass: {
            popup: 'swal2-popup',
            confirmButton: 'swal2-confirm-button',
            cancelButton: 'swal2-cancel-button'
          }
        });
      }
    }

    return await swalCache.fire({
      showClass: {
        popup: 'swal2-show',
        backdrop: 'swal2-backdrop-show',
        icon: 'swal2-icon-show'
      },
      hideClass: {
        popup: 'swal2-hide',
        backdrop: 'swal2-backdrop-hide',
        icon: 'swal2-hide'
      },
      ...options
    });
  } finally {
    swalLoading = false;
  }
}

/**
 * Show a success toast/message
 */
export async function showSuccess(title: string, text?: string) {
  const Swal = await loadSwal();
  return Swal.fire({
    icon: 'success',
    title,
    text,
    timer: 3000,
    showConfirmButton: false,
    toast: true,
    position: 'top-end'
  });
}

/**
 * Show an error message
 */
export async function showError(title: string, text?: string) {
  const Swal = await loadSwal();
  return Swal.fire({
    icon: 'error',
    title,
    text,
    timer: 3000,
    showConfirmButton: false,
    toast: true,
    position: 'top-end'
  });
}

/**
 * Show a warning message
 */
export async function showWarning(title: string, text?: string) {
  const Swal = await loadSwal();
  return Swal.fire({
    icon: 'warning',
    title,
    text,
    timer: 3000,
    showConfirmButton: false,
    toast: true,
    position: 'top-end'
  });
}

/**
 * Load sweetalert2 (internal helper)
 */
async function loadSwal() {
  if (swalCache) return swalCache;

  const Swal = await import('sweetalert2');
  swalCache = Swal.default || Swal;
  return swalCache;
}

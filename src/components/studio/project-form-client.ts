// All client-side behaviour for /studio/[slug]: the DOM is the source of
// truth for every repeatable section (tags, gallery, videos, downloads) —
// there's no parallel JS state model, this script just reads/writes the DOM
// and serializes it into the save payload on submit. Dev-only, never ships
// (see src/integrations/studio-dev.ts).
import { marked } from 'marked';
import DOMPurify from 'dompurify';

interface ImageInput {
  kind: 'existing' | 'upload';
  path?: string;
  dataUrl?: string;
  filename?: string;
}

const form = document.getElementById('project-form') as HTMLFormElement;
const isNew = form.dataset.isNew === 'true';
let previousSlug = form.dataset.previousSlug || null;

let dirty = false;
form.addEventListener('input', () => (dirty = true));
form.addEventListener('change', () => (dirty = true));
window.addEventListener('beforeunload', (e) => {
  if (dirty) e.preventDefault();
});

// ---------------------------------------------------------------------------
// Slug auto-generation
// ---------------------------------------------------------------------------
const titleInput = document.getElementById('field-title') as HTMLInputElement;
const slugInput = document.getElementById('field-slug') as HTMLInputElement;
const regenerateButton = document.getElementById('regenerate-slug') as HTMLButtonElement;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

let slugManuallyEdited = isNew ? false : true; // existing projects: don't clobber a saved slug

titleInput.addEventListener('input', () => {
  if (!slugManuallyEdited) slugInput.value = slugify(titleInput.value);
});
slugInput.addEventListener('input', () => {
  slugManuallyEdited = true;
});
regenerateButton.addEventListener('click', () => {
  slugInput.value = slugify(titleInput.value);
  slugManuallyEdited = false;
});

// Keep the footer path indicator live for new projects, where there's no
// real path yet.
const footerPath = document.getElementById('footer-path') as HTMLElement;
if (isNew) {
  slugInput.addEventListener('input', () => {
    footerPath.textContent = `src/content/projects/${slugInput.value || '<slug>'}/index.mdx`;
  });
}

// ---------------------------------------------------------------------------
// Summary character counter
// ---------------------------------------------------------------------------
const summaryInput = document.getElementById('field-summary') as HTMLTextAreaElement;
const summaryCount = document.getElementById('summary-count') as HTMLElement;
const summaryMax = Number(summaryInput.maxLength);
summaryInput.addEventListener('input', () => {
  summaryCount.textContent = `${summaryInput.value.length}/${summaryMax}`;
});

// ---------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------
const tagsContainer = document.getElementById('tags-container') as HTMLElement;
const tagInput = document.getElementById('tag-input') as HTMLInputElement;
const tagsMax = Number(tagsContainer.dataset.max ?? '6');

function tagCount(): number {
  return tagsContainer.querySelectorAll('.tag-chip').length;
}

function addTag(raw: string) {
  const value = raw.trim().toLowerCase();
  if (!value || tagCount() >= tagsMax) return;
  const existing = Array.from(tagsContainer.querySelectorAll('.tag-chip')).some(
    (chip) => (chip as HTMLElement).dataset.tag === value,
  );
  if (existing) return;

  const chip = document.createElement('span');
  chip.className =
    'tag-chip inline-flex items-center gap-1 bg-surface-raised px-2 py-0.5 font-mono text-mono-xs uppercase text-ink';
  chip.dataset.tag = value;
  const label = document.createTextNode(value + ' ');
  const removeButton = document.createElement('button');
  removeButton.type = 'button';
  removeButton.className = 'remove-tag';
  removeButton.setAttribute('aria-label', `Remove ${value}`);
  removeButton.textContent = '×';
  chip.appendChild(label);
  chip.appendChild(removeButton);
  tagsContainer.insertBefore(chip, tagInput);
  dirty = true;
}

tagInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault();
    addTag(tagInput.value);
    tagInput.value = '';
  }
});
tagInput.addEventListener('blur', () => {
  if (tagInput.value.trim()) {
    addTag(tagInput.value);
    tagInput.value = '';
  }
});
tagsContainer.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  if (target.classList.contains('remove-tag')) {
    target.closest('.tag-chip')?.remove();
    dirty = true;
  }
});

// ---------------------------------------------------------------------------
// Image slot helpers — shared by cover, gallery cells, and video posters.
// Each "slot" is an element carrying `data-existing-path`; a pending upload
// is stashed directly on the element (not serialized into the DOM) until
// submit time.
// ---------------------------------------------------------------------------
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

interface PendingUpload {
  dataUrl: string;
  filename: string;
}

const pendingUploads = new WeakMap<HTMLElement, PendingUpload>();

async function handleImageFile(file: File, slotEl: HTMLElement, imgEl: HTMLImageElement | null) {
  const dataUrl = await fileToDataUrl(file);
  pendingUploads.set(slotEl, { dataUrl, filename: file.name });
  if (imgEl) {
    imgEl.src = dataUrl;
  }
  dirty = true;
}

function readImageSlot(slotEl: HTMLElement | null): ImageInput | null {
  if (!slotEl) return null;
  const pending = pendingUploads.get(slotEl);
  if (pending) return { kind: 'upload', dataUrl: pending.dataUrl, filename: pending.filename };
  const existing = slotEl.dataset.existingPath;
  if (existing) return { kind: 'existing', path: existing };
  return null;
}

// Cover
const coverSlot = document.getElementById('cover-slot') as HTMLElement;
const coverInput = document.getElementById('cover-input') as HTMLInputElement;
coverInput.addEventListener('change', () => {
  const file = coverInput.files?.[0];
  if (!file) return;
  let img = coverSlot.querySelector('img') as HTMLImageElement | null;
  if (!img) {
    coverSlot.querySelector('#cover-preview-empty')?.remove();
    img = document.createElement('img');
    img.className = 'h-full w-full object-cover';
    img.alt = 'Cover preview';
    coverSlot.appendChild(img);
  }
  handleImageFile(file, coverSlot, img);
});

// Gallery
const galleryGrid = document.getElementById('gallery-grid') as HTMLElement;
const galleryAddSlot = document.getElementById('gallery-add') as HTMLElement;
const galleryInput = document.getElementById('gallery-input') as HTMLInputElement;

function createGalleryCell(): HTMLElement {
  const cell = document.createElement('div');
  cell.className = 'gallery-cell image-slot relative aspect-square border border-hairline';
  cell.draggable = true;

  const img = document.createElement('img');
  img.className = 'h-full w-full object-cover';
  img.alt = '';

  const controls = document.createElement('div');
  controls.className = 'absolute top-1 right-1 flex gap-1';

  const moveEarlierButton = document.createElement('button');
  moveEarlierButton.type = 'button';
  moveEarlierButton.className = 'focus-ring move-gallery-item-earlier bg-bg-void/80 p-1 text-mono-xs';
  moveEarlierButton.setAttribute('aria-label', 'Move image earlier');
  moveEarlierButton.textContent = '←';

  const moveLaterButton = document.createElement('button');
  moveLaterButton.type = 'button';
  moveLaterButton.className = 'focus-ring move-gallery-item-later bg-bg-void/80 p-1 text-mono-xs';
  moveLaterButton.setAttribute('aria-label', 'Move image later');
  moveLaterButton.textContent = '→';

  const dragHandle = document.createElement('button');
  dragHandle.type = 'button';
  dragHandle.className = 'focus-ring drag-handle cursor-grab bg-bg-void/80 p-1 text-mono-xs';
  dragHandle.setAttribute('aria-label', 'Drag to reorder');
  dragHandle.textContent = '⠿';

  const removeButton = document.createElement('button');
  removeButton.type = 'button';
  removeButton.className = 'focus-ring remove-gallery-item bg-bg-void/80 p-1 text-mono-xs text-red-400';
  removeButton.setAttribute('aria-label', 'Remove image');
  removeButton.textContent = '×';

  controls.appendChild(moveEarlierButton);
  controls.appendChild(moveLaterButton);
  controls.appendChild(dragHandle);
  controls.appendChild(removeButton);

  const altInput = document.createElement('input');
  altInput.type = 'text';
  altInput.className =
    'gallery-alt w-full border-t border-hairline bg-bg-void/80 p-1 font-mono text-[10px] text-ink';
  altInput.placeholder = 'Alt text (required)';

  cell.appendChild(img);
  cell.appendChild(controls);
  cell.appendChild(altInput);
  return cell;
}

async function addGalleryFiles(files: FileList) {
  for (const file of Array.from(files)) {
    if (galleryGrid.querySelectorAll('.gallery-cell').length >= 6) break;
    const cell = createGalleryCell();
    galleryGrid.insertBefore(cell, galleryAddSlot);
    const img = cell.querySelector('img') as HTMLImageElement;
    await handleImageFile(file, cell, img);
  }
}

galleryInput.addEventListener('change', () => {
  if (galleryInput.files) addGalleryFiles(galleryInput.files);
});

galleryGrid.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  if (target.classList.contains('remove-gallery-item')) {
    target.closest('.gallery-cell')?.remove();
    dirty = true;
    return;
  }
  // Keyboard-operable equivalent to the drag handle below — dragstart/
  // dragover never fire from a keyboard, so without these, reordering the
  // gallery is mouse-only.
  if (target.classList.contains('move-gallery-item-earlier')) {
    const cell = target.closest('.gallery-cell');
    const previous = cell?.previousElementSibling;
    if (cell && previous && previous.classList.contains('gallery-cell')) {
      galleryGrid.insertBefore(cell, previous);
      target.focus();
      dirty = true;
    }
    return;
  }
  if (target.classList.contains('move-gallery-item-later')) {
    const cell = target.closest('.gallery-cell');
    const next = cell?.nextElementSibling;
    if (cell && next && next.classList.contains('gallery-cell')) {
      galleryGrid.insertBefore(next, cell);
      target.focus();
      dirty = true;
    }
    return;
  }
});

let draggedCell: HTMLElement | null = null;
galleryGrid.addEventListener('dragstart', (e) => {
  const cell = (e.target as HTMLElement).closest('.gallery-cell') as HTMLElement | null;
  if (!cell) return;
  draggedCell = cell;
  cell.classList.add('opacity-40');
});
galleryGrid.addEventListener('dragend', () => {
  draggedCell?.classList.remove('opacity-40');
  draggedCell = null;
});
galleryGrid.addEventListener('dragover', (e) => {
  e.preventDefault();
  const target = (e.target as HTMLElement).closest('.gallery-cell') as HTMLElement | null;
  if (!target || target === draggedCell || !draggedCell) return;
  galleryGrid.insertBefore(draggedCell, target);
  dirty = true;
});

// Preview loop
const previewPosterSlot = document.getElementById('preview-poster-slot') as HTMLElement;
const previewPosterInput = document.getElementById('preview-poster-input') as HTMLInputElement;
previewPosterInput.addEventListener('change', () => {
  const file = previewPosterInput.files?.[0];
  if (!file) return;
  let img = previewPosterSlot.querySelector('img') as HTMLImageElement | null;
  if (!img) {
    previewPosterSlot.replaceChildren();
    img = document.createElement('img');
    img.className = 'h-full w-full object-cover';
    img.alt = 'Preview loop poster';
    previewPosterSlot.appendChild(img);
  }
  handleImageFile(file, previewPosterSlot, img);
});

const previewVideoInput = document.getElementById('preview-video-input') as HTMLInputElement;
const previewVideoExisting = document.getElementById('preview-video-existing') as HTMLInputElement;
let previewVideoPending: PendingUpload | null = null;
previewVideoInput.addEventListener('change', async () => {
  const file = previewVideoInput.files?.[0];
  if (!file) return;
  previewVideoPending = { dataUrl: await fileToDataUrl(file), filename: file.name };
  dirty = true;
});

// ---------------------------------------------------------------------------
// Video rows
// ---------------------------------------------------------------------------
const videosList = document.getElementById('videos-list') as HTMLElement;
const videoRowTemplate = document.getElementById('video-row-template') as HTMLTemplateElement;
const addVideoButton = document.getElementById('add-video') as HTMLButtonElement;

const videoPosterUploads = new WeakMap<HTMLElement, PendingUpload>();
const videoSrcUploads = new WeakMap<HTMLElement, PendingUpload>();

function updateVideoRowVisibility(row: HTMLElement) {
  const provider = (row.querySelector('.video-provider') as HTMLSelectElement).value;
  const idInput = row.querySelector('.video-id') as HTMLElement;
  const localFields = row.querySelector('.video-local-fields') as HTMLElement;
  const isLocal = provider === 'local';
  idInput.classList.toggle('hidden', isLocal);
  localFields.classList.toggle('hidden', !isLocal);
}

function wireVideoRow(row: HTMLElement) {
  updateVideoRowVisibility(row);
  row.querySelector('.video-provider')?.addEventListener('change', () => updateVideoRowVisibility(row));
  row.querySelector('.remove-video')?.addEventListener('click', () => {
    row.remove();
    dirty = true;
  });
  const posterInput = row.querySelector('.video-poster-input') as HTMLInputElement;
  posterInput?.addEventListener('change', async () => {
    const file = posterInput.files?.[0];
    if (!file) return;
    videoPosterUploads.set(row, { dataUrl: await fileToDataUrl(file), filename: file.name });
    dirty = true;
  });
  const srcInput = row.querySelector('.video-src-input') as HTMLInputElement;
  srcInput?.addEventListener('change', async () => {
    const file = srcInput.files?.[0];
    if (!file) return;
    videoSrcUploads.set(row, { dataUrl: await fileToDataUrl(file), filename: file.name });
    dirty = true;
  });
}

videosList.querySelectorAll('.video-row').forEach((row) => wireVideoRow(row as HTMLElement));

addVideoButton.addEventListener('click', () => {
  const fragment = videoRowTemplate.content.cloneNode(true) as DocumentFragment;
  const row = fragment.querySelector('.video-row') as HTMLElement;
  videosList.appendChild(row);
  wireVideoRow(row);
  dirty = true;
});

// ---------------------------------------------------------------------------
// Downloads
// ---------------------------------------------------------------------------
const downloadsList = document.getElementById('downloads-list') as HTMLElement;
const downloadRowTemplate = document.getElementById('download-row-template') as HTMLTemplateElement;
const addDownloadButton = document.getElementById('add-download') as HTMLButtonElement;

function wireDownloadRow(row: HTMLElement) {
  row.querySelector('.remove-download')?.addEventListener('click', () => {
    row.remove();
    dirty = true;
  });
}
downloadsList.querySelectorAll('.download-row').forEach((row) => wireDownloadRow(row as HTMLElement));

addDownloadButton.addEventListener('click', () => {
  const fragment = downloadRowTemplate.content.cloneNode(true) as DocumentFragment;
  const row = fragment.querySelector('.download-row') as HTMLElement;
  downloadsList.appendChild(row);
  wireDownloadRow(row);
  dirty = true;
});

// ---------------------------------------------------------------------------
// Body markdown preview — sanitized even though this is single-author,
// local-only content (no cross-user trust boundary): DOMPurify is free
// insurance against a stray pasted <script> landing in rendered HTML.
// ---------------------------------------------------------------------------
const bodyTextarea = document.getElementById('field-body') as HTMLTextAreaElement;
const bodyPreviewToggle = document.getElementById('body-preview-toggle') as HTMLInputElement;
const bodyPreviewPane = document.getElementById('body-preview-pane') as HTMLElement;

bodyPreviewToggle.addEventListener('change', () => {
  if (bodyPreviewToggle.checked) {
    const html = marked.parse(bodyTextarea.value) as string;
    bodyPreviewPane.innerHTML = DOMPurify.sanitize(html);
    bodyTextarea.classList.add('hidden');
    bodyPreviewPane.classList.remove('hidden');
  } else {
    bodyTextarea.classList.remove('hidden');
    bodyPreviewPane.classList.add('hidden');
  }
});

// ---------------------------------------------------------------------------
// Discard
// ---------------------------------------------------------------------------
const discardButton = document.getElementById('discard-button') as HTMLButtonElement;
discardButton.addEventListener('click', () => {
  if (dirty && !confirm('Discard unsaved changes?')) return;
  dirty = false;
  if (isNew) {
    window.location.href = '/studio';
  } else {
    window.location.reload();
  }
});

// ---------------------------------------------------------------------------
// Submit / save
// ---------------------------------------------------------------------------
const errorBanner = document.getElementById('form-error-banner') as HTMLElement;
const saveButton = document.getElementById('save-button') as HTMLButtonElement;

function clearErrors() {
  errorBanner.classList.add('hidden');
  errorBanner.textContent = '';
  document.querySelectorAll('.field-error').forEach((el) => (el.textContent = ''));
}

function showErrors(errors: Record<string, string[]>) {
  const unmatched: string[] = [];
  for (const [field, messages] of Object.entries(errors)) {
    const target = document.querySelector(`[data-error-for="${field}"]`);
    if (target) {
      target.textContent = messages.join(' ');
    } else {
      unmatched.push(...messages);
    }
  }
  if (unmatched.length > 0) {
    errorBanner.textContent = unmatched.join(' ');
    errorBanner.classList.remove('hidden');
  }
}

function textValue(id: string): string {
  return (document.getElementById(id) as HTMLInputElement)?.value.trim() ?? '';
}

function buildPayload() {
  const gallery = Array.from(galleryGrid.querySelectorAll('.gallery-cell')).map((cell) => {
    const image = readImageSlot(cell as HTMLElement)!;
    const alt = (cell.querySelector('.gallery-alt') as HTMLInputElement).value.trim();
    return { alt, image };
  });

  const previewPoster = readImageSlot(previewPosterSlot);
  const previewSrc = previewVideoPending
    ? { kind: 'upload' as const, dataUrl: previewVideoPending.dataUrl, filename: previewVideoPending.filename }
    : previewVideoExisting.value
      ? { kind: 'existing' as const, path: previewVideoExisting.value }
      : null;
  const preview = previewPoster || previewSrc ? { src: previewSrc, poster: previewPoster } : null;

  const videos = Array.from(videosList.querySelectorAll('.video-row')).map((row) => {
    const provider = (row.querySelector('.video-provider') as HTMLSelectElement).value;
    const title = (row.querySelector('.video-title') as HTMLInputElement).value.trim();
    if (provider === 'local') {
      const existingSrc = (row as HTMLElement).dataset.existingSrc || '';
      const existingPoster = (row as HTMLElement).dataset.existingPoster || '';
      const srcUpload = videoSrcUploads.get(row as HTMLElement);
      const posterPending = videoPosterUploads.get(row as HTMLElement);
      return {
        provider: 'local' as const,
        title,
        duration: (row.querySelector('.video-duration') as HTMLInputElement).value.trim(),
        caption: (row.querySelector('.video-caption') as HTMLInputElement).value.trim(),
        src: srcUpload
          ? { kind: 'upload' as const, dataUrl: srcUpload.dataUrl, filename: srcUpload.filename }
          : existingSrc
            ? { kind: 'existing' as const, path: existingSrc }
            : null,
        poster: posterPending
          ? { kind: 'upload' as const, dataUrl: posterPending.dataUrl, filename: posterPending.filename }
          : existingPoster
            ? { kind: 'existing' as const, path: existingPoster }
            : null,
      };
    }
    return {
      provider: provider as 'youtube' | 'vimeo',
      id: (row.querySelector('.video-id') as HTMLInputElement).value.trim(),
      title,
    };
  });

  const downloads = Array.from(downloadsList.querySelectorAll('.download-row')).map((row) => ({
    label: (row.querySelector('.download-label') as HTMLInputElement).value.trim(),
    url: (row.querySelector('.download-url') as HTMLInputElement).value.trim(),
    size: (row.querySelector('.download-size') as HTMLInputElement).value.trim(),
  }));

  const tags = Array.from(tagsContainer.querySelectorAll('.tag-chip')).map(
    (chip) => (chip as HTMLElement).dataset.tag as string,
  );

  return {
    previousSlug,
    data: {
      title: titleInput.value.trim(),
      slug: slugInput.value.trim(),
      tagline: textValue('field-tagline'),
      summary: summaryInput.value.trim(),
      date: (document.getElementById('field-date') as HTMLInputElement).value,
      status: (document.getElementById('field-status') as HTMLSelectElement).value,
      category: (document.getElementById('field-category') as HTMLSelectElement).value,
      featured: (document.getElementById('field-featured') as HTMLInputElement).checked,
      cardSize: (form.querySelector('input[name="cardSize"]:checked') as HTMLInputElement)?.value ?? 'md',
      tags,
      accent: '', // no dedicated UI field yet; the server preserves an existing value when this is empty
      cover: readImageSlot(coverSlot),
      gallery,
      preview,
      videos,
      links: { github: textValue('field-github'), demo: textValue('field-demo'), docs: textValue('field-docs') },
      downloads,
    },
    body: bodyTextarea.value,
  };
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearErrors();
  saveButton.disabled = true;
  saveButton.textContent = 'SAVING…';

  try {
    const payload = buildPayload();
    const res = await fetch('/api/studio/save', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await res.json();

    if (result.ok) {
      dirty = false;
      footerPath.textContent = result.path;
      const newSlug = payload.data.slug;
      if (isNew) {
        window.location.href = `/studio/${newSlug}`;
        return;
      }
      previousSlug = newSlug;
      form.dataset.previousSlug = newSlug;
      saveButton.textContent = 'SAVED';
      setTimeout(() => (saveButton.textContent = 'SAVE TO DISK'), 1500);
    } else {
      showErrors(result.errors ?? { _form: [result.error ?? 'Save failed.'] });
    }
  } catch (error) {
    showErrors({ _form: [(error as Error).message] });
  } finally {
    saveButton.disabled = false;
    if (saveButton.textContent === 'SAVING…') saveButton.textContent = 'SAVE TO DISK';
  }
});

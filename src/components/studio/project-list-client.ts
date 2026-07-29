// Manual orphan-file cleanup on the /studio project list. Deletion only
// ever happens from here, only for files explicitly checked by the user,
// and only after a confirm() — see computeOrphans/deleteOrphans in
// src/integrations/studio-save.ts for why this never runs automatically.
document.querySelectorAll('.delete-orphans-button').forEach((button) => {
  button.addEventListener('click', async () => {
    const details = button.closest('.orphan-details') as HTMLElement | null;
    if (!details) return;
    const slug = details.dataset.slug!;

    const checked = Array.from(details.querySelectorAll<HTMLInputElement>('.orphan-checkbox:checked'));
    if (checked.length === 0) {
      alert('Select at least one file first.');
      return;
    }

    const content = checked.filter((c) => c.dataset.kind === 'content').map((c) => c.value);
    const video = checked.filter((c) => c.dataset.kind === 'video').map((c) => c.value);

    const confirmed = confirm(
      `Permanently delete ${checked.length} file(s) for "${slug}"? This cannot be undone.`,
    );
    if (!confirmed) return;

    const res = await fetch('/api/studio/delete-orphans', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ slug, content, video }),
    });
    const result = await res.json();

    if (result.ok) {
      window.location.reload();
    } else {
      alert(`Delete failed: ${result.error ?? 'unknown error'}`);
    }
  });
});

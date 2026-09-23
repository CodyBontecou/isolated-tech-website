-- Update the public app name while preserving the existing slug and related records.

UPDATE apps
SET name = 'vox.md',
    updated_at = datetime('now')
WHERE slug = 'voxboard';

-- Rename the existing app in place. Its ID and every app_id relationship remain intact.
-- R2 object keys remain unchanged; the public asset routes support the legacy prefix.
UPDATE apps
SET slug = 'whereday',
    name = 'Whereday',
    icon_url = CASE WHEN icon_url = '/apps/isome/icon' THEN '/apps/whereday/icon' ELSE icon_url END,
    description = replace(replace(description, 'iso.me Maps plugin', 'Maps plugin'),
                          'https://github.com/CodyBontecou/isome', 'https://github.com/CodyBontecou/whereday'),
    custom_page_config = json_set(custom_page_config, '$.ios_app_store_url',
                                 'https://apps.apple.com/app/id6761960794'),
    updated_at = datetime('now')
WHERE id = '5MK3SXQjnnLZU25PRmnxE' AND slug IN ('isome', 'iso-me', 'whereday');

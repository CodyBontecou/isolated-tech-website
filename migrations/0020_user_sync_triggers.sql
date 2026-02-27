-- Sync users from Better Auth 'user' table to legacy 'users' table
-- Required because 'purchases' table has a foreign key to 'users'
-- but Better Auth writes to 'user' table

-- Trigger: sync on INSERT
CREATE TRIGGER IF NOT EXISTS sync_user_to_users
AFTER INSERT ON user
BEGIN
  INSERT OR REPLACE INTO users (id, email, name, avatar_url, is_admin, newsletter_subscribed, created_at, updated_at)
  VALUES (NEW.id, NEW.email, NEW.name, NEW.image, NEW.isAdmin, NEW.newsletterSubscribed, NEW.createdAt, NEW.updatedAt);
END;

-- Trigger: sync on UPDATE
CREATE TRIGGER IF NOT EXISTS sync_user_to_users_update
AFTER UPDATE ON user
BEGIN
  UPDATE users SET 
    email = NEW.email,
    name = NEW.name,
    avatar_url = NEW.image,
    is_admin = NEW.isAdmin,
    newsletter_subscribed = NEW.newsletterSubscribed,
    updated_at = NEW.updatedAt
  WHERE id = NEW.id;
END;

-- Backfill: sync any existing users that aren't in the legacy table
INSERT OR IGNORE INTO users (id, email, name, avatar_url, is_admin, newsletter_subscribed, created_at, updated_at)
SELECT id, email, name, image, isAdmin, newsletterSubscribed, createdAt, updatedAt
FROM user;

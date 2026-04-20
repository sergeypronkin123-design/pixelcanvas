"""
Generate SQL to change admin password.

Run locally with bcrypt installed:
  pip install bcrypt
  python scripts/rotate_admin_password.py

It will:
1. Generate a strong random password
2. Produce a bcrypt hash
3. Print SQL to run in Neon
4. Print env vars to set in Render

Store the generated password in a password manager.
"""
import secrets
import string
import sys

try:
    import bcrypt
except ImportError:
    print("ERROR: bcrypt not installed. Run: pip install bcrypt")
    sys.exit(1)


def generate_password(length: int = 24) -> str:
    # Alphabet excludes characters that cause copy-paste issues
    alphabet = string.ascii_letters + string.digits + "!@#$%&*-_+="
    return ''.join(secrets.choice(alphabet) for _ in range(length))


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode('utf-8')[:72], bcrypt.gensalt()).decode('utf-8')


def generate_secret_key() -> str:
    return secrets.token_urlsafe(64)


def main():
    new_password = generate_password(24)
    pw_hash = hash_password(new_password)
    new_secret = generate_secret_key()

    print("=" * 70)
    print("CREDENTIALS GENERATED — save these in a password manager NOW")
    print("=" * 70)
    print()
    print(f"ADMIN_PASSWORD = {new_password}")
    print()
    print(f"SECRET_KEY = {new_secret}")
    print()
    print("=" * 70)
    print("STEP 1 — Run this SQL in Neon (SQL Editor):")
    print("=" * 70)
    print()
    print("-- If you know current admin email, replace pixelstake.ru if needed")
    print(f"UPDATE users")
    print(f"SET password_hash = '{pw_hash}'")
    print(f"WHERE is_admin = true;")
    print()
    print("-- Verify:")
    print("SELECT id, email, username, is_admin FROM users WHERE is_admin = true;")
    print()
    print("=" * 70)
    print("STEP 2 — Update Render environment variables:")
    print("=" * 70)
    print()
    print("Render Dashboard → pixelcanvas-api → Environment")
    print()
    print(f"  SECRET_KEY       = {new_secret}")
    print(f"  ADMIN_PASSWORD   = {new_password}")
    print(f"  ENVIRONMENT      = production")
    print()
    print("After saving — Render will automatically redeploy.")
    print()
    print("=" * 70)
    print("STEP 3 — Verify login still works on pixelstake.ru with new password")
    print("=" * 70)


if __name__ == "__main__":
    main()

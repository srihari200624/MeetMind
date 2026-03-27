import hashlib
import sqlite3
from database import get_connection


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def create_user(employee_id: str, password: str, name: str, email: str, role: str = "employee"):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO users (employee_id, password, name, email, role)
            VALUES (?, ?, ?, ?, ?)
        """, (employee_id, hash_password(password), name, email, role))
        conn.commit()
        print(f"User '{name}' ({role}) created successfully.")
        return True
    except sqlite3.IntegrityError:
        print(f"Employee ID '{employee_id}' already exists.")
        return False
    finally:
        conn.close()


def login(employee_id: str, password: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM users WHERE employee_id = ? AND password = ?
    """, (employee_id, hash_password(password)))
    user = cursor.fetchone()
    conn.close()
    if user:
        return {
            "id": user["id"],
            "employee_id": user["employee_id"],
            "name": user["name"],
            "email": user["email"],
            "role": user["role"]
        }
    return None


def get_user_by_id(user_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    conn.close()
    if user:
        return {
            "id": user["id"],
            "employee_id": user["employee_id"],
            "name": user["name"],
            "email": user["email"],
            "role": user["role"]
        }
    return None


def get_user_by_name(name: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE LOWER(name) = LOWER(?)", (name,))
    user = cursor.fetchone()
    conn.close()
    if user:
        return {
            "id": user["id"],
            "employee_id": user["employee_id"],
            "name": user["name"],
            "email": user["email"],
            "role": user["role"]
        }
    return None


def get_all_employees():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, employee_id, name, email, role FROM users WHERE role = 'employee'")
    users = cursor.fetchall()
    conn.close()
    return [dict(u) for u in users]


def get_all_managers():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, employee_id, name, email, role FROM users WHERE role = 'manager'")
    users = cursor.fetchall()
    conn.close()
    return [dict(u) for u in users]


# ── Seed initial users (run once) ──────────────────────────────────────────
if __name__ == "__main__":
    # Create a default manager
    create_user(
        employee_id="MGR001",
        password="manager123",
        name="Hari",
        email="meetmind.test@gmail.com",
        role="manager"
    )
    # Create sample employees
    create_user(
        employee_id="EMP001",
        password="emp001pass",
        name="Reno Red",
        email="meetmind.test@gmail.com",
        role="employee"
    )
    create_user(
        employee_id="EMP002",
        password="emp002pass",
        name="Mukil Dharan",
        email="meetmind.test@gmail.com",
        role="employee"
    )
    create_user(
        employee_id="EMP003",
        password="emp003pass",
        name="Bala Ashwath",
        email="meetmind.test@gmail.com",
        role="employee"
    )
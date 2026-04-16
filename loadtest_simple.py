"""
ПРОСТОЙ нагрузочный тест (без WebSocket)
=========================================

Быстрый тест HTTP API — регистрация, загрузка холста, размещение пикселей.

Запуск:
    pip install locust
    locust -f loadtest_simple.py --host=https://pixelcanvas-api.onrender.com

Потом в браузере: http://localhost:8089
"""
import json
import random
import string
import time
from locust import HttpUser, task, between

COLORS = ["#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ff00ff",
          "#00ffff", "#ffffff", "#000000", "#ff8800", "#8800ff"]


def rand_str(n=10):
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=n))


class PixelStakeUser(HttpUser):
    wait_time = between(2, 5)
    token = None
    last_pixel_time = 0

    def on_start(self):
        email = f"loadtest_{rand_str()}@test.com"
        username = f"u{rand_str(8)}"
        
        r = self.client.post("/api/auth/register",
            json={"email": email, "username": username, "password": "Test12345!", "ref": None},
            name="/api/auth/register"
        )
        if r.status_code == 200:
            self.token = r.json().get("access_token")
            self.client.headers.update({"Authorization": f"Bearer {self.token}"})

    @task(10)
    def place_pixel(self):
        now = time.time()
        if now - self.last_pixel_time < 30:
            return
        r = self.client.post("/api/pixels/place",
            json={"x": random.randint(0, 999), "y": random.randint(0, 999), "color": random.choice(COLORS)},
            name="/api/pixels/place"
        )
        if r.status_code == 200:
            self.last_pixel_time = now

    @task(5)
    def canvas(self):
        self.client.get("/api/pixels/canvas/binary", name="/api/pixels/canvas/binary")

    @task(3)
    def status(self):
        self.client.get("/api/pixels/status", name="/api/pixels/status")

    @task(1)
    def leaderboard(self):
        self.client.get("/api/leaderboard/all-time", name="/api/leaderboard")

    @task(1)
    def clans(self):
        self.client.get("/api/clans/list", name="/api/clans/list")

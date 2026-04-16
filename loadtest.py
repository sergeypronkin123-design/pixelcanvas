"""
Нагрузочный тест для PixelStake
================================

Симулирует реальных пользователей:
- Регистрация/вход
- Загрузка холста (бинарный endpoint)
- WebSocket соединение
- Размещение пикселей с кулдауном
- Просмотр leaderboard

Запуск:
    pip install locust websockets
    locust -f loadtest.py --host=https://pixelcanvas-api.onrender.com

Потом откройте http://localhost:8089 и настройте:
- Number of users: 100 (начните с малого)
- Ramp up: 10 users/sec
- Run time: 3 minutes

Постепенно увеличивайте users: 100 → 500 → 1000 → ...
Смотрите на графики — response time и failures.
"""
import json
import random
import string
import time
import asyncio
import threading
from locust import HttpUser, task, between, events
import websockets

# Настройки
WS_URL = "wss://pixelcanvas-api.onrender.com/ws"
CANVAS_SIZE = 1000

# Палитра цветов
COLORS = [
    "#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ff00ff",
    "#00ffff", "#ffffff", "#000000", "#ff8800", "#8800ff",
]


def random_email():
    prefix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=10))
    return f"loadtest_{prefix}@test.com"


def random_username():
    return ''.join(random.choices(string.ascii_lowercase, k=8)) + str(random.randint(100, 999))


class WebSocketClient:
    """Простой WebSocket клиент в отдельном потоке"""
    def __init__(self, url):
        self.url = url
        self.thread = None
        self.running = False
        self.messages_received = 0

    def start(self):
        self.running = True
        self.thread = threading.Thread(target=self._run, daemon=True)
        self.thread.start()

    def _run(self):
        try:
            asyncio.new_event_loop().run_until_complete(self._listen())
        except Exception:
            pass

    async def _listen(self):
        try:
            async with websockets.connect(self.url, close_timeout=5) as ws:
                while self.running:
                    try:
                        msg = await asyncio.wait_for(ws.recv(), timeout=60)
                        self.messages_received += 1
                    except asyncio.TimeoutError:
                        try:
                            await ws.send("ping")
                        except Exception:
                            break
                    except Exception:
                        break
        except Exception:
            pass

    def stop(self):
        self.running = False


class PixelStakeUser(HttpUser):
    wait_time = between(1, 3)
    token = None
    ws_client = None
    last_pixel_time = 0
    cooldown_seconds = 30

    def on_start(self):
        """Регистрация + WebSocket при старте"""
        email = random_email()
        username = random_username()
        password = "LoadTest123!"

        # Регистрация
        with self.client.post(
            "/api/auth/register",
            json={"email": email, "username": username, "password": password, "ref": None},
            catch_response=True,
            name="/api/auth/register"
        ) as response:
            if response.status_code == 200:
                data = response.json()
                self.token = data.get("access_token")
                self.client.headers.update({"Authorization": f"Bearer {self.token}"})
                response.success()
            else:
                response.failure(f"Register failed: {response.status_code}")
                return

        # Подключить WebSocket
        try:
            self.ws_client = WebSocketClient(WS_URL)
            self.ws_client.start()
        except Exception:
            pass

        # Загрузить холст
        self.client.get("/api/pixels/canvas/binary", name="/api/pixels/canvas/binary")
        self.client.get("/api/pixels/status", name="/api/pixels/status")

    def on_stop(self):
        if self.ws_client:
            self.ws_client.stop()

    @task(10)
    def place_pixel(self):
        """Размещение пикселя (главная нагрузка)"""
        now = time.time()
        if now - self.last_pixel_time < self.cooldown_seconds:
            return

        x = random.randint(0, CANVAS_SIZE - 1)
        y = random.randint(0, CANVAS_SIZE - 1)
        color = random.choice(COLORS)

        with self.client.post(
            "/api/pixels/place",
            json={"x": x, "y": y, "color": color},
            catch_response=True,
            name="/api/pixels/place"
        ) as response:
            if response.status_code == 200:
                self.last_pixel_time = now
                response.success()
            elif response.status_code == 400:
                # Cooldown — это нормально
                response.success()
            else:
                response.failure(f"Place failed: {response.status_code}")

    @task(5)
    def get_canvas_binary(self):
        """Загрузка холста (binary)"""
        self.client.get("/api/pixels/canvas/binary", name="/api/pixels/canvas/binary")

    @task(3)
    def get_status(self):
        """Статус батла (обновляет онлайн-счётчик)"""
        self.client.get("/api/pixels/status", name="/api/pixels/status")

    @task(1)
    def get_leaderboard(self):
        """Лидерборд"""
        self.client.get("/api/leaderboard/all-time", name="/api/leaderboard/all-time")

    @task(1)
    def get_clans(self):
        """Список кланов"""
        self.client.get("/api/clans/list", name="/api/clans/list")


# Статистика в реальном времени
@events.request.add_listener
def on_request(request_type, name, response_time, response_length, exception, **kwargs):
    if response_time > 3000:  # запросы больше 3 сек
        print(f"⚠️  Slow: {name} took {response_time}ms")


@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    print("\n" + "=" * 60)
    print("🎯 PixelStake Load Test")
    print("=" * 60)
    print(f"Host: {environment.host}")
    print("Постепенно увеличивайте users и смотрите на графики")
    print("=" * 60 + "\n")


@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    print("\n" + "=" * 60)
    print("📊 Итоги теста:")
    print("=" * 60)
    stats = environment.stats.total
    print(f"Запросов: {stats.num_requests}")
    print(f"Ошибок: {stats.num_failures} ({stats.fail_ratio * 100:.1f}%)")
    print(f"Средний response time: {stats.avg_response_time:.0f}ms")
    print(f"P95 response time: {stats.get_response_time_percentile(0.95):.0f}ms")
    print(f"P99 response time: {stats.get_response_time_percentile(0.99):.0f}ms")
    print(f"RPS: {stats.current_rps:.1f}")
    print("=" * 60)

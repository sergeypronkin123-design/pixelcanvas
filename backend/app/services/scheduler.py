"""
Фоновый планировщик — периодически проверяет:
- Не нужно ли завершить батл и выдать награды
- Не нужно ли активировать отложенные Pro-подписки
"""
import asyncio
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

CHECK_INTERVAL_SECONDS = 3600  # раз в час


async def scheduler_loop():
    """Основной цикл планировщика"""
    logger.info("Scheduler started")
    while True:
        try:
            await run_checks()
        except Exception as e:
            logger.error(f"Scheduler error: {e}")
        await asyncio.sleep(CHECK_INTERVAL_SECONDS)


async def run_checks():
    """Однократная проверка всех задач"""
    from app.core.database import SessionLocal
    from app.services import battle_awards

    db = SessionLocal()
    try:
        # 1. Завершить батл если время пришло
        battle_to_finalize = battle_awards.should_finalize_current_battle(db)
        if battle_to_finalize:
            logger.info(f"Finalizing battle {battle_to_finalize.year}/{battle_to_finalize.month}")
            result = battle_awards.finalize_battle(db, battle_to_finalize)
            logger.info(f"Battle finalized: {result}")

        # 2. Активировать отложенные Pro
        activated = battle_awards.check_and_process_pending_redemptions(db)
        if activated > 0:
            logger.info(f"Activated {activated} pending Pro redemptions")

    finally:
        db.close()

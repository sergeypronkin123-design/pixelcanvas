"""
Интеграция с Robokassa для приёма платежей.

Документация: https://docs.robokassa.ru/
Формат подписи: MD5(MerchantLogin:OutSum:InvId:Receipt:Password1)
"""
import hashlib
import json
import logging
from typing import Optional, Dict, Any
from urllib.parse import urlencode

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

ROBOKASSA_PAYMENT_URL = "https://auth.robokassa.ru/Merchant/Index.aspx"


def _md5(value: str) -> str:
    return hashlib.md5(value.encode("utf-8")).hexdigest()


def build_receipt(amount_rub: float, item_name: str, quantity: int = 1) -> dict:
    """
    Формирует чек для самозанятого (Робочеки СМЗ).
    Налог: без_НДС (самозанятый не платит НДС).
    """
    return {
        "sno": "npd",  # Налог на профессиональный доход (самозанятость)
        "items": [
            {
                "name": item_name,
                "quantity": quantity,
                "sum": round(amount_rub * quantity, 2),
                "tax": "none",
                "payment_method": "full_payment",
                "payment_object": "service",
            }
        ],
    }


def generate_payment_url(
    amount_rub: float,
    inv_id: int,
    description: str,
    user_email: str,
    item_name: str,
    metadata: Optional[Dict[str, Any]] = None,
    is_test: bool = False,
) -> str:
    """
    Генерирует URL для перехода на страницу оплаты Robokassa.

    Args:
        amount_rub: Сумма в рублях (например 199.00)
        inv_id: Уникальный ID платежа (целое число, у нас id из таблицы Subscription)
        description: Описание платежа
        user_email: Email покупателя (для чека)
        item_name: Название товара для чека
        metadata: Дополнительные данные (сохраняются в Shp_* параметрах)
        is_test: Тестовый режим (без реальных денег)

    Returns:
        URL для перенаправления пользователя на оплату
    """
    merchant_login = settings.ROBOKASSA_MERCHANT_LOGIN
    password_1 = settings.ROBOKASSA_PASSWORD_1

    out_sum = f"{amount_rub:.2f}"
    receipt = build_receipt(amount_rub, item_name)
    receipt_json = json.dumps(receipt, ensure_ascii=False, separators=(",", ":"))

    # Подпись: MerchantLogin:OutSum:InvId:Receipt:Password1
    # + дополнительные пользовательские параметры (Shp_*) в алфавитном порядке
    shp_params = {}
    if metadata:
        for k, v in metadata.items():
            shp_params[f"Shp_{k}"] = str(v)

    # В подписи пользовательские параметры добавляются в алфавитном порядке
    shp_for_signature = ""
    for k in sorted(shp_params.keys()):
        shp_for_signature += f":{k}={shp_params[k]}"

    sig_input = f"{merchant_login}:{out_sum}:{inv_id}:{receipt_json}:{password_1}{shp_for_signature}"
    signature = _md5(sig_input)

    params = {
        "MerchantLogin": merchant_login,
        "OutSum": out_sum,
        "InvId": str(inv_id),
        "Description": description,
        "Receipt": receipt_json,
        "Email": user_email,
        "SignatureValue": signature,
        "Culture": "ru",
        "Encoding": "utf-8",
    }

    if is_test:
        params["IsTest"] = "1"

    # Добавить Shp_* параметры
    params.update(shp_params)

    url = ROBOKASSA_PAYMENT_URL + "?" + urlencode(params)
    return url


def verify_payment_signature(
    out_sum: str,
    inv_id: str,
    signature_value: str,
    shp_params: Optional[Dict[str, str]] = None,
) -> bool:
    """
    Проверка подписи от Robokassa при получении уведомления (ResultURL).
    Формат: MD5(OutSum:InvId:Password2:Shp_*)

    Args:
        out_sum: Сумма из уведомления
        inv_id: ID платежа
        signature_value: Подпись от Robokassa
        shp_params: Пользовательские параметры Shp_*
    """
    password_2 = settings.ROBOKASSA_PASSWORD_2

    shp_for_signature = ""
    if shp_params:
        for k in sorted(shp_params.keys()):
            shp_for_signature += f":{k}={shp_params[k]}"

    sig_input = f"{out_sum}:{inv_id}:{password_2}{shp_for_signature}"
    expected = _md5(sig_input).upper()

    return expected == signature_value.upper()

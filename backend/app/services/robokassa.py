"""
Интеграция с Robokassa для приёма платежей.

Документация: https://docs.robokassa.ru/ru/fiscalization/
Формат подписи: MD5(MerchantLogin:OutSum:InvId:Receipt:Password1:Shp_*)

ВАЖНО: Из-за размера Receipt используется POST-запрос (форма с автосабмитом).
Перед добавлением в подпись значение Receipt НЕ кодируется (используется исходный JSON),
но в теле формы должно быть URL-закодировано при GET.
"""
import hashlib
import json
import logging
from typing import Optional, Dict, Any
from urllib.parse import quote

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
        "sno": "npd",
        "items": [
            {
                "name": item_name[:128],  # до 128 символов
                "quantity": quantity,
                "sum": round(amount_rub * quantity, 2),
                "tax": "none",
                "payment_method": "full_payment",
                "payment_object": "service",
            }
        ],
    }


def generate_payment_form(
    amount_rub: float,
    inv_id: int,
    description: str,
    user_email: str,
    item_name: str,
    metadata: Optional[Dict[str, Any]] = None,
    is_test: bool = False,
) -> str:
    """
    Генерирует HTML-форму с автосабмитом на страницу оплаты Robokassa.
    Используется POST (т.к. Receipt может быть большим).

    Возвращает готовый HTML — фронтенд получает его и вставляет на страницу.
    Forma немедленно сабмитится через JavaScript.
    """
    merchant_login = settings.ROBOKASSA_MERCHANT_LOGIN
    password_1 = settings.ROBOKASSA_PASSWORD_1

    out_sum = f"{amount_rub:.2f}"
    receipt = build_receipt(amount_rub, item_name)
    # Compact JSON без пробелов
    receipt_json = json.dumps(receipt, ensure_ascii=False, separators=(",", ":"))
    # Для подписи: URL-кодированный Receipt
    receipt_encoded = quote(receipt_json, safe="")

    shp_params = {}
    if metadata:
        for k, v in metadata.items():
            shp_params[f"Shp_{k}"] = str(v)

    # Подпись: MerchantLogin:OutSum:InvId:URL_ENCODED_Receipt:Password1:Shp_*
    shp_for_signature = ""
    for k in sorted(shp_params.keys()):
        shp_for_signature += f":{k}={shp_params[k]}"

    sig_input = f"{merchant_login}:{out_sum}:{inv_id}:{receipt_encoded}:{password_1}{shp_for_signature}"
    signature = _md5(sig_input)

    # Сформировать скрытые поля формы
    fields = {
        "MerchantLogin": merchant_login,
        "OutSum": out_sum,
        "InvId": str(inv_id),
        "Description": description,
        "Receipt": receipt_json,  # В теле формы — как есть, браузер закодирует
        "Email": user_email,
        "SignatureValue": signature,
        "Culture": "ru",
        "Encoding": "utf-8",
    }
    if is_test:
        fields["IsTest"] = "1"
    fields.update(shp_params)

    # HTML-форма с автосабмитом
    inputs_html = "\n".join(
        f'<input type="hidden" name="{k}" value="{_escape_html(v)}" />'
        for k, v in fields.items()
    )

    html = f"""<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>Переход к оплате...</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body {{
      background: #0f0f17;
      color: #e5e5e5;
      font-family: -apple-system, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
    }}
    .loader {{
      text-align: center;
    }}
    .spinner {{
      width: 40px;
      height: 40px;
      border: 3px solid rgba(249, 115, 22, 0.3);
      border-top-color: #f97316;
      border-radius: 50%;
      margin: 0 auto 20px;
      animation: spin 0.8s linear infinite;
    }}
    @keyframes spin {{
      to {{ transform: rotate(360deg); }}
    }}
  </style>
</head>
<body>
  <div class="loader">
    <div class="spinner"></div>
    <p>Переходим к оплате...</p>
  </div>
  <form id="rk" method="POST" action="{ROBOKASSA_PAYMENT_URL}">
    {inputs_html}
  </form>
  <script>document.getElementById('rk').submit();</script>
</body>
</html>"""

    return html


def _escape_html(value: str) -> str:
    """Простое экранирование HTML для значений в атрибутах"""
    return (
        str(value)
        .replace("&", "&amp;")
        .replace('"', "&quot;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def verify_payment_signature(
    out_sum: str,
    inv_id: str,
    signature_value: str,
    shp_params: Optional[Dict[str, str]] = None,
) -> bool:
    """
    Проверка подписи от Robokassa при получении уведомления (ResultURL).
    Формат: MD5(OutSum:InvId:Password2:Shp_*)
    """
    password_2 = settings.ROBOKASSA_PASSWORD_2

    shp_for_signature = ""
    if shp_params:
        for k in sorted(shp_params.keys()):
            shp_for_signature += f":{k}={shp_params[k]}"

    sig_input = f"{out_sum}:{inv_id}:{password_2}{shp_for_signature}"
    expected = _md5(sig_input).upper()

    return expected == signature_value.upper()

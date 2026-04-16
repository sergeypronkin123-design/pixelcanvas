"""
Интеграция с Robokassa для приёма платежей.

Документация: https://docs.robokassa.ru/pay-interface/

Формат подписи (с чеком и Shp_*):
  MD5(MerchantLogin:OutSum:InvId:Receipt:Пароль#1:Shp_key1=val1:Shp_key2=val2)

Где Receipt в подписи = URL-кодированный JSON.
Где Receipt в POST-форме = URL-кодированный JSON (браузер НЕ кодирует повторно при POST).

Документация цитата:
  "Перед добавлением в строку для подписи значение Receipt нужно URL-кодировать."
  "Из-за объема номенклатуры используйте метод POST."
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
    """Чек для самозанятого (Робочеки СМЗ)."""
    return {
        "sno": "npd",
        "items": [
            {
                "name": item_name[:128],
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
    Генерирует HTML-страницу с формой + JS автосабмит.
    
    Используем JavaScript для сборки формы и отправки,
    чтобы контролировать как именно Receipt передаётся
    (без двойного кодирования).
    """
    merchant_login = settings.ROBOKASSA_MERCHANT_LOGIN
    password_1 = settings.ROBOKASSA_PASSWORD_1

    out_sum = f"{amount_rub:.2f}"
    receipt = build_receipt(amount_rub, item_name)
    receipt_json = json.dumps(receipt, ensure_ascii=False, separators=(",", ":"))
    receipt_url_encoded = quote(receipt_json)

    # Собираем Shp_* параметры
    shp_params = {}
    if metadata:
        for k, v in metadata.items():
            shp_params[f"Shp_{k}"] = str(v)

    # Shp_* в подпись в алфавитном порядке
    shp_for_signature = ""
    for k in sorted(shp_params.keys()):
        shp_for_signature += f":{k}={shp_params[k]}"

    # Подпись: MerchantLogin:OutSum:InvId:URL_ENCODED_Receipt:Password1:Shp_*
    sig_input = f"{merchant_login}:{out_sum}:{inv_id}:{receipt_url_encoded}:{password_1}{shp_for_signature}"
    signature = _md5(sig_input)

    logger.info(f"Robokassa payment: InvId={inv_id}, OutSum={out_sum}, Sig={signature}")

    # Все поля для формы
    fields = {
        "MerchantLogin": merchant_login,
        "OutSum": out_sum,
        "InvId": str(inv_id),
        "Description": description[:100],
        "SignatureValue": signature,
        "Culture": "ru",
        "Encoding": "utf-8",
        "Email": user_email,
    }
    if is_test:
        fields["IsTest"] = "1"
    fields.update(shp_params)

    # Receipt НЕ в fields — мы добавим его через JS чтобы избежать двойного кодирования
    fields_json = json.dumps(fields, ensure_ascii=False)

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
    .loader {{ text-align: center; }}
    .spinner {{
      width: 40px; height: 40px;
      border: 3px solid rgba(249,115,22,0.3);
      border-top-color: #f97316;
      border-radius: 50%;
      margin: 0 auto 20px;
      animation: spin 0.8s linear infinite;
    }}
    @keyframes spin {{ to {{ transform: rotate(360deg); }} }}
  </style>
</head>
<body>
  <div class="loader">
    <div class="spinner"></div>
    <p>Переходим к оплате...</p>
  </div>
  <form id="rk" method="POST" action="{ROBOKASSA_PAYMENT_URL}" accept-charset="UTF-8"></form>
  <script>
    var fields = {fields_json};
    var receipt = {json.dumps(receipt_url_encoded)};
    var form = document.getElementById('rk');
    
    // Добавляем обычные поля
    for (var key in fields) {{
      var inp = document.createElement('input');
      inp.type = 'hidden';
      inp.name = key;
      inp.value = fields[key];
      form.appendChild(inp);
    }}
    
    // Receipt — уже URL-кодированный, добавляем как есть
    var ri = document.createElement('input');
    ri.type = 'hidden';
    ri.name = 'Receipt';
    ri.value = receipt;
    form.appendChild(ri);
    
    form.submit();
  </script>
</body>
</html>"""

    return html


def verify_payment_signature(
    out_sum: str,
    inv_id: str,
    signature_value: str,
    shp_params: Optional[Dict[str, str]] = None,
) -> bool:
    """
    Проверка подписи от Robokassa (ResultURL).
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

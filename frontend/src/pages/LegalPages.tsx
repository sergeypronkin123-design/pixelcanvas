import { Navbar } from '@/components/layout/Navbar';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export function OfferPage() {
  return (
    <div className="min-h-screen bg-canvas-bg">
      <Navbar />
      <div className="max-w-3xl mx-auto px-6 pt-24 pb-16">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <h1 className="font-display font-bold text-3xl text-canvas-bright mb-8">Публичная оферта</h1>
          <div className="prose prose-invert max-w-none space-y-4 text-canvas-text text-sm leading-relaxed">

            <p className="text-canvas-muted">Дата публикации: 08 апреля 2026 г.</p>

            <h2 className="font-display font-semibold text-xl text-canvas-bright mt-8">1. Общие положения</h2>
            <p>Настоящая публичная оферта (далее — «Оферта») является официальным предложением Администрации платформы PixelStake, далее именуемой «Продавец», адресованным любому физическому лицу, далее именуемому «Покупатель», заключить договор купли-продажи цифровых товаров на условиях, изложенных ниже. Полные реквизиты Продавца доступны по запросу на email: support@pixelstake.ru.</p>
            <p>Оферта считается принятой (акцептованной) с момента совершения Покупателем оплаты любого товара на сайте PixelStake (https://pixelstake.ru).</p>

            <h2 className="font-display font-semibold text-xl text-canvas-bright mt-8">2. Предмет договора</h2>
            <p>Продавец предоставляет Покупателю право владения цифровыми блоками пикселей на общей интерактивной онлайн-платформе PixelStake. Каждый блок представляет собой область размером 10×10 пикселей на общем холсте.</p>
            <p>Покупатель получает следующие права:</p>
            <p>— Право рисовать (размещать изображения) внутри приобретённых блоков;</p>
            <p>— Право выставлять приобретённые блоки на перепродажу другим пользователям через встроенный маркетплейс;</p>
            <p>— Право владения блоком на неограниченный срок, пока платформа функционирует.</p>

            <h2 className="font-display font-semibold text-xl text-canvas-bright mt-8">3. Описание товара и цены</h2>
            <p>Товаром является цифровой блок пикселей на платформе PixelStake. Цена каждого блока определяется автоматически на основе его расположения на холсте и текущей заполненности платформы. Цена указывается на странице покупки перед совершением оплаты.</p>
            <p>Цены указаны в долларах США (при оплате через Stripe) или в рублях РФ (при оплате через ЮKassa). Продавец оставляет за собой право изменять цены на нераспроданные блоки без предварительного уведомления.</p>

            <h2 className="font-display font-semibold text-xl text-canvas-bright mt-8">4. Порядок оплаты</h2>
            <p>Оплата осуществляется онлайн одним из следующих способов:</p>
            <p>— Банковская карта (Visa, MasterCard, МИР) через платёжную систему Stripe или ЮKassa;</p>
            <p>— Иные способы оплаты, доступные через ЮKassa (ЮMoney, SberPay и др.).</p>
            <p>Товар (права на блок) предоставляется мгновенно после подтверждения оплаты платёжной системой.</p>

            <h2 className="font-display font-semibold text-xl text-canvas-bright mt-8">5. Доставка</h2>
            <p>Товар является цифровым. Доставка не требуется. Доступ к приобретённому блоку предоставляется автоматически и мгновенно после успешной оплаты в личном кабинете Покупателя на платформе.</p>

            <h2 className="font-display font-semibold text-xl text-canvas-bright mt-8">6. Возврат средств</h2>
            <p>Поскольку товар является цифровым и предоставляется мгновенно после оплаты, возврат денежных средств, как правило, не осуществляется.</p>
            <p>Исключения:</p>
            <p>— Техническая ошибка, в результате которой блок не был предоставлен Покупателю;</p>
            <p>— Двойное списание средств за один и тот же блок.</p>
            <p>В указанных случаях Покупатель может обратиться по электронной почте, указанной в разделе «Контакты». Возврат производится в течение 10 рабочих дней тем же способом, которым была произведена оплата.</p>

            <h2 className="font-display font-semibold text-xl text-canvas-bright mt-8">7. Перепродажа блоков</h2>
            <p>Покупатель имеет право выставить приобретённый блок на перепродажу через встроенный маркетплейс платформы. При успешной перепродаже платформа удерживает комиссию в размере 5% от суммы сделки.</p>

            <h2 className="font-display font-semibold text-xl text-canvas-bright mt-8">8. Ответственность</h2>
            <p>Продавец не несёт ответственности за содержимое (изображения), размещённое Покупателями в приобретённых блоках. Продавец оставляет за собой право удалять контент, нарушающий законодательство РФ.</p>
            <p>Продавец прилагает разумные усилия для обеспечения бесперебойной работы платформы, но не гарантирует её доступность 24/7.</p>

            <h2 className="font-display font-semibold text-xl text-canvas-bright mt-8">9. Персональные данные</h2>
            <p>Продавец обрабатывает персональные данные Покупателя (email, имя пользователя) исключительно для целей исполнения настоящего договора в соответствии с Федеральным законом №152-ФЗ «О персональных данных». Данные не передаются третьим лицам, за исключением платёжных систем для обработки оплаты.</p>

            <h2 className="font-display font-semibold text-xl text-canvas-bright mt-8">10. Прочие условия</h2>
            <p>Настоящая Оферта действует бессрочно до её отзыва Продавцом. Продавец вправе вносить изменения в Оферту, размещая актуальную версию на данной странице. Продолжение использования платформы после внесения изменений означает согласие Покупателя с новой редакцией Оферты.</p>
            <p>Все споры разрешаются путём переговоров, а при невозможности достижения согласия — в соответствии с законодательством Российской Федерации.</p>

          </div>
        </motion.div>
      </div>
    </div>
  );
}

export function ContactsPage() {
  return (
    <div className="min-h-screen bg-canvas-bg">
      <Navbar />
      <div className="max-w-3xl mx-auto px-6 pt-24 pb-16">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <h1 className="font-display font-bold text-3xl text-canvas-bright mb-8">Контакты и реквизиты</h1>
          <div className="space-y-6">

            <div className="card">
              <h2 className="font-display font-semibold text-lg text-canvas-bright mb-4">Продавец</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b border-canvas-border pb-3">
                  <span className="text-canvas-muted">Статус</span>
                  <span className="text-canvas-bright">Самозанятый (плательщик НПД)</span>
                </div>
                <div className="flex justify-between border-b border-canvas-border pb-3">
                  <span className="text-canvas-muted">ФИО</span>
                  <span className="text-canvas-bright">Пронкин Сергей</span>
                </div>
                <div className="flex justify-between border-b border-canvas-border pb-3">
                  <span className="text-canvas-muted">ИНН</span>
                  <span className="text-canvas-bright font-mono">250202459700</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-canvas-muted">Режим налогообложения</span>
                  <span className="text-canvas-bright">Налог на профессиональный доход (НПД)</span>
                </div>
              </div>
            </div>

            <div className="card">
              <h2 className="font-display font-semibold text-lg text-canvas-bright mb-4">Связь</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b border-canvas-border pb-3">
                  <span className="text-canvas-muted">Email</span>
                  <span className="text-neon-amber">support@pixelstake.ru</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-canvas-muted">Время ответа</span>
                  <span className="text-canvas-bright">В течение 24 часов</span>
                </div>
              </div>
            </div>

            <div className="card">
              <h2 className="font-display font-semibold text-lg text-canvas-bright mb-4">О платформе</h2>
              <p className="text-sm text-canvas-muted leading-relaxed">
                PixelStake — интерактивная онлайн-платформа, на которой пользователи могут приобретать цифровые блоки пикселей,
                создавать изображения внутри своих блоков и торговать ими на встроенном маркетплейсе.
                Все товары являются цифровыми и предоставляются мгновенно после оплаты.
              </p>
            </div>

            <div className="card">
              <h2 className="font-display font-semibold text-lg text-canvas-bright mb-4">Юридическая информация</h2>
              <div className="space-y-2 text-sm">
                <Link to="/offer" className="block text-neon-amber hover:underline">→ Публичная оферта</Link>
                <Link to="/privacy" className="block text-neon-amber hover:underline">→ Политика конфиденциальности</Link>
                <Link to="/refund" className="block text-neon-amber hover:underline">→ Политика возврата</Link>
              </div>
            </div>

          </div>
        </motion.div>
      </div>
    </div>
  );
}

export function RefundPage() {
  return (
    <div className="min-h-screen bg-canvas-bg">
      <Navbar />
      <div className="max-w-3xl mx-auto px-6 pt-24 pb-16">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <h1 className="font-display font-bold text-3xl text-canvas-bright mb-8">Политика возврата</h1>
          <div className="space-y-4 text-sm text-canvas-text leading-relaxed">

            <p className="text-canvas-muted">Дата публикации: 08 апреля 2026 г.</p>

            <h2 className="font-display font-semibold text-xl text-canvas-bright mt-8">1. Общие положения</h2>
            <p>Все товары на платформе PixelStake являются цифровыми (блоки пикселей) и предоставляются мгновенно после оплаты. В связи с этим, согласно ст. 26.1 Закона РФ «О защите прав потребителей», возврат цифрового товара надлежащего качества не предусмотрен.</p>

            <h2 className="font-display font-semibold text-xl text-canvas-bright mt-8">2. Случаи, когда возврат возможен</h2>
            <p>Возврат денежных средств осуществляется в следующих случаях:</p>
            <p>— Произошла техническая ошибка и блок не был предоставлен после оплаты;</p>
            <p>— Произошло двойное списание средств за один и тот же блок;</p>
            <p>— Оплата была произведена, но платформа не подтвердила получение платежа.</p>

            <h2 className="font-display font-semibold text-xl text-canvas-bright mt-8">3. Как запросить возврат</h2>
            <p>Для запроса возврата напишите на email: support@pixelstake.ru. В обращении укажите:</p>
            <p>— Ваш логин (имя пользователя) на платформе;</p>
            <p>— Дату и сумму платежа;</p>
            <p>— Описание проблемы.</p>

            <h2 className="font-display font-semibold text-xl text-canvas-bright mt-8">4. Сроки возврата</h2>
            <p>Обращения рассматриваются в течение 5 рабочих дней. Возврат средств производится в течение 10 рабочих дней после одобрения заявки тем же способом, которым была произведена оплата.</p>

          </div>
        </motion.div>
      </div>
    </div>
  );
}

export function PrivacyPage() {
  return (
    <div className="min-h-screen bg-canvas-bg">
      <Navbar />
      <div className="max-w-3xl mx-auto px-6 pt-24 pb-16">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <h1 className="font-display font-bold text-3xl text-canvas-bright mb-8">Политика конфиденциальности</h1>
          <div className="space-y-4 text-sm text-canvas-text leading-relaxed">

            <p className="text-canvas-muted">Дата публикации: 08 апреля 2026 г.</p>

            <h2 className="font-display font-semibold text-xl text-canvas-bright mt-8">1. Какие данные собираются</h2>
            <p>При регистрации и использовании платформы PixelStake собираются следующие данные:</p>
            <p>— Адрес электронной почты;</p>
            <p>— Имя пользователя (логин);</p>
            <p>— Данные о совершённых покупках (блоки, суммы, даты).</p>
            <p>Платёжные данные (номер карты, CVC и т.д.) не хранятся на платформе — они обрабатываются непосредственно платёжными системами Stripe и ЮKassa.</p>

            <h2 className="font-display font-semibold text-xl text-canvas-bright mt-8">2. Цели обработки данных</h2>
            <p>Персональные данные обрабатываются исключительно для:</p>
            <p>— Создания и обслуживания учётной записи пользователя;</p>
            <p>— Обработки платежей и предоставления цифровых товаров;</p>
            <p>— Связи с пользователем при возникновении проблем;</p>
            <p>— Выполнения требований законодательства РФ.</p>

            <h2 className="font-display font-semibold text-xl text-canvas-bright mt-8">3. Передача данных третьим лицам</h2>
            <p>Данные не продаются и не передаются третьим лицам, за исключением:</p>
            <p>— Платёжных систем (Stripe, ЮKassa) — для обработки оплаты;</p>
            <p>— Государственных органов — по запросу в соответствии с законодательством РФ.</p>

            <h2 className="font-display font-semibold text-xl text-canvas-bright mt-8">4. Защита данных</h2>
            <p>Пароли хранятся в зашифрованном виде (bcrypt). Соединение с сайтом защищено SSL-сертификатом (HTTPS). Доступ к базе данных ограничен и защищён.</p>

            <h2 className="font-display font-semibold text-xl text-canvas-bright mt-8">5. Права пользователя</h2>
            <p>Пользователь имеет право запросить удаление своей учётной записи и всех связанных данных, написав на email: support@pixelstake.ru. Запрос обрабатывается в течение 5 рабочих дней.</p>

            <h2 className="font-display font-semibold text-xl text-canvas-bright mt-8">6. Cookies</h2>
            <p>Платформа использует только технические cookies (токен авторизации), необходимые для работы сайта. Рекламные и аналитические cookies не используются.</p>

          </div>
        </motion.div>
      </div>
    </div>
  );
}

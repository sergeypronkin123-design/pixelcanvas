import { Navbar } from '@/components/layout/Navbar';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export function OfferPage() {
  return (
    <div className="min-h-screen bg-canvas-bg"><Navbar />
      <div className="max-w-3xl mx-auto px-6 pt-24 pb-16">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <h1 className="font-display font-bold text-3xl text-canvas-bright mb-8">Публичная оферта</h1>
          <div className="space-y-4 text-sm text-canvas-text leading-relaxed">
            <p className="text-canvas-muted">Дата публикации: 12 апреля 2026 г.</p>
            <h2 className="font-display font-semibold text-xl text-canvas-bright mt-8">1. Общие положения</h2>
            <p>Настоящая оферта является предложением Администрации платформы PixelStake любому физическому лицу заключить договор на условиях ниже. Реквизиты Продавца доступны по запросу: support@pixelstake.ru.</p>
            <p>Оферта считается принятой с момента оплаты подписки или регистрации на платформе.</p>
            <h2 className="font-display font-semibold text-xl text-canvas-bright mt-8">2. Предмет договора</h2>
            <p>PixelStake — интерактивная онлайн-платформа для участия в пиксельных батлах. Пользователи могут бесплатно размещать пиксели на общем холсте или приобрести Pro-подписку для ускоренного размещения.</p>
            <h2 className="font-display font-semibold text-xl text-canvas-bright mt-8">3. Подписка Pro</h2>
            <p>Pro-подписка действует 30 дней с момента оплаты. Даёт право размещать пиксели каждые 5 секунд вместо 30. Стоимость: $4.99 или 499₽.</p>
            <h2 className="font-display font-semibold text-xl text-canvas-bright mt-8">4. Оплата</h2>
            <p>Оплата производится через Stripe (банковские карты) или ЮKassa (карты, ЮMoney, SberPay). Услуга активируется мгновенно после подтверждения оплаты.</p>
            <h2 className="font-display font-semibold text-xl text-canvas-bright mt-8">5. Возврат</h2>
            <p>Подробности в <Link to="/refund" className="text-orange-400 hover:underline">Политике возврата</Link>.</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export function ContactsPage() {
  return (
    <div className="min-h-screen bg-canvas-bg"><Navbar />
      <div className="max-w-3xl mx-auto px-6 pt-24 pb-16">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <h1 className="font-display font-bold text-3xl text-canvas-bright mb-8">Контакты и реквизиты</h1>
          <div className="card space-y-3 text-sm">
            <div className="flex justify-between border-b border-canvas-border pb-3"><span className="text-canvas-muted">Статус</span><span className="text-canvas-bright">Самозанятый (НПД)</span></div>
            <div className="flex justify-between border-b border-canvas-border pb-3"><span className="text-canvas-muted">ФИО</span><span className="text-canvas-bright">Пронкин Сергей</span></div>
            <div className="flex justify-between border-b border-canvas-border pb-3"><span className="text-canvas-muted">ИНН</span><span className="text-canvas-bright font-mono">250202459700</span></div>
            <div className="flex justify-between border-b border-canvas-border pb-3"><span className="text-canvas-muted">Email</span><span className="text-orange-400">support@pixelstake.ru</span></div>
            <div className="flex justify-between"><span className="text-canvas-muted">Платформа</span><span className="text-canvas-bright">pixelstake.ru</span></div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export function RefundPage() {
  return (
    <div className="min-h-screen bg-canvas-bg"><Navbar />
      <div className="max-w-3xl mx-auto px-6 pt-24 pb-16">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <h1 className="font-display font-bold text-3xl text-canvas-bright mb-8">Политика возврата</h1>
          <div className="space-y-4 text-sm text-canvas-text leading-relaxed">
            <p>Pro-подписка — цифровая услуга, предоставляемая мгновенно. Возврат возможен в случаях:</p>
            <p>— Техническая ошибка (подписка не активировалась после оплаты)</p>
            <p>— Двойное списание</p>
            <p>Для возврата напишите на support@pixelstake.ru. Срок рассмотрения — 5 рабочих дней, возврат — 10 рабочих дней.</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export function PrivacyPage() {
  return (
    <div className="min-h-screen bg-canvas-bg"><Navbar />
      <div className="max-w-3xl mx-auto px-6 pt-24 pb-16">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <h1 className="font-display font-bold text-3xl text-canvas-bright mb-8">Политика конфиденциальности</h1>
          <div className="space-y-4 text-sm text-canvas-text leading-relaxed">
            <p>Собираемые данные: email, имя пользователя, данные о покупках. Платёжные данные обрабатываются Stripe и ЮKassa.</p>
            <p>Данные не передаются третьим лицам кроме платёжных систем. Пароли хранятся в зашифрованном виде.</p>
            <p>Для удаления аккаунта напишите на support@pixelstake.ru.</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

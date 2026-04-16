import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Mail, Phone, FileText, User, Shield, RotateCcw } from 'lucide-react';

export function OfferPage() {
  return (
    <div className="min-h-screen bg-canvas-bg flex flex-col"><Navbar />
      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-20 sm:pt-24 pb-12">
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
            <div className="flex items-center gap-3 mb-6">
              <FileText size={28} className="text-orange-400" />
              <h1 className="font-display font-bold text-2xl sm:text-3xl text-canvas-bright">Публичная оферта</h1>
            </div>

            <div className="card space-y-4 text-sm text-canvas-text leading-relaxed">
              <p className="text-canvas-muted text-xs">Редакция от 13 апреля 2026 г.</p>

              <h2 className="font-display font-semibold text-lg text-canvas-bright mt-4">1. Общие положения</h2>
              <p>
                Настоящая публичная оферта (далее — «Оферта») представляет собой официальное предложение
                самозанятого Пронкина Сергея Николаевича (ИНН: 250202459700), действующего на основании
                свидетельства о постановке на учет в качестве плательщика налога на профессиональный доход
                (далее — «Исполнитель»), любому дееспособному физическому лицу (далее — «Пользователь»)
                заключить договор на использование платформы PixelStake на условиях, изложенных ниже.
              </p>
              <p>
                Оферта считается принятой (акцептованной) Пользователем с момента регистрации на сайте
                <strong className="text-canvas-bright"> pixelstake.ru</strong> либо с момента оплаты подписки Pro.
              </p>

              <h2 className="font-display font-semibold text-lg text-canvas-bright mt-4">2. Предмет договора</h2>
              <p>
                Исполнитель предоставляет Пользователю доступ к интерактивной онлайн-платформе PixelStake —
                сервису для участия в коллективных пиксельных соревнованиях (Pixel Battle) на общем холсте
                размером 1000×1000 пикселей.
              </p>
              <p>
                Бесплатное использование: Пользователь может размещать 1 пиксель каждые 30 секунд во время
                активного периода Pixel Battle (с 1 по 7 число каждого месяца).
              </p>

              <h2 className="font-display font-semibold text-lg text-canvas-bright mt-4">3. Подписка Pro</h2>
              <p>
                <strong className="text-canvas-bright">Наименование услуги:</strong> Цифровая подписка «PixelStake Pro»
              </p>
              <p>
                <strong className="text-canvas-bright">Стоимость:</strong> 199 рублей (для оплаты рублями) или
                эквивалент в иностранной валюте.
              </p>
              <p>
                <strong className="text-canvas-bright">Срок действия:</strong> 30 календарных дней с момента
                активации услуги.
              </p>
              <p>
                <strong className="text-canvas-bright">Что получает Пользователь:</strong> ускоренный режим
                размещения пикселей — 1 пиксель каждые 5 секунд вместо стандартных 30 секунд.
              </p>
              <p>
                <strong className="text-canvas-bright">Порядок предоставления услуги:</strong> услуга предоставляется
                автоматически и мгновенно после подтверждения оплаты от платёжной системы. Подписка активируется
                в личном кабинете Пользователя в течение 1–5 минут.
              </p>
              <p>
                <strong className="text-canvas-bright">Способ получения:</strong> цифровая услуга,
                предоставляется через сайт pixelstake.ru и не требует физической доставки.
              </p>

              <h2 className="font-display font-semibold text-lg text-canvas-bright mt-4">4. Порядок оплаты</h2>
              <p>
                Оплата производится в электронной форме через платёжные системы Stripe (для банковских карт
                международных систем) или Robokassa (для российских карт, СБП, ЮMoney и других методов).
                Моментом оплаты считается получение Исполнителем подтверждения успешного платежа от
                платёжной системы.
              </p>
              <p>
                После успешной оплаты Пользователю на указанный email направляется чек в соответствии
                с требованиями 422-ФЗ «О налоге на профессиональный доход».
              </p>

              <h2 className="font-display font-semibold text-lg text-canvas-bright mt-4">5. Возврат средств</h2>
              <p>
                Условия возврата средств изложены в <Link to="/refund" className="text-orange-400 hover:underline">Политике возврата</Link>.
              </p>

              <h2 className="font-display font-semibold text-lg text-canvas-bright mt-4">6. Персональные данные</h2>
              <p>
                Обработка персональных данных Пользователя осуществляется в соответствии с
                <Link to="/privacy" className="text-orange-400 hover:underline"> Политикой конфиденциальности</Link>.
              </p>

              <h2 className="font-display font-semibold text-lg text-canvas-bright mt-4">7. Ответственность</h2>
              <p>
                Исполнитель не несёт ответственности за временную недоступность сервиса вследствие
                технических работ, сбоев интернет-провайдеров или действий третьих лиц. Пользователь
                обязуется использовать платформу добросовестно и не размещать контент, нарушающий
                законодательство РФ.
              </p>

              <h2 className="font-display font-semibold text-lg text-canvas-bright mt-4">8. Контакты Исполнителя</h2>
              <p>Пронкин Сергей Николаевич</p>
              <p>ИНН: 250202459700</p>
              <p>г. Владивосток</p>
              <p>Email: <a href="mailto:support@pixelstake.ru" className="text-orange-400 hover:underline">support@pixelstake.ru</a></p>
            </div>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export function ContactsPage() {
  return (
    <div className="min-h-screen bg-canvas-bg flex flex-col"><Navbar />
      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-20 sm:pt-24 pb-12">
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
            <div className="flex items-center gap-3 mb-6">
              <User size={28} className="text-orange-400" />
              <h1 className="font-display font-bold text-2xl sm:text-3xl text-canvas-bright">Контакты и реквизиты</h1>
            </div>

            <div className="card space-y-4 text-sm">
              <h2 className="font-display font-semibold text-lg text-canvas-bright mb-3">Реквизиты</h2>

              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1 border-b border-canvas-border pb-3">
                  <span className="text-canvas-muted">Статус</span>
                  <span className="text-canvas-bright">Самозанятый (плательщик НПД)</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1 border-b border-canvas-border pb-3">
                  <span className="text-canvas-muted">ФИО</span>
                  <span className="text-canvas-bright">Пронкин Сергей Николаевич</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1 border-b border-canvas-border pb-3">
                  <span className="text-canvas-muted">ИНН</span>
                  <span className="text-canvas-bright font-mono">250202459700</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1 border-b border-canvas-border pb-3">
                  <span className="text-canvas-muted">Город</span>
                  <span className="text-canvas-bright">Владивосток</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1 border-b border-canvas-border pb-3">
                  <span className="text-canvas-muted">Email для связи</span>
                  <a href="mailto:support@pixelstake.ru" className="text-orange-400 hover:underline">support@pixelstake.ru</a>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                  <span className="text-canvas-muted">Сайт</span>
                  <span className="text-canvas-bright">pixelstake.ru</span>
                </div>
              </div>
            </div>

            <div className="card mt-4 border-orange-500/20">
              <h2 className="font-display font-semibold text-lg text-canvas-bright mb-3 flex items-center gap-2">
                <Mail size={16} className="text-orange-400" /> Связь
              </h2>
              <p className="text-canvas-muted text-sm mb-3">
                По любым вопросам, связанным с работой сервиса, подпиской, возвратом средств или
                техническими проблемами, вы можете написать нам на email:
              </p>
              <a href="mailto:support@pixelstake.ru"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-500/10 border border-orange-500/30 text-orange-400 rounded-xl font-display hover:bg-orange-500/20 transition-all">
                <Mail size={16} /> support@pixelstake.ru
              </a>
              <p className="text-xs text-canvas-muted mt-3">Время ответа: до 24 часов в будние дни.</p>
            </div>

            <div className="card mt-4">
              <h2 className="font-display font-semibold text-lg text-canvas-bright mb-3">Документы</h2>
              <div className="space-y-2">
                <Link to="/offer" className="flex items-center gap-2 px-3 py-2 rounded-xl bg-canvas-elevated hover:bg-canvas-elevated/70 transition-all">
                  <FileText size={16} className="text-canvas-muted" />
                  <span className="text-sm text-canvas-text">Публичная оферта</span>
                </Link>
                <Link to="/privacy" className="flex items-center gap-2 px-3 py-2 rounded-xl bg-canvas-elevated hover:bg-canvas-elevated/70 transition-all">
                  <Shield size={16} className="text-canvas-muted" />
                  <span className="text-sm text-canvas-text">Политика конфиденциальности</span>
                </Link>
                <Link to="/refund" className="flex items-center gap-2 px-3 py-2 rounded-xl bg-canvas-elevated hover:bg-canvas-elevated/70 transition-all">
                  <RotateCcw size={16} className="text-canvas-muted" />
                  <span className="text-sm text-canvas-text">Политика возврата</span>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export function RefundPage() {
  return (
    <div className="min-h-screen bg-canvas-bg flex flex-col"><Navbar />
      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-20 sm:pt-24 pb-12">
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
            <div className="flex items-center gap-3 mb-6">
              <RotateCcw size={28} className="text-orange-400" />
              <h1 className="font-display font-bold text-2xl sm:text-3xl text-canvas-bright">Политика возврата</h1>
            </div>

            <div className="card space-y-4 text-sm text-canvas-text leading-relaxed">
              <p className="text-canvas-muted text-xs">Редакция от 13 апреля 2026 г.</p>

              <h2 className="font-display font-semibold text-lg text-canvas-bright mt-4">Общие положения</h2>
              <p>
                Подписка «PixelStake Pro» является цифровой услугой, предоставляемой мгновенно после
                оплаты. Возврат денежных средств возможен в следующих случаях:
              </p>

              <h2 className="font-display font-semibold text-lg text-canvas-bright mt-4">Случаи, когда возможен возврат</h2>
              <ul className="space-y-2 pl-5 list-disc">
                <li>
                  <strong className="text-canvas-bright">Техническая ошибка:</strong> оплата прошла,
                  но подписка не была активирована в течение 24 часов.
                </li>
                <li>
                  <strong className="text-canvas-bright">Двойное списание:</strong> с карты списана
                  сумма дважды за одну и ту же услугу.
                </li>
                <li>
                  <strong className="text-canvas-bright">Недоступность сервиса:</strong> если сервис был
                  недоступен более 7 дней подряд в период действия подписки по вине Исполнителя.
                </li>
                <li>
                  <strong className="text-canvas-bright">Ошибочный платёж:</strong> если оплата
                  произведена по ошибке и подписка ещё не использовалась (0 размещённых пикселей).
                </li>
              </ul>

              <h2 className="font-display font-semibold text-lg text-canvas-bright mt-4">Случаи, когда возврат не производится</h2>
              <ul className="space-y-2 pl-5 list-disc">
                <li>Подписка уже частично использована (размещены пиксели с ускоренным кулдауном)</li>
                <li>С момента оплаты прошло более 14 календарных дней</li>
                <li>Блокировка аккаунта за нарушение условий использования</li>
              </ul>

              <h2 className="font-display font-semibold text-lg text-canvas-bright mt-4">Как запросить возврат</h2>
              <ol className="space-y-2 pl-5 list-decimal">
                <li>
                  Напишите на email <a href="mailto:support@pixelstake.ru" className="text-orange-400 hover:underline">support@pixelstake.ru</a>
                </li>
                <li>Укажите email вашего аккаунта и дату оплаты</li>
                <li>Опишите причину запроса возврата</li>
                <li>Приложите скриншот списания (если есть)</li>
              </ol>

              <h2 className="font-display font-semibold text-lg text-canvas-bright mt-4">Сроки рассмотрения и возврата</h2>
              <div className="space-y-2">
                <p>
                  <strong className="text-canvas-bright">Рассмотрение заявки:</strong> до 5 рабочих дней
                  с момента получения письма.
                </p>
                <p>
                  <strong className="text-canvas-bright">Возврат средств:</strong> при положительном решении
                  деньги возвращаются на ту же карту/счёт, с которой была произведена оплата, в течение
                  10 рабочих дней. Фактическое поступление средств зависит от вашего банка
                  (обычно 3–10 банковских дней).
                </p>
              </div>

              <h2 className="font-display font-semibold text-lg text-canvas-bright mt-4">Контакты</h2>
              <p>
                По всем вопросам возврата: <a href="mailto:support@pixelstake.ru" className="text-orange-400 hover:underline">support@pixelstake.ru</a>
              </p>
              <p>Самозанятый Пронкин Сергей Николаевич, ИНН: 250202459700</p>
            </div>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export function PrivacyPage() {
  return (
    <div className="min-h-screen bg-canvas-bg flex flex-col"><Navbar />
      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-20 sm:pt-24 pb-12">
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
            <div className="flex items-center gap-3 mb-6">
              <Shield size={28} className="text-orange-400" />
              <h1 className="font-display font-bold text-2xl sm:text-3xl text-canvas-bright">Политика конфиденциальности</h1>
            </div>

            <div className="card space-y-4 text-sm text-canvas-text leading-relaxed">
              <p className="text-canvas-muted text-xs">Редакция от 13 апреля 2026 г.</p>

              <h2 className="font-display font-semibold text-lg text-canvas-bright mt-4">1. Общие положения</h2>
              <p>
                Настоящая политика обработки персональных данных составлена в соответствии с Федеральным
                законом от 27.07.2006 №152-ФЗ «О персональных данных» и определяет порядок обработки
                персональных данных самозанятым Пронкиным Сергеем Николаевичем (ИНН: 250202459700),
                именуемым в дальнейшем «Оператор».
              </p>

              <h2 className="font-display font-semibold text-lg text-canvas-bright mt-4">2. Какие данные мы собираем</h2>
              <ul className="space-y-1 pl-5 list-disc">
                <li>Email адрес (при регистрации)</li>
                <li>Имя пользователя (никнейм)</li>
                <li>Зашифрованный пароль (пароль в открытом виде не хранится)</li>
                <li>IP-адрес и данные о браузере (для обеспечения безопасности)</li>
                <li>История платежей и статус подписки</li>
              </ul>
              <p>
                Платёжные данные (номер карты, CVV-код и т. п.) <strong className="text-canvas-bright">не обрабатываются и не хранятся</strong> Оператором.
                Они обрабатываются платёжными системами Stripe и Robokassa в соответствии с их политиками безопасности.
              </p>

              <h2 className="font-display font-semibold text-lg text-canvas-bright mt-4">3. Цели обработки</h2>
              <ul className="space-y-1 pl-5 list-disc">
                <li>Предоставление доступа к сервису PixelStake</li>
                <li>Обработка платежей и выдача чеков</li>
                <li>Информирование пользователей об изменениях в сервисе</li>
                <li>Обеспечение безопасности и предотвращение мошенничества</li>
                <li>Выполнение требований законодательства РФ</li>
              </ul>

              <h2 className="font-display font-semibold text-lg text-canvas-bright mt-4">4. Передача данных третьим лицам</h2>
              <p>
                Оператор не передаёт персональные данные третьим лицам, за исключением случаев:
              </p>
              <ul className="space-y-1 pl-5 list-disc">
                <li>Платёжные системы (Stripe, Robokassa) — для обработки платежей</li>
                <li>Государственные органы — по обоснованному требованию в соответствии с законом</li>
              </ul>

              <h2 className="font-display font-semibold text-lg text-canvas-bright mt-4">5. Безопасность</h2>
              <p>
                Оператор принимает необходимые технические меры для защиты персональных данных:
                шифрование паролей (bcrypt), HTTPS-соединение, ограничение доступа к базе данных.
              </p>

              <h2 className="font-display font-semibold text-lg text-canvas-bright mt-4">6. Права пользователя</h2>
              <p>Вы имеете право:</p>
              <ul className="space-y-1 pl-5 list-disc">
                <li>Запросить информацию о хранящихся о вас данных</li>
                <li>Потребовать удаления вашего аккаунта и всех связанных данных</li>
                <li>Отозвать согласие на обработку персональных данных</li>
              </ul>
              <p>
                Для реализации этих прав напишите на <a href="mailto:support@pixelstake.ru" className="text-orange-400 hover:underline">support@pixelstake.ru</a>.
                Срок рассмотрения запроса — до 30 дней.
              </p>

              <h2 className="font-display font-semibold text-lg text-canvas-bright mt-4">7. Cookies</h2>
              <p>
                Сайт использует cookies для обеспечения работы авторизации. Продолжая использование сайта,
                вы соглашаетесь с обработкой cookies.
              </p>

              <h2 className="font-display font-semibold text-lg text-canvas-bright mt-4">8. Контакты</h2>
              <p>Оператор: Самозанятый Пронкин Сергей Николаевич</p>
              <p>ИНН: 250202459700</p>
              <p>Email: <a href="mailto:support@pixelstake.ru" className="text-orange-400 hover:underline">support@pixelstake.ru</a></p>
            </div>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

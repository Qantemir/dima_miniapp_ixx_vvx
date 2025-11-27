import { useNavigate } from 'react-router-dom';
import { AdminPageLayout } from '@/components/AdminPageLayout';
import { Seo } from '@/components/Seo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LifeBuoy, Package, Boxes, Megaphone, Moon, AlertTriangle } from '@/components/icons';
import { useAdminGuard } from '@/hooks/useAdminGuard';

const QUICK_LINKS = [
  {
    label: 'Список заказов',
    description: 'Проверьте новые заказы и обновите статусы.',
    to: '/admin/orders',
    icon: Package,
  },
  {
    label: 'Каталог и остатки',
    description: 'Редактируйте товары, цены и варианты вкусов.',
    to: '/admin/catalog',
    icon: Boxes,
  },
  {
    label: 'Рассылка клиентам',
    description: 'Сообщите об акциях и статусе работы магазина.',
    to: '/admin/broadcast',
    icon: Megaphone,
  },
  {
    label: 'Режим сна',
    description: 'Включите паузу в работе магазина и задайте сообщение.',
    to: '/admin/store',
    icon: Moon,
  },
];

const STATUS_TIPS = [
  {
    title: 'В обработке → Принят',
    text: 'После проверки оплаты и чека переключите заказ в «Принят», чтобы клиент знал, что заказ собирается.',
  },
  {
    title: 'Выехал',
    text: 'Используйте, когда курьер выехал. Клиент получает уведомление в Telegram.',
  },
  {
    title: 'Завершён',
    text: 'Завершённые заказы мягко удаляются: их можно восстановить в течение 10 минут во вкладке заказа.',
  },
  {
    title: 'Отменён',
    text: 'При отмене система автоматически возвращает товары на склад по данным варианта.',
  },
];

const TROUBLESHOOTING_STEPS = [
  'Клиент не видит паузу: нажмите «Сохранить» в настройках сна и дождитесь подтверждения «статус обновлён». У клиентов всё обновляется через SSE + резервный опрос.',
  'Не проходит оплата: убедитесь, что файл чека читаемый и не превышает лимит, иначе предложите клиенту повторить.',
  'Рассылка падает: проверьте токен бота и лог Telegram. Недоступные получатели автоматически помечаются и исключаются.',
  'Редактор текста не даёт вводить данные: на мобильных устройствах лучше отключить режим «увеличения шрифта» в Telegram WebView или попросить пользователя обновить страницу.',
];

export const AdminHelpPage = () => {
  const navigate = useNavigate();
  const isAuthorized = useAdminGuard('/');
  const seoProps = {
    title: 'Админ: Помощь',
    description: 'Инструкции по управлению каталогом, заказами и режимом сна.',
    path: '/admin/help',
    noIndex: true,
  };

  if (!isAuthorized) {
    return null;
  }

  return (
    <>
      <Seo {...seoProps} />
      <AdminPageLayout
        title="Помощь"
        description="Собрали короткие инструкции, чтобы быстрее работать с заказами и режимом сна."
        icon={LifeBuoy}
        contentClassName="space-y-5"
        contentLabel="Инструкции для администраторов"
      >
        <section aria-label="Быстрые действия">
          <h2 className="text-base font-semibold text-foreground mb-3">Быстрые действия</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {QUICK_LINKS.map(link => {
              const Icon = link.icon;
              return (
                <Card key={link.to} className="border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Icon className="h-4 w-4 text-primary" />
                      {link.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-muted-foreground">
                    <p>{link.description}</p>
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate(link.to)}>
                      Перейти
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <section aria-label="Работа со статусами">
          <h2 className="text-base font-semibold text-foreground mb-3">Как работать со статусами</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {STATUS_TIPS.map(item => (
              <Card key={item.title} className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{item.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2" aria-label="Подробные советы">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Moon className="h-4 w-4 text-primary" />
                Режим сна
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                Включайте сон, когда нет возможности принимать заказы. Клиент увидит блокирующий экран и сообщение,
                которое вы указали.
              </p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Текст можно менять на ходу — обновление прилетит всем клиентам через пару секунд.</li>
                <li>Как только восстановите работу, просто отключите сон — корзины и заказы сохраняются.</li>
                <li>Если нужно проверить фронт в режиме клиента, временно выключите сон и снова включите после теста.</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Megaphone className="h-4 w-4 text-primary" />
                Рассылка и коммуникации
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                Рассылка отправляется партиями и автоматически исключает пользователей, которые запретили сообщения
                боту. Не используйте Markdown — текст отправляется «как есть».
              </p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Добавьте ссылку на чат поддержки, чтобы клиент мог задать вопрос.</li>
                <li>Не дублируйте сообщение чаще чем раз в несколько минут, чтобы Telegram не считал это спамом.</li>
              </ul>
            </CardContent>
          </Card>
        </section>

        <section aria-label="Диагностика ошибок">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-primary" />
                Если что-то пошло не так
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-2">
                {TROUBLESHOOTING_STEPS.map(step => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>
      </AdminPageLayout>
    </>
  );
};

export default AdminHelpPage;

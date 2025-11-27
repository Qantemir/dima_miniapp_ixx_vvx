import { OrderSectionCard } from '@/components/order/OrderSectionCard';

interface OrderCustomerSectionProps {
  name: string;
  phone: string;
  comment?: string | null;
}

export const OrderCustomerSection = ({ name, phone, comment }: OrderCustomerSectionProps) => (
  <OrderSectionCard className="space-y-2">
    <h3 className="font-semibold text-foreground text-sm sm:text-base">Контактная информация</h3>
    <div className="space-y-1 text-sm">
      <p className="text-muted-foreground">
        Имя: <span className="text-foreground">{name}</span>
      </p>
      <p className="text-muted-foreground">
        Телефон: <span className="text-foreground">{phone}</span>
      </p>
      {comment ? (
        <p className="text-muted-foreground">
          Комментарий: <span className="text-foreground">{comment}</span>
        </p>
      ) : null}
    </div>
  </OrderSectionCard>
);


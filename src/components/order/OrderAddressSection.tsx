import { MapPin } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { OrderSectionCard } from '@/components/order/OrderSectionCard';

interface OrderAddressSectionProps {
  address: string;
  editing: boolean;
  canEdit: boolean;
  saving: boolean;
  newAddress: string;
  onAddressChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onEditRequest: () => void;
}

export const OrderAddressSection = ({
  address,
  editing,
  canEdit,
  saving,
  newAddress,
  onAddressChange,
  onSave,
  onCancel,
  onEditRequest,
}: OrderAddressSectionProps) => (
  <OrderSectionCard className="space-y-3">
    <div className="flex items-center gap-2">
      <MapPin className="h-5 w-5 text-primary" />
      <Label className="text-base font-semibold">Адрес доставки</Label>
    </div>

    {editing ? (
      <div className="space-y-3">
        <Textarea
          value={newAddress}
          onChange={event => onAddressChange(event.target.value)}
          onInput={event => onAddressChange((event.target as HTMLTextAreaElement).value)}
          rows={3}
          disabled={saving}
          placeholder="Укажите адрес доставки"
          inputMode="text"
        />
        <div className="flex gap-2">
          <Button onClick={onSave} disabled={saving} className="flex-1">
            {saving ? 'Сохранение...' : 'Сохранить'}
          </Button>
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            Отмена
          </Button>
        </div>
      </div>
    ) : (
      <>
        <p className="text-foreground whitespace-pre-line">{address}</p>
        {canEdit ? (
          <Button variant="outline" size="sm" onClick={onEditRequest} className="w-full">
            Изменить адрес
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">
            Адрес нельзя изменить после того, как заказ принят
          </p>
        )}
      </>
    )}
  </OrderSectionCard>
);

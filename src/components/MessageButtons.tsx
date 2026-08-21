import { Button } from "@/components/ui/button";
import { openWhatsApp, openSMS } from "@/lib/whatsapp";
import { MessageCircle, MessageSquareText } from "lucide-react";

export function MessageButtons({
  phone,
  message,
  size = "sm",
}: {
  phone: string | null | undefined;
  message: string;
  size?: "sm" | "default";
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size={size} onClick={() => openWhatsApp(phone, message)}>
        <MessageCircle className="size-4" /> واتساب
      </Button>
      <Button variant="outline" size={size} onClick={() => openSMS(phone, message)}>
        <MessageSquareText className="size-4" /> رسالة نصية
      </Button>
    </div>
  );
}

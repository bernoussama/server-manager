import { ServiceCard } from "@/features/services/components/ServiceCard";
import { ServiceLogs } from "@/features/services/components/ServiceLogs";

export function ServicesView() {
  return (
    <div className="space-y-4">
      <div className="grid gap-6 md:grid-cols-3">
        <ServiceCard
          name="DNS Server"
          status="running"
          memory="128MB"
          cpu="2%"
        />
        <ServiceCard
          name="DHCP Server"
          status="running"
          memory="96MB"
          cpu="1%"
        />
        <ServiceCard
          name="HTTP Server"
          status="stopped"
          memory="0MB"
          cpu="0%"
        />
      </div>
      <ServiceLogs />
    </div>
  );
} 
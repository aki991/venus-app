"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DoctorAdminItem, ChairAdminItem } from "@/lib/db/admin";
import { DoctorsTab } from "./DoctorsTab";
import { ChairsTab } from "./ChairsTab";
import { AiBookingTab } from "./AiBookingTab";

export function AdminPanel({
  doctors,
  chairs,
  aiDefaultDoctorId,
}: {
  doctors: DoctorAdminItem[];
  chairs: ChairAdminItem[];
  aiDefaultDoctorId: string | null;
}) {
  return (
    <Tabs defaultValue="doktori" className="w-full">
      <TabsList className="border border-venus-border bg-venus-canvas p-1 group-data-[orientation=horizontal]/tabs:h-12">
        <TabsTrigger value="doktori" className="px-4 text-base">
          Doktori
        </TabsTrigger>
        <TabsTrigger value="stolice" className="px-4 text-base">
          Stolice
        </TabsTrigger>
        <TabsTrigger value="ai" className="px-4 text-base">
          AI zakazivanje
        </TabsTrigger>
      </TabsList>

      <TabsContent value="doktori" className="mt-4">
        <DoctorsTab doctors={doctors} />
      </TabsContent>
      <TabsContent value="stolice" className="mt-4">
        <ChairsTab chairs={chairs} />
      </TabsContent>
      <TabsContent value="ai" className="mt-4">
        <AiBookingTab currentDoctorId={aiDefaultDoctorId} />
      </TabsContent>
    </Tabs>
  );
}

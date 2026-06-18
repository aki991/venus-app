"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DoctorAdminItem, ChairAdminItem } from "@/lib/db/admin";
import { DoctorsTab } from "./DoctorsTab";
import { ChairsTab } from "./ChairsTab";

export function AdminPanel({
  doctors,
  chairs,
}: {
  doctors: DoctorAdminItem[];
  chairs: ChairAdminItem[];
}) {
  return (
    <Tabs defaultValue="doktori" className="w-full">
      <TabsList>
        <TabsTrigger value="doktori">Doktori</TabsTrigger>
        <TabsTrigger value="stolice">Stolice</TabsTrigger>
      </TabsList>

      <TabsContent value="doktori" className="mt-4">
        <DoctorsTab doctors={doctors} />
      </TabsContent>
      <TabsContent value="stolice" className="mt-4">
        <ChairsTab chairs={chairs} />
      </TabsContent>
    </Tabs>
  );
}

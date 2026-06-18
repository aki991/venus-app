// Deljeni tipovi za admin akcije (plain modul — sme da se importuje i na klijentu).

export type ActionResult = { success: true } | { error: string };

export interface CreateDoctorInput {
  firstName: string;
  lastName: string;
  initials: string;
  colorHex: string;
  specialty: string;
  phone: string;
  email: string;
  sendInvite: boolean;
  noEmail: boolean;
}

export interface UpdateDoctorInput {
  firstName: string;
  lastName: string;
  initials: string;
  colorHex: string;
  specialty: string;
  phone: string;
}

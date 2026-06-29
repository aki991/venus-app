-- Dodaj anatomske zone (kruna, koren) u tooth_surface enum
-- za klikabilni anatomski prikaz zuba
ALTER TYPE public.tooth_surface ADD VALUE IF NOT EXISTS 'kruna';
ALTER TYPE public.tooth_surface ADD VALUE IF NOT EXISTS 'koren';

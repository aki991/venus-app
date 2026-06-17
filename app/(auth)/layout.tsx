export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-venus-bg px-4 py-10">
      <div className="w-full max-w-[440px] space-y-8">
        <div className="space-y-1 text-center">
          <h1 className="font-serif text-5xl font-bold tracking-wide text-venus-gold">
            VENUS
          </h1>
          <p className="text-xs uppercase tracking-[0.25em] text-venus-text-faint">
            Stomatološka ordinacija
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}

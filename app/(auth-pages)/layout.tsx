export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[calc(100vh-8rem)] w-full flex flex-col items-center justify-center">{children}</div>
  );
}

import { Skeleton } from "@/shared/ui/skeleton";

export function MeetingLoading({ variant }: { variant: "list" | "detail" }) {
  const label = variant === "list" ? "Loading meetings" : "Loading meeting";
  return <div aria-busy="true" aria-label={label} className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-10" role="status">
    <Skeleton className="h-8 w-40" />
    {variant === "list" ? <><div className="grid gap-3 sm:grid-cols-3"><Skeleton className="h-10" /><Skeleton className="h-10" /><Skeleton className="h-10" /></div><div className="space-y-1 rounded-lg border p-5">{Array.from({ length: 5 }, (_, index) => <Skeleton className="h-14 w-full" key={index} />)}</div></> : <><Skeleton className="h-10 w-2/3" /><Skeleton className="h-5 w-56" /><Skeleton className="h-52 w-full" /></>}
  </div>;
}

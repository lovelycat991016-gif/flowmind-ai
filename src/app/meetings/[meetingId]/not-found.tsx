import { buttonVariants } from "@/shared/ui/button";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
      <h1 className="text-xl font-semibold">Meeting not found</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        This meeting is unavailable or no longer exists.
      </p>
      <Link
        className={`${buttonVariants({ variant: "outline" })} mt-6`}
        href="/meetings"
      >
        Back to meetings
      </Link>
    </div>
  );
}

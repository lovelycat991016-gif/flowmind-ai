"use client";

import { useEffect, useRef, useState } from "react";
import { deleteMeetingAction } from "@/features/meetings/actions/delete-meeting";
import { Button } from "@/shared/ui/button";
import { t, zhCN } from "@/shared/i18n/zh-CN";

export function DeleteMeetingDialog({
  meetingId,
  title,
}: {
  meetingId: string;
  title: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const close = () => {
    triggerRef.current?.focus();
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    const first = dialog?.querySelector<HTMLElement>("button, [href], input");
    first?.focus();
  }, [open]);

  return (
    <>
      <Button
        className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
        onClick={() => setOpen(true)}
        ref={triggerRef}
        type="button"
        variant="outline"
      >
        {zhCN.meetings.deleteMeeting}
      </Button>
      {open ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <div
            aria-describedby="delete-description"
            aria-labelledby="delete-title"
            aria-modal="true"
            className="bg-card w-full max-w-md rounded-lg border p-6 shadow-xl"
            onKeyDown={(event) => {
              if (event.key === "Escape") close();
            }}
            ref={dialogRef}
            role="dialog"
          >
            <h2 className="text-lg font-semibold" id="delete-title">
              {t("meetings", "deleteTitle", { title })}
            </h2>
            <p
              className="text-muted-foreground mt-2 text-sm"
              id="delete-description"
            >
              {zhCN.meetings.deleteDescription}
            </p>
            <form
              action={deleteMeetingAction}
              className="mt-6 flex justify-end gap-3"
            >
              <input name="id" type="hidden" value={meetingId} />
              <Button onClick={close} type="button" variant="outline">
                {zhCN.common.cancel}
              </Button>
              <Button
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                type="submit"
              >
                {zhCN.meetings.deletePermanently}
              </Button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

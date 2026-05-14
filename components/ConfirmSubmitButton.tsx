"use client";

import { useFormStatus } from "react-dom";

type ConfirmSubmitButtonProps = {
  children: React.ReactNode;
  confirmMessage: string;
  pendingLabel?: string;
  className: string;
  disabled?: boolean;
};

export default function ConfirmSubmitButton({
  children,
  confirmMessage,
  pendingLabel = "Processando...",
  className,
  disabled = false,
}: ConfirmSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      onClick={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
      className={className}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

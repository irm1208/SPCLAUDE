import { useId, type InputHTMLAttributes } from "react";
import { TESTING_LABS } from "@/lib/labs";
import { Input } from "./ui";

/** Native suggestions keep existing and custom lab names editable. */
export function LabInput(props: Omit<InputHTMLAttributes<HTMLInputElement>, "list">) {
  const listId = useId();
  return (
    <>
      <Input maxLength={80} {...props} list={listId} />
      <datalist id={listId}>
        {TESTING_LABS.map(lab => <option key={lab.name} value={lab.name} />)}
      </datalist>
    </>
  );
}

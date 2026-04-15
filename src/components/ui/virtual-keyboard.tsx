"use client";

import { useEffect, useRef, useState } from "react";
import Keyboard from "react-simple-keyboard";
import type { KeyboardReactInterface } from "react-simple-keyboard";
import { cn } from "@/lib/utils";

type LayoutName = "default" | "shift" | "symbols";

interface VirtualKeyboardProps {
  value: string;
  onChange: (value: string) => void;
  onDone: () => void;
  className?: string;
}

export function VirtualKeyboard({
  value,
  onChange,
  onDone,
  className,
}: VirtualKeyboardProps) {
  const keyboardRef = useRef<KeyboardReactInterface | null>(null);
  const [layoutName, setLayoutName] = useState<LayoutName>("default");

  useEffect(() => {
    keyboardRef.current?.setInput(value);
  }, [value]);

  function handleKeyPress(button: string) {
    switch (button) {
      case "{shift}":
      case "{lock}":
        setLayoutName((current) => (current === "shift" ? "default" : "shift"));
        return;
      case "{numbers}":
        setLayoutName("symbols");
        return;
      case "{abc}":
        setLayoutName("default");
        return;
      case "{done}":
        onDone();
        return;
      default:
        if (layoutName === "shift" && !button.startsWith("{")) {
          setLayoutName("default");
        }
    }
  }

  return (
    <div
      className={cn(
        "matterhub-keyboard w-full select-none border-t border-border bg-surface px-2 py-2",
        className,
      )}
    >
      <Keyboard
        keyboardRef={(instance) => {
          keyboardRef.current = instance;
        }}
        layoutName={layoutName}
        onChange={onChange}
        onKeyPress={handleKeyPress}
        preventMouseDownDefault
        preventMouseUpDefault
        stopMouseDownPropagation
        stopMouseUpPropagation
        disableCaretPositioning
        layout={{
          default: [
            "q w e r t y u i o p",
            "a s d f g h j k l",
            "{shift} z x c v b n m {bksp}",
            "{numbers} {space} @ . - _ {done}",
          ],
          shift: [
            "Q W E R T Y U I O P",
            "A S D F G H J K L",
            "{shift} Z X C V B N M {bksp}",
            "{numbers} {space} @ . - _ {done}",
          ],
          symbols: [
            "1 2 3 4 5 6 7 8 9 0",
            "! @ # $ % ^ & * ( )",
            "- _ = + / ; : ' \" {bksp}",
            "{abc} {space} , . \\ ~ {done}",
          ],
        }}
        display={{
          "{shift}": "Shift",
          "{numbers}": "123",
          "{abc}": "ABC",
          "{bksp}": "Delete",
          "{space}": "Space",
          "{done}": "Done",
        }}
        buttonTheme={[
          {
            class: "matterhub-keyboard-action",
            buttons: "{shift} {numbers} {abc} {bksp} {done}",
          },
          {
            class: "matterhub-keyboard-space",
            buttons: "{space}",
          },
        ]}
      />
    </div>
  );
}

"use client";

import React from "react";
import {Button, Tooltip} from "@heroui/react";
import {Icon} from "@iconify/react";
import {cn} from "@heroui/react";

import PromptInput from "./PromptInput";

interface PromptInputWithRegenerateButtonProps {
  onSendMessage?: (message: string) => Promise<void>;
  isLoading?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export default function Component({
  onSendMessage,
  isLoading = false,
  placeholder = "Enter a prompt here",
  disabled = false
}: PromptInputWithRegenerateButtonProps) {
  const [isRegenerating, setIsRegenerating] = React.useState<boolean>(false);
  const [prompt, setPrompt] = React.useState<string>("");
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const onRegenerate = () => {
    setIsRegenerating(true);

    setTimeout(() => {
      setIsRegenerating(false);
    }, 1000);
  };

  const handleSendMessage = () => {
    if (prompt.trim() && onSendMessage) {
      onSendMessage(prompt);
      setPrompt("");
    }
  };

  // Handle key events to support Enter for submit and Shift+Enter for new line
  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // If the key pressed is Enter
    if (event.key === 'Enter') {
      // If Shift is held, allow the default behavior (new line)
      if (event.shiftKey) {
        return;
      }

      // Otherwise prevent default and send the message if possible
      event.preventDefault();

      if (prompt.trim() && !isLoading && !disabled) {
        handleSendMessage();
      }
    }
  };

  return (
    <div className="flex w-full flex-col gap-4">
      <div>
        <Button
          isDisabled={isRegenerating || isLoading || disabled}
          size="sm"
          startContent={
            <Icon
              className={cn("text-medium", isRegenerating ? "origin-center animate-spin" : "")}
              icon="solar:restart-linear"
            />
          }
          variant="flat"
          onPress={onRegenerate}
        >
          Regenerate
        </Button>
      </div>
      <form
        className="flex w-full flex-col items-start rounded-medium bg-default-100 transition-colors hover:bg-default-200/70"
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
      >
        <PromptInput
          ref={textareaRef}
          classNames={{
            inputWrapper: "!bg-transparent shadow-none",
            innerWrapper: "relative",
            input: "pt-1 pl-2 pb-6 !pr-10 text-medium",
          }}
          endContent={
            <div className="flex items-end gap-2">
              <Tooltip showArrow content="Send message">
                <Button
                  isIconOnly
                  color={!prompt ? "default" : "primary"}
                  isDisabled={!prompt || isLoading || disabled}
                  radius="lg"
                  size="sm"
                  variant="solid"
                  onPress={handleSendMessage}
                  type="submit"
                >
                  <Icon
                    className={cn(
                      "[&>path]:stroke-[2px]",
                      !prompt ? "text-default-600" : "text-primary-foreground",
                    )}
                    icon="solar:arrow-up-linear"
                    width={20}
                  />
                </Button>
              </Tooltip>
            </div>
          }
          minRows={3}
          radius="lg"
          value={prompt}
          variant="flat"
          onValueChange={setPrompt}
          isDisabled={isLoading || disabled}
          placeholder={placeholder}
          onKeyDown={handleKeyDown}
        />
        <div className="flex w-full flex-wrap items-center justify-between gap-2 px-4 pb-4">
          <div className="flex flex-wrap gap-3">
            <Button
              size="sm"
              startContent={
                <Icon className="text-default-500" icon="solar:paperclip-linear" width={18} />
              }
              variant="flat"
              isDisabled={isLoading || disabled}
            >
              Attach
            </Button>
            <Button
              size="sm"
              startContent={
                <Icon className="text-default-500" icon="solar:soundwave-linear" width={18} />
              }
              variant="flat"
              isDisabled={isLoading || disabled}
            >
              Voice Commands
            </Button>
            <Button
              size="sm"
              startContent={
                <Icon className="text-default-500" icon="solar:notes-linear" width={18} />
              }
              variant="flat"
              isDisabled={isLoading || disabled}
            >
              Templates
            </Button>
          </div>
          <div className="flex flex-col items-end">
            <p className="py-1 text-tiny text-default-400">{prompt.length}/2000</p>
            <span className="text-xs text-default-400">Enter to send, Shift+Enter for new line</span>
          </div>
        </div>
      </form>
    </div>
  );
}

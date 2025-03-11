"use client";

import React, { useState, useEffect, useRef } from "react";
import { ScrollShadow } from "@heroui/react";
import Conversation from "./Conversation";
import PromptInputWithRegenerateButton from "./PromptInputWithRegenerateButton";
import MessageCard from "./MessageCard";
import { assistantMessages, userMessages } from "./Messages";

interface ChatProps {
  workflowID?: string;
  onSendMessage?: (message: string) => Promise<void>;
}

export default function Chat({ workflowID, onSendMessage }: ChatProps) {
  const [customMessages, setCustomMessages] = useState<Array<{ role: string; message: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Function to handle sending a new message
  const handleSendMessage = async (messageText: string) => {
    if (!messageText.trim()) return;

    // Add user message to local state
    const userMessage = {
      role: "user",
      message: messageText,
    };

    setCustomMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // If onSendMessage prop exists, use it
      if (onSendMessage) {
        await onSendMessage(messageText);
      }

      // Simulate a response for now - in production this would come from the workflow
      setTimeout(() => {
        const botMessage = {
          role: "assistant",
          message: `This is a simulated response to: "${messageText}"`,
        };
        setCustomMessages(prev => [...prev, botMessage]);
        setIsLoading(false);
      }, 1000);
    } catch (error) {
      console.error("Error sending message:", error);
      setIsLoading(false);
    }
  };

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [customMessages]);

  // Custom conversation component that extends the existing one
  const CustomConversation = () => {
    // Only show the existing demo messages if we have no custom messages
    if (customMessages.length === 0) {
      return <Conversation />;
    }

    return (
      <div className="flex flex-col gap-4 px-1">
        {customMessages.map((message, index) => (
          <MessageCard
            key={index}
            avatar={
              message.role === "assistant"
                ? "https://nextuipro.nyc3.cdn.digitaloceanspaces.com/components-images/avatar_ai.png"
                : "https://d2u8k2ocievbld.cloudfront.net/memojis/male/6.png"
            }
            message={message.message}
            messageClassName={message.role === "user" ? "bg-content3 text-content3-foreground" : ""}
          />
        ))}

        {isLoading && (
          <MessageCard
            avatar="https://nextuipro.nyc3.cdn.digitaloceanspaces.com/components-images/avatar_ai.png"
            message="Thinking..."
            status="loading"
          />
        )}
      </div>
    );
  };

  // Custom PromptInput with our handler
  const CustomPromptInput = () => {
    return (
      <PromptInputWithRegenerateButton
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
      />
    );
  };

  return (
    <div className="flex h-full w-full max-w-full flex-col">
      <div className="flex w-full flex-wrap items-center justify-between gap-2 border-b-small border-divider py-2 px-4">
        <p className="text-base font-medium">Chatbot</p>
        <p className="text-xs text-default-400">Workflow ID: {workflowID || 'Not connected'}</p>
      </div>

      <ScrollShadow className="flex flex-1 flex-col p-4 overflow-y-auto" ref={scrollRef}>
        <CustomConversation />
      </ScrollShadow>

      <div className="p-4 border-t border-divider">
        <CustomPromptInput />
      </div>
    </div>
  );
}

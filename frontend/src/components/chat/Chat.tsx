"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { ScrollShadow } from "@heroui/react";
import PromptInputWithRegenerateButton from "./PromptInputWithRegenerateButton";
import MessageCard from "./MessageCard";
import { useChatWorkflowExecution } from "../../hooks/useChatWorkflowExecution";

interface ChatProps {
  workflowID?: string;
  onSendMessage?: (message: string) => Promise<void>;
}

// Use React.memo to prevent unnecessary re-renders
const Chat = React.memo(function Chat({ workflowID, onSendMessage }: ChatProps) {
  const [messages, setMessages] = useState<Array<{ role: string; message: string }>>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Use our custom hook for workflow execution
  const {
    isLoading,
    error,
    executeWorkflow,
    cleanup,
    sessionId
  } = useChatWorkflowExecution({ workflowID });

  // Load messages from session storage on initial load
  useEffect(() => {
    if (workflowID) {
      const storedMessages = sessionStorage.getItem(`chat_messages_${workflowID}`);
      if (storedMessages) {
        try {
          setMessages(JSON.parse(storedMessages));
        } catch (e) {
          console.error('Error parsing stored messages:', e);
        }
      }
    }
  }, [workflowID]);

  // Save messages to session storage when they change
  useEffect(() => {
    if (workflowID && messages.length > 0) {
      sessionStorage.setItem(`chat_messages_${workflowID}`, JSON.stringify(messages));
    }
  }, [messages, workflowID]);

  // Function to handle sending a new message - use useCallback to make it stable
  const handleSendMessage = useCallback(async (messageText: string) => {
    if (!messageText.trim()) return;

    // Add user message to local state
    const userMessage = {
      role: "user",
      message: messageText,
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      // If onSendMessage prop exists, use it (for custom handlers)
      if (onSendMessage) {
        await onSendMessage(messageText);
      }

      // Execute the workflow with the message
      if (workflowID) {
        const response = await executeWorkflow(messageText);

        // Add the assistant's response if we got one
        if (response) {
          setMessages(prev => [...prev, response]);
        }
      } else {
        // Fallback for when no workflow is connected
        setTimeout(() => {
          const botMessage = {
            role: "assistant",
            message: `This is a simulated response (no workflow connected): "${messageText}"`,
          };
          setMessages(prev => [...prev, botMessage]);
        }, 1000);
      }
    } catch (err) {
      console.error("Error sending message:", err);
      // Add an error message
      setMessages(prev => [...prev, {
        role: "assistant",
        message: "Sorry, an error occurred while processing your message."
      }]);
    }
  }, [onSendMessage, workflowID, executeWorkflow]);

  // Handle clearing the chat history
  const handleClearChat = useCallback(() => {
    if (workflowID) {
      sessionStorage.removeItem(`chat_messages_${workflowID}`);
    }
    setMessages([]);
  }, [workflowID]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Clean up intervals when component unmounts
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // Custom conversation component
  const CustomConversation = useCallback(() => {
    if (messages.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] h-full p-4 text-center">
          <div className="mb-4">
            <img
              src="https://nextuipro.nyc3.cdn.digitaloceanspaces.com/components-images/avatar_ai.png"
              alt="Chatbot"
              className="w-16 h-16 rounded-full"
            />
          </div>
          <h3 className="text-lg font-semibold mb-2">Welcome to the Workflow Chatbot</h3>
          <p className="text-default-500 mb-4 max-w-md">
            {workflowID
              ? "This chatbot is powered by your workflow. Send a message to get started!"
              : "No workflow is connected yet. Please connect a workflow to use this chatbot."}
          </p>
          {!workflowID && (
            <p className="text-xs text-default-400 mb-2">
              Tip: Build a workflow that takes a message input and produces a response output.
            </p>
          )}
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-4 px-1">
        {messages.map((message, index) => (
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

        {error && (
          <MessageCard
            avatar="https://nextuipro.nyc3.cdn.digitaloceanspaces.com/components-images/avatar_ai.png"
            message={`Error: ${error}`}
            messageClassName="bg-danger-100 text-danger-700"
          />
        )}
      </div>
    );
  }, [messages, isLoading, error, workflowID]);

  // Custom PromptInput with our handler
  const CustomPromptInput = useCallback(() => {
    return (
      <PromptInputWithRegenerateButton
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
        placeholder={workflowID ? "Send a message..." : "No workflow connected"}
        disabled={!workflowID}
      />
    );
  }, [handleSendMessage, isLoading, workflowID]);

  return (
    <div className="flex h-full w-full max-w-full flex-col">
      <div className="flex w-full flex-wrap items-center justify-between gap-2 border-b-small border-divider py-2 px-4">
        <p className="text-base font-medium">Chatbot</p>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={handleClearChat}
              className="text-xs text-default-500 hover:text-default-700"
              aria-label="Clear chat history"
            >
              Clear history
            </button>
          )}
          <p className="text-xs text-default-400">
            {workflowID ? `Connected to workflow: ${workflowID}` : 'Not connected to a workflow'}
          </p>
        </div>
      </div>

      <ScrollShadow className="flex flex-1 flex-col p-4 overflow-y-auto" ref={scrollRef}>
        <CustomConversation />
      </ScrollShadow>

      <div className="p-4 border-t border-divider">
        <CustomPromptInput />
      </div>
    </div>
  );
});

export default Chat;

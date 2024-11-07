"use client";

import type { CardProps } from "@nextui-org/react";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardBody,
  Button,
  Input,
  CardFooter,
} from "@nextui-org/react";
import { listApiKeys, setApiKey, getApiKey } from "../../utils/api";

export default function Component(props: CardProps) {
  const [keys, setKeys] = useState<{ name: string; value: string }[]>([]);
  const [originalKeys, setOriginalKeys] = useState<{ name: string; value: string }[]>([]);

  useEffect(() => {
    const fetchApiKeys = async () => {
      try {
        const keys = await listApiKeys();
        const keyValues = await Promise.all(
          keys.map(async (key: string) => {
            const value = await getApiKey(key);
            return { name: value.name, value: value.value };
          })
        );

        setKeys(keyValues);
        setOriginalKeys(keyValues);

      } catch (error) {
        console.error("Error fetching API keys:", error);
      }
    };

    fetchApiKeys();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setKeys((prevKeys) =>
      prevKeys.map((key) =>
        key.name === name ? { ...key, value: value } : key
      )
    );
  };

  const saveApiKeys = async () => {
    try {
      await Promise.all(
        keys.map(({ name, value }) => setApiKey(name, value))
      );
      setOriginalKeys(keys);
      console.log("API Keys saved:", keys);
    } catch (error) {
      console.error("Error saving API keys:", error);
    }
  };

  const hasChanges = () => {
    return keys.some((key, index) => key.value !== originalKeys[index].value);
  };

  return (
    <Card className="max-w-xl p-2" {...props}>
      <CardBody className="grid grid-cols-1 gap-4">
        {keys.map(({ name, value }) => (
          <Input
            key={name}
            label={name}
            labelPlacement="outside"
            placeholder={`Enter value`}
            name={name}
            value={value}
            onFocus={() => handleInputChange({ target: { name, value: '' } })}
            onChange={handleInputChange}
          />
        ))}
      </CardBody>
      {hasChanges() && (
        <CardFooter className="flex justify-between">
          <Button 
            onPress={saveApiKeys}
            className="bg-primary text-white"
          >
            Save API Keys
          </Button>
          <Button
            onPress={() => setKeys(originalKeys)}
            className="bg-secondary text-primary"
          >
            Cancel
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

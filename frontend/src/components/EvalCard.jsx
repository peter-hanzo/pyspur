import React from "react";
import { Card, CardBody, CardFooter, Button } from "@nextui-org/react";
import { Icon } from "@iconify/react";

export default function EvalCard({ title, description, type, dataPoints, paperLink, onRun }) {
  return (
    <Card className="relative w-full">
      <CardBody className="relative min-h-[220px] bg-gradient-to-br from-content1 to-default-100/50 p-6">
        <h2 className="text-xl font-semibold mb-2">{title}</h2>
        <p className="text-default-500 text-sm mb-3">{description}</p>
        <p className="text-default-500 text-sm mb-1"><strong>Type:</strong> {type}</p>
        <p className="text-default-500 text-sm mb-1"><strong>Data Points:</strong> {dataPoints}</p>
        {paperLink && (
          <a href={paperLink} target="_blank" rel="noopener noreferrer" className="text-blue-500 text-sm">
            Original Paper
          </a>
        )}
      </CardBody>
      <CardFooter className="border-t-1 border-default-100 justify-end py-2 px-4">
        <Button
          color="primary"
          variant="flat"
          onPress={onRun}
          startContent={<Icon icon="solar:play-linear" width={16} />}
        >
          Run Eval
        </Button>
      </CardFooter>
    </Card>
  );
}
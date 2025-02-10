import { Button, Card, CardBody, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from '@heroui/react'
import { Icon } from '@iconify/react'

interface HelpModalProps {
    isOpen: boolean
    onClose: () => void
}

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} size="2xl">
            <ModalContent>
                <ModalHeader>How can we help you? 🤝</ModalHeader>
                <ModalBody>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card
                            className="cursor-pointer hover:scale-[1.02] transition-transform"
                            isPressable
                            onPress={() => window.open('https://calendly.com/d/cnf9-57m-bv3/pyspur-founders', '_blank')}
                        >
                            <CardBody className="flex flex-col items-center gap-4 p-6">
                                <Icon icon="solar:calendar-linear" className="w-12 h-12 text-primary" />
                                <div className="text-center">
                                    <h3 className="text-lg font-semibold mb-2">Talk to the Founders</h3>
                                    <p className="text-sm text-default-500">
                                        Schedule a call with our founders to discuss your needs and get personalized
                                        help
                                    </p>
                                </div>
                            </CardBody>
                        </Card>

                        <Card
                            className="cursor-pointer hover:scale-[1.02] transition-transform"
                            isPressable
                            onPress={() => window.open('https://github.com/pyspur-dev/pyspur', '_blank')}
                        >
                            <CardBody className="flex flex-col items-center gap-4 p-6">
                                <Icon icon="solar:book-linear" className="w-12 h-12 text-primary" />
                                <div className="text-center">
                                    <h3 className="text-lg font-semibold mb-2">Documentation</h3>
                                    <p className="text-sm text-default-500">
                                        Browse our comprehensive documentation to learn more about PySpur&apos;s
                                        features
                                    </p>
                                </div>
                            </CardBody>
                        </Card>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button color="danger" variant="light" onPress={onClose}>
                        Close
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    )
}

import { RunResponse, RunStatus } from '@/types/api_types/runSchemas'
import { getWorkflowRuns } from '@/utils/api'
import type { DateValue } from '@heroui/react'
import {
    Button,
    Chip,
    DatePicker,
    Input,
    Spinner,
    Table,
    TableBody,
    TableCell,
    TableColumn,
    TableHeader,
    TableRow,
} from '@heroui/react'
import { Icon } from '@iconify/react'
import { formatDistanceToNow } from 'date-fns'
import { useRouter } from 'next/router'
import React, { useEffect, useState } from 'react'
import NodeOutputDisplay from './nodes/NodeOutputDisplay'

interface TraceTableProps {
    workflowId: string
}

const getStatusColor = (status: RunStatus): 'success' | 'warning' | 'danger' | 'default' => {
    switch (status) {
        case 'COMPLETED':
            return 'success'
        case 'RUNNING':
        case 'PENDING':
        case 'PAUSED':
            return 'warning'
        case 'FAILED':
        case 'CANCELLED':
            return 'danger'
        default:
            return 'default'
    }
}

const getStatusIcon = (status: RunStatus): string => {
    switch (status) {
        case 'COMPLETED':
            return 'solar:check-circle-linear'
        case 'RUNNING':
            return 'solar:running-linear'
        case 'PENDING':
            return 'solar:clock-circle-linear'
        case 'PAUSED':
            return 'solar:pause-circle-linear'
        case 'FAILED':
            return 'solar:danger-circle-linear'
        case 'CANCELLED':
            return 'solar:close-circle-linear'
        default:
            return 'solar:question-circle-linear'
    }
}

const TraceTable: React.FC<TraceTableProps> = ({ workflowId }) => {
    const router = useRouter()
    const [runs, setRuns] = useState<RunResponse[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [startDate, setStartDate] = useState<DateValue>(null)
    const [endDate, setEndDate] = useState<DateValue>(null)
    const [startTime, setStartTime] = useState<string>('00:00')
    const [endTime, setEndTime] = useState<string>('23:59')

    const fetchRuns = async () => {
        try {
            setIsLoading(true)
            let start: Date | undefined
            let end: Date | undefined

            if (startDate) {
                const [hours, minutes] = startTime.split(':').map(Number)
                start = new Date(startDate.toString())
                start.setHours(hours, minutes, 0, 0)
            }

            if (endDate) {
                const [hours, minutes] = endTime.split(':').map(Number)
                end = new Date(endDate.toString())
                end.setHours(hours, minutes, 59, 999)
            }

            const workflowRuns = await getWorkflowRuns(workflowId, 1, 100, start, end)
            // Sort runs by start time in descending order (newest first)
            const sortedRuns = workflowRuns.sort((a, b) => {
                const dateA = a.start_time ? new Date(a.start_time).getTime() : 0
                const dateB = b.start_time ? new Date(b.start_time).getTime() : 0
                return dateB - dateA
            })
            setRuns(sortedRuns)
        } catch (error) {
            console.error('Error fetching workflow runs:', error)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchRuns()
        // Set up polling for active runs
        const intervalId = setInterval(() => {
            const hasActiveRuns = runs.some(
                (run) => run.status === 'RUNNING' || run.status === 'PENDING' || run.status === 'PAUSED'
            )
            if (hasActiveRuns) {
                fetchRuns()
            }
        }, 5000) // Poll every 5 seconds if there are active runs

        return () => clearInterval(intervalId)
    }, [workflowId, startDate, endDate, startTime, endTime])

    const handleApplyFilter = () => {
        fetchRuns()
    }

    const handleClearFilter = () => {
        setStartDate(null)
        setEndDate(null)
        setStartTime('00:00')
        setEndTime('23:59')
    }

    const columns = [
        { key: 'run_id', label: 'Run ID' },
        { key: 'time', label: 'Time' },
        { key: 'inputs', label: 'Inputs' },
        { key: 'duration', label: 'Duration' },
        { key: 'status', label: 'Status' },
    ]

    const handleRunClick = (runId: string) => {
        router.push(`/trace/${runId}`)
    }

    const formatDuration = (startTime?: string, endTime?: string) => {
        if (!startTime) return '-'

        const start = new Date(startTime)
        const end = endTime ? new Date(endTime) : new Date()

        // Calculate duration in seconds
        const durationInSeconds = (end.getTime() - start.getTime()) / 1000

        // Format the duration in a more readable way
        if (durationInSeconds < 60) {
            return `${Math.round(durationInSeconds)}s`
        } else if (durationInSeconds < 3600) {
            return `${Math.floor(durationInSeconds / 60)}m ${Math.round(durationInSeconds % 60)}s`
        } else {
            const hours = Math.floor(durationInSeconds / 3600)
            const minutes = Math.floor((durationInSeconds % 3600) / 60)
            return `${hours}h ${minutes}m`
        }
    }

    if (isLoading) {
        return (
            <div className="flex justify-center p-4">
                <Spinner size="lg" />
            </div>
        )
    }

    if (runs.length === 0) {
        return <div className="flex justify-center p-8 text-default-500">No runs found for this spur</div>
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-4 items-end">
                <div className="flex flex-col gap-2">
                    <label className="text-sm text-default-600">Start Date</label>
                    <DatePicker
                        value={startDate}
                        onChange={setStartDate}
                        labelPlacement="outside"
                        classNames={{
                            base: 'min-w-[200px]',
                            input: 'min-w-[200px]',
                        }}
                    />
                </div>
                <div className="flex flex-col gap-2">
                    <label className="text-sm text-default-600">Start Time</label>
                    <Input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="min-w-[150px]"
                    />
                </div>
                <div className="flex flex-col gap-2">
                    <label className="text-sm text-default-600">End Date</label>
                    <DatePicker
                        value={endDate}
                        onChange={setEndDate}
                        labelPlacement="outside"
                        classNames={{
                            base: 'min-w-[200px]',
                            input: 'min-w-[200px]',
                        }}
                    />
                </div>
                <div className="flex flex-col gap-2">
                    <label className="text-sm text-default-600">End Time</label>
                    <Input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="min-w-[150px]"
                    />
                </div>
                <div className="flex gap-2">
                    <Button color="primary" onClick={handleApplyFilter}>
                        Apply Filter
                    </Button>
                    <Button variant="flat" onClick={handleClearFilter}>
                        Clear
                    </Button>
                </div>
            </div>

            <Table aria-label="Spur Runs" isHeaderSticky>
                <TableHeader columns={columns}>
                    {(column) => <TableColumn key={column.key}>{column.label}</TableColumn>}
                </TableHeader>
                <TableBody items={runs}>
                    {(run) => (
                        <TableRow key={run.id}>
                            {(columnKey) => (
                                <TableCell>
                                    {columnKey === 'time' ? (
                                        <span className="text-default-500">
                                            {formatDistanceToNow(new Date(run.start_time || ''), { addSuffix: true })}
                                        </span>
                                    ) : columnKey === 'inputs' ? (
                                        <div>
                                            {run.initial_inputs ? (
                                                <div className="border rounded-lg overflow-hidden">
                                                    <NodeOutputDisplay
                                                        output={Object.values(run.initial_inputs)[0] || {}}
                                                        maxHeight="100px"
                                                    />
                                                </div>
                                            ) : (
                                                <span className="text-default-400">No inputs</span>
                                            )}
                                        </div>
                                    ) : columnKey === 'run_id' ? (
                                        <Chip
                                            size="sm"
                                            variant="flat"
                                            className="cursor-pointer"
                                            onClick={() => handleRunClick(run.id)}
                                        >
                                            {run.id}
                                        </Chip>
                                    ) : columnKey === 'duration' ? (
                                        <span>{formatDuration(run.start_time, run.end_time)}</span>
                                    ) : columnKey === 'status' ? (
                                        <Chip
                                            size="sm"
                                            variant="flat"
                                            color={getStatusColor(run.status)}
                                            startContent={<Icon icon={getStatusIcon(run.status)} width={16} />}
                                        >
                                            {run.status}
                                        </Chip>
                                    ) : null}
                                </TableCell>
                            )}
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    )
}

export default TraceTable

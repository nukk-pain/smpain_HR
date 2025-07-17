import React, { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAuth } from '@/components/AuthProvider'
import { useNotification } from '@/components/NotificationProvider'
import apiService from '@/services/api'
import { LeaveRequest } from '@/types'

const LeaveManagement: React.FC = () => {
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState<Date | undefined>()
  const { user } = useAuth()
  const { showSuccess } = useNotification()

  useEffect(() => {
    apiService.getLeaveRequests().then((res) => setRequests(res))
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">휴가 신청 내역</h2>
        <Button onClick={() => setOpen(true)}>신청</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>날짜</TableHead>
            <TableHead>사유</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map(req => (
            <TableRow key={req.id}>
              <TableCell>{format(new Date(req.startDate), 'yyyy-MM-dd')}</TableCell>
              <TableCell>{req.reason}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>휴가 신청</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Calendar mode="single" selected={date} onSelect={setDate} />
            <Input placeholder="사유" />
          </div>
          <DialogFooter>
            <Button onClick={() => setOpen(false)}>취소</Button>
            <Button onClick={() => { setOpen(false); showSuccess('신청 완료') }}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default LeaveManagement
